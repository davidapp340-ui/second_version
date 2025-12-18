import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { 
  getCurrentUserProfile, 
  loginWithCode as serviceLoginWithCode,
  signOut as serviceSignOut
} from '@/lib/authService';
import { UserProfile, ChildProfile } from '@/types/auth';

// מפתח לשמירת פרופיל הילד בזיכרון המכשיר (לצורך צימוד קבוע)
const STORAGE_KEY_LINKED_CHILD = 'zoomi_linked_child_profile';

type AuthContextType = {
  // מצב 1: משתמש רגיל (הורה / ילד עצמאי)
  session: Session | null;
  user: User | null;         // אובייקט המשתמש של Supabase
  profile: UserProfile | null; // הפרופיל מה-DB

  // מצב 2: ילד מקושר (ללא אימייל)
  linkedChild: ChildProfile | null;

  // מצב כללי
  loading: boolean;
  
  // פעולות
  signInWithCode: (code: string) => Promise<{ error: string | null }>;
  signOutUser: () => Promise<void>;
  refreshUserData: () => Promise<void>; // פונקציה לרענון ידני של הנתונים
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  linkedChild: null,
  loading: true,
  signInWithCode: async () => ({ error: null }),
  signOutUser: async () => {},
  refreshUserData: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State עבור משתמשים רשומים (Supabase Auth)
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // State עבור ילד מקושר (Local Storage)
  const [linkedChild, setLinkedChild] = useState<ChildProfile | null>(null);

  const [loading, setLoading] = useState(true);

  // 1. אתחול ראשוני: בדיקה מי מחובר
  useEffect(() => {
    initializeAuth();

    // האזנה לשינויים ב-Supabase (למשל: תוקף טוקן פג)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // אם יש סשן, נטען את הפרופיל וננקה ילד מקושר (לא יכולים להיות שניהם יחד)
        await loadUserProfile();
        setLinkedChild(null); 
        await AsyncStorage.removeItem(STORAGE_KEY_LINKED_CHILD);
      } else if (!linkedChild) {
        // אם התנתקנו מהסשן ואין ילד מקושר בזיכרון -> איפוס
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // פונקציית הטעינה הראשית
  const initializeAuth = async () => {
    try {
      setLoading(true);

      // א. בדיקה אם יש משתמש רגיל (הורה/עצמאי)
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        await loadUserProfile();
      } else {
        // ב. אם אין משתמש רגיל, נבדוק אם יש "ילד מקושר" שמור בזיכרון
        const savedChildJson = await AsyncStorage.getItem(STORAGE_KEY_LINKED_CHILD);
        if (savedChildJson) {
          try {
            const parsedChild = JSON.parse(savedChildJson) as ChildProfile;
            setLinkedChild(parsedChild);
          } catch (e) {
            console.error('Failed to parse saved child:', e);
            await AsyncStorage.removeItem(STORAGE_KEY_LINKED_CHILD);
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // טעינת פרופיל משתמש (הורה/עצמאי)
  const loadUserProfile = async () => {
    const userProfile = await getCurrentUserProfile();
    setProfile(userProfile);
  };

  // פעולה: כניסת ילד עם קוד
  const signInWithCode = async (code: string) => {
    setLoading(true);
    const { child, error } = await serviceLoginWithCode(code);
    
    if (child) {
      // שמירה בזיכרון המכשיר (Pairing)
      await AsyncStorage.setItem(STORAGE_KEY_LINKED_CHILD, JSON.stringify(child));
      setLinkedChild(child);
      
      // וידוא שאין משתמשים אחרים מחוברים
      if (session) await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    }
    
    setLoading(false);
    return { error };
  };

  // פעולה: יציאה מלאה (Reset)
  const signOutUser = async () => {
    setLoading(true);
    try {
      // 1. ניקוי סופרבייס
      await serviceSignOut();
      // 2. ניקוי זיכרון מקומי
      await AsyncStorage.removeItem(STORAGE_KEY_LINKED_CHILD);
      
      // 3. איפוס סטייט
      setSession(null);
      setUser(null);
      setProfile(null);
      setLinkedChild(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  // רענון נתונים (שימושי כשרוצים לעדכן נקודות וכו')
  const refreshUserData = async () => {
    if (session) {
      await loadUserProfile();
    }
    // הערה: עבור ילד מקושר, נצטרך בעתיד לוגיקה לרענון מול השרת
    // כרגע הנתונים נשארים מה שנשמר בזיכרון בעת החיבור
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        linkedChild,
        loading,
        signInWithCode,
        signOutUser,
        refreshUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}