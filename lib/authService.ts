import { supabase } from './supabase';
import { ChildProfile, ChildLoginResponse, UserProfile } from '@/types/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHILD_STORAGE_KEY = 'zoomi_child_creds';

// ==========================================
// 1. אימות הורים וילדים עצמאיים (Supabase Auth)
// ==========================================

// הרשמת הורה
export async function signUpParent(email: string, password: string, fullName: string) {
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
  return { user: data.user, error };
}

// הרשמת ילד עצמאי (פתיחת משפחה ופרופיל באופן אוטומטי ע"י הטריגר ב-DB)
export async function signUpIndependentChild(params: { 
  email: string; 
  password: string; 
  name: string; 
  age: string; // נקבל כמחרוזת ונמיר למספר
  avatarUrl?: string; 
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: { 
      data: { 
        name: params.name, 
        role: 'child_independent',
        age: parseInt(params.age) || 8, // המרה למספר
        avatarUrl: params.avatarUrl || 'default'
      } 
    }
  });
  return { user: data.user, error };
}

// התחברות רגילה (הורה או ילד עצמאי)
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data.user, error };
}

// יציאה (מוחק גם את הזיכרון של הילד המקושר אם קיים)
export async function signOut() {
  await AsyncStorage.removeItem(CHILD_STORAGE_KEY);
  await supabase.auth.signOut();
}

// קבלת פרופיל המשתמש הנוכחי (אם מחובר דרך Supabase)
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    name: data.full_name,
    role: data.role,
    familyId: data.family_id
  };
}

// ==========================================
// 2. ניהול ילדים מקושרים (פעולות הורה)
// ==========================================

// יצירת רשומת ילד חדשה (ע"י הורה מחובר)
export async function createLinkedChild(name: string, age: number, familyId: string) {
  // אנחנו מניחים שההורה כבר מחובר, ה-RLS יאכוף את ההרשאה
  const { data, error } = await supabase
    .from('children')
    .insert({
      family_id: familyId,
      name: name,
      age: age,
      is_independent: false,
      avatar_url: 'default' // אפשר לשדרג בעתיד לבחירת דמות
    })
    .select()
    .single();

  return { child: data, error };
}

// הפקת קוד צימוד (קורא לפונקציה SQL)
export async function generateLinkingCode(childId: string) {
  const { data, error } = await supabase.rpc('generate_linking_code', {
    target_child_id: childId
  });

  return { code: data, error };
}

// ==========================================
// 3. אימות ילדים מקושרים (פעולות מכשיר ילד)
// ==========================================

/**
 * שלב א': ביצוע הצימוד מול השרת
 * שולחים קוד -> מקבלים טוקן ומידע ראשוני
 */
export async function pairDeviceWithCode(code: string): Promise<ChildLoginResponse> {
  try {
    const { data, error } = await supabase.rpc('pair_device_with_code', {
      code_input: code
    });

    if (error) throw error;
    
    // הפונקציה ב-SQL מחזירה אובייקט עם שדה success
    // אם נכשל: { success: false, error: '...' }
    // אם הצליח: { success: true, child_id: '...', device_token: '...' }
    
    if (!data.success) {
      return { success: false, error: data.error || 'קוד שגוי' };
    }

    // הצימוד הצליח, כעת נשלוף את המידע המלא בעזרת הטוקן החדש
    return await getChildByToken(data.child_id, data.device_token);

  } catch (err: any) {
    console.error('Pairing failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * שלב ב': שליפת נתונים באמצעות טוקן (כניסה אוטומטית)
 */
export async function getChildByToken(childId: string, token: string): Promise<ChildLoginResponse> {
  try {
    const { data, error } = await supabase.rpc('get_child_data_by_token', {
      p_child_id: childId,
      p_token: token
    });

    if (error) throw error;
    if (!data.success) return { success: false, error: 'Auth failed' };

    const childData = data.data;
    
    // שמירת הנתונים במכשיר לשימוש עתידי (כניסה אוטומטית בפעם הבאה)
    await saveChildCredentials(childData.id, token);

    const childProfile: ChildProfile = {
      id: childData.id,
      name: childData.name,
      familyId: childData.family_id,
      avatarUrl: childData.avatar_url,
      points: childData.points,
      dailyStreak: childData.daily_streak,
      isIndependent: childData.is_independent,
      token: token // שומרים בזיכרון הנוכחי (לא ב-DB, רק ב-State)
    };

    return { success: true, child: childProfile, token };

  } catch (err: any) {
    console.error('Get child by token failed:', err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// 4. ניהול אחסון מקומי (Local Storage)
// ==========================================

async function saveChildCredentials(childId: string, token: string) {
  try {
    const jsonValue = JSON.stringify({ childId, token });
    await AsyncStorage.setItem(CHILD_STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to save child creds', e);
  }
}

export async function getStoredChildCredentials() {
  try {
    const jsonValue = await AsyncStorage.getItem(CHILD_STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    return null;
  }
}