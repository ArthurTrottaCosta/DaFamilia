import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importJWK } from "https://deno.land/x/jose@v4.15.4/index.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Utils ─────────────────────────────────────────────────────────────────────
const enc = new TextEncoder();
function b64u(s: string): Uint8Array {
  s = s.replace(/-/g,'+').replace(/_/g,'/');
  while (s.length%4) s+='=';
  return Uint8Array.from(atob(s), c=>c.charCodeAt(0));
}
function u8b64u(b: Uint8Array): string {
  return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function concat(...arrs: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(arrs.reduce((n,a)=>n+a.length,0));
  let i=0; for(const a of arrs){out.set(a,i);i+=a.length;} return out;
}

// ── VAPID JWT ─────────────────────────────────────────────────────────────────
function vapidJWK() {
  const pub = b64u(VAPID_PUBLIC_KEY);
  return { kty:'EC', crv:'P-256', d:VAPID_PRIVATE_KEY, x:u8b64u(pub.slice(1,33)), y:u8b64u(pub.slice(33,65)) };
}
async function vapidAuth(endpoint: string): Promise<string> {
  const url = new URL(endpoint);
  const pk = await importJWK(vapidJWK(),'ES256');
  const jwt = await new SignJWT({aud:`${url.protocol}//${url.host}`, sub:'mailto:admin@dafamiliaa.com.br'})
    .setProtectedHeader({alg:'ES256',typ:'JWT'}).setIssuedAt().setExpirationTime('12h').sign(pk);
  return `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;
}

// ── HKDF helper ───────────────────────────────────────────────────────────────
async function hkdf(prk: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    {name:'HKDF', hash:'SHA-256', salt:new Uint8Array(32), info}, key, len*8
  ));
}
async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', salt, {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm));
}

// ── aes128gcm encryption (RFC 8291) ──────────────────────────────────────────
async function encrypt(plaintext: string, p256dhB64u: string, authB64u: string): Promise<Uint8Array> {
  const authSecret = b64u(authB64u);
  const receiverPubKey = b64u(p256dhB64u);

  // Local ECDH key pair
  const kp = await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const localJWK = await crypto.subtle.exportKey('jwk', kp.publicKey);
  const senderPub = concat(new Uint8Array([0x04]), b64u(localJWK.x!), b64u(localJWK.y!));

  // ECDH shared secret
  const receiverKey = await crypto.subtle.importKey('raw', receiverPubKey, {name:'ECDH',namedCurve:'P-256'}, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:receiverKey}, kp.privateKey, 256));

  // RFC 8291 key derivation
  // PRK_key = HKDF-Extract(auth_secret, ECDH_secret)
  const prkKey = await hkdfExtract(authSecret, sharedSecret);
  // key_info = "WebPush: info" + 0x00 + receiver_pub + sender_pub
  const keyInfo = concat(enc.encode('WebPush: info\0'), receiverPubKey, senderPub);
  // IKM = HKDF-Expand(PRK_key, key_info, 32)
  const ikm = await hkdf(prkKey, keyInfo, 32);

  // Salt for content encryption
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK = HKDF-Extract(salt, IKM)
  const prk = await hkdfExtract(salt, ikm);

  // CEK = HKDF-Expand(PRK, "Content-Encoding: aes128gcm\0", 16)
  const cek = await hkdf(prk, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  // Nonce = HKDF-Expand(PRK, "Content-Encoding: nonce\0", 12)
  const nonce = await hkdf(prk, enc.encode('Content-Encoding: nonce\0'), 12);

  // Encrypt: pad plaintext with 0x02 delimiter
  const ptBytes = enc.encode(plaintext);
  const padded = concat(ptBytes, new Uint8Array([0x02])); // padding delimiter
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce}, aesKey, padded));

  // RFC 8188 record format: salt(16) + rs(4) + idlen(1) + keyid(senderPub) + ciphertext
  const rs = new Uint8Array([0x00, 0x10, 0x00, 0x00]); // record size 4096
  const idlen = new Uint8Array([senderPub.length]);
  return concat(salt, rs, idlen, senderPub, ciphertext);
}

// ── Send push ─────────────────────────────────────────────────────────────────
async function sendPush(sub: any, payload: object): Promise<void> {
  try {
    const { endpoint, keys } = sub;
    if (!endpoint) { console.error('missing endpoint'); return; }
    const body = await encrypt(JSON.stringify(payload), keys.p256dh, keys.auth);
    const auth = await vapidAuth(endpoint);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body,
    });
    const txt = await res.text();
    console.log(`push → ${new URL(endpoint).host} [${res.status}] ${txt.slice(0,100)}`);
    if (res.status===404||res.status===410) {
      await supabase.from('push_subscriptions').delete().eq('id', sub.dbId);
    }
  } catch(e) { console.error('sendPush error:', e); }
}

async function notifyFamily(code: string, payload: object, exclude?: string) {
  let q = supabase.from('push_subscriptions').select('*').eq('family_code', code);
  if (exclude) q = q.neq('member_name', exclude);
  const {data,error} = await q;
  if (error) { console.error('DB:', error); return; }
  console.log(`notifyFamily ${code}: ${data?.length??0} subs`);
  await Promise.all((data??[]).map((s:any)=>sendPush({...s.subscription, dbId:s.id}, payload)));
}

async function notifyMember(code: string, member: string, payload: object) {
  const {data,error} = await supabase.from('push_subscriptions').select('*').eq('family_code',code).eq('member_name',member);
  if (error) { console.error('DB:', error); return; }
  console.log(`notifyMember ${member}: ${data?.length??0} subs`);
  await Promise.all((data??[]).map((s:any)=>sendPush({...s.subscription, dbId:s.id}, payload)));
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type'};
  if (req.method==='OPTIONS') return new Response('ok',{headers:cors});
  try {
    const {type,data} = await req.json();
    console.log('notify:', type);
    if (type==='nudge') {
      await notifyMember(data.family_code, data.to_member, {
        title:`👋 ${data.from_member} te cutucou!`,
        body:`${data.action==='call'?'📞 Ligue':'💬 Mande mensagem'} para ${data.contact_emoji} ${data.contact_name}`,
        tag:'nudge',
      });
    } else if (type==='new_appointment') {
      const dl = new Date(data.date+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
      await notifyFamily(data.family_code, {
        title:`📅 Novo compromisso!`,
        body:`${data.added_by}: ${data.title} — ${dl}${data.time?' às '+data.time:''}`,
        tag:'appointment',
      }, data.added_by);
    } else if (type==='reminder') {
      const tmr = new Date(); tmr.setDate(tmr.getDate()+1);
      const {data:appts} = await supabase.from('appointments').select('*').eq('date',tmr.toISOString().split('T')[0]);
      for (const a of appts??[]) await notifyFamily(a.family_code,{title:`⏰ Amanhã: ${a.title}`,body:`${a.member_name}${a.time?' às '+a.time:''}`,tag:'reminder'});
    } else if (type==='birthdays') {
      const now=new Date();
      const mmdd=`${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const {data:members} = await supabase.from('members').select('*').not('birthday','is',null);
      for (const m of members??[]) if (m.birthday?.slice(5)===mmdd) await notifyFamily(m.family_code,{title:`🎂 Aniversário!`,body:`Hoje é aniversário de ${m.name}! 🥳`,tag:'birthday'});
    }
    return new Response(JSON.stringify({ok:true}),{headers:{...cors,'Content-Type':'application/json'}});
  } catch(e) {
    console.error('error:', e);
    return new Response(JSON.stringify({ok:false,error:String(e)}),{status:500,headers:{...cors,'Content-Type':'application/json'}});
  }
});
