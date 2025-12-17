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
  linking_code?: string;
}

// --- Auth & Registration Logic ---

/**
 * 1. Parent Registration
 * יוצר משתמש, ה-Trigger ב-SQL משלים את היתר.
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
  } catch (error) {
    console.error('Parent signup failed:', error);
    return { user: null, error };
  }
}

/**
 * 2. Independent Child Registration
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
  } catch (error) {
    console.error('Independent child signup failed:', error);
    return { user: null, error };
  }
}

/**
 * 3. General Sign In
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
 * משתמש ב-RPC כדי לעקוף את חסימת ה-RLS
 */
export async function loginWithCode(code: string) {
  try {
    const { data, error } = await supabase.rpc('check_child_code', {
      code_input: code
    });

    if (error) throw error;
    if (!data) throw new Error('קוד לא תקין או לא נמצא');

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

export async function getCurrentUserWithProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.log('No profile found (might be linked child)');
      return { user, profile: null };
    }

    return { user, profile: profile as UserProfile };
  } catch (error) {
    console.error('Get current user failed:', error);
    return null;
  }
}