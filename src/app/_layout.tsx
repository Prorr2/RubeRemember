import React from 'react';
import { View, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RememberStoreProvider } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

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
              <Stack.Screen name="settings" />
              <Stack.Screen name="slots" />
              <Stack.Screen name="goals" />
              <Stack.Screen name="tasks" />
              <Stack.Screen name="reminders" />
              <Stack.Screen name="activities" />
              <Stack.Screen name="trash" />
              <Stack.Screen name="editor" />
              <Stack.Screen name="search" />
              <Stack.Screen name="lists" />
              <Stack.Screen name="session" />
              <Stack.Screen name="statistics" />
            </Stack>
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </RememberStoreProvider>
  );
}
