import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

// רכיב "שומר הסף" הפנימי
function InitialLayout() {
  // אנחנו מושכים גם את session וגם את linkedChild
  const { session, linkedChild, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  useFrameworkReady();

  useEffect(() => {
    if (loading) return;

    // הגדרת קבוצות מסכים
    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';
    
    // רשימת מסכים שפתוחים לכולם (דף הבית, בחירת סוג משתמש, מדיניות)
    const isPublicRoute = 
      segments[0] === 'index' || 
      segments[0] === 'user-type' || 
      segments[0] === 'consent-policy';

    // בדיקה: האם המשתמש מחובר? (או כהורה/עצמאי עם סשן, או כילד מקושר)
    const isAuthenticated = !!session || !!linkedChild;

    if (!isAuthenticated) {
      // --- תרחיש 1: אורח (לא מחובר) ---
      // אם הוא מנסה להיכנס לאזור שמור (כמו הטאבים או הוספת ילד) -> זרוק אותו החוצה
      if (inTabsGroup || segments[0] === 'add-child') {
        router.replace('/'); 
      }
    } else {
      // --- תרחיש 2: מחובר (הורה או ילד) ---
      // אם הוא מנסה לחזור למסכי התחברות או לדף הפתיחה -> שלח אותו לאפליקציה
      if (inAuthGroup || isPublicRoute) {
        router.replace('/(tabs)');
      }
    }
  }, [session, linkedChild, loading, segments]);

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
        {/* מסכים ציבוריים */}
        <Stack.Screen name="index" />
        <Stack.Screen name="user-type" />
        <Stack.Screen name="consent-policy" />
        
        {/* מסכי אימות (Login/Signup) */}
        <Stack.Screen name="auth" />
        
        {/* האפליקציה עצמה (מוגן) */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-child" />
        
        {/* מסך שגיאה כללי */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

// הרכיב הראשי שעוטף הכל בספק האימות
export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}