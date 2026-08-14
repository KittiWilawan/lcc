import { Stack } from "expo-router";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider } from "../context/ThemeContext";
import AppLockScreen from "../components/AppLockScreen";

export default function RootLayout() {
  const [isLocked, setIsLocked] = useState(false);
  const [checkingLock, setCheckingLock] = useState(true);

  useEffect(() => {
    void checkAppLock();
  }, []);

  const checkAppLock = async () => {
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
    }
  };

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
