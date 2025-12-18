import React from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { UserAppRole } from '@/types/auth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserAppRole[]; // מי מורשה לראות את זה?
  fallback?: React.ReactNode;  // (אופציונלי) מה להציג אם אין הרשאה? למשל הודעה או כלום
}

/**
 * רכיב אבטחה המציג את תוכנו רק למשתמשים בעלי תפקיד מתאים.
 * דוגמה לשימוש:
 * <RoleGuard allowedRoles={['PARENT']}>
 * <DeleteButton />
 * </RoleGuard>
 */
export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { role, loading } = useUserRole();

  // בזמן טעינה לא מציגים כלום כדי למנוע הבהובים
  if (loading) {
    return null; 
  }

  // אם התפקיד הנוכחי נמצא ברשימת המורשים -> הצג את התוכן
  if (allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  // אחרת -> הצג את ה-fallback (בדרך כלל כלום)
  return <>{fallback}</>;
}