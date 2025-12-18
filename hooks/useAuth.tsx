import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { AuthState, ChildLoginResponse, ChildProfile, UserRole } from '@/types/auth';
import { 
  getCurrentUserProfile, 
  getStoredChildCredentials, 
  getChildByToken, 
  signOut as authSignOut,
  pairDeviceWithCode,
  signIn as authSignIn,
  signUpParent as authSignUpParent,
  signUpIndependentChild as authSignUpIndependentChild
} from '@/lib/authService';
import { supabase } from '@/lib/supabase';

// הגדרת הממשק של ה-Context – אלו הפונקציות שיהיו זמינות בכל האפליקציה
interface AuthContextType extends AuthState {
  signIn: (e: string, p: string) => Promise<{ error: any }>;
  signUpParent: (e: string, p: string, n: string) => Promise<{ error: any }>;
  
  // פונקציה חדשה שהייתה חסרה
  signUpIndependentChild: (params: { 
    email: string; 
    password: string; 
    name: string; 
    age: string; 
    avatarUrl?: string; 
  }) => Promise<{ error: any }>;

  signInWithCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    child: null,
    role: 'GUEST',
    isLoading: true,
    isAuthenticated: false,
  });

  const router = useRouter();
  const segments = useSegments();

  // --- הפונקציה הראשית: מי אני? ---
  const checkUser = async () => {
    try {
      // בדיקה 1: האם יש Session פעיל ב-Supabase? (הורה או ילד עצמאי)
      const userProfile = await getCurrentUserProfile();
      
      if (userProfile) {
        setState({
          user: userProfile,
          child: null, // הורה לא מוגדר כילד
          role: userProfile.role,
          isLoading: false,
          isAuthenticated: true
        });
        return;
      }

      // בדיקה 2: אם אין Session, האם יש טוקן של ילד מקושר בזיכרון המכשיר?
      const storedCreds = await getStoredChildCredentials();
      if (storedCreds && storedCreds.childId && storedCreds.token) {
        // אימות הטוקן מול השרת
        const response = await getChildByToken(storedCreds.childId, storedCreds.token);
        
        if (response.success && response.child) {
          setState({
            user: null,
            child: response.child,
            role: 'child_linked',
            isLoading: false,
            isAuthenticated: true
          });
          return;
        }
      }

      // ברירת מחדל: אף אחד לא מחובר (אורח)
      setState({
        user: null,
        child: null,
        role: 'GUEST',
        isLoading: false,
        isAuthenticated: false
      });

    } catch (error) {
      console.error('Auth check failed:', error);
      // במקרה של שגיאה קריטית, נחזיר מצב אורח כדי לא לתקוע את האפליקציה
      setState(prev => ({ ...prev, role: 'GUEST', isLoading: false, isAuthenticated: false }));
    }
  };

  // --- האזנה לשינויים ---
  useEffect(() => {
    checkUser();

    // מאזין לשינויים ב-Supabase (כניסה/יציאה של הורים/עצמאיים)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // אם האירוע הוא יציאה, או כניסה חדשה, נריץ בדיקה מחדש
      checkUser(); 
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- פעולות (Actions) ---

  const signIn = async (email: string, pass: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const { error } = await authSignIn(email, pass);
    if (error) setState(prev => ({ ...prev, isLoading: false }));
    // הערה: אין צורך לקרוא ל-checkUser כאן ידנית, ה-listener למעלה יעשה זאת
    return { error };
  };

  const signUpParent = async (email: string, pass: string, name: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const { error } = await authSignUpParent(email, pass, name);
    if (error) setState(prev => ({ ...prev, isLoading: false }));
    return { error };
  };

  const signUpIndependentChild = async (params: any) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const { error } = await authSignUpIndependentChild(params);
    if (error) setState(prev => ({ ...prev, isLoading: false }));
    return { error };
  };

  const signInWithCode = async (code: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await pairDeviceWithCode(code);
    
    if (result.success) {
      // כאן ה-Listener של Supabase לא יעבוד (כי זה לא auth רגיל),
      // אז חובה לקרוא ל-checkUser ידנית
      await checkUser(); 
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
    return result;
  };

  const signOut = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await authSignOut();
      // איפוס ידני למצב אורח
      setState({
        user: null,
        child: null,
        role: 'GUEST',
        isLoading: false,
        isAuthenticated: false
      });
      // זריקה למסך הפתיחה
      router.replace('/'); 
    } catch (e) {
      console.error("Sign out error", e);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      ...state, 
      signIn, 
      signUpParent,
      signUpIndependentChild,
      signInWithCode, 
      signOut,
      refreshUser: checkUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};