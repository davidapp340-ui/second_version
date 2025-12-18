/**
 * הגדרות טיפוסים למערכת האימות והמשתמשים
 * קובץ זה משמש כ"מקור האמת" למבנה הנתונים באפליקציה
 */

// 1. תפקידים במערכת (Internal App Roles)
// אלו המצבים האפשריים של המשתמש הנוכחי באפליקציה
export type UserAppRole = 
  | 'GUEST'              // אורח (לא מחובר)
  | 'PARENT'             // הורה מחובר
  | 'INDEPENDENT_CHILD'  // ילד עצמאי (עם אימייל)
  | 'LINKED_CHILD';      // ילד מקושר (נכנס עם קוד)

// 2. מבנה פרופיל משתמש (הורה או ילד עצמאי)
// זהה לטבלת profiles ב-DB
export interface UserProfile {
  id: string;            // המזהה של ה-Auth User
  email: string;
  full_name: string;
  family_id: string;
  role: 'parent' | 'child_independent'; // התפקיד כפי ששמור ב-DB
  created_at: string;
}

// 3. מבנה פרופיל ילד (מקושר או עצמאי)
// זהה לטבלת children ב-DB
export interface ChildProfile {
  id: string;
  family_id: string;
  user_id?: string | null; // יהיה מלא רק אם זה ילד עצמאי
  name: string;
  age: number;
  avatar_url: string;
  points: number;
  daily_streak: number;
  is_independent: boolean;
  // שדות לשימוש ההורה בלבד (לא רלוונטי לילד עצמו)
  linking_code?: string;
  linking_code_expires_at?: string;
}

// 4. התשובה שמקבלים מהשרת בעת בדיקת קוד
export interface ChildLoginResponse {
  child: ChildProfile | null;
  error: string | null;
}