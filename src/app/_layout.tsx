import { Stack } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "../context/ThemeContext";
import AppLockScreen from "../components/AppLockScreen";

// Prevent auto hide until initial checks are completed
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [isLocked, setIsLocked] = useState(false);
  const [checkingLock, setCheckingLock] = useState(true);

  const checkAppLock = useCallback(async () => {
    try {
      const lockEnabled = await AsyncStorage.getItem('@app_lock_enabled');
      const hasPin = await AsyncStorage.getItem('@app_lock_pin');
      if (lockEnabled === 'true' && hasPin) {
        setIsLocked(true);
      }
    } catch (e) {
      console.log('Error checking app lock:', e);
    } finally {
      setCheckingLock(false);
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkAppLock();
  }, [checkAppLock]);

  if (checkingLock) return null;

  if (isLocked) {
    return (
      <ThemeProvider>
        <AppLockScreen onUnlock={() => setIsLocked(false)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
