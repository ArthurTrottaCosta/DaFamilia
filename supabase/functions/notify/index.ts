// supabase/functions/notify/index.ts
// Deploy: supabase functions deploy notify

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── VAPID signing ─────────────────────────────────────────────────────────────
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

function b64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signVapid(audience: string): Promise<string> {
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience, exp: now + 12 * 3600, sub: 'mailto:admin@dafamiliaa.com.br'
  })));
  const signing = `${header}.${payload}`;
  const keyData = b64urlDecode(VAPID_PRIVATE_KEY);
  const privateKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signing)
  );
  return `${signing}.${b64urlEncode(sig)}`;
}

// ── Send one push notification ────────────────────────────────────────────────
async function sendPush(subscription: any, payload: object): Promise<boolean> {
  try {
    const endpoint = subscription.endpoint;
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await signVapid(audience);

    const body = JSON.stringify(payload);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body,
    });
    return res.status < 300;
  } catch {
    return false;
  }
}

// ── Notify all members of a family ───────────────────────────────────────────
async function notifyFamily(familyCode: string, payload: object, excludeMember?: string) {
  let query = supabase.from('push_subscriptions').select('*').eq('family_code', familyCode);
  if (excludeMember) query = query.neq('member_name', excludeMember);
  const { data: subs } = await query;
  if (!subs) return;
  await Promise.all(subs.map((s: any) => sendPush(s.subscription, payload)));
}

// ── Notify a specific member ──────────────────────────────────────────────────
async function notifyMember(familyCode: string, memberName: string, payload: object) {
  const { data: subs } = await supabase.from('push_subscriptions')
    .select('*').eq('family_code', familyCode).eq('member_name', memberName);
  if (!subs) return;
  await Promise.all(subs.map((s: any) => sendPush(s.subscription, payload)));
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });

  const { type, data } = await req.json();

  switch (type) {
    // 👋 Nudge received
    case 'nudge': {
      await notifyMember(data.family_code, data.to_member, {
        title: `👋 ${data.from_member} te cutucou!`,
        body: `${data.action === 'call' ? '📞 Ligue' : '💬 Mande mensagem'} para ${data.contact_emoji} ${data.contact_name}`,
        tag: 'nudge',
        url: '/',
      });
      break;
    }
    // 📅 New appointment added
    case 'new_appointment': {
      await notifyFamily(data.family_code, {
        title: `📅 Novo compromisso da família!`,
        body: `${data.added_by} adicionou: ${data.title} — ${new Date(data.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}${data.time ? ' às ' + data.time : ''}`,
        tag: 'appointment',
        url: '/',
      }, data.added_by);
      break;
    }
    // 📅 Appointment reminder (1 day before) — call via cron
    case 'reminder': {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const { data: appts } = await supabase.from('appointments')
        .select('*').eq('date', tomorrowStr);
      if (appts) {
        for (const appt of appts) {
          await notifyFamily(appt.family_code, {
            title: `⏰ Lembrete de amanhã!`,
            body: `${appt.title} — ${appt.member_name}${appt.time ? ' às ' + appt.time : ''}`,
            tag: 'reminder',
            url: '/',
          });
        }
      }
      break;
    }
    // 🎂 Birthday today — call via cron
    case 'birthdays': {
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const { data: members } = await supabase.from('members')
        .select('*').not('birthday', 'is', null);
      if (members) {
        for (const m of members) {
          const bday = m.birthday?.slice(5); // MM-DD
          if (bday === `${mm}-${dd}`) {
            await notifyFamily(m.family_code, {
              title: `🎂 Aniversário hoje!`,
              body: `Hoje é aniversário de ${m.name}! Manda uma mensagem 🥳`,
              tag: 'birthday',
              url: '/',
            });
          }
        }
      }
      break;
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
});
