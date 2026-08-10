import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // ผู้ใช้เคย Login ไว้แล้ว → เช็คว่ามี familyId หรือยัง
        const familyId = await AsyncStorage.getItem('familyId');
        if (familyId) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/family-setup');
        }
      } else {
        // ยังไม่เคย Login → ไปหน้า Login
        router.replace('/login');
      }
    } catch (error) {
      console.log('Session check error:', error);
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // แสดง Loading screen ขณะเช็ค Session
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#059669" />
      <Text style={styles.loadingText}>กำลังตรวจสอบ...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 13,
  },
});
