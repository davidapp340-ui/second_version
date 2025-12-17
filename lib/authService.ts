import { supabase } from './supabase';

// --- פונקציות עזר ---

function generateLinkingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --- פונקציות אימות והרשמה ---

// 1. הרשמת הורה (הגרסה המתוקנת והמלאה)
export async function signUpParent(email: string, password: string, fullName: string) {
  try {
    // א. יצירת המשתמש במערכת האימות (Auth)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: fullName, // שימוש ב-name כדי להיות עקבי
          role: 'parent'
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    // ב. יצירת משפחה חדשה (קודם כל המשפחה!)
    // אנחנו יוצרים שורה בטבלת families ומקבלים חזרה את ה-ID שלה
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .insert({
        name: `משפחת ${fullName}`
      })
      .select()
      .single();

    if (familyError) throw familyError;

    // ג. יצירת פרופיל הורה (שמצביע על המשפחה שנוצרה)
    const { error: parentError } = await supabase
      .from('parents')
      .insert({
        id: authData.user.id,     // אותו ID כמו ב-Auth
        family_id: familyData.id, // הקישור למשפחה שיצרנו הרגע
        name: fullName,
        email: email
      });

    if (parentError) throw parentError;

    return { user: authData.user, error: null };
  } catch (error) {
    console.error('Parent signup error:', error);
    return { user: null, error };
  }
}

// 2. הרשמת ילד עצמאי
export async function signUpIndependentChild(data: {
  email: string;
  password: string;
  name: string;
  age: string;
  avatarUrl: string;
}) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { role: 'child_independent' } }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    const { error: profileError } = await supabase
      .from('children')
      .insert({
        user_id: authData.user.id,
        name: data.name,
        age: parseInt(data.age, 10),
        avatar_url: data.avatarUrl,
        linking_code: generateLinkingCode(),
        is_independent: true,
        points: 0,
        daily_streak: 0
      });

    if (profileError) throw profileError;

    return { user: authData.user, error: null };
  } catch (error) {
    console.error('Independent child signup error:', error);
    return { user: null, error };
  }
}

// 3. התחברות כללית
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

// 4. התנתקות
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Sign out error:', error);
}