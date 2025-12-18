import { supabase } from './supabase';
import { ChildProfile, ChildLoginResponse, UserProfile } from '@/types/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHILD_STORAGE_KEY = 'zoomi_child_creds';

// ==========================================
// 1. אימות הורים (רגיל - אימייל/סיסמה)
// ==========================================

export async function signUpParent(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: fullName, role: 'parent' } }
  });
  return { user: data.user, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data.user, error };
}

export async function signOut() {
  // ניקוי כפול: גם Supabase וגם האחסון המקומי של הילד
  await AsyncStorage.removeItem(CHILD_STORAGE_KEY);
  await supabase.auth.signOut();
}

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
// 2. אימות ילדים (צימוד מכשיר)
// ==========================================

/**
 * שלב א': ביצוע הצימוד מול השרת
 * שולחים קוד -> מקבלים טוקן
 */
export async function pairDeviceWithCode(code: string): Promise<ChildLoginResponse> {
  try {
    const { data, error } = await supabase.rpc('pair_device_with_code', {
      code_input: code
    });

    if (error) throw error;
    if (!data.success) return { success: false, error: data.error };

    // בשלב זה הצימוד הצליח, אבל אנחנו צריכים לשלוף את פרטי הילד המלאים
    // נשתמש בטוקן שקיבלנו הרגע
    return await getChildByToken(data.child_id, data.device_token);

  } catch (err: any) {
    console.error('Pairing failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * שלב ב': שליפת נתונים באמצעות טוקן (כניסה יומיומית)
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
    
    // שמירת הנתונים במכשיר לשימוש עתידי
    await saveChildCredentials(childData.id, token);

    const childProfile: ChildProfile = {
      id: childData.id,
      name: childData.name,
      familyId: childData.family_id,
      avatarUrl: childData.avatar_url,
      points: childData.points,
      dailyStreak: childData.daily_streak,
      isIndependent: childData.is_independent,
      token: token // שומרים בזיכרון הנוכחי
    };

    return { success: true, child: childProfile, token };

  } catch (err: any) {
    console.error('Get child by token failed:', err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// 3. ניהול אחסון מקומי (Local Storage)
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