import { supabase } from './supabase';

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export async function signUpWithEmail(data: SignUpData) {
  const { email, password, firstName } = data;

  // אנחנו שולחים את השם וסוג המשתמש ישירות ביצירת החשבון
  // הטריגר במסד הנתונים יזהה זאת ויצור את הפרופיל והמשפחה אוטומטית
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        user_type: 'parent',
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!authData.user) {
    throw new Error('Failed to create user account');
  }

  return authData;
}

export async function signInWithEmail(data: SignInData) {
  const { email, password } = data;

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return authData;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  const { clearChildSession } = await import('./sessionService');
  await clearChildSession();
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

export interface SignUpChildData {
  email: string;
  password: string;
  firstName: string;
  age: number;
}

export async function signUpChildIndependent(data: SignUpChildData) {
  const { email, password, firstName, age } = data;

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        age,
        user_type: 'child_independent',
      },
    },
  });

  if (error) {
    throw error;
  }

  return authData;
}

export async function signInChildIndependent(data: SignInData) {
  const { email, password } = data;

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return authData;
}

export async function signInWithGoogle(userType: 'parent' | 'child_independent') {
  const redirectTo = `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signInWithFacebook(userType: 'parent' | 'child_independent') {
  const redirectTo = `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function handleOAuthCallback(userType: 'parent' | 'child_independent') {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('No user found after OAuth');
  }

  const firstName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
  const email = user.email || '';

  if (userType === 'parent') {
    const { createParentProfile } = await import('./familyService');
    try {
      await createParentProfile(user.id, firstName, email);
    } catch (error: any) {
      if (error.message?.includes('Profile already exists')) {
        console.log('Parent profile already exists, continuing...');
      } else {
        console.error('Failed to create parent profile during OAuth:', error);
        throw error;
      }
    }
  }

  return user;
}