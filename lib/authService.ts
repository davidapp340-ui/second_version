import { supabase } from './supabase';

// --- Helper Functions ---

function generateLinkingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --- Auth & Registration Logic ---

// 1. Parent Registration Logic
export async function signUpParent(email: string, password: string, fullName: string) {
  try {
    // A. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: fullName, role: 'parent' } }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned from Auth');

    // B. Create Family (The container)
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .insert({ name: `משפחת ${fullName}` })
      .select()
      .single();

    if (familyError) throw familyError;

    // C. Create Parent Profile (Linked to Family)
    const { error: parentError } = await supabase
      .from('parents')
      .insert({
        id: authData.user.id,
        family_id: familyData.id,
        name: fullName,
        email: email
      });

    if (parentError) throw parentError;

    return { user: authData.user, error: null };
  } catch (error) {
    console.error('Parent signup logic failed:', error);
    return { user: null, error };
  }
}

// 2. Independent Child Registration Logic
export async function signUpIndependentChild(data: {
  email: string;
  password: string;
  name: string;
  age: string;
  avatarUrl: string;
}) {
  try {
    // A. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { role: 'child_independent' } }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    // B. Create Child Profile
    // NOTE: We only send fields that exist in the 'children' table schema
    const { error: profileError } = await supabase
      .from('children')
      .insert({
        user_id: authData.user.id,
        name: data.name,
        age: parseInt(data.age, 10),
        avatar_url: data.avatarUrl,
        linking_code: generateLinkingCode(),
        is_independent: true,
        points: 0,
        daily_streak: 0
        // family_id is NULL for independent child initially
      });

    if (profileError) throw profileError;

    return { user: authData.user, error: null };
  } catch (error) {
    console.error('Independent child signup failed:', error);
    return { user: null, error };
  }
}

// 3. General Sign In
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { user: null, error };
  }
}

// 4. Sign Out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Sign out error:', error);
}