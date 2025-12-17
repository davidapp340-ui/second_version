import { supabase } from './supabase';

// --- פונקציות עזר ---

// פונקציה ליצירת קוד קישור רנדומלי (6 תווים: אותיות ומספרים)
function generateLinkingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ללא I, O, 1, 0 למניעת בלבול
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --- פונקציות אימות והרשמה ---

// 1. הרשמת הורה (יוצר גם משפחה אוטומטית)
export async function signUpParent(email: string, password: string, firstName: string) {
  try {
    // א. יצירת המשתמש במערכת האימות
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          role: 'parent' // סימון תפקיד למקרה הצורך
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    // ב. יצירת פרופיל הורה בטבלת parents
    const { error: parentError } = await supabase
      .from('parents')
      .insert({
        id: authData.user.id,
        first_name: firstName,
        email: email
      });

    if (parentError) throw parentError;

    // ג. יצירת משפחה חדשה עבור ההורה בטבלת families
    const { error: familyError } = await supabase
      .from('families')
      .insert({
        parent_id: authData.user.id,
        name: 'My Family' // שם ברירת מחדל, ניתן לשינוי בהגדרות
      });

    if (familyError) throw familyError;

    return { user: authData.user, error: null };
  } catch (error) {
    console.error('Parent signup error:', error);
    return { user: null, error };
  }
}

// 2. הרשמת ילד עצמאי (ללא הורה מפקח) - התיקון הגדול
export async function signUpIndependentChild(data: {
  email: string;
  password: string;
  name: string;
  age: string;
  avatarUrl: string;
}) {
  try {
    // א. יצירת המשתמש
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role: 'child_independent'
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    // ב. יצירת פרופיל הילד בטבלת children
    // שים לב: אנחנו שולחים את כל שדות החובה, כולל linking_code שנוצר כאן
    const { error: profileError } = await supabase
      .from('children')
      .insert({
        user_id: authData.user.id,
        name: data.name,
        age: parseInt(data.age, 10), // המרה בטוחה למספר
        avatar_url: data.avatarUrl,
        linking_code: generateLinkingCode(), // יצירת קוד חובה
        is_linked: false,
        total_points: 0,
        current_step: 1,
        daily_streak: 0
        // family_id לא נשלח כי הוא אופציונלי עכשיו (NULL)
      });

    if (profileError) {
      console.error('Child profile creation failed:', profileError);
      // במצב אידיאלי היינו מוחקים את המשתמש שנוצר, אך כרגע נסתפק בהודעת שגיאה
      throw new Error('שגיאה ביצירת פרופיל הילד במסד הנתונים');
    }

    return { user: authData.user, error: null };
  } catch (error) {
    console.error('Independent child signup error:', error);
    return { user: null, error };
  }
}

// 3. התחברות כללית (מתאים גם להורה וגם לילד)
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
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

// 5. בדיקת המשתמש הנוכחי
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}