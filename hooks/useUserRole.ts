import { useAuth } from './useAuth';
import { UserAppRole } from '@/types/auth';

/**
 * useUserRole
 * הוק זה מתרגם את מצב האימות המורכב (Session vs Linked Child)
 * לתפקיד יחיד וברור שקל לעבוד איתו באפליקציה.
 */
export function useUserRole(): { role: UserAppRole; loading: boolean } {
  const { session, profile, linkedChild, loading } = useAuth();

  // בזמן טעינה, אנחנו לא יודעים עדיין מי המשתמש
  if (loading) {
    return { role: 'GUEST', loading: true };
  }

  // 1. בדיקת הורה או ילד עצמאי (מחוברים עם סופרבייס)
  if (session && profile) {
    if (profile.role === 'parent') {
      return { role: 'PARENT', loading: false };
    }
    if (profile.role === 'child_independent') {
      return { role: 'INDEPENDENT_CHILD', loading: false };
    }
  }

  // 2. בדיקת ילד מקושר (מחובר לוקאלית)
  if (linkedChild) {
    return { role: 'LINKED_CHILD', loading: false };
  }

  // 3. ברירת מחדל: אורח
  return { role: 'GUEST', loading: false };
}