export type UserRole = 'parent' | 'child_independent' | 'child_linked' | 'GUEST';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'parent' | 'child_independent';
  familyId?: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  familyId: string;
  avatarUrl: string;
  points: number;
  dailyStreak: number;
  isIndependent: boolean;
  // שדות שקיימים רק באפליקציה כשהילד מחובר
  token?: string; 
}

export interface AuthState {
  user: UserProfile | null;       // מלא אם זה הורה/עצמאי
  child: ChildProfile | null;     // מלא אם זה ילד מקושר
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface ChildLoginResponse {
  success: boolean;
  child?: ChildProfile;
  token?: string;
  error?: string;
}