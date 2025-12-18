import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

// רכיב הניווט הפנימי - מגיב למצב האימות (Auth State)
function RootNavigation() {
  // אנחנו שולפים רק את המידע הקריטי: האם המערכת בטעינה? האם המשתמש מחובר?
  const { isAuthenticated, isLoading } = useAuth();
  
  const segments = useSegments();
  const router = useRouter();
  
  // טעינת פונטים ומשאבים (נשאר כמו שהיה)
  useFrameworkReady();

  useEffect(() => {
    if (isLoading) return;

    // בדיקת מיקום נוכחי
    const inAuthGroup = segments[0] === 'auth';     // מסכי כניסה
    const inTabsGroup = segments[0] === '(tabs)';   // האפליקציה עצמה (מסך הבית)
    
    // לוגיקת הניתוב החדשה והפשוטה:
    
    if (isAuthenticated) {
      // 1. אם המשתמש מחובר (הורה או ילד) ומנסה להיכנס למסכי כניסה -> העבר לבית
      if (inAuthGroup) {
        router.replace('/(tabs)');
      }
    } else {
      // 2. אם המשתמש לא מחובר (אורח) ומנסה להיכנס לאפליקציה -> זרוק החוצה
      if (inTabsGroup) {
        router.replace('/'); // חזרה למסך הפתיחה
      }
    }
  }, [isAuthenticated, isLoading, segments]);

  // מסך טעינה בזמן שהמערכת בודקת טוקנים בזיכרון או בשרת
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <ActivityIndicator size="large" color="#4FFFB0" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {/* מסכים ציבוריים */}
        <Stack.Screen name="index" />
        <Stack.Screen name="user-type" />
        <Stack.Screen name="consent-policy" />
        
        {/* מסכי אימות */}
        <Stack.Screen name="auth" />
        
        {/* האפליקציה המוגנת (דורשת isAuthenticated) */}
        <Stack.Screen name="(tabs)" />
        
        {/* מסכים כלליים */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

// הרכיב הראשי שעוטף הכל ב-AuthProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}