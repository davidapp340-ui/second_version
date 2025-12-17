import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

// רכיב "שומר הסף" - מנהל את הניווט וההגנה
function InitialLayout() {
  const { session, loading, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // מפעיל את התיקונים של הפריימוורק (מהקוד המקורי שלך)
  useFrameworkReady();

  useEffect(() => {
    if (loading) return;

    // בדיקה: איפה המשתמש נמצא כרגע?
    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';
    const inProtectedFlow = inTabsGroup || segments[0] === 'add-child';

    if (!session) {
      // תרחיש 1: משתמש לא מחובר מנסה להיכנס לאזור שמור
      if (inProtectedFlow) {
        router.replace('/'); // זרוק אותו למסך הפתיחה
      }
    } else if (session && profile) {
      // תרחיש 2: משתמש מחובר מנסה לחזור למסכי התחברות
      // (למשל, אם הוא לוחץ "אחורה" אחרי התחברות)
      if (inAuthGroup || segments[0] === 'index' || segments[0] === 'user-type') {
        router.replace('/(tabs)'); // העבר אותו לאפליקציה
      }
    }
  }, [session, loading, segments, profile]);

  // מסך טעינה בזמן שהמערכת בודקת מי המשתמש
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <ActivityIndicator size="large" color="#4FFFB0" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="user-type" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-child" />
        <Stack.Screen name="consent-policy" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}

// הרכיב הראשי - עוטף את הכל ב"מוח" של המערכת
export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}