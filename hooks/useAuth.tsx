import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { 
  getCurrentUserWithProfile, 
  UserProfile, 
  ChildProfile, 
  loginWithCode 
} from '@/lib/authService';

// מפתח לשמירת ילד מקושר בזיכרון המכשיר
const LINKED_CHILD_STORAGE_KEY = 'zoomi_linked_child_code';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;         // קיים רק להורים וילדים עצמאיים
  linkedChild: ChildProfile | null;    // קיים רק לילדים מקושרים
  loading: boolean;
  isAdmin: boolean;
  isLinkedMode: boolean;               // האם אנחנו במצב "ילד מקושר"
  signInWithCode: (code: string) => Promise<{ error: string | null }>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  linkedChild: null,
  loading: true,
  isAdmin: false,
  isLinkedMode: false,
  signInWithCode: async () => ({ error: null }),
  signOutUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [linkedChild, setLinkedChild] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. בדיקה ראשונית בעליית האפליקציה
    initializeAuth();

    // 2. האזנה לשינויים באימות של סופרבייס (הורים/עצמאיים)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // אם יש משתמש רגיל, נביא את הפרופיל שלו
        const data = await getCurrentUserWithProfile();
        setProfile(data?.profile || null);
        // ונוודא שאין ילד מקושר "תקוע" בזיכרון
        setLinkedChild(null); 
      } else {
        setProfile(null);
      }
      
      // אם אין סשן, אנחנו לא מכבים את הטעינה מיד, 
      // כי אולי זה ילד מקושר (זה יטופל ב-initializeAuth)
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);

      // א. בדיקה אם יש משתמש רגיל (הורה/עצמאי)
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        const data = await getCurrentUserWithProfile();
        setProfile(data?.profile || null);
      } else {
        // ב. אם אין משתמש רגיל, נבדוק אם יש "ילד מקושר" שמור בזיכרון
        const savedCode = await AsyncStorage.getItem(LINKED_CHILD_STORAGE_KEY);
        if (savedCode) {
          const { child } = await loginWithCode(savedCode);
          if (child) {
            setLinkedChild(child);
          } else {
            // אם הקוד לא תקין יותר, נמחק אותו
            await AsyncStorage.removeItem(LINKED_CHILD_STORAGE_KEY);
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // פונקציה לכניסת ילד מקושר
  const signInWithCode = async (code: string) => {
    setLoading(true);
    const { child, error } = await loginWithCode(code);
    
    if (child) {
      // שמירה בזיכרון כדי שיישאר מחובר גם אחרי סגירת האפליקציה
      await AsyncStorage.setItem(LINKED_CHILD_STORAGE_KEY, code);
      setLinkedChild(child);
      // איפוס נתונים אחרים למען הסדר הטוב
      setSession(null);
      setUser(null);
      setProfile(null);
    }
    
    setLoading(false);
    return { error: error ? 'קוד שגוי או לא קיים' : null };
  };

  // יציאה (תומך גם בהורה וגם בילד מקושר)
  const signOutUser = async () => {
    setLoading(true);
    try {
      // 1. ניקוי סופרבייס
      await supabase.auth.signOut();
      // 2. ניקוי זיכרון מקומי
      await AsyncStorage.removeItem(LINKED_CHILD_STORAGE_KEY);
      
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

  const isAdmin = profile?.role === 'parent';
  const isLinkedMode = !!linkedChild; // האם מחובר כרגע ילד מקושר

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        linkedChild,
        loading,
        isAdmin,
        isLinkedMode,
        signInWithCode,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}