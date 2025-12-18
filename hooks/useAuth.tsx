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
  signUpParent as authSignUpParent
} from '@/lib/authService';
import { supabase } from '@/lib/supabase';

interface AuthContextType extends AuthState {
  signIn: (e: string, p: string) => Promise<{ error: any }>;
  signUpParent: (e: string, p: string, n: string) => Promise<{ error: any }>;
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

  // פונקציית הבדיקה הראשית - מי אני?
  const checkUser = async () => {
    try {
      // 1. בדיקת משתמש רשום (הורה / ילד עצמאי)
      const userProfile = await getCurrentUserProfile();
      
      if (userProfile) {
        setState({
          user: userProfile,
          child: null,
          role: userProfile.role,
          isLoading: false,
          isAuthenticated: true
        });
        return;
      }

      // 2. בדיקת ילד מקושר (Token בזיכרון)
      const storedCreds = await getStoredChildCredentials();
      if (storedCreds && storedCreds.childId && storedCreds.token) {
        const response = await getChildByToken(storedCreds.childId, storedCreds.token);
        
        if (response.success && response.child) {
          setState({
            user: null,
            child: response.child,
            role: response.child.isIndependent ? 'child_independent' : 'child_linked', // לרוב זה יהיה linked
            isLoading: false,
            isAuthenticated: true
          });
          return;
        }
      }

      // 3. אף אחד לא מחובר - אורח
      setState({
        user: null,
        child: null,
        role: 'GUEST',
        isLoading: false,
        isAuthenticated: false
      });

    } catch (error) {
      console.error('Auth check failed:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // הרצה ראשונית והאזנה לשינויים ב-Supabase
  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- פעולות ---

  const signIn = async (email: string, pass: string) => {
    const { error } = await authSignIn(email, pass);
    if (!error) await checkUser();
    return { error };
  };

  const signUpParent = async (email: string, pass: string, name: string) => {
    const { error } = await authSignUpParent(email, pass, name);
    if (!error) await checkUser();
    return { error };
  };

  const signInWithCode = async (code: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await pairDeviceWithCode(code);
    
    if (result.success) {
      await checkUser(); // רענון המצב כדי לזהות את הילד החדש
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
    return result;
  };

  const signOut = async () => {
    await authSignOut();
    await checkUser();
    router.replace('/'); // חזרה למסך הפתיחה
  };

  return (
    <AuthContext.Provider value={{ 
      ...state, 
      signIn, 
      signUpParent, 
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