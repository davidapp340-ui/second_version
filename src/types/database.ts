export type UserRole = 'parent' | 'child_independent';

// מבנה של משפחה
export interface Family {
  id: string;
  name: string;
  created_at: string;
}

// מבנה של פרופיל (הורה או ילד עצמאי - מי שיש לו Auth)
export interface Profile {
  id: string; // זהה ל-auth.uid
  family_id: string;
  role: UserRole;
  email: string | null;
  created_at: string;
}

// מבנה של ילד (הישות שמשחקת באפליקציה)
export interface Child {
  id: string;
  family_id: string;
  user_id: string | null; // null אם זה ילד מקושר
  name: string;
  avatar_url: string | null;
  created_at: string;
  // שדות לוגיים לשימוש באפליקציה (לא בהכרח נשלפים תמיד)
  linking_code?: string;
}