import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // הנחה שקובץ ה-client קיים
import { Session } from '@supabase/supabase-js';
import { Profile, Child } from '../types/database';

// הגדרת המידע שהקונטקסט יחשוף לאפליקציה
interface AuthContextType {
  session: Session | null;
  profile: Profile | null;     // מידע אם זה הורה/עצמאי
  activeChild: Child | null;   // מידע אם זה ילד (מקושר או עצמאי)
  loading: boolean;
  isLinkedDevice: boolean;     // דגל מהיר לבדיקה אם זה מכשיר ילד
  signOut: () => Promise<void>;
  // פונקציה לצימוד מכשיר (עבור ילד מקושר)
  pairDevice: (childId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // פונקציה ראשית לבדיקת מצב המשתמש בעת טעינת האפליקציה
    const initializeAuth = async () => {
      setLoading(true);

      // 1. בדיקת סשן של Supabase (הורה או ילד עצמאי)
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        setSession(currentSession);
        
        // שליפת הפרופיל
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();
          
        if (profileData) {
          setProfile(profileData);
          
          // אם זה ילד עצמאי, נשלוף גם את רשומת ה-Child שלו
          if (profileData.role === 'child_independent') {
            const { data: childData } = await supabase
              .from('children')
              .select('*')
              .eq('user_id', currentSession.user.id)
              .single();
            if (childData) setActiveChild(childData);
          }
        }
      } else {
        // 2. אם אין סשן - בדיקת זיכרון מקומי לילד מקושר (Device Pairing)
        // ב-React Native נשתמש ב-AsyncStorage. ב-Web נשתמש ב-localStorage.
        const linkedChildId = localStorage.getItem('zoomi_linked_child_id');
        
        if (linkedChildId) {
          // ניסיון לשלוף את פרטי הילד מהמסד
          // הערה: נצטרך לוודא ש-RLS מאפשר שליפה זו, או להשתמש ב-RPC
          const { data: childData } = await supabase
            .from('children')
            .select('*')
            .eq('id', linkedChildId)
            .single();
            
          if (childData) {
            setActiveChild(childData);
          }
        }
      }
      
      setLoading(false);
    };

    initializeAuth();

    // האזנה לשינויים בזמן אמת (רק עבור Auth Users)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // המשתמש התחבר מחדש או נרשם
        setSession(session);
        // כאן היינו מפעילים שוב את שליפת הפרופיל...
      } else {
        // המשתמש התנתק
        setSession(null);
        setProfile(null);
        // לא מאפסים את activeChild מיד, כי אולי הוא עבר למצב מקושר? 
        // אבל למען הפשטות כרגע נאפס:
        if (!localStorage.getItem('zoomi_linked_child_id')) {
           setActiveChild(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // פונקציות עזר

  const pairDevice = async (childId: string) => {
    localStorage.setItem('zoomi_linked_child_id', childId);
    // טעינה מחדש של הדף או שליפה יזומה
    window.location.reload(); 
  };

  const signOut = async () => {
    // ניתוק כפול: גם מהשרת וגם מהזיכרון המקומי
    await supabase.auth.signOut();
    localStorage.removeItem('zoomi_linked_child_id');
    setSession(null);
    setProfile(null);
    setActiveChild(null);
  };

  const isLinkedDevice = !!activeChild && !session;

  return (
    <AuthContext.Provider value={{ 
      session, 
      profile, 
      activeChild, 
      loading, 
      isLinkedDevice,
      signOut,
      pairDevice
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook לשימוש קל בקומפוננטות
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};