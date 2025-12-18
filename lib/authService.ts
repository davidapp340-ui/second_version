import { supabase } from './supabase';
import { UserProfile, ChildProfile, ChildLoginResponse } from '@/types/auth';

// ==========================================
// 1. אימות הורים (Parent Auth)
// ==========================================

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

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Sign out error:', error);
}

// ==========================================
// 2. ניהול ילדים (Linked Children)
// ==========================================

/**
 * יצירת רשומת ילד חדש במשפחה (ללא משתמש Auth, רק רשומה בטבלה)
 */
export async function createLinkedChild(name: string, age: number, familyId: string) {
  try {
    const { data, error } = await supabase
      .from('children')
      .insert({
        name,
        age,
        family_id: familyId,
        is_independent: false,
        avatar_url: 'default',
        points: 0
      })
      .select()
      .single();

    if (error) throw error;
    return { child: data, error: null };
  } catch (error: any) {
    console.error('Create linked child failed:', error);
    return { child: null, error };
  }
}

/**
 * יצירת קוד כניסה לילד (קורא לפונקציית ה-SQL שיצרנו בשלב 1)
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
 * כניסת ילד עם קוד
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

    return { child: data as ChildProfile, error: null };
  } catch (error: any) {
    console.error('Login with code failed:', error);
    return { child: null, error: error.message || 'שגיאת תקשורת' };
  }
}

// ==========================================
// 3. ילדים עצמאיים (Independent Child)
// ==========================================

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

// ==========================================
// 4. כללי (Helpers)
// ==========================================

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