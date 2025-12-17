import { supabase } from './supabase';

export interface Child {
  id: string;
  family_id: string;
  user_id: string | null;
  name: string;
  age: number;
  avatar_url: string | null;
  linking_code: string;
  is_linked: boolean;
  linked_at: string | null;
  current_step: number;
  total_steps: number;
  consecutive_days: number;
  last_practice_date: string | null;
  created_at: string;
  updated_at: string;
  code_generated_date?: string;
}

export interface Family {
  id: string;
  parent_id: string;
  name: string;
  created_at: string;
}

export interface Parent {
  id: string;
  first_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AddChildData {
  name: string;
  age: number;
}

// שימו לב: הפונקציה createParentProfile נמחקה מכאן כי היא מבוצעת אוטומטית ע"י המסד נתונים

export async function getParentProfile(userId: string) {
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getFamily(parentId: string) {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('parent_id', parentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getChildren(familyId: string) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Child[];
}

export async function addChild(familyId: string, childData: AddChildData) {
  // STEP 1: Generate unique linking code for this child
  const linkingCode = await generateUniqueLinkingCode();

  // STEP 2: Insert child record into database
  const { data: childRecord, error: childError } = await supabase
    .from('children')
    .insert({
      family_id: familyId,
      name: childData.name,
      age: childData.age,
      linking_code: linkingCode,
    })
    .select()
    .single();

  if (childError) throw childError;

  const child = childRecord as Child;

  // STEP 3: Call edge function to create auth account for child
  const { data, error: functionError } = await supabase.functions.invoke('create-child-account', {
    body: {
      childId: child.id,
      name: child.name,
      age: child.age,
      familyId: child.family_id,
    },
  });

  if (functionError) {
    throw new Error('שגיאה ביצירת חשבון הילד: ' + functionError.message);
  }

  if (data?.error) {
    throw new Error('שגיאה ביצירת חשבון הילד: ' + data.error);
  }

  // STEP 4: Fetch fresh child data from database
  const { data: updatedChild, error: fetchError } = await supabase
    .from('children')
    .select('*')
    .eq('id', child.id)
    .single();

  if (fetchError) {
    console.error('Warning: Could not fetch updated child data:', fetchError);
    return child;
  }

  return updatedChild as Child;
}

async function generateUniqueLinkingCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { data } = await supabase
      .from('children')
      .select('id')
      .eq('linking_code', code)
      .maybeSingle();

    if (!data) {
      isUnique = true;
    }
  }

  return code;
}

export async function getResearchMessages() {
  const { data, error } = await supabase
    .from('research_messages')
    .select('message_key')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateChildProgress(childId: string, updates: Partial<Child>) {
  const { data, error } = await supabase
    .from('children')
    .update(updates)
    .eq('id', childId)
    .select()
    .single();

  if (error) throw error;
  return data as Child;
}

export async function deleteChild(childId: string) {
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', childId);

  if (error) throw error;
}

export async function recordParentConsent(
  parentId: string,
  childId: string,
  policyIds: string[]
) {
  const consents = policyIds.map(policyId => ({
    parent_id: parentId,
    child_id: childId,
    policy_id: policyId,
    policy_version: 1,
  }));

  const { error } = await supabase
    .from('parent_consents')
    .insert(consents);

  if (error) throw error;
}

export async function getConsentPolicies() {
  const { data, error } = await supabase
    .from('consent_policies')
    .select('*')
    .eq('is_active', true)
    .order('policy_type', { ascending: true });

  if (error) throw error;
  return data;
}

export async function linkChildWithCode(linkingCode: string) {
  // בינתיים לא משנים את זה, בשלב הבא נטפל בבעיה הזו
  console.log('[linkChildWithCode] Starting with code:', linkingCode);
  
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('*')
    .eq('linking_code', linkingCode)
    .maybeSingle();

  if (childError || !child) {
     throw new Error('קוד לא תקין');
  }

  return { ...child, isFirstLogin: false };
}

export async function getChildByUserId(userId: string) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getChildAccessCode(childId: string) {
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('linking_code, name, code_generated_date')
    .eq('id', childId)
    .single();

  if (childError) throw childError;
  if (!child) throw new Error('ילד לא נמצא');

  return { name: child.name, code: child.linking_code };
}