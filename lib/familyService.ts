import { supabase } from './supabase';

// --- Types ---

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
  linking_code?: string;
}

export interface Family {
  id: string;
  name: string;
}

export interface ResearchMessage {
  id: string;
  message_key: string;
}

// --- Helper Functions ---

/**
 * פונקציית עזר ליצירת קוד רנדומלי בן 6 תווים.
 * משתמשת בתווים ברורים כדי למנוע בלבול (ללא 0, O, 1, I).
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --- Service Functions ---

/**
 * שליפת פרטי המשפחה המקושרת למשתמש (הורה/עצמאי).
 */
export async function getFamily(userId: string): Promise<Family | null> {
  try {
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
  } catch (error) {
    console.error('Unexpected error in getFamily:', error);
    return null;
  }
}

/**
 * שליפת כל הילדים השייכים למשפחה מסוימת.
 * כולל המרה למבנה הנתונים המשמש את האפליקציה (Child Interface).
 */
export async function getChildren(familyId: string): Promise<Child[]> {
  try {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching children:', error);
      return [];
    }

    return data.map((child: any) => ({
      id: child.id,
      name: child.name,
      age: child.age,
      avatar_url: child.avatar_url,
      points: child.points || 0,
      daily_streak: child.daily_streak || 0,
      consecutive_days: child.daily_streak || 0,
      current_step: 1, // ברירת מחדל עד להטמעת מנגנון התקדמות מלא
      total_steps: 30,
      linking_code: child.linking_code
    }));
  } catch (error) {
    console.error('Unexpected error in getChildren:', error);
    return [];
  }
}

/**
 * הוספת ילד חדש למשפחה.
 * הפונקציה מייצרת קוד קישור (linking_code) באופן אוטומטי לשימוש עתידי בכניסה עם קוד.
 */
export async function addChild(familyId: string, name: string, age: number, avatarUrl: string) {
  try {
    const newCode = generateCode();
    
    const { data, error } = await supabase
      .from('children')
      .insert({
        family_id: familyId,
        name,
        age,
        avatar_url: avatarUrl,
        linking_code: newCode,
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
 * עדכון פרטי ילד קיים.
 */
export async function updateChild(childId: string, updates: Partial<Omit<Child, 'id'>>) {
  try {
    const { data, error } = await supabase
      .from('children')
      .update(updates)
      .eq('id', childId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating child:', error);
    throw error;
  }
}

/**
 * מחיקת ילד מהמערכת.
 */
export async function deleteChild(childId: string) {
  try {
    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', childId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting child:', error);
    throw error;
  }
}

/**
 * שליפת הודעות מחקר עבור ההורה.
 */
export async function getResearchMessages(): Promise<ResearchMessage[]> {
  try {
    // כרגע מחזיר הודעות דמי (Mock Data) עד להקמת טבלת הודעות ייעודית במסד הנתונים
    return [
      { id: '1', message_key: 'research.msg1' },
      { id: '2', message_key: 'research.msg2' },
      { id: '3', message_key: 'research.msg3' }
    ];
  } catch (error) {
    console.error('Error fetching research messages:', error);
    return [];
  }
}