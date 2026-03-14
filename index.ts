// supabase/functions/notify/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return new Uint8Array(bin.split('').map(c => c.charCodeAt(0)));
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function makeVapidJwt(audience: string): Promise<string> {
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 43200,
    sub: 'mailto:admin@dafamiliaa.com.br'
  })));

  const signingInput = `${header}.${payload}`;

  // Import private key as PKCS8 (wrap raw key in proper DER structure)
  const rawKey = b64urlDecode(VAPID_PRIVATE_KEY);
  
  // PKCS8 wrapper for P-256 private key
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06,
    0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01,
    0x01, 0x04, 0x20
  ]);
  const pkcs8 = new Uint8Array(pkcs8Header.length + rawKey.length);
  pkcs8.set(pkcs8Header);
  pkcs8.set(rawKey, pkcs8Header.length);

  const privateKey = await crypto.subtle.importKey(
    'pkcs8', pkcs8,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${b64urlEncode(sig)}`;
}

async function sendPush(subscription: any, payload: object): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const endpoint = subscription.endpoint;
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;
    
    console.log("Sending push to:", url.host);
    
    const jwt = await makeVapidJwt(audience);
    const body = JSON.stringify(payload);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body,
    });

    const responseText = await res.text();
    console.log(`Push result: ${res.status}`, responseText);
    
    return { ok: res.status < 300, status: res.status, error: responseText };
  } catch (e) {
    console.error("sendPush error:", e);
    return { ok: false, error: String(e) };
  }
}

async function notifyFamily(familyCode: string, payload: object, excludeMember?: string) {
  let query = supabase.from('push_subscriptions').select('*').eq('family_code', familyCode);
  if (excludeMember) query = query.neq('member_name', excludeMember);
  const { data: subs, error } = await query;
  if (error) { console.error("DB error fetching subs:", error); return; }
  console.log(`Notifying ${subs?.length ?? 0} subscribers in family ${familyCode}`);
  if (subs) await Promise.all(subs.map((s: any) => sendPush(s.subscription, payload)));
}

async function notifyMember(familyCode: string, memberName: string, payload: object) {
  const { data: subs, error } = await supabase.from('push_subscriptions')
    .select('*').eq('family_code', familyCode).eq('member_name', memberName);
  if (error) { console.error("DB error:", error); return; }
  console.log(`Notifying member ${memberName}: ${subs?.length ?? 0} devices`);
  if (subs) await Promise.all(subs.map((s: any) => sendPush(s.subscription, payload)));
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type, data } = body;
    console.log("notify called:", type, JSON.stringify(data));

    switch (type) {
      case 'nudge':
        await notifyMember(data.family_code, data.to_member, {
          title: `👋 ${data.from_member} te cutucou!`,
          body: `${data.action === 'call' ? '📞 Ligue' : '💬 Mande mensagem'} para ${data.contact_emoji} ${data.contact_name}`,
          tag: 'nudge',
        });
        break;

      case 'new_appointment':
        await notifyFamily(data.family_code, {
          title: `📅 Novo compromisso!`,
          body: `${data.added_by}: ${data.title} — ${new Date(data.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}${data.time ? ' às ' + data.time : ''}`,
          tag: 'appointment',
        }, data.added_by);
        break;

      case 'reminder': {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const { data: appts } = await supabase.from('appointments').select('*').eq('date', tomorrowStr);
        if (appts) for (const a of appts) {
          await notifyFamily(a.family_code, {
            title: `⏰ Amanhã: ${a.title}`,
            body: `${a.member_name}${a.time ? ' às ' + a.time : ''}`,
            tag: 'reminder',
          });
        }
        break;
      }

      case 'birthdays': {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const { data: members } = await supabase.from('members').select('*').not('birthday', 'is', null);
        if (members) for (const m of members) {
          if (m.birthday?.slice(5) === `${mm}-${dd}`) {
            await notifyFamily(m.family_code, {
              title: `🎂 Aniversário hoje!`,
              body: `Hoje é aniversário de ${m.name}! 🥳`,
              tag: 'birthday',
            });
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error("Handler error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
