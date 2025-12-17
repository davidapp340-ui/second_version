import { supabase } from './supabase';

// --- Types ---

export type UserRole = 'parent' | 'child_independent';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  family_id: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  is_independent: boolean;
  points: number;
  family_id: string;
}

// --- Auth & Registration Logic ---

/**
 * 1. Parent Registration
 * יוצר משתמש בסופרבייס עם מטא-דאטה מתאים.
 * ה-Trigger ב-SQL ייצור אוטומטית את המשפחה והפרופיל.
 */
export async function signUpParent(email: string, password: string, fullName: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: fullName,
          role: 'parent' // זה הטריגר ל-SQL ליצור פרופיל הורה
        }
      }
    });

    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error) {
    console.error('Parent signup failed:', error);
    return { user: null, error };
  }
}

/**
 * 2. Independent Child Registration
 * יוצר משתמש עם מטא-דאטה של ילד עצמאי.
 * ה-Trigger ב-SQL ייצור משפחה, פרופיל ורשומה בטבלת children.
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
          role: 'child_independent' // זה הטריגר ל-SQL ליצור פרופיל ילד עצמאי
        }
      }
    });

    if (error) throw error;
    return { user: authData.user, error: null };
  } catch (error) {
    console.error('Independent child signup failed:', error);
    return { user: null, error };
  }
}

/**
 * 3. General Sign In (Email/Password)
 * משמש הורים וילדים עצמאיים.
 */
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { user: null, error };
  }
}

/**
 * 4. Linked Child Login (Magic Code)
 * פונקציה חדשה! מאפשרת לילד להיכנס עם קוד שההורה נתן לו.
 * מחזירה את פרטי הילד אם הקוד נכון.
 */
export async function loginWithCode(code: string) {
  try {
    // מחפשים ילד עם הקוד הזה
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('linking_code', code)
      .single();

    if (error) throw new Error('קוד לא תקין או לא נמצא');
    if (!data) throw new Error('ילד לא נמצא');

    return { child: data as ChildProfile, error: null };
  } catch (error) {
    console.error('Login with code failed:', error);
    return { child: null, error };
  }
}

/**
 * 5. Sign Out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Sign out error:', error);
}

// --- Helper Data Fetching ---

/**
 * מקבל את המשתמש הנוכחי + הפרופיל שלו מהטבלה החדשה
 */
export async function getCurrentUserWithProfile() {
  try {
    // 1. קבלת המשתמש המחובר
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 2. קבלת הפרופיל שלו מטבלת profiles
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      // אם אין פרופיל, זה כנראה ילד מקושר שנכנס עם קוד, או באג
      console.log('No profile found for auth user (might be linked child mode)');
      return { user, profile: null };
    }

    return { user, profile: profile as UserProfile };
  } catch (error) {
    console.error('Get current user failed:', error);
    return null;
  }
}