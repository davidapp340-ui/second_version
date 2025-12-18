import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

// רכיב הניווט הפנימי - מגיב לשינויים בתפקיד המשתמש
function RootNavigation() {
  const { role, loading } = useUserRole();
  const segments = useSegments();
  const router = useRouter();
  
  useFrameworkReady();

  useEffect(() => {
    if (loading) return;

    // איפה המשתמש נמצא כרגע?
    const inAuthGroup = segments[0] === 'auth';     // מסכי כניסה
    const inTabsGroup = segments[0] === '(tabs)';   // האפליקציה עצמה
    const inPublicGroup =                           // מסכי פתיחה
      segments[0] === 'index' || 
      segments[0] === 'user-type' || 
      segments[0] === 'consent-policy';

    // --- לוגיקת הניווט החדשה והפשוטה ---

    if (role === 'GUEST') {
      // 1. תרחיש אורח:
      // אם הוא מנסה להיכנס לאזור פרטי (טאבים) -> זרוק אותו לבחירת משתמש
      if (inTabsGroup) {
        router.replace('/user-type');
      }
    } else {
      // 2. תרחיש מחובר (הורה / ילד מקושר / ילד עצמאי):
      // אם הוא מנסה לחזור למסכי הכניסה -> החזר אותו לאפליקציה
      if (inAuthGroup || inPublicGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [role, loading, segments]);

  // מסך טעינה בזמן שהמערכת בודקת מי אתה
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
        
        {/* מסכי אימות */}
        <Stack.Screen name="auth" />
        
        {/* האפליקציה המוגנת */}
        <Stack.Screen name="(tabs)" />
        
        {/* מסכים כלליים */}
        <Stack.Screen name="test-auth" options={{ presentation: 'modal' }} />
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