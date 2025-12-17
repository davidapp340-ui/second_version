import { supabase } from './supabase';

export interface Child {
  id: string;
  name: string;
  age: number;
  avatar_url: string;
  points: number;
  daily_streak: number;
  current_step?: number;
  total_steps?: number;
  consecutive_days: number;
  linking_code?: string; // השדה החדש
}

export interface Family {
  id: string;
  name: string;
}

export interface ResearchMessage {
  id: string;
  message_key: string;
}

// פונקציית עזר ליצירת קוד רנדומלי (6 תווים)
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // אותיות ברורות בלבד
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * קבלת פרטי המשפחה של ההורה
 */
export async function getFamily(userId: string): Promise<Family | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('family:families(*)')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching family:', error);
    return null;
  }

  return data?.family as unknown as Family;
}

/**
 * קבלת רשימת הילדים במשפחה
 */
export async function getChildren(familyId: string): Promise<Child[]> {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching children:', error);
    return [];
  }

  // ממירים את המידע הגולמי למבנה הטיפוס שלנו
  return data.map((child: any) => ({
    id: child.id,
    name: child.name,
    age: child.age,
    avatar_url: child.avatar_url,
    points: child.points || 0,
    daily_streak: child.daily_streak || 0,
    consecutive_days: child.daily_streak || 0, // לשימוש בתצוגה
    current_step: 1, // נתונים זמניים עד שיהיה מנגנון התקדמות מלא
    total_steps: 30,
    linking_code: child.linking_code
  }));
}

/**
 * הוספת ילד חדש למשפחה - כולל יצירת קוד!
 */
export async function addChild(familyId: string, name: string, age: number, avatarUrl: string) {
  try {
    const newCode = generateCode(); // יצירת הקוד
    
    const { data, error } = await supabase
      .from('children')
      .insert({
        family_id: familyId,
        name,
        age,
        avatar_url: avatarUrl,
        linking_code: newCode, // שמירת הקוד במסד הנתונים
        is_independent: false,
        points: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding child:', error);
    throw error;
  }
}

/**
 * מחיקת ילד
 */
export async function deleteChild(childId: string) {
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', childId);

  if (error) {
    console.error('Error deleting child:', error);
    throw error;
  }
}

/**
 * הודעות מחקר (Placeholder)
 */
export async function getResearchMessages(): Promise<ResearchMessage[]> {
  // כרגע נחזיר הודעות דמי, בהמשך זה יבוא מהמסד
  return [
    { id: '1', message_key: 'research.msg1' },
    { id: '2', message_key: 'research.msg2' }
  ];
}