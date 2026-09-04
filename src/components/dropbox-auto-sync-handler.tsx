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
  const initialCheckDoneRef = useRef<boolean>(false);

  // Toast state & animation refs
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    setToastMessage(message);

    fadeAnim.setValue(0);
    scaleAnim.setValue(0.85);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after 3.5 seconds
    hideTimeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 350,
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

    const hasCredentials = !!(settings?.dropboxAccessToken?.trim() || settings?.dropboxRefreshToken?.trim());
    if (!hasCredentials) return;
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

  // Immediate check on App Launch as soon as store finishes loading
  useEffect(() => {
    const hasCredentials = !!(store.userSettings?.dropboxAccessToken?.trim() || store.userSettings?.dropboxRefreshToken?.trim());
    if (hasCredentials && !initialCheckDoneRef.current) {
      initialCheckDoneRef.current = true;
      runSyncCheck('App startup launch check');
    }
  }, [store.userSettings?.dropboxAccessToken, store.userSettings?.dropboxRefreshToken]);

  useEffect(() => {
    // 1. Initial check when component mounts (if app is active)
    if (AppState.currentState === 'active') {
      runSyncCheck('Initial app mount');
    }

    // 2. Set interval to check every 30 minutes while in foreground
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;
    const intervalId = setInterval(() => {
      if (appStateRef.current === 'active') {
        runSyncCheck('30-minute interval timer');
      }
    }, THIRTY_MINUTES_MS);

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
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.toastCard}>
        <Ionicons name="cloud-done-outline" size={26} color="#0061FF" />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(15, 15, 20, 0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
