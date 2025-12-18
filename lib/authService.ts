import { supabase } from './supabase';
import { UserProfile, ChildProfile, ChildLoginResponse } from '@/types/auth';

// ==========================================
// 1. פעולות אימות להורים (Parent Auth)
// ==========================================

/**
 * הרשמת הורה חדש
 * המערכת תיצור אוטומטית משפחה ופרופיל (דרך הטריגר ב-SQL)
 */
export async function signUpParent(email: string, password: string, fullName: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: fullName,
          role: 'parent'
        }
      }
    });

    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error: any) {
    console.error('Parent signup failed:', error);
    return { user: null, error };
  }
}

/**
 * הרשמת ילד עצמאי (מעל גיל 13, עם מייל משלו)
 */
export async function signUpIndependentChild(data: {
  email: string;
  password: string;
  name: string;
  age: string;
  avatarUrl: string;
}) {
  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          age: data.age,
          avatarUrl: data.avatarUrl,
          role: 'child_independent'
        }
      }
    });

    if (error) throw error;
    return { user: authData.user, error: null };
  } catch (error: any) {
    console.error('Independent child signup failed:', error);
    return { user: null, error };
  }
}

/**
 * התחברות רגילה (אימייל וסיסמה)
 * משמשת הורים וילדים עצמאיים
 */
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return { user: null, error };
  }
}

/**
 * יציאה מהמערכת
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Sign out error:', error);
}

// ==========================================
// 2. פעולות לילד מקושר (Linked Child)
// ==========================================

/**
 * יצירת קוד זמני (מופעל ע"י הורה)
 * קורא לפונקציית ה-RPC בשרת שיצרנו בשלב 1
 */
export async function generateLinkingCode(childId: string): Promise<{ code: string | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('generate_linking_code', {
      target_child_id: childId
    });

    if (error) throw error;
    return { code: data as string, error: null };
  } catch (error) {
    console.error('Failed to generate code:', error);
    return { code: null, error };
  }
}

/**
 * כניסת ילד עם קוד (Pairing)
 * קורא לפונקציית ה-RPC בשרת שבודקת את הקוד והתוקף
 */
export async function loginWithCode(code: string): Promise<ChildLoginResponse> {
  try {
    const { data, error } = await supabase.rpc('check_child_code', {
      code_input: code
    });

    if (error) throw error;
    
    if (!data) {
      return { child: null, error: 'קוד שגוי או פג תוקף' };
    }

    // המרת התשובה מהשרת לטיפוס המוכר שלנו
    const childProfile: ChildProfile = data as ChildProfile;
    return { child: childProfile, error: null };
  } catch (error: any) {
    console.error('Login with code failed:', error);
    return { child: null, error: error.message || 'שגיאת תקשורת' };
  }
}

// ==========================================
// 3. עזרים (Helpers)
// ==========================================

/**
 * שליפת הפרופיל של המשתמש המחובר כרגע (הורה/עצמאי)
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) return null;

    return profile as UserProfile;
  } catch (error) {
    return null;
  }
}

/**
 * רענון פרטי ילד (למשל, כדי לעדכן נקודות)
 * משמש את האפליקציה כשהילד כבר מצומד, כדי לקבל מידע עדכני
 */
export async function fetchChildProfile(childId: string): Promise<ChildProfile | null> {
  try {
    // כאן אנחנו משתמשים ב-select רגיל כי לילד אין Auth Token,
    // אבל בגלל ה-RLS זה יעבוד רק אם הקריאה מתבצעת בהקשר מורשה.
    // הערה: פונקציה זו תעבוד כרגע בעיקר עבור הורים שצופים בילד.
    // עבור הילד עצמו, אנחנו נסתמך על המידע שנשמר בזיכרון או על פונקציות RPC ייעודיות בהמשך.
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('id', childId)
      .single();

    if (error) throw error;
    return data as ChildProfile;
  } catch (error) {
    console.error('Fetch child failed:', error);
    return null;
  }
}