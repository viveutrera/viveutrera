import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface CreateHostRequest {
  action: 'create';
  email: string;
  displayName: string;
  active?: boolean;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Metodo no permitido.' }, 405);
  }

  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const anonKey = requiredEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('Authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'No autorizado.' }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } }
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'JWT no valido.' }, 401);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: adminProfile } = await serviceClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .eq('active', true)
      .maybeSingle();
    const { data: legacyAdminProfile } = adminProfile ? { data: adminProfile } : await serviceClient
      .from('admin_profiles')
      .select('user_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!adminProfile && !legacyAdminProfile) return json({ error: 'Solo un administrador puede gestionar anfitriones.' }, 403);

    const body = await request.json() as CreateHostRequest;
    if (body.action !== 'create') return json({ error: 'Accion no soportada.' }, 400);

    const email = body.email.trim().toLowerCase();
    const displayName = body.displayName.trim();
    if (!isValidEmail(email)) return json({ error: 'Email no valido.' }, 400);
    if (!displayName) return json({ error: 'El nombre es obligatorio.' }, 400);

    const existing = await findUserByEmail(serviceClient, email);
    const user = existing ?? await inviteHost(serviceClient, email);

    const { error: profileError } = await serviceClient
      .from('profiles')
      .upsert({
        user_id: user.id,
        email,
        display_name: displayName,
        role: 'host',
        active: body.active ?? true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    if (profileError) throw profileError;

    return json({ userId: user.id, email, displayName, invited: !existing });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'No se pudo crear el anfitrion.' }, 500);
  }
});

async function inviteHost(serviceClient: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(email);
  if (error) throw error;
  if (!data.user) throw new Error('Supabase no devolvio el usuario invitado.');
  return data.user;
}

async function findUserByEmail(serviceClient: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await serviceClient.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email);
}

function requiredEnv(key: string) {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Falta configurar ${key}.`);
  return value;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
