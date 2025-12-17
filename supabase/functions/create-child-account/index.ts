import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { childId, name, age, familyId } = await req.json();

    if (!childId || !name || !familyId) {
      throw new Error('Missing required fields');
    }

    // 1. Create Auth User for the child
    const email = `child_${childId}@zoomi.local`;
    const password = `zoomi_child_${childId}`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: name, age: age, role: 'child', family_id: familyId }
    });

    if (authError) throw authError;

    // 2. Link the existing Child record to the new Auth User
    // CORRECTED: Using valid columns only (no 'is_linked' or 'linked_at')
    const { error: updateError } = await supabase
      .from('children')
      .update({
        user_id: authData.user.id,
        // We assume existence of user_id implies linked status in the app logic
      })
      .eq('id', childId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});