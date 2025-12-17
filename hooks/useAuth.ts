import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// הגדרת מבנה הנתונים של המשתמש כפי שהאפליקציה מכירה אותו
export interface UserProfile {
  id: string;             // מזהה ייחודי (Auth UUID)
  email?: string;
  name: string;
  role: 'parent' | 'child';
  familyId?: string;      // המזהה שמקשר למשפחה
  avatarUrl?: string;
  points?: number;        // רלוונטי לילד
  isIndependent?: boolean; // האם הילד עצמאי (ללא הורה מנהל)
}

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;       // קיצור דרך: האם המשתמש הוא הורה
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // בדיקה ראשונית בעליית האפליקציה
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // האזנה לשינויים בחיבור (התחברות/התנתקות בזמן אמת)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // הפונקציה החכמה שמזהה מי המשתמש מול הטבלאות במסד הנתונים
  const fetchProfile = async (userId: string) => {
    try {
      // שלב 1: בדיקה בטבלת הורים (parents)
      const { data: parent } = await supabase
        .from('parents')
        .select('id, name, family_id, avatar_url')
        .eq('id', userId)
        .single();

      if (parent) {
        setProfile({
          id: userId,
          email: session?.user.email,
          name: parent.name,
          role: 'parent',
          familyId: parent.family_id,
          avatarUrl: parent.avatar_url,
        });
        setLoading(false);
        return;
      }

      // שלב 2: אם לא הורה, בדיקה בטבלת ילדים (children)
      const { data: child } = await supabase
        .from('children')
        .select('id, name, family_id, avatar_url, points, is_independent')
        .eq('id', userId)
        .single();

      if (child) {
        setProfile({
          id: userId,
          email: session?.user.email,
          name: child.name,
          role: 'child',
          familyId: child.family_id,
          avatarUrl: child.avatar_url,
          points: child.points || 0,
          isIndependent: child.is_independent || false,
        });
      }
      
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      profile, 
      loading, 
      isAdmin: profile?.role === 'parent', 
      refreshProfile: () => session && fetchProfile(session.user.id), 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook לשימוש נוח בכל קובץ באפליקציה
export const useAuth = () => useContext(AuthContext);