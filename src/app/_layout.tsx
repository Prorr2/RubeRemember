import React from 'react';
import { View, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RememberStoreProvider } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';
import { DropboxAutoSyncHandler } from '@/components/dropbox-auto-sync-handler';

// Patch to prevent "Unable to activate keep awake" unhandled rejections on both Web and Native
try {
  // 1. Web WakeLock patch
  if (typeof navigator !== 'undefined' && navigator.wakeLock) {
    const originalRequest = navigator.wakeLock.request;
    if (originalRequest) {
      navigator.wakeLock.request = async function (...args) {
        try {
          return await originalRequest.apply(this, args);
        } catch (e) {
          console.warn('navigator.wakeLock.request failed, returning dummy sentinel:', e);
          return {
            onrelease: null,
            released: false,
            type: 'screen',
            release: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
          } as any;
        }
      };
    }
  }

  // 2. Native KeepAwake patch
  const { requireNativeModule } = require('expo-modules-core');
  if (requireNativeModule) {
    try {
      const ExpoKeepAwake = requireNativeModule('ExpoKeepAwake');
      if (ExpoKeepAwake) {
        const originalActivate = ExpoKeepAwake.activate;
        if (originalActivate) {
          ExpoKeepAwake.activate = async (...args: any[]) => {
            try {
              return await originalActivate(...args);
            } catch (e) {
              console.warn('Failed to activate keep awake, suppressing error:', e);
            }
          };
        }
        
        const originalDeactivate = ExpoKeepAwake.deactivate;
        if (originalDeactivate) {
          ExpoKeepAwake.deactivate = async (...args: any[]) => {
            try {
              return await originalDeactivate(...args);
            } catch (e) {
              console.warn('Failed to deactivate keep awake, suppressing error:', e);
            }
          };
        }
      }
    } catch (e) {
      // KeepAwake module might not exist in some builds
    }
  }
} catch (e) {
  // Safe fallback
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  return (
    <RememberStoreProvider>
      <SafeAreaProvider>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="backup" />
              <Stack.Screen name="dropbox" />
              <Stack.Screen name="sync" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="slots" />
              <Stack.Screen name="goals" />
              <Stack.Screen name="tasks" />
              <Stack.Screen name="activities" />
              <Stack.Screen name="trash" />
              <Stack.Screen name="editor" />
              <Stack.Screen name="search" />
              <Stack.Screen name="lists" />
              <Stack.Screen name="session" />
              <Stack.Screen name="statistics" />
              <Stack.Screen name="help" />
            </Stack>
            <DropboxAutoSyncHandler />
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </RememberStoreProvider>
  );
}
