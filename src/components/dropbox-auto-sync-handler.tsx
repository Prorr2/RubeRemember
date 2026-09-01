import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRememberStore } from '@/hooks/use-remember-store';
import { DropboxService } from '@/services/DropboxService';

export function DropboxAutoSyncHandler() {
  const store = useRememberStore();
  const storeRef = useRef(store);
  storeRef.current = store;

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isSyncingRef = useRef<boolean>(false);

  // Toast state & animation refs
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-24)).current;
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    setToastMessage(message);

    fadeAnim.setValue(0);
    translateYAnim.setValue(-24);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after 3.5 seconds
    hideTimeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -24,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastMessage(null);
      });
    }, 3500);
  };

  const runSyncCheck = async (reason: string) => {
    if (isSyncingRef.current) return;
    const currentStore = storeRef.current;
    const settings = currentStore.userSettings;

    if (!settings?.dropboxAccessToken || !settings.dropboxAccessToken.trim()) return;
    if (settings.dropboxAutoUploadEnabled === false) return;

    isSyncingRef.current = true;
    try {
      console.log(`[DropboxAutoSyncHandler] Triggering check (${reason})...`);
      const result = await DropboxService.performAutoSync({
        userSettings: currentStore.userSettings,
        items: currentStore.items,
        exportBackupData: currentStore.exportBackupData,
        updateUserSettings: currentStore.updateUserSettings,
        forceManual: false,
      });

      if (result.success && result.uploaded) {
        showToast('Base de datos sincronizada');
      }
    } catch (err) {
      console.warn('[DropboxAutoSyncHandler] Check error:', err);
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    // 1. Initial check when component mounts (if app is active)
    if (AppState.currentState === 'active') {
      runSyncCheck('Initial app mount');
    }

    // 2. Set interval to check every 30 seconds (30,000 ms) while in foreground
    const THIRTY_SECONDS_MS = 30 * 1000;
    const intervalId = setInterval(() => {
      if (appStateRef.current === 'active') {
        runSyncCheck('30-second interval timer');
      }
    }, THIRTY_SECONDS_MS);

    // 3. Listen to AppState foreground changes ('active')
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        runSyncCheck('Foreground app reactivated');
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  if (!toastMessage) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toastContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }],
        },
      ]}
    >
      <View style={styles.toastCard}>
        <Ionicons name="cloud-done-outline" size={18} color="#0061FF" />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 42,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999999,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 15, 18, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
