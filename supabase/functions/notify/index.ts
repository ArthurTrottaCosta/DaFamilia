import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importJWK } from "https://deno.land/x/jose@v4.15.4/index.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
function b64u(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
function u8b64u(b: Uint8Array): string {
  return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len); let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}
function num32(n: number): Uint8Array {
  return new Uint8Array([n >> 24 & 0xff, n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff]);
}

// ── VAPID JWT ─────────────────────────────────────────────────────────────────
function vapidKeyToJWK() {
  const pub = b64u(VAPID_PUBLIC_KEY);
  const enc = (b: Uint8Array) => u8b64u(b);
  return {
    kty: 'EC', crv: 'P-256',
    d: VAPID_PRIVATE_KEY,
    x: enc(pub.slice(1, 33)),
    y: enc(pub.slice(33, 65)),
  };
}

async function makeVapidAuth(endpoint: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const privateKey = await importJWK(vapidKeyToJWK(), 'ES256');
  const jwt = await new SignJWT({ aud: audience, sub: 'mailto:admin@dafamiliaa.com.br' })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setIssuedAt().setExpirationTime('12h')
    .sign(privateKey);
  return `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;
}

// ── Web Push Encryption (RFC 8291 / RFC 8188) ─────────────────────────────────
async function encryptPayload(
  plaintext: string,
  p256dhB64u: string,
  authB64u: string
): Promise<{ body: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const enc = new TextEncoder();
  const authSecret = b64u(authB64u);
  const receiverPublicKey = b64u(p256dhB64u);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPublicKeyJWK = await crypto.subtle.exportKey('jwk', localKeyPair.publicKey);
  const lx = b64u(localPublicKeyJWK.x!); const ly = b64u(localPublicKeyJWK.y!);
  const localPublicKey = concat(new Uint8Array([0x04]), lx, ly);

  // Import receiver public key
  const receiverKey = await crypto.subtle.importKey(
    'raw', receiverPublicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverKey }, localKeyPair.privateKey, 256
  ));

  // HKDF-SHA256 for PRK (with auth secret)
  const hkdfKey = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits']);
  const prk = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: enc.encode('Content-Encoding: auth\0') },
    hkdfKey, 256
  ));

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF for CEK and nonce
  const prkKey = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits']);
  const keyInfo = concat(enc.encode('Content-Encoding: aesgcm\0'), new Uint8Array([0x00, 65]), localPublicKey, new Uint8Array([0x00, 65]), receiverPublicKey);
  const nonceInfo = concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([0x00, 65]), localPublicKey, new Uint8Array([0x00, 65]), receiverPublicKey);

  const cekBits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo }, prkKey, 128));
  const nonceBits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prkKey, 96));

  // Encrypt with AES-128-GCM (add 2-byte padding length prefix)
  const aesKey = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt']);
  const paddedPlaintext = concat(new Uint8Array([0x00, 0x00]), enc.encode(plaintext));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBits }, aesKey, paddedPlaintext
  ));

  return { body: ciphertext, salt, localPublicKey };
}

// ── Send one push notification ────────────────────────────────────────────────
async function sendPush(sub: any, payload: object): Promise<void> {
  try {
    const endpoint: string = sub.endpoint;
    if (!endpoint) { console.error('missing endpoint'); return; }
    const { keys } = sub;

    const { body, salt, localPublicKey } = await encryptPayload(
      JSON.stringify(payload), keys.p256dh, keys.auth
    );

    const auth = await makeVapidAuth(endpoint);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        'Encryption': `salt=${u8b64u(salt)}`,
        'Crypto-Key': `dh=${u8b64u(localPublicKey)};vapid`,
        'TTL': '86400',
        'Urgency': 'high',
      },
      body,
    });
    const txt = await res.text();
    console.log(`push → ${new URL(endpoint).host} [${res.status}] ${txt.slice(0, 100)}`);
    if (res.status === 404 || res.status === 410) {
      await supabase.from('push_subscriptions').delete().eq('id', sub.dbId);
    }
  } catch (e) { console.error('sendPush error:', e); }
}

async function notifyFamily(familyCode: string, payload: object, exclude?: string) {
  let q = supabase.from('push_subscriptions').select('*').eq('family_code', familyCode);
  if (exclude) q = q.neq('member_name', exclude);
  const { data, error } = await q;
  if (error) { console.error('DB:', error); return; }
  console.log(`notifyFamily ${familyCode}: ${data?.length ?? 0} subs`);
  await Promise.all((data ?? []).map((s: any) => sendPush({ ...s.subscription, dbId: s.id }, payload)));
}

async function notifyMember(familyCode: string, member: string, payload: object) {
  const { data, error } = await supabase.from('push_subscriptions')
    .select('*').eq('family_code', familyCode).eq('member_name', member);
  if (error) { console.error('DB:', error); return; }
  console.log(`notifyMember ${member}: ${data?.length ?? 0} subs`);
  await Promise.all((data ?? []).map((s: any) => sendPush({ ...s.subscription, dbId: s.id }, payload)));
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { type, data } = await req.json();
    console.log('notify:', type);

    if (type === 'nudge') {
      await notifyMember(data.family_code, data.to_member, {
        title: `👋 ${data.from_member} te cutucou!`,
        body: `${data.action === 'call' ? '📞 Ligue' : '💬 Mande mensagem'} para ${data.contact_emoji} ${data.contact_name}`,
        tag: 'nudge',
      });
    } else if (type === 'new_appointment') {
      const dateLabel = new Date(data.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      await notifyFamily(data.family_code, {
        title: `📅 Novo compromisso!`,
        body: `${data.added_by}: ${data.title} — ${dateLabel}${data.time ? ' às ' + data.time : ''}`,
        tag: 'appointment',
      }, data.added_by);
    } else if (type === 'reminder') {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const { data: appts } = await supabase.from('appointments').select('*').eq('date', tomorrow.toISOString().split('T')[0]);
      for (const a of appts ?? []) {
        await notifyFamily(a.family_code, { title: `⏰ Amanhã: ${a.title}`, body: `${a.member_name}${a.time ? ' às ' + a.time : ''}`, tag: 'reminder' });
      }
    } else if (type === 'birthdays') {
      const now = new Date();
      const mmdd = `${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const { data: members } = await supabase.from('members').select('*').not('birthday','is',null);
      for (const m of members ?? []) {
        if (m.birthday?.slice(5) === mmdd) {
          await notifyFamily(m.family_code, { title: `🎂 Aniversário!`, body: `Hoje é aniversário de ${m.name}! 🥳`, tag: 'birthday' });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('handler error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
