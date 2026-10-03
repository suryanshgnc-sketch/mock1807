// Supabase Edge Function: impersonate
// Lets an admin / super_admin sign in as a STUDENT account.
// Deploy:  supabase functions deploy impersonate
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by Supabase.)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Who is calling?
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: u, error: ue } = await svc.auth.getUser(jwt);
    if (ue || !u?.user) return reply(401, { error: 'Not signed in.' });
    const caller = u.user;

    // 2. Must be admin or super_admin (moderators cannot impersonate).
    const { data: me } = await svc.from('profiles').select('role').eq('id', caller.id).maybeSingle();
    if (!me || !['admin', 'super_admin'].includes(me.role)) {
      return reply(403, { error: 'Only admins can log in as a student.' });
    }

    // 3. Target must be an existing, non-blocked STUDENT.
    const { user_id } = await req.json().catch(() => ({}));
    if (!user_id || typeof user_id !== 'string') return reply(400, { error: 'user_id is required.' });
    const { data: target } = await svc.from('profiles').select('id,role,blocked,name').eq('id', user_id).maybeSingle();
    if (!target) return reply(404, { error: 'Student not found.' });
    if ((target.role || 'student') !== 'student') return reply(403, { error: 'You can only log in as a student account, not staff.' });
    if (target.blocked) return reply(409, { error: 'This student is blocked. Unblock them first.' });

    const { data: tu, error: te } = await svc.auth.admin.getUserById(user_id);
    const email = tu?.user?.email;
    if (te || !email) return reply(404, { error: 'This student has no email on their account.' });

    // 4. One-time login token (no email is sent).
    const { data: link, error: le } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
    const token_hash = link?.properties?.hashed_token;
    if (le || !token_hash) return reply(500, { error: le?.message || 'Could not create a login token.' });

    // 5. Audit trail.
    await svc.from('admin_audit_log').insert({
      admin_user_id: caller.id,
      action: 'impersonate_start',
      target_type: 'student',
      target_id: user_id,
      details: { admin_email: caller.email, student_email: email },
    });

    return reply(200, { token_hash, email, name: target.name });
  } catch (e) {
    return reply(500, { error: (e as Error).message || 'Unexpected error.' });
  }
});
