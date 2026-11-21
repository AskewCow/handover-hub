// GET /api/keepalive — called once a day by the Vercel cron in vercel.json.
// Free Supabase projects pause after a week without activity; a tiny query keeps this one awake
// so the site still works when it is opened weeks after submission.
import { createClient } from '@supabase/supabase-js';

export async function GET(): Promise<Response> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ ok: false, error: 'Supabase is not configured' }, { status: 500 });

  const { error } = await createClient(url, key).rpc('ping');
  return Response.json({ ok: !error, at: new Date().toISOString() }, { status: error ? 502 : 200 });
}
