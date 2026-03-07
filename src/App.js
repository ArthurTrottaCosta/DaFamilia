import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://szjwvmfwikruczkvbcpy.supabase.co",
  "sb_publishable_px91bnDnthtn-2R6-WuTVQ_ecukGXuY"
);

function generateCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
function formatPhone(v) {
  const n = v.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}
function formatDate(ts) { return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); }
function rawPhone(p) { return p.replace(/\D/g, ""); }
async function hashPassword(password) {
  const encoded = new TextEncoder().encode(password + "dafamilia_salt_2024");
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const MEMBER_COLORS = ["#b85e22","#2563eb","#16a34a","#9333ea","#dc2626","#0891b2","#d97706","#be185d"];
function memberColor(name) {
  if (!name) return "#b85e22";
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function getTheme(dark) {
  return dark ? {
    bg: "radial-gradient(ellipse at 25% 0%,#1a1008 0%,#0f0a04 50%,#1a1410 100%)",
    card: "rgba(40,25,10,.85)", cardBorder: "rgba(100,60,20,.35)",
    text: "#f0d8b0", textSub: "#b09060", textMuted: "#7a6040",
    header: "rgba(15,10,4,.97)", input: "rgba(30,18,6,.9)", inputBorder: "#5a3c18",
    accent: "#d4783a", accentDark: "#a85c28", tabBar: "rgba(15,10,4,.97)",
    modalBg: "#1a1008", pill: "rgba(212,120,58,.15)",
  } : {
    bg: "radial-gradient(ellipse at 25% 0%,#f7e4c4 0%,#fdf7ee 50%,#ede4d4 100%)",
    card: "rgba(255,255,255,.8)", cardBorder: "rgba(210,170,110,.3)",
    text: "#1e1006", textSub: "#7a5228", textMuted: "#9a6c3a",
    header: "rgba(253,247,238,.97)", input: "rgba(255,255,255,.9)", inputBorder: "#e0c9a8",
    accent: "#b85e22", accentDark: "#8f4214", tabBar: "rgba(253,247,238,.97)",
    modalBg: "#fdf6ed", pill: "rgba(184,94,34,.1)",
  };
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  const cb = useCallback(onClose, [onClose]);
  useEffect(() => { const t = setTimeout(cb, 3000); return () => clearTimeout(t); }, [cb]);
  return <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: "#1a0f00", color: "#fdf0e0", padding: "11px 22px", borderRadius: 50, fontSize: 13, zIndex: 9999, whiteSpace: "nowrap", boxShadow: "0 6px 28px rgba(0,0,0,.45)", pointerEvents: "none" }}>{msg}</div>;
}

// ── Loader ────────────────────────────────────────────────────────────────────
function Loader({ text, dark }) {
  const t = getTheme(dark);
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: dark ? "rgba(15,10,4,.95)" : "rgba(253,247,238,.95)", zIndex: 9998, gap: 14 }}>
      <div style={{ fontSize: 44, animation: "spin 1s linear infinite" }}>🏡</div>
      {text && <p style={{ fontFamily: "Georgia,serif", fontSize: 14, color: t.textMuted }}>{text}</p>}
    </div>
  );
}

// ── How To Use ────────────────────────────────────────────────────────────────
const HOW_TO_STEPS = [
  { emoji: "🏡", title: "Crie ou entre em uma família", desc: "Crie sua família com uma senha e compartilhe o código de 6 letras com os membros. Cada família tem sua própria agenda." },
  { emoji: "📒", title: "Adicione contatos da família", desc: "Salve o mecânico do pai, a médica de confiança, a pizzaria favorita. Qualquer contato que a família toda precisa conhecer." },
  { emoji: "✏️", title: "Edite e descreva os contatos", desc: "Adicione descrições como 'atende aos sábados' ou 'aceita Pix'. Registre interações com data e valor para ter um histórico." },
  { emoji: "📌", title: "Fixe os mais importantes", desc: "Dentro de um contato, toque em Fixar para deixá-lo no topo da lista. Ótimo para os contatos de emergência." },
  { emoji: "👋", title: "Cutucada", desc: "Abra um contato e toque em Cutucar para avisar alguém da família para ligar ou mandar mensagem para aquele contato." },
  { emoji: "📅", title: "Calendário compartilhado", desc: "Registre compromissos para qualquer membro da família. Filtre por pessoa e veja quem adicionou cada evento." },
];

function HowToModal({ onClose, dark }) {
  const [step, setStep] = useState(0);
  const t = getTheme(dark);
  const isLast = step === HOW_TO_STEPS.length - 1;
  const s = HOW_TO_STEPS[step];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 24, backdropFilter: "blur(6px)" }}>
      <div style={{ background: t.modalBg, borderRadius: 28, padding: "36px 28px 28px", width: "100%", maxWidth: 380, boxShadow: "0 24px 80px rgba(0,0,0,.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{s.emoji}</div>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 22, fontWeight: 800, color: t.text, marginBottom: 10 }}>{s.title}</h2>
          <p style={{ fontFamily: "Georgia,serif", fontSize: 15, color: t.textSub, lineHeight: 1.65 }}>{s.desc}</p>
        </div>
        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
          {HOW_TO_STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{ width: i === step ? 20 : 7, height: 7, borderRadius: 10, background: i === step ? t.accent : t.inputBorder, cursor: "pointer", transition: "all .2s" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: "13px", borderRadius: 14, border: `1.5px solid ${t.inputBorder}`, background: "transparent", color: t.textSub, fontSize: 14, cursor: "pointer" }}>← Anterior</button>}
          <button onClick={() => isLast ? onClose() : setStep(s => s + 1)} style={{ flex: 2, padding: "13px", borderRadius: 14, border: "none", background: `linear-gradient(135deg,${t.accent},${t.accentDark})`, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 16px ${t.accent}55` }}>
            {isLast ? "Começar! 🏡" : "Próximo →"}
          </button>
        </div>
        <button onClick={onClose} style={{ display: "block", width: "100%", marginTop: 12, background: "none", border: "none", color: t.textMuted, fontSize: 12, cursor: "pointer" }}>Pular tutorial</button>
      </div>
    </div>
  );
}

// ── Nudge Banner ──────────────────────────────────────────────────────────────
function NudgeBanner({ nudges, onDismiss }) {
  const n = nudges[0]; if (!n) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, zIndex: 2000, background: "linear-gradient(135deg,#b85e22,#8f4214)", padding: "16px 18px 18px", boxShadow: "0 8px 32px rgba(0,0,0,.3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <p style={{ color: "rgba(255,255,255,.8)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px" }}>👋 {n.from_member} quer que você:</p>
          <p style={{ color: "#fff", fontFamily: "Georgia,serif", fontSize: 17, fontWeight: 700, marginTop: 4 }}>{n.action === "call" ? "📞 Ligue" : "💬 Mande mensagem"} para {n.contact_emoji} {n.contact_name}</p>
        </div>
        <button onClick={() => onDismiss(n.id)} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {n.action === "call"
          ? <a href={`tel:${rawPhone(n.contact_phone)}`} onClick={() => onDismiss(n.id)} style={{ flex: 1, padding: "11px", borderRadius: 12, background: "rgba(255,255,255,.2)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14, textAlign: "center", border: "1.5px solid rgba(255,255,255,.4)" }}>📞 Ligar agora</a>
          : <a href={`https://wa.me/55${rawPhone(n.contact_phone)}`} target="_blank" rel="noreferrer" onClick={() => onDismiss(n.id)} style={{ flex: 1, padding: "11px", borderRadius: 12, background: "rgba(255,255,255,.2)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14, textAlign: "center", border: "1.5px solid rgba(255,255,255,.4)" }}>💬 WhatsApp agora</a>}
        <button onClick={() => onDismiss(n.id)} style={{ padding: "11px 16px", borderRadius: 12, background: "transparent", color: "rgba(255,255,255,.7)", border: "1.5px solid rgba(255,255,255,.2)", fontSize: 13, cursor: "pointer" }}>Depois</button>
      </div>
      {nudges.length > 1 && <p style={{ color: "rgba(255,255,255,.6)", fontSize: 11, marginTop: 8, textAlign: "center" }}>+{nudges.length - 1} cutucada{nudges.length - 1 > 1 ? "s" : ""} pendente{nudges.length - 1 > 1 ? "s" : ""}</p>}
    </div>
  );
}

// ── Nudge Modal ───────────────────────────────────────────────────────────────
function NudgeModal({ contact, members, currentMember, familyCode, onClose, onSent, dark }) {
  const [target, setTarget] = useState(""); const [action, setAction] = useState("call"); const [sending, setSending] = useState(false);
  const t = getTheme(dark);
  const others = members.filter(m => m.name !== currentMember);
  async function send() {
    if (!target || sending) return; setSending(true);
    await supabase.from("nudges").insert({ family_code: familyCode, from_member: currentMember, to_member: target, contact_id: contact.id, contact_name: contact.name, contact_phone: contact.phone, contact_emoji: contact.emoji, action, seen: false });
    setSending(false); onSent(`Cutucada enviada para ${target}! 👋`); onClose();
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(4px)" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: t.modalBg, borderRadius: "26px 26px 0 0", padding: "24px 18px 40px", width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: t.inputBorder, borderRadius: 4, margin: "0 auto 20px" }} />
        <h2 style={{ fontFamily: "Georgia,serif", fontSize: 21, color: t.text, marginBottom: 6, fontWeight: 700 }}>👋 Cutucar alguém</h2>
        <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 20, lineHeight: 1.5 }}>Notificar alguém para entrar em contato com {contact.emoji} <strong>{contact.name}</strong>.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setAction("call")} style={{ padding: "13px", borderRadius: 14, border: action === "call" ? `2px solid ${t.accent}` : `2px solid ${t.inputBorder}`, background: action === "call" ? `${t.accent}18` : t.input, cursor: "pointer", fontWeight: 700, fontSize: 14, color: action === "call" ? t.accent : t.textSub }}>📞 Ligar</button>
          <button onClick={() => setAction("whatsapp")} style={{ padding: "13px", borderRadius: 14, border: action === "whatsapp" ? "2px solid #25d366" : `2px solid ${t.inputBorder}`, background: action === "whatsapp" ? "rgba(37,211,102,.1)" : t.input, cursor: "pointer", fontWeight: 700, fontSize: 14, color: action === "whatsapp" ? "#16a34a" : t.textSub }}>💬 WhatsApp</button>
        </div>
        <p style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Quem cutucar?</p>
        {others.length === 0 ? <p style={{ fontFamily: "Georgia,serif", fontSize: 14, color: t.textMuted, fontStyle: "italic", marginBottom: 20 }}>Nenhum outro membro ainda.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {others.map((m, i) => (
                <button key={i} onClick={() => setTarget(m.name)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: 14, border: target === m.name ? `2px solid ${t.accent}` : `2px solid ${t.inputBorder}`, background: target === m.name ? `${t.accent}18` : t.input, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: memberColor(m.name), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{m.name[0].toUpperCase()}</div>
                  <span style={{ fontFamily: "Georgia,serif", fontSize: 16, color: t.text, fontWeight: target === m.name ? 700 : 400 }}>{m.name}</span>
                  {target === m.name && <span style={{ marginLeft: "auto", color: t.accent }}>✓</span>}
                </button>
              ))}
            </div>}
        <button onClick={send} disabled={!target || sending} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: target ? `linear-gradient(135deg,${t.accent},${t.accentDark})` : t.inputBorder, color: target ? "#fff" : t.textMuted, fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17, cursor: target ? "pointer" : "not-allowed" }}>{sending ? "Enviando..." : "👋 Cutucar!"}</button>
      </div>
    </div>
  );
}

// ── Emoji Picker ──────────────────────────────────────────────────────────────
function EmojiPicker({ value, onChange, dark }) {
  const t = getTheme(dark);
  const SUGGESTIONS = ["⭐","🔧","🏥","🍕","🚗","💇","⚖️","💊","🏫","🏦","🐾","🌿","💪","🎨","📦","🏠"];
  function handleInput(e) {
    const chars = [...e.target.value].filter(c => c.codePointAt(0) > 255);
    if (chars.length > 0) onChange(chars[0]);
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 11, color: t.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".5px" }}>Ícone do contato</p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: t.input, borderRadius: 14, border: `1.5px solid ${t.inputBorder}`, padding: "10px 14px", marginBottom: 8 }}>
        <span style={{ fontSize: 38, lineHeight: 1 }}>{value}</span>
        <div style={{ flex: 1 }}>
          <input value="" onChange={handleInput} placeholder="Digite ou cole um emoji aqui 😊" style={{ width: "100%", border: "none", background: "transparent", fontSize: 15, fontFamily: "Georgia,serif", color: t.text, outline: "none" }} />
          <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>No celular: toque em 🌐 ou 😊 no teclado</p>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {SUGGESTIONS.map(e => (
          <button key={e} onClick={() => onChange(e)} style={{ width: 38, height: 38, borderRadius: 10, border: value === e ? `2px solid ${t.accent}` : `1.5px solid ${t.inputBorder}`, background: value === e ? `${t.accent}18` : t.input, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{e}</button>
        ))}
      </div>
    </div>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ family, dark, onToggleDark, onClose, onToast, onFamilyUpdate, onShowHowTo }) {
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(family.name);
  const [editPass, setEditPass] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [saving, setSaving] = useState(false);
  const t = getTheme(dark);
  const fS2 = { width: "100%", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${t.inputBorder}`, background: t.input, fontFamily: "Georgia,serif", fontSize: 15, color: t.text, marginBottom: 10, outline: "none", boxSizing: "border-box" };

  async function saveName() {
    if (!newName.trim()) return; setSaving(true);
    await supabase.from("families").update({ name: newName.trim() }).eq("code", family.code);
    onFamilyUpdate({ ...family, name: newName.trim() });
    setEditName(false); setSaving(false); onToast("Nome atualizado! ✅");
  }

  async function savePass() {
    if (!oldPass || !newPass) return; setSaving(true);
    const hashedOld = await hashPassword(oldPass);
    if (hashedOld !== family.password) { setSaving(false); onToast("Senha atual incorreta ❌"); return; }
    const hashedNew = await hashPassword(newPass);
    await supabase.from("families").update({ password: hashedNew }).eq("code", family.code);
    onFamilyUpdate({ ...family, password: hashedNew });
    setEditPass(false); setOldPass(""); setNewPass(""); setSaving(false); onToast("Senha atualizada! ✅");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: t.modalBg, borderRadius: "26px 26px 0 0", padding: "24px 18px 40px", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: t.inputBorder, borderRadius: 4, margin: "0 auto 20px" }} />
        <h2 style={{ fontFamily: "Georgia,serif", fontSize: 22, color: t.text, marginBottom: 20, fontWeight: 700 }}>⚙️ Menu</h2>

        {/* Quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <button onClick={() => { onToggleDark(); }} style={{ padding: "14px", borderRadius: 14, border: `1.5px solid ${t.inputBorder}`, background: t.card, cursor: "pointer", fontSize: 13, color: t.text, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 24 }}>{dark ? "☀️" : "🌙"}</span>{dark ? "Modo claro" : "Modo escuro"}
          </button>
          <button onClick={() => { onClose(); setTimeout(onShowHowTo, 150); }} style={{ padding: "14px", borderRadius: 14, border: `1.5px solid ${t.inputBorder}`, background: t.card, cursor: "pointer", fontSize: 13, color: t.text, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
            data-menu-howto="1">
            <span style={{ fontSize: 24 }}>❓</span>Como usar
          </button>
        </div>

        {/* Family name */}
        <div style={{ background: t.card, borderRadius: 16, padding: "16px 18px", marginBottom: 12, border: `1px solid ${t.cardBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editName ? 12 : 0 }}>
            <div>
              <p style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, color: t.text }}>🏡 Nome da família</p>
              <p style={{ fontSize: 13, color: t.textSub, marginTop: 2 }}>{family.name}</p>
            </div>
            <button onClick={() => setEditName(!editName)} style={{ background: `${t.accent}18`, border: "none", borderRadius: 10, padding: "7px 13px", fontSize: 13, color: t.accent, cursor: "pointer", fontWeight: 600 }}>✏️ Editar</button>
          </div>
          {editName && (
            <div>
              <input value={newName} onChange={e => setNewName(e.target.value)} style={fS2} />
              <button onClick={saveName} disabled={saving} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${t.accent},${t.accentDark})`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          )}
        </div>

        {/* Password */}
        <div style={{ background: t.card, borderRadius: 16, padding: "16px 18px", marginBottom: 12, border: `1px solid ${t.cardBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editPass ? 12 : 0 }}>
            <div>
              <p style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, color: t.text }}>🔒 Senha da família</p>
              <p style={{ fontSize: 13, color: t.textSub, marginTop: 2 }}>••••••••</p>
            </div>
            <button onClick={() => setEditPass(!editPass)} style={{ background: `${t.accent}18`, border: "none", borderRadius: 10, padding: "7px 13px", fontSize: 13, color: t.accent, cursor: "pointer", fontWeight: 600 }}>✏️ Alterar</button>
          </div>
          {editPass && (
            <div>
              <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="Senha atual" style={fS2} />
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Nova senha" style={fS2} />
              <button onClick={savePass} disabled={saving} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${t.accent},${t.accentDark})`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          )}
        </div>

        {/* Family code */}
        <div style={{ background: t.card, borderRadius: 16, padding: "16px 18px", border: `1px solid ${t.cardBorder}` }}>
          <p style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 4 }}>🔑 Código da família</p>
          <p style={{ fontFamily: "Georgia,serif", fontSize: 26, fontWeight: 800, color: t.accent, letterSpacing: "5px" }}>{family.code}</p>
          <p style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>Compartilhe com os membros para entrar na família</p>
        </div>
      </div>
    </div>
  );
}

// ── Members Modal ─────────────────────────────────────────────────────────────
function MembersModal({ members, family, onClose, onToast, dark }) {
  const t = getTheme(dark);
  function shareFamily() {
    const msg = `Oi! Entrei no *DaFamília* 🏡\n\nVem guardar os contatos da nossa família comigo!\n\n👉 https://da-familia.vercel.app\n🔑 Código: *${family.code}*\n🔒 Peça a senha pra mim`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    onToast("Compartilhando via WhatsApp! 🚀");
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: t.modalBg, borderRadius: "26px 26px 0 0", padding: "24px 18px 40px", width: "100%", maxWidth: 480, maxHeight: "70vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: t.inputBorder, borderRadius: 4, margin: "0 auto 20px" }} />
        <h2 style={{ fontFamily: "Georgia,serif", fontSize: 20, color: t.text, marginBottom: 6, fontWeight: 700 }}>👨‍👩‍👧‍👦 Membros da família</h2>
        <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 18 }}>Convide mais pessoas!</p>
        <div style={{ background: `${t.accent}10`, borderRadius: 16, padding: "16px 14px", marginBottom: 20, border: `1.5px solid ${t.accent}28` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: t.input, borderRadius: 12, padding: "12px 16px", marginBottom: 10, border: `1px solid ${t.inputBorder}` }}>
            <div>
              <p style={{ fontSize: 11, color: t.textMuted }}>Código da família</p>
              <p style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 800, color: t.accent, letterSpacing: "4px" }}>{family.code}</p>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(family.code); onToast("Código copiado! 📋"); }} style={{ background: `${t.accent}18`, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: t.accent, cursor: "pointer", fontWeight: 600 }}>Copiar</button>
          </div>
          <button onClick={shareFamily} style={{ width: "100%", padding: "13px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#25d366,#128c7e)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>💬 Compartilhar no WhatsApp</button>
        </div>
        {members.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: t.card, borderRadius: 12, marginBottom: 8, border: `1px solid ${t.cardBorder}` }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: memberColor(m.name), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>{m.name[0].toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: "Georgia,serif", fontSize: 16, color: t.text }}>{m.name}</span>
              {m.birthday && <p style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>🎂 {new Date(m.birthday + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</p>}
            </div>
            {m.joined_at && <span style={{ fontSize: 11, color: t.textMuted }}>{formatDate(m.joined_at)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ contact, onSave, onClose, dark }) {
  const [name, setName] = useState(contact.name || ""); const [label, setLabel] = useState(contact.label || ""); const [est, setEst] = useState(contact.establishment || ""); const [phone, setPhone] = useState(contact.phone || ""); const [emoji, setEmoji] = useState(contact.emoji || "⭐"); const [saving, setSaving] = useState(false);
  const valid = name.trim() && phone.replace(/\D/g, "").length >= 8;
  const t = getTheme(dark);
  const fS2 = { width: "100%", padding: "14px 16px", borderRadius: 14, border: `1.5px solid ${t.inputBorder}`, background: t.input, fontFamily: "Georgia,serif", fontSize: "16px", color: t.text, marginBottom: 11, outline: "none", boxSizing: "border-box" };
  async function handleSave() { if (!valid || saving) return; setSaving(true); await onSave({ ...contact, name: name.trim(), label: label.trim(), establishment: est.trim(), phone, emoji }); setSaving(false); }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1050, backdropFilter: "blur(4px)" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: t.modalBg, borderRadius: "26px 26px 0 0", padding: "24px 18px 40px", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: t.inputBorder, borderRadius: 4, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "Georgia,serif", fontSize: 22, color: t.text, fontWeight: 700 }}>Editar contato</h2>
          <button onClick={onClose} style={{ background: dark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.06)", border: "none", borderRadius: 20, padding: "6px 12px", fontSize: 13, color: t.textSub, cursor: "pointer" }}>✕ Fechar</button>
        </div>
        <EmojiPicker value={emoji} onChange={setEmoji} dark={dark} />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome *" style={fS2} />
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Tipo (ex: Mecânico, Médico...)" style={fS2} />
        <input value={est} onChange={e => setEst(e.target.value)} placeholder="Estabelecimento (opcional)" style={fS2} />
        <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="Telefone *" style={fS2} inputMode="numeric" />
        <button onClick={handleSave} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: valid ? `linear-gradient(135deg,${t.accent},${t.accentDark})` : t.inputBorder, color: valid ? "#fff" : t.textMuted, fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17, cursor: valid ? "pointer" : "not-allowed" }}>{saving ? "Salvando..." : "Salvar alterações"}</button>
      </div>
    </div>
  );
}

// ── Contact Detail ────────────────────────────────────────────────────────────
function ContactDetail({ contact, members, currentMember, familyCode, onClose, onUpdate, onEdit, onToast, onPin, dark }) {
  const [note, setNote] = useState(""); const [amount, setAmount] = useState(""); const [desc, setDesc] = useState(contact.description || ""); const [editDesc, setEditDesc] = useState(false); const [interactions, setInteractions] = useState([]); const [saving, setSaving] = useState(false); const [showNudge, setShowNudge] = useState(false);
  const t = getTheme(dark);
  const fS2 = { width: "100%", padding: "14px 16px", borderRadius: 14, border: `1.5px solid ${t.inputBorder}`, background: t.input, fontFamily: "Georgia,serif", fontSize: "16px", color: t.text, marginBottom: 11, outline: "none", boxSizing: "border-box" };
  useEffect(() => { supabase.from("interactions").select("*").eq("contact_id", contact.id).order("created_at", { ascending: false }).then(({ data }) => { if (data) setInteractions(data); }); }, [contact.id]);
  async function saveDesc() { await supabase.from("contacts").update({ description: desc }).eq("id", contact.id); onUpdate({ ...contact, description: desc }); setEditDesc(false); }
  async function addLog() {
    if (!note.trim()) return; setSaving(true);
    const { data } = await supabase.from("interactions").insert({ contact_id: contact.id, note: note.trim(), amount: amount.trim() || null }).select().single();
    if (data) setInteractions([data, ...interactions]);
    setNote(""); setAmount(""); setSaving(false); onToast("Interação registrada! ✅");
  }
  const phone = rawPhone(contact.phone);
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ background: t.modalBg, borderRadius: "26px 26px 0 0", padding: "20px 18px 40px", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", overscrollBehavior: "contain" }}>
          <div style={{ width: 36, height: 4, background: t.inputBorder, borderRadius: 4, margin: "0 auto 18px" }} />
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${t.cardBorder}` }}>
            <span style={{ fontSize: 50 }}>{contact.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 22, color: t.text, fontWeight: 800 }}>{contact.name}</h2>
                {contact.pinned && <span style={{ fontSize: 14 }}>📌</span>}
              </div>
              {contact.label && <p style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: ".5px", marginTop: 2 }}>{contact.label}</p>}
              {contact.establishment && <p style={{ fontFamily: "Georgia,serif", fontSize: 13, color: t.textSub, fontStyle: "italic", marginTop: 2 }}>{contact.establishment}</p>}
              <p style={{ fontSize: 13, color: t.textSub, marginTop: 4 }}>{contact.phone}</p>
              {contact.added_by && <p style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>Adicionado por <span style={{ color: memberColor(contact.added_by), fontWeight: 600 }}>{contact.added_by}</span></p>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={onEdit} style={{ background: `${t.accent}18`, border: `1.5px solid ${t.accent}33`, borderRadius: 12, padding: "7px 10px", fontSize: 12, color: t.accent, cursor: "pointer", fontWeight: 600 }}>✏️</button>
              <button onClick={() => onPin(contact)} style={{ background: contact.pinned ? `${t.accent}25` : t.card, border: `1.5px solid ${t.cardBorder}`, borderRadius: 12, padding: "7px 10px", fontSize: 12, color: contact.pinned ? t.accent : t.textMuted, cursor: "pointer" }}>{contact.pinned ? "📌" : "📍"}</button>
            </div>
          </div>
          {/* Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            <a href={`tel:${phone}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "13px 8px", borderRadius: 14, background: `linear-gradient(135deg,${t.accent},${t.accentDark})`, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13 }}><span style={{ fontSize: 20 }}>📞</span>Ligar</a>
            <a href={`https://wa.me/55${phone}`} target="_blank" rel="noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "13px 8px", borderRadius: 14, background: "linear-gradient(135deg,#25d366,#128c7e)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13 }}><span style={{ fontSize: 20 }}>💬</span>WhatsApp</a>
            <button onClick={() => setShowNudge(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "13px 8px", borderRadius: 14, background: "linear-gradient(135deg,#f39c12,#d68910)", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}><span style={{ fontSize: 20 }}>👋</span>Cutucar</button>
          </div>
          {/* Desc */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: ".5px" }}>Descrição</p>
              {!editDesc && <button onClick={() => setEditDesc(true)} style={{ background: "none", border: "none", fontSize: 12, color: t.accent, cursor: "pointer" }}>✏️ Editar</button>}
            </div>
            {editDesc ? <div><textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Atende aos sábados, aceita Pix..." style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${t.inputBorder}`, background: t.input, fontFamily: "Georgia,serif", fontSize: 14, color: t.text, outline: "none", resize: "vertical", minHeight: 80, boxSizing: "border-box" }} /><button onClick={saveDesc} style={{ marginTop: 6, padding: "8px 18px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Salvar</button></div>
              : <p style={{ fontFamily: "Georgia,serif", fontSize: 14, color: desc ? t.text : t.textMuted, fontStyle: desc ? "normal" : "italic", lineHeight: 1.6 }}>{desc || "Nenhuma descrição."}</p>}
          </div>
          {/* Log */}
          <div style={{ background: `${t.accent}0a`, borderRadius: 16, padding: "16px 14px", marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>📝 Registrar interação</p>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="O que foi feito?" style={{ ...fS2, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Valor gasto (opcional)" style={{ ...fS2, flex: 1, marginBottom: 0 }} />
              <button onClick={addLog} disabled={saving} style={{ padding: "14px 18px", borderRadius: 14, border: "none", background: note.trim() ? t.accent : t.inputBorder, color: note.trim() ? "#fff" : t.textMuted, fontWeight: 700, fontSize: 14, cursor: note.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>{saving ? "..." : "+ Salvar"}</button>
            </div>
          </div>
          {/* History */}
          <div>
            <p style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>🕐 Histórico</p>
            {interactions.length === 0 ? <p style={{ fontFamily: "Georgia,serif", fontSize: 13, color: t.textMuted, fontStyle: "italic" }}>Nenhuma interação registrada ainda.</p>
              : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{interactions.map(e => (
                  <div key={e.id} style={{ background: t.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${t.cardBorder}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: t.textMuted }}>{formatDate(e.created_at)}</span>
                      {e.amount && <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>💰 {e.amount}</span>}
                    </div>
                    <p style={{ fontFamily: "Georgia,serif", fontSize: 14, color: t.text, lineHeight: 1.5 }}>{e.note}</p>
                  </div>
                ))}</div>}
          </div>
        </div>
      </div>
      {showNudge && <NudgeModal contact={contact} members={members} currentMember={currentMember} familyCode={familyCode} onClose={() => setShowNudge(false)} onSent={onToast} dark={dark} />}
    </>
  );
}

// ── Contact Cards ─────────────────────────────────────────────────────────────
function ContactCardGrid({ contact, onDelete, onTap, dark }) {
  const [confirm, setConfirm] = useState(false);
  const t = getTheme(dark);
  return (
    <div onClick={() => !confirm && onTap()} style={{ background: t.card, borderRadius: 20, padding: "18px 12px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, position: "relative", cursor: "pointer", boxShadow: `0 2px 18px rgba(0,0,0,${dark ? ".25" : ".09"})`, border: `1px solid ${t.cardBorder}${contact.pinned ? "" : ""}`, outline: contact.pinned ? `2px solid ${t.accent}` : "none", WebkitTapHighlightColor: "transparent" }}>
      {contact.pinned && <span style={{ position: "absolute", top: 7, left: 9, fontSize: 11 }}>📌</span>}
      <div style={{ fontSize: 38, lineHeight: 1 }}>{contact.emoji}</div>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 14, fontWeight: 700, color: t.text, textAlign: "center", lineHeight: 1.25, wordBreak: "break-word", width: "100%" }}>{contact.name}</div>
      {contact.label && <div style={{ fontSize: 10, color: t.textMuted, textAlign: "center", textTransform: "uppercase", letterSpacing: ".4px" }}>{contact.label}</div>}
      {contact.establishment && <div style={{ fontFamily: "Georgia,serif", fontSize: 11, color: t.textSub, textAlign: "center", fontStyle: "italic" }}>{contact.establishment}</div>}
      <div style={{ marginTop: 4, background: t.accent, color: "#fff", borderRadius: 30, padding: "5px 12px", fontSize: 11, fontWeight: 700 }}>{contact.phone}</div>
      {contact.added_by && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>por {contact.added_by}</div>}
      {!confirm ? <button onClick={e => { e.stopPropagation(); setConfirm(true); }} style={{ position: "absolute", top: 8, right: 9, background: "none", border: "none", fontSize: 14, cursor: "pointer", opacity: .25, color: t.text, padding: 4 }}>✕</button>
        : <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4, zIndex: 2 }}>
            <button onClick={onDelete} style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>Sim</button>
            <button onClick={() => setConfirm(false)} style={{ background: "#888", border: "none", borderRadius: 8, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>Não</button>
          </div>}
    </div>
  );
}
function ContactCardList({ contact, onDelete, onTap, dark }) {
  const [confirm, setConfirm] = useState(false);
  const t = getTheme(dark); const phone = rawPhone(contact.phone);
  return (
    <div style={{ background: t.card, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, position: "relative", boxShadow: `0 2px 12px rgba(0,0,0,${dark ? ".2" : ".07"})`, border: `1px solid ${t.cardBorder}`, outline: contact.pinned ? `2px solid ${t.accent}` : "none" }}>
      {contact.pinned && <span style={{ position: "absolute", top: 7, right: 38, fontSize: 11 }}>📌</span>}
      <div onClick={() => !confirm && onTap()} style={{ fontSize: 36, lineHeight: 1, cursor: "pointer", flexShrink: 0 }}>{contact.emoji}</div>
      <div onClick={() => !confirm && onTap()} style={{ flex: 1, cursor: "pointer", minWidth: 0 }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 15, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contact.name}</div>
        {contact.label && <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: ".4px" }}>{contact.label}</div>}
        {contact.establishment && <div style={{ fontFamily: "Georgia,serif", fontSize: 12, color: t.textSub, fontStyle: "italic" }}>{contact.establishment}</div>}
        <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>{contact.phone}</div>
        {contact.added_by && <div style={{ fontSize: 11, color: t.textMuted }}>por {contact.added_by}</div>}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <a href={`tel:${phone}`} onClick={e => e.stopPropagation()} style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${t.accent},${t.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16 }}>📞</a>
        <a href={`https://wa.me/55${phone}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#25d366,#128c7e)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16 }}>💬</a>
      </div>
      {!confirm ? <button onClick={e => { e.stopPropagation(); setConfirm(true); }} style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", fontSize: 13, cursor: "pointer", opacity: .25, color: t.text, padding: 2 }}>✕</button>
        : <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 6, right: 8, display: "flex", gap: 4, zIndex: 2 }}>
            <button onClick={onDelete} style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>Sim</button>
            <button onClick={() => setConfirm(false)} style={{ background: "#888", border: "none", borderRadius: 8, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>Não</button>
          </div>}
    </div>
  );
}

// ── Add Contact Modal ─────────────────────────────────────────────────────────
function AddModal({ onSave, onClose, dark }) {
  const [name, setName] = useState(""); const [label, setLabel] = useState(""); const [est, setEst] = useState(""); const [phone, setPhone] = useState(""); const [emoji, setEmoji] = useState("⭐"); const [saving, setSaving] = useState(false);
  const valid = name.trim() && phone.replace(/\D/g, "").length >= 8;
  const t = getTheme(dark);
  const fS2 = { width: "100%", padding: "14px 16px", borderRadius: 14, border: `1.5px solid ${t.inputBorder}`, background: t.input, fontFamily: "Georgia,serif", fontSize: "16px", color: t.text, marginBottom: 11, outline: "none", boxSizing: "border-box" };
  async function handleSave() { if (!valid || saving) return; setSaving(true); await onSave({ name: name.trim(), label: label.trim(), establishment: est.trim(), phone, emoji }); setSaving(false); }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: t.modalBg, borderRadius: "26px 26px 0 0", padding: "24px 18px 40px", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ width: 36, height: 4, background: t.inputBorder, borderRadius: 4, marginLeft: "auto", marginRight: "auto" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "Georgia,serif", fontSize: 22, color: t.text, fontWeight: 700 }}>Novo contato da família</h2>
          <button onClick={onClose} style={{ background: dark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.06)", border: "none", borderRadius: 20, padding: "6px 12px", fontSize: 13, color: t.textSub, cursor: "pointer" }}>✕ Fechar</button>
        </div>
        <EmojiPicker value={emoji} onChange={setEmoji} dark={dark} />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome *" style={fS2} />
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Tipo (ex: Mecânico, Médico...)" style={fS2} />
        <input value={est} onChange={e => setEst(e.target.value)} placeholder="Estabelecimento (opcional)" style={fS2} />
        <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="Telefone *" style={fS2} inputMode="numeric" />
        <button onClick={handleSave} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: valid ? `linear-gradient(135deg,${t.accent},${t.accentDark})` : t.inputBorder, color: valid ? "#fff" : t.textMuted, fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17, cursor: valid ? "pointer" : "not-allowed" }}>{saving ? "Salvando..." : "Salvar contato"}</button>
      </div>
    </div>
  );
}

// ── Add Appointment Modal ─────────────────────────────────────────────────────
function AddAppointmentModal({ members, contacts, currentMember, familyCode, onSave, onClose, initialDate, dark }) {
  const [title, setTitle] = useState(""); const [date, setDate] = useState(initialDate || new Date().toISOString().split("T")[0]); const [time, setTime] = useState(""); const [forMember, setForMember] = useState(currentMember); const [selContact, setSelContact] = useState(null); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false);
  const valid = title.trim() && date && forMember;
  const t = getTheme(dark);
  const fS2 = { width: "100%", padding: "14px 16px", borderRadius: 14, border: `1.5px solid ${t.inputBorder}`, background: t.input, fontFamily: "Georgia,serif", fontSize: "16px", color: t.text, marginBottom: 11, outline: "none", boxSizing: "border-box" };
  async function handleSave() {
    if (!valid || saving) return; setSaving(true);
    const c = contacts.find(x => x.id === selContact);
    await onSave({ title: title.trim(), date, time, member_name: forMember, added_by: currentMember, family_code: familyCode, contact_id: selContact || null, contact_name: c?.name || null, contact_emoji: c?.emoji || null, notes: notes.trim() || null });
    setSaving(false);
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: t.modalBg, borderRadius: "26px 26px 0 0", padding: "24px 18px 40px", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", overscrollBehavior: "contain" }}>
        <div style={{ width: 36, height: 4, background: t.inputBorder, borderRadius: 4, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "Georgia,serif", fontSize: 22, color: t.text, fontWeight: 700 }}>📅 Novo compromisso</h2>
          <button onClick={onClose} style={{ background: dark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.06)", border: "none", borderRadius: 20, padding: "6px 12px", fontSize: 13, color: t.textSub, cursor: "pointer" }}>✕ Fechar</button>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do compromisso *" style={fS2} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 11 }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...fS2, marginBottom: 0 }} />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...fS2, marginBottom: 0 }} />
        </div>
        <p style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8, marginTop: 4 }}>De quem é este compromisso?</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {members.map((m, i) => (
            <button key={i} onClick={() => setForMember(m.name)} style={{ padding: "8px 14px", borderRadius: 20, border: forMember === m.name ? `2px solid ${memberColor(m.name)}` : `2px solid ${t.inputBorder}`, background: forMember === m.name ? `${memberColor(m.name)}18` : t.input, cursor: "pointer", fontSize: 13, fontWeight: forMember === m.name ? 700 : 400, color: forMember === m.name ? memberColor(m.name) : t.textSub, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: memberColor(m.name), display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 800 }}>{m.name[0].toUpperCase()}</span>{m.name}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Contato relacionado (opcional)</p>
        <div style={{ marginBottom: 14, maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={() => setSelContact(null)} style={{ padding: "10px 14px", borderRadius: 12, border: selContact === null ? `2px solid ${t.accent}` : `2px solid ${t.inputBorder}`, background: selContact === null ? `${t.accent}10` : t.input, cursor: "pointer", fontSize: 13, color: t.textSub, textAlign: "left" }}>Nenhum contato específico</button>
          {contacts.map(c => (
            <button key={c.id} onClick={() => setSelContact(c.id)} style={{ padding: "10px 14px", borderRadius: 12, border: selContact === c.id ? `2px solid ${t.accent}` : `2px solid ${t.inputBorder}`, background: selContact === c.id ? `${t.accent}10` : t.input, cursor: "pointer", fontSize: 13, color: t.textSub, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>{c.emoji}</span>
              <div><div style={{ fontWeight: selContact === c.id ? 700 : 400, color: t.text }}>{c.name}</div>{c.label && <div style={{ fontSize: 11, color: t.textMuted }}>{c.label}</div>}</div>
              {selContact === c.id && <span style={{ marginLeft: "auto", color: t.accent }}>✓</span>}
            </button>
          ))}
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações (opcional)" style={{ ...fS2, resize: "vertical", minHeight: 70 }} />
        <button onClick={handleSave} disabled={!valid || saving} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: valid ? `linear-gradient(135deg,${t.accent},${t.accentDark})` : t.inputBorder, color: valid ? "#fff" : t.textMuted, fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17, cursor: valid ? "pointer" : "not-allowed" }}>{saving ? "Salvando..." : "Salvar compromisso"}</button>
      </div>
    </div>
  );
}

// ── Appointment Card ──────────────────────────────────────────────────────────
function AppointmentCard({ appt, onDelete, showDate, dark }) {
  const [confirm, setConfirm] = useState(false);
  const t = getTheme(dark); const color = memberColor(appt.member_name);
  const dateStr = showDate ? new Date(appt.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : null;
  const isBirthday = appt.is_birthday;
  return (
    <div style={{ background: t.card, borderRadius: 14, padding: "12px 14px", marginBottom: 8, border: `1px solid ${t.cardBorder}`, borderLeft: `4px solid ${isBirthday ? "#f59e0b" : color}`, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            {showDate && <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 700 }}>{dateStr}</span>}
            {appt.time && <span style={{ fontSize: 11, background: `${t.accent}18`, color: t.accent, borderRadius: 8, padding: "1px 7px", fontWeight: 700 }}>🕐 {appt.time}</span>}
            {isBirthday && <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", borderRadius: 8, padding: "1px 7px", fontWeight: 700 }}>🎂 Aniversário</span>}
          </div>
          <p style={{ fontFamily: "Georgia,serif", fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.3 }}>{appt.title}</p>
          {appt.contact_name && <p style={{ fontSize: 12, color: t.textSub, marginTop: 3 }}>{appt.contact_emoji} com {appt.contact_name}</p>}
          {appt.notes && <p style={{ fontSize: 12, color: t.textMuted, marginTop: 3, fontStyle: "italic" }}>{appt.notes}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 800 }}>{appt.member_name[0].toUpperCase()}</div>
            <span style={{ fontSize: 11, color, fontWeight: 600 }}>{appt.member_name}</span>
            {!isBirthday && appt.added_by && appt.added_by !== appt.member_name && <span style={{ fontSize: 11, color: t.textMuted }}>· por {appt.added_by}</span>}
          </div>
        </div>
        {!isBirthday && (!confirm
          ? <button onClick={() => setConfirm(true)} style={{ background: "none", border: "none", fontSize: 13, cursor: "pointer", opacity: .3, color: t.text, padding: 2, flexShrink: 0 }}>✕</button>
          : <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => onDelete(appt.id)} style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>Sim</button>
              <button onClick={() => setConfirm(false)} style={{ background: "#888", border: "none", borderRadius: 8, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>Não</button>
            </div>)}
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function CalendarScreen({ appointments, members, contacts, currentMember, familyCode, onAdd, onDelete, onToast, dark }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filterMember, setFilterMember] = useState("todos");
  const t = getTheme(dark);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const dayNames = ["D","S","T","Q","Q","S","S"];

  // Build birthday appointments for current month view
  const birthdayAppts = members
    .filter(m => m.birthday)
    .map(m => {
      const bday = new Date(m.birthday + "T00:00:00");
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,"0")}-${String(bday.getDate()).padStart(2,"0")}`;
      if (bday.getMonth() !== viewMonth) return null;
      return { id: `bday_${m.name}`, title: `🎂 Aniversário de ${m.name}`, date: dateStr, member_name: m.name, added_by: m.name, is_birthday: true, time: null, contact_name: null, contact_emoji: null, notes: null };
    }).filter(Boolean);

  const allAppts = [...appointments, ...birthdayAppts];

  function apptsByDay(day) {
    const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return allAppts.filter(a => a.date === dateStr && (filterMember === "todos" || a.member_name === filterMember));
  }

  function prevMonth() { if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); } else setViewMonth(m => m-1); setSelectedDay(null); }
  function nextMonth() { if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); } else setViewMonth(m => m+1); setSelectedDay(null); }

  const selectedDateStr = selectedDay ? `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}` : null;
  const selectedAppts = selectedDay ? apptsByDay(selectedDay) : [];

  const upcomingAppts = allAppts
    .filter(a => { const d = new Date(a.date + "T00:00:00"); return d >= new Date(today.toDateString()) && (filterMember === "todos" || a.member_name === filterMember); })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""))
    .slice(0, 6);

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* Filter */}
      <div style={{ padding: "12px 14px 0", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
          <button onClick={() => setFilterMember("todos")} style={{ padding: "6px 14px", borderRadius: 20, border: filterMember === "todos" ? `2px solid ${t.accent}` : `2px solid ${t.inputBorder}`, background: filterMember === "todos" ? `${t.accent}18` : t.input, cursor: "pointer", fontSize: 12, fontWeight: filterMember === "todos" ? 700 : 400, color: filterMember === "todos" ? t.accent : t.textSub, whiteSpace: "nowrap" }}>Todos</button>
          {members.map((m, i) => (
            <button key={i} onClick={() => setFilterMember(m.name)} style={{ padding: "6px 14px", borderRadius: 20, border: filterMember === m.name ? `2px solid ${memberColor(m.name)}` : `2px solid ${t.inputBorder}`, background: filterMember === m.name ? `${memberColor(m.name)}18` : t.input, cursor: "pointer", fontSize: 12, fontWeight: filterMember === m.name ? 700 : 400, color: filterMember === m.name ? memberColor(m.name) : t.textSub, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: memberColor(m.name), display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 800 }}>{m.name[0].toUpperCase()}</span>{m.name}
            </button>
          ))}
        </div>
      </div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 8px" }}>
        <button onClick={prevMonth} style={{ background: `${t.accent}18`, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 16, cursor: "pointer", color: t.accent }}>‹</button>
        <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20, fontWeight: 800, color: t.text }}>{monthNames[viewMonth]} {viewYear}</h2>
        <button onClick={nextMonth} style={{ background: `${t.accent}18`, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 16, cursor: "pointer", color: t.accent }}>›</button>
      </div>
      {/* Day names */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "0 14px", gap: 2, marginBottom: 4 }}>
        {dayNames.map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 11, color: t.textMuted, fontWeight: 700, padding: "4px 0" }}>{d}</div>)}
      </div>
      {/* Days */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "0 14px", gap: 3 }}>
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1; const appts = apptsByDay(day);
          const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          const isSelected = selectedDay === day;
          const hasBirthday = appts.some(a => a.is_birthday);
          return (
            <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)} style={{ aspectRatio: "1", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: isSelected ? t.accent : isToday ? `${t.accent}18` : t.card, border: isToday && !isSelected ? `2px solid ${t.accent}` : `2px solid transparent`, position: "relative", WebkitTapHighlightColor: "transparent" }}>
              {hasBirthday && !isSelected && <div style={{ position: "absolute", top: 3, right: 3, width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />}
              <span style={{ fontSize: 13, fontWeight: isToday || isSelected ? 800 : 400, color: isSelected ? "#fff" : isToday ? t.accent : t.text }}>{day}</span>
              {appts.filter(a => !a.is_birthday).length > 0 && (
                <div style={{ display: "flex", gap: 2, marginTop: 2, flexWrap: "wrap", justifyContent: "center", maxWidth: 28 }}>
                  {appts.filter(a => !a.is_birthday).slice(0, 3).map((a, idx) => <div key={idx} style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,.8)" : memberColor(a.member_name) }} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Selected day */}
      {selectedDay && (
        <div style={{ margin: "16px 14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: "Georgia,serif" }}>{selectedDay} de {monthNames[viewMonth]}</p>
            <button onClick={() => setShowAdd(true)} style={{ background: t.accent, border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, color: "#fff", cursor: "pointer", fontWeight: 700 }}>+ Novo</button>
          </div>
          {selectedAppts.length === 0
            ? <div style={{ textAlign: "center", padding: "24px 0", background: t.card, borderRadius: 16 }}><p style={{ fontSize: 13, color: t.textMuted, fontStyle: "italic", fontFamily: "Georgia,serif" }}>Nenhum compromisso neste dia</p></div>
            : selectedAppts.map(a => <AppointmentCard key={a.id} appt={a} onDelete={onDelete} dark={dark} />)}
        </div>
      )}
      {/* Upcoming */}
      {!selectedDay && upcomingAppts.length > 0 && (
        <div style={{ margin: "20px 14px 0" }}>
          <p style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>📌 Próximos compromissos</p>
          {upcomingAppts.map(a => <AppointmentCard key={a.id} appt={a} onDelete={onDelete} showDate dark={dark} />)}
        </div>
      )}
      {/* FAB */}
      <button onClick={() => setShowAdd(true)} style={{ position: "fixed", bottom: 24, right: 20, zIndex: 500, background: `linear-gradient(135deg,${t.accent},${t.accentDark})`, color: "#fff", border: "none", borderRadius: 60, padding: "16px 22px", display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: `0 8px 28px ${t.accent}80`, WebkitTapHighlightColor: "transparent" }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Compromisso
      </button>
      {showAdd && <AddAppointmentModal members={members} contacts={contacts} currentMember={currentMember} familyCode={familyCode} initialDate={selectedDateStr} onSave={async (d) => { await onAdd(d); setShowAdd(false); }} onClose={() => setShowAdd(false)} dark={dark} />}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [tab, setTab] = useState("contacts");
  const [family, setFamily] = useState(null);
  const [currentMember, setCurrentMember] = useState("");
  const [contacts, setContacts] = useState([]);
  const [members, setMembers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [nudges, setNudges] = useState([]);
  const [dark, setDark] = useState(() => localStorage.getItem("df_dark") === "1");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [layout, setLayout] = useState(() => localStorage.getItem("df_layout") || "grid");
  const [search, setSearch] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberBirthday, setMemberBirthday] = useState("");
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPass, setJoinPass] = useState("");
  const [yourName, setYourName] = useState("");
  const [yourBirthday, setYourBirthday] = useState("");
  const [err, setErr] = useState("");
  const nudgeInterval = useRef(null);

  const t = getTheme(dark);

  function toggleDark() {
    setDark(d => { const next = !d; localStorage.setItem("df_dark", next ? "1" : "0"); return next; });
  }

  const checkNudges = useCallback(async () => {
    if (!currentMember || !family) return;
    const { data } = await supabase.from("nudges").select("*").eq("family_code", family.code).eq("to_member", currentMember).eq("seen", false).order("created_at", { ascending: true });
    if (data && data.length > 0) setNudges(data);
  }, [currentMember, family]);

  useEffect(() => {
    const saved = localStorage.getItem("df_session");
    if (saved) {
      try {
        const { familyCode, memberNameSaved } = JSON.parse(saved);
        if (familyCode) {
          setLoadingText("Carregando sua família..."); setLoading(true);
          supabase.from("families").select("*").eq("code", familyCode).single()
            .then(({ data: f }) => { if (f) { setFamily(f); setCurrentMember(memberNameSaved || ""); return fetchFamilyData(familyCode); } else localStorage.removeItem("df_session"); })
            .then(() => { setScreen("family"); setLoading(false); setLoadingText(""); })
            .catch(() => { setLoading(false); setLoadingText(""); });
        }
      } catch (e) { localStorage.removeItem("df_session"); }
    }
    if (!localStorage.getItem("df_howto_done")) setShowHowTo(true);
  }, []);

  useEffect(() => {
    if (screen === "family" && currentMember && family) {
      checkNudges();
      nudgeInterval.current = setInterval(checkNudges, 15000);
    }
    return () => clearInterval(nudgeInterval.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, currentMember, family, checkNudges]);

  async function dismissNudge(id) { await supabase.from("nudges").update({ seen: true }).eq("id", id); setNudges(prev => prev.filter(n => n.id !== id)); }
  function saveSession(f, name) { localStorage.setItem("df_session", JSON.stringify({ familyCode: f.code, memberNameSaved: name })); }
  function toggleLayout(l) { setLayout(l); localStorage.setItem("df_layout", l); }

  async function fetchFamilyData(code) {
    const [{ data: cs }, { data: ms }, { data: as }] = await Promise.all([
      supabase.from("contacts").select("*").eq("family_code", code).order("created_at"),
      supabase.from("members").select("*").eq("family_code", code).order("joined_at"),
      supabase.from("appointments").select("*").eq("family_code", code).order("date")
    ]);
    setContacts(cs || []); setMembers(ms || []); setAppointments(as || []);
  }

  async function createFamily() {
    if (!newFamilyName.trim() || !newPass.trim() || !memberName.trim()) return;
    setLoadingText("Criando sua família..."); setLoading(true);
    const code = generateCode(); const hashed = await hashPassword(newPass.trim());
    const { error } = await supabase.from("families").insert({ code, name: newFamilyName.trim(), password: hashed });
    if (error) { setLoading(false); setLoadingText(""); setErr("Erro ao criar família."); return; }
    await supabase.from("members").insert({ family_code: code, name: memberName.trim(), birthday: memberBirthday || null });
    const { data: f } = await supabase.from("families").select("*").eq("code", code).single();
    setFamily(f); setCurrentMember(memberName.trim()); saveSession(f, memberName.trim());
    await fetchFamilyData(code);
    setScreen("family"); setLoading(false); setLoadingText(""); setToast(`Família criada! Código: ${code}`);
  }

  async function joinFamily() {
    const code = joinCode.trim().toUpperCase();
    if (!yourName.trim()) { setErr("Digite seu nome 👤"); return; }
    setLoadingText("Entrando na família..."); setLoading(true);
    const { data: f } = await supabase.from("families").select("*").eq("code", code).single();
    if (!f) { setLoading(false); setLoadingText(""); setErr("Família não encontrada 😕"); return; }
    const hashed = await hashPassword(joinPass.trim());
    if (f.password !== hashed) { setLoading(false); setLoadingText(""); setErr("Senha incorreta 🔒"); return; }
    const { data: existing } = await supabase.from("members").select("*").eq("family_code", code).eq("name", yourName.trim());
    if (!existing || existing.length === 0) await supabase.from("members").insert({ family_code: code, name: yourName.trim(), birthday: yourBirthday || null });
    setFamily(f); setCurrentMember(yourName.trim()); saveSession(f, yourName.trim());
    await fetchFamilyData(code); setScreen("family"); setLoading(false); setLoadingText("");
    setToast(`Bem-vindo à família ${f.name}! 🏠`);
  }

  async function addContact(c) {
    const { data } = await supabase.from("contacts").insert({ family_code: family.code, name: c.name, label: c.label, establishment: c.establishment, phone: c.phone, emoji: c.emoji, description: "", added_by: currentMember }).select().single();
    if (data) setContacts(prev => [...prev, data]);
    setShowAdd(false); setToast("Contato adicionado! ✅");
  }

  async function saveEditContact(updated) {
    await supabase.from("contacts").update({ name: updated.name, label: updated.label, establishment: updated.establishment, phone: updated.phone, emoji: updated.emoji }).eq("id", updated.id);
    const newC = { ...selectedContact, ...updated };
    setContacts(contacts.map(c => c.id === updated.id ? newC : c));
    setEditingContact(null); setSelectedContact(newC); setToast("Contato atualizado! ✅");
  }

  async function deleteContact(id) { await supabase.from("contacts").delete().eq("id", id); setContacts(contacts.filter(c => c.id !== id)); setToast("Contato removido"); }

  async function togglePin(contact) {
    const pinned = !contact.pinned;
    await supabase.from("contacts").update({ pinned }).eq("id", contact.id);
    const updated = { ...contact, pinned };
    setContacts(contacts.map(c => c.id === contact.id ? updated : c));
    if (selectedContact?.id === contact.id) setSelectedContact(updated);
    setToast(pinned ? "Contato fixado! 📌" : "Contato desafixado");
  }

  function updateContact(updated) { setContacts(contacts.map(c => c.id === updated.id ? updated : c)); setSelectedContact(updated); }

  async function addAppointment(data) {
    const { data: saved } = await supabase.from("appointments").insert(data).select().single();
    if (saved) setAppointments(prev => [...prev, saved].sort((a, b) => a.date.localeCompare(b.date)));
    setToast("Compromisso adicionado! 📅");
  }

  async function deleteAppointment(id) { await supabase.from("appointments").delete().eq("id", id); setAppointments(prev => prev.filter(a => a.id !== id)); setToast("Compromisso removido"); }

  function reset() {
    localStorage.removeItem("df_session"); clearInterval(nudgeInterval.current);
    setFamily(null); setContacts([]); setMembers([]); setNudges([]); setAppointments([]);
    setCurrentMember(""); setScreen("home");
    setNewFamilyName(""); setNewPass(""); setJoinCode(""); setJoinPass("");
    setYourName(""); setMemberName(""); setErr(""); setSearch("");
  }

  // Sort contacts: pinned first, then alphabetical
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.name.localeCompare(b.name);
  });

  const filtered = sortedContacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.label || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.establishment || "").toLowerCase().includes(search.toLowerCase())
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppts = appointments.filter(a => a.date === todayStr).length;

  const fS2 = { width: "100%", padding: "14px 16px", borderRadius: 14, border: `1.5px solid ${t.inputBorder}`, background: t.input, fontFamily: "Georgia,serif", fontSize: "16px", color: t.text, marginBottom: 11, outline: "none", boxSizing: "border-box", WebkitAppearance: "none" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        input:focus, textarea:focus { border-color:#b85e22 !important; box-shadow:0 0 0 3px rgba(184,94,34,.15); }
        input[type="date"], input[type="time"] { color-scheme: ${dark ? "dark" : "light"}; }
        ::-webkit-scrollbar { width:0; }
        body { overscroll-behavior:none; background:${t.bg.split(",")[0].replace("radial-gradient(ellipse at 25% 0%","").trim()}; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media(min-width:900px) {
          .desktop-split { display:grid !important; grid-template-columns:1fr 1fr; gap:0; }
          .desktop-panel { border-right:1px solid rgba(150,100,50,.15); }
          .mobile-tab-bar { display:none !important; }
          .desktop-always-show { display:block !important; }
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "system-ui,sans-serif", maxWidth: 1200, margin: "0 auto" }}>

        <NudgeBanner nudges={nudges} onDismiss={dismissNudge} />

        {/* HOME */}
        {screen === "home" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "32px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <div style={{ fontSize: 72, marginBottom: 8 }}>🏡</div>
              <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 48, fontWeight: 800, color: t.text, letterSpacing: "-1.5px", lineHeight: .95 }}>Da<span style={{ color: t.accent }}>Família</span></h1>
              <p style={{ color: t.textSub, fontSize: 14, margin: "14px auto 0", lineHeight: 1.65, maxWidth: 260 }}>A agenda de contatos da sua família, preservada de geração em geração.</p>
            </div>
            <div style={{ width: 44, height: 2, background: `linear-gradient(90deg,transparent,${t.accent},transparent)`, marginBottom: 40 }} />
            <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 13 }}>
              <button onClick={() => setScreen("create")} style={{ padding: "18px 24px", borderRadius: 18, border: "none", background: `linear-gradient(135deg,${t.accent},${t.accentDark})`, color: "#fff", fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 24px ${t.accent}70`, WebkitTapHighlightColor: "transparent" }}>✨ Criar minha família</button>
              <button onClick={() => { setScreen("join"); setErr(""); }} style={{ padding: "18px 24px", borderRadius: 18, border: `2px solid ${t.inputBorder}`, background: t.card, color: t.textSub, fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>🔗 Entrar em uma família</button>
              <button onClick={() => setShowHowTo(true)} style={{ padding: "12px", borderRadius: 14, border: "none", background: "transparent", color: t.textMuted, fontSize: 13, cursor: "pointer" }}>❓ Como funciona</button>
            </div>
            <button onClick={toggleDark} style={{ marginTop: 32, background: "none", border: "none", fontSize: 20, cursor: "pointer", opacity: .5 }}>{dark ? "☀️" : "🌙"}</button>
          </div>
        )}

        {/* CREATE */}
        {screen === "create" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "32px 24px" }}>
            <div style={{ width: "100%", maxWidth: 380 }}>
              <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: t.textSub, cursor: "pointer", fontSize: 14, marginBottom: 28, padding: 0 }}>← Voltar</button>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 34, color: t.text, marginBottom: 8, fontWeight: 800 }}>Criar família</h2>
              <p style={{ color: t.textSub, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>Você vai receber um código para convidar os membros.</p>
              <input value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="Seu nome 👤 *" style={fS2} />
              <label style={{ fontSize: 12, color: t.textMuted, marginBottom: 4, display: "block" }}>Seu aniversário (opcional 🎂)</label>
              <input type="date" value={memberBirthday} onChange={e => setMemberBirthday(e.target.value)} style={{ ...fS2 }} />
              <input value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} placeholder="Nome da família (ex: Família Silva)" style={fS2} />
              <input value={newPass} onChange={e => setNewPass(e.target.value)} type="password" placeholder="Crie uma senha" style={fS2} />
              {err && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 10 }}>{err}</p>}
              <button onClick={createFamily} style={{ width: "100%", padding: "17px", borderRadius: 16, border: "none", marginTop: 6, background: newFamilyName && newPass && memberName ? `linear-gradient(135deg,${t.accent},${t.accentDark})` : t.inputBorder, color: newFamilyName && newPass && memberName ? "#fff" : t.textMuted, fontFamily: "'Playfair Display',Georgia,serif", fontSize: 19, fontWeight: 700, cursor: newFamilyName && newPass && memberName ? "pointer" : "not-allowed", WebkitTapHighlightColor: "transparent" }}>Criar família 🏡</button>
            </div>
          </div>
        )}

        {/* JOIN */}
        {screen === "join" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "32px 24px" }}>
            <div style={{ width: "100%", maxWidth: 380 }}>
              <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: t.textSub, cursor: "pointer", fontSize: 14, marginBottom: 28, padding: 0 }}>← Voltar</button>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 34, color: t.text, marginBottom: 8, fontWeight: 800 }}>Entrar na família</h2>
              <p style={{ color: t.textSub, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>Peça o código de 6 letras para um membro da família.</p>
              <input value={yourName} onChange={e => { setYourName(e.target.value); setErr(""); }} placeholder="Seu nome 👤 *" style={fS2} />
              <label style={{ fontSize: 12, color: t.textMuted, marginBottom: 4, display: "block" }}>Seu aniversário (opcional 🎂)</label>
              <input type="date" value={yourBirthday} onChange={e => setYourBirthday(e.target.value)} style={{ ...fS2 }} />
              <input value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setErr(""); }} maxLength={6} placeholder="CÓDIGO" style={{ ...fS2, fontSize: "28px", textAlign: "center", letterSpacing: "10px", fontWeight: 800, fontFamily: "Georgia,serif" }} />
              <input value={joinPass} onChange={e => { setJoinPass(e.target.value); setErr(""); }} type="password" placeholder="Senha da família" style={fS2} />
              {err && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 10, textAlign: "center" }}>{err}</p>}
              <button onClick={joinFamily} style={{ width: "100%", padding: "17px", borderRadius: 16, border: "none", background: joinCode.length === 6 && joinPass && yourName ? `linear-gradient(135deg,${t.accent},${t.accentDark})` : t.inputBorder, color: joinCode.length === 6 && joinPass && yourName ? "#fff" : t.textMuted, fontFamily: "'Playfair Display',Georgia,serif", fontSize: 19, fontWeight: 700, cursor: joinCode.length === 6 && joinPass && yourName ? "pointer" : "not-allowed", WebkitTapHighlightColor: "transparent" }}>Entrar na família 🔑</button>
            </div>
          </div>
        )}

        {/* FAMILY */}
        {screen === "family" && family && (
          <div style={{ minHeight: "100vh", paddingTop: nudges.length > 0 ? 160 : 0 }}>
            {/* Header */}
            <div style={{ padding: "18px 16px 0", background: t.header, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${t.cardBorder}`, position: "sticky", top: nudges.length > 0 ? 160 : 0, zIndex: 100 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 20 }}>🏡</span>
                    <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20, fontWeight: 800, color: t.text }}>{family.name}</h1>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                    <span onClick={() => { navigator.clipboard?.writeText(family.code); setToast("Código copiado!"); }} style={{ fontSize: 11, fontWeight: 800, letterSpacing: "3px", color: t.accent, background: t.pill, padding: "2px 9px", borderRadius: 20, cursor: "pointer" }}>{family.code} 📋</span>
                    <button onClick={() => setShowMembers(true)} style={{ background: "none", border: `1px solid ${t.inputBorder}`, borderRadius: 20, padding: "2px 9px", fontSize: 11, color: t.textSub, cursor: "pointer" }}>👥 {members.length}</button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {tab === "contacts" && (
                    <div style={{ display: "flex", background: dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)", borderRadius: 10, padding: 3, gap: 2 }}>
                      <button onClick={() => toggleLayout("grid")} style={{ padding: "5px 8px", borderRadius: 8, border: "none", background: layout === "grid" ? (dark ? "rgba(255,255,255,.15)" : "#fff") : "transparent", cursor: "pointer", fontSize: 14, boxShadow: layout === "grid" ? "0 1px 4px rgba(0,0,0,.15)" : "none", color: t.text }}>⊞</button>
                      <button onClick={() => toggleLayout("list")} style={{ padding: "5px 8px", borderRadius: 8, border: "none", background: layout === "list" ? (dark ? "rgba(255,255,255,.15)" : "#fff") : "transparent", cursor: "pointer", fontSize: 14, boxShadow: layout === "list" ? "0 1px 4px rgba(0,0,0,.15)" : "none", color: t.text }}>☰</button>
                    </div>
                  )}
                  <button onClick={() => setShowSettings(true)} style={{ background: "none", border: `1px solid ${t.inputBorder}`, borderRadius: 20, padding: "6px 12px", fontSize: 13, color: t.textSub, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>⚙️ <span style={{ fontSize: 12 }}>Menu</span></button>
                  <button onClick={reset} style={{ background: "none", border: `1.5px solid ${t.inputBorder}`, borderRadius: 20, padding: "6px 12px", fontSize: 12, color: t.textSub, cursor: "pointer" }}>Sair</button>
                </div>
              </div>
              {tab === "contacts" && (
                <div style={{ position: "relative", paddingBottom: 0 }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, opacity: .4 }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contato..." style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: 12, border: `1.5px solid ${t.inputBorder}`, background: t.input, fontSize: "15px", color: t.text, outline: "none", boxSizing: "border-box" }} />
                </div>
              )}
              {/* Tab bar */}
              <div className="mobile-tab-bar" style={{ display: "flex", marginTop: 10 }}>
                <button onClick={() => setTab("contacts")} style={{ flex: 1, padding: "11px", background: "none", border: "none", borderBottom: tab === "contacts" ? `2.5px solid ${t.accent}` : "2.5px solid transparent", color: tab === "contacts" ? t.accent : t.textMuted, fontWeight: tab === "contacts" ? 700 : 400, fontSize: 13, cursor: "pointer" }}>📒 Contatos</button>
                <button onClick={() => setTab("calendar")} style={{ flex: 1, padding: "11px", background: "none", border: "none", borderBottom: tab === "calendar" ? `2.5px solid ${t.accent}` : "2.5px solid transparent", color: tab === "calendar" ? t.accent : t.textMuted, fontWeight: tab === "calendar" ? 700 : 400, fontSize: 13, cursor: "pointer", position: "relative" }}>
                  📅 Calendário
                  {todayAppts > 0 && <span style={{ position: "absolute", top: 8, right: "calc(50% - 36px)", background: t.accent, color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{todayAppts}</span>}
                </button>
              </div>
            </div>

            {/* Desktop split / Mobile single */}
            <div className="desktop-split" style={{ display: "block" }}>
              {/* Contacts panel */}
              <div className="desktop-panel desktop-always-show" style={{ display: tab === "contacts" ? "block" : "none" }}>
                <div style={{ padding: "16px 14px 110px" }}>
                  {filtered.length === 0
                    ? <div style={{ textAlign: "center", padding: "64px 0" }}>
                        <div style={{ fontSize: 56, marginBottom: 14 }}>{search ? "🔍" : "📒"}</div>
                        <p style={{ fontFamily: "Georgia,serif", fontSize: 18, color: t.textSub, fontStyle: "italic" }}>{search ? "Nenhum contato encontrado" : "A agenda está vazia"}</p>
                        <p style={{ fontSize: 13, color: t.textMuted, marginTop: 8, lineHeight: 1.6 }}>{search ? "Tente outro termo" : "Adicione o mecânico do pai,\no médico da família..."}</p>
                      </div>
                    : layout === "grid"
                      ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12 }}>{filtered.map(c => <ContactCardGrid key={c.id} contact={c} onDelete={() => deleteContact(c.id)} onTap={() => setSelectedContact(c)} dark={dark} />)}</div>
                      : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{filtered.map(c => <ContactCardList key={c.id} contact={c} onDelete={() => deleteContact(c.id)} onTap={() => setSelectedContact(c)} dark={dark} />)}</div>}
                </div>
                <button onClick={() => setShowAdd(true)} style={{ position: "fixed", bottom: 24, right: 20, zIndex: 500, background: `linear-gradient(135deg,${t.accent},${t.accentDark})`, color: "#fff", border: "none", borderRadius: 60, padding: "16px 22px", display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: `0 8px 28px ${t.accent}80`, WebkitTapHighlightColor: "transparent" }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Novo contato
                </button>
              </div>
              {/* Calendar panel */}
              <div className="desktop-always-show" style={{ display: tab === "calendar" ? "block" : "none" }}>
                <CalendarScreen appointments={appointments} members={members} contacts={contacts} currentMember={currentMember} familyCode={family.code} onAdd={addAppointment} onDelete={deleteAppointment} onToast={setToast} dark={dark} />
              </div>
            </div>
          </div>
        )}

        {loading && <Loader text={loadingText} dark={dark} />}
        {showAdd && <AddModal onSave={addContact} onClose={() => setShowAdd(false)} dark={dark} />}
        {showMembers && family && <MembersModal members={members} family={family} onClose={() => setShowMembers(false)} onToast={setToast} dark={dark} />}
        {showSettings && family && <SettingsModal family={family} dark={dark} onToggleDark={toggleDark} onClose={() => setShowSettings(false)} onToast={setToast} onFamilyUpdate={setFamily} onShowHowTo={() => setShowHowTo(true)} />}
        {showHowTo && <HowToModal onClose={() => { setShowHowTo(false); localStorage.setItem("df_howto_done", "1"); }} dark={dark} />}
        {selectedContact && !editingContact && <ContactDetail contact={selectedContact} members={members} currentMember={currentMember} familyCode={family?.code} onClose={() => setSelectedContact(null)} onUpdate={updateContact} onEdit={() => setEditingContact(selectedContact)} onToast={setToast} onPin={togglePin} dark={dark} />}
        {editingContact && <EditModal contact={editingContact} onSave={saveEditContact} onClose={() => setEditingContact(null)} dark={dark} />}
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}
