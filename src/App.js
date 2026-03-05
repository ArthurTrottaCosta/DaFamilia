import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://szjwvmfwikruczkvbcpy.supabase.co",
  "sb_publishable_px91bnDnthtn-2R6-WuTVQ_ecukGXuY"
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function formatPhone(v) {
  const n = v.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function rawPhone(p) { return p.replace(/\D/g, ""); }

async function hashPassword(password) {
  const encoded = new TextEncoder().encode(password + "dafamilia_salt_2024");
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const fS = {
  width: "100%", padding: "14px 16px", borderRadius: 14, border: "1.5px solid #e0c9a8",
  background: "rgba(255,255,255,.9)", fontFamily: "Georgia,serif", fontSize: "16px", color: "#1e1006",
  marginBottom: 11, outline: "none", boxSizing: "border-box", WebkitAppearance: "none",
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  const cb = useCallback(onClose, [onClose]);
  useEffect(() => { const t = setTimeout(cb, 3000); return () => clearTimeout(t); }, [cb]);
  return (
    <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: "#1a0f00", color: "#fdf0e0", padding: "11px 22px", borderRadius: 50, fontSize: 13, zIndex: 9999, whiteSpace: "nowrap", boxShadow: "0 6px 28px rgba(0,0,0,.35)", pointerEvents: "none" }}>{msg}</div>
  );
}

// ── Loader ────────────────────────────────────────────────────────────────────
function Loader({ text }) {
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(253,247,238,.95)", zIndex: 9998, gap: 14 }}>
      <div style={{ fontSize: 44, animation: "spin 1s linear infinite" }}>🏡</div>
      {text && <p style={{ fontFamily: "Georgia,serif", fontSize: 14, color: "#9a6c3a" }}>{text}</p>}
    </div>
  );
}

// ── Nudge Banner ──────────────────────────────────────────────────────────────
function NudgeBanner({ nudges, onDismiss, onAction }) {
  const n = nudges[0];
  if (!n) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480, zIndex: 2000,
      background: "linear-gradient(135deg,#b85e22,#8f4214)",
      padding: "16px 18px 18px", boxShadow: "0 8px 32px rgba(0,0,0,.3)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <p style={{ color: "rgba(255,255,255,.8)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px" }}>
            👋 {n.from_member} quer que você:
          </p>
          <p style={{ color: "#fff", fontFamily: "Georgia,serif", fontSize: 17, fontWeight: 700, marginTop: 4 }}>
            {n.action === "call" ? "📞 Ligue" : "💬 Mande mensagem"} para {n.contact_emoji} {n.contact_name}
          </p>
        </div>
        <button onClick={() => onDismiss(n.id)} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {n.action === "call" ? (
          <a href={`tel:${rawPhone(n.contact_phone)}`} onClick={() => onDismiss(n.id)} style={{ flex: 1, padding: "11px", borderRadius: 12, background: "rgba(255,255,255,.2)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14, textAlign: "center", border: "1.5px solid rgba(255,255,255,.4)" }}>
            📞 Ligar agora
          </a>
        ) : (
          <a href={`https://wa.me/55${rawPhone(n.contact_phone)}`} target="_blank" rel="noreferrer" onClick={() => onDismiss(n.id)} style={{ flex: 1, padding: "11px", borderRadius: 12, background: "rgba(255,255,255,.2)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14, textAlign: "center", border: "1.5px solid rgba(255,255,255,.4)" }}>
            💬 WhatsApp agora
          </a>
        )}
        <button onClick={() => onDismiss(n.id)} style={{ padding: "11px 16px", borderRadius: 12, background: "transparent", color: "rgba(255,255,255,.7)", border: "1.5px solid rgba(255,255,255,.2)", fontSize: 13, cursor: "pointer" }}>
          Depois
        </button>
      </div>
      {nudges.length > 1 && (
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: 11, marginTop: 8, textAlign: "center" }}>+{nudges.length - 1} cutucada{nudges.length - 1 > 1 ? "s" : ""} pendente{nudges.length - 1 > 1 ? "s" : ""}</p>
      )}
    </div>
  );
}

// ── Send Nudge Modal ──────────────────────────────────────────────────────────
function NudgeModal({ contact, members, currentMember, familyCode, onClose, onSent }) {
  const [target, setTarget] = useState("");
  const [action, setAction] = useState("call");
  const [sending, setSending] = useState(false);
  const otherMembers = members.filter(m => m.name !== currentMember);

  async function send() {
    if (!target || sending) return;
    setSending(true);
    await supabase.from("nudges").insert({
      family_code: familyCode,
      from_member: currentMember,
      to_member: target,
      contact_id: contact.id,
      contact_name: contact.name,
      contact_phone: contact.phone,
      contact_emoji: contact.emoji,
      action,
      seen: false
    });
    setSending(false);
    onSent(`Cutucada enviada para ${target}! 👋`);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,5,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fdf6ed", borderRadius: "26px 26px 0 0", padding: "24px 18px 40px", width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: "#ddd", borderRadius: 4, margin: "0 auto 20px" }} />
        <h2 style={{ fontFamily: "Georgia,serif", fontSize: 21, color: "#1e1006", marginBottom: 6, fontWeight: 700 }}>👋 Cutucar alguém</h2>
        <p style={{ fontSize: 13, color: "#9a6c3a", marginBottom: 20, lineHeight: 1.5 }}>
          Manda uma notificação para alguém da família entrar em contato com {contact.emoji} <strong>{contact.name}</strong>.
        </p>

        {/* Ação */}
        <p style={{ fontSize: 11, color: "#9a6c3a", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>O que fazer?</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setAction("call")} style={{ padding: "13px", borderRadius: 14, border: action === "call" ? "2px solid #b85e22" : "2px solid #e0c9a8", background: action === "call" ? "rgba(184,94,34,.08)" : "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14, color: action === "call" ? "#b85e22" : "#7a5228" }}>
            📞 Ligar
          </button>
          <button onClick={() => setAction("whatsapp")} style={{ padding: "13px", borderRadius: 14, border: action === "whatsapp" ? "2px solid #25d366" : "2px solid #e0c9a8", background: action === "whatsapp" ? "rgba(37,211,102,.08)" : "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14, color: action === "whatsapp" ? "#128c7e" : "#7a5228" }}>
            💬 WhatsApp
          </button>
        </div>

        {/* Quem cutucar */}
        <p style={{ fontSize: 11, color: "#9a6c3a", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Quem cutucar?</p>
        {otherMembers.length === 0 ? (
          <p style={{ fontFamily: "Georgia,serif", fontSize: 14, color: "#b09070", fontStyle: "italic", marginBottom: 20 }}>Nenhum outro membro na família ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {otherMembers.map((m, i) => (
              <button key={i} onClick={() => setTarget(m.name)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
                borderRadius: 14, border: target === m.name ? "2px solid #b85e22" : "2px solid #e0c9a8",
                background: target === m.name ? "rgba(184,94,34,.08)" : "rgba(255,255,255,.8)",
                cursor: "pointer", textAlign: "left"
              }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#b85e22,#8f4214)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{m.name[0].toUpperCase()}</div>
                <span style={{ fontFamily: "Georgia,serif", fontSize: 16, color: "#1e1006", fontWeight: target === m.name ? 700 : 400 }}>{m.name}</span>
                {target === m.name && <span style={{ marginLeft: "auto", color: "#b85e22" }}>✓</span>}
              </button>
            ))}
          </div>
        )}

        <button onClick={send} disabled={!target || sending} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: target ? "linear-gradient(135deg,#b85e22,#8f4214)" : "#e0d0bc", color: target ? "#fff" : "#bba07a", fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17, cursor: target ? "pointer" : "not-allowed", boxShadow: target ? "0 6px 20px rgba(184,94,34,.4)" : "none" }}>
          {sending ? "Enviando..." : "👋 Cutucar!"}
        </button>
      </div>
    </div>
  );
}

// ── Emoji Input ───────────────────────────────────────────────────────────────
function EmojiInput({ value, onChange }) {
  function handleInput(e) {
    const chars = [...e.target.value].filter(c => c.codePointAt(0) > 255);
    if (chars.length > 0) onChange(chars[0]);
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 11, color: "#9a6c3a", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".5px" }}>Ícone do contato</p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,.9)", borderRadius: 14, border: "1.5px solid #e0c9a8", padding: "12px 16px" }}>
        <span style={{ fontSize: 40 }}>{value}</span>
        <div style={{ flex: 1 }}>
          <input value="" onChange={handleInput} placeholder="Toque aqui e escolha um emoji 😊"
            style={{ width: "100%", border: "none", background: "transparent", fontSize: 15, fontFamily: "Georgia,serif", color: "#5a3818", outline: "none" }} />
          <p style={{ fontSize: 11, color: "#b09070", marginTop: 3 }}>Celular: toque no 🌐 ou 😊 do teclado</p>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ contact, onSave, onClose }) {
  const [name, setName] = useState(contact.name || "");
  const [label, setLabel] = useState(contact.label || "");
  const [est, setEst] = useState(contact.establishment || "");
  const [phone, setPhone] = useState(contact.phone || "");
  const [emoji, setEmoji] = useState(contact.emoji || "⭐");
  const [saving, setSaving] = useState(false);
  const valid = name.trim() && phone.replace(/\D/g, "").length >= 8;

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true);
    await onSave({ ...contact, name: name.trim(), label: label.trim(), establishment: est.trim(), phone, emoji });
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,5,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1050, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fdf6ed", borderRadius: "26px 26px 0 0", padding: "24px 18px 40px", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: "#ddd", borderRadius: 4, margin: "0 auto 20px" }} />
        <h2 style={{ fontFamily: "Georgia,serif", fontSize: 22, color: "#1e1006", marginBottom: 18, fontWeight: 700 }}>Editar contato</h2>
        <EmojiInput value={emoji} onChange={setEmoji} />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome *" style={fS} />
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Tipo (ex: Mecânico, Médico...)" style={fS} />
        <input value={est} onChange={e => setEst(e.target.value)} placeholder="Estabelecimento (opcional)" style={fS} />
        <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="Telefone *" style={fS} inputMode="numeric" />
        <button onClick={handleSave} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: valid ? "linear-gradient(135deg,#b85e22,#8f4214)" : "#e0d0bc", color: valid ? "#fff" : "#bba07a", fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17, cursor: valid ? "pointer" : "not-allowed" }}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}

// ── Contact Detail ────────────────────────────────────────────────────────────
function ContactDetail({ contact, members, currentMember, familyCode, onClose, onUpdate, onEdit, onToast }) {
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState(contact.description || "");
  const [editDesc, setEditDesc] = useState(false);
  const [interactions, setInteractions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    supabase.from("interactions").select("*").eq("contact_id", contact.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setInteractions(data); });
  }, [contact.id]);

  async function saveDesc() {
    await supabase.from("contacts").update({ description: desc }).eq("id", contact.id);
    onUpdate({ ...contact, description: desc });
    setEditDesc(false);
  }

  async function addLog() {
    if (!note.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("interactions").insert({ contact_id: contact.id, note: note.trim(), amount: amount.trim() || null }).select().single();
    if (data) setInteractions([data, ...interactions]);
    setNote(""); setAmount(""); setSaving(false);
    onToast("Interação registrada! ✅");
  }

  const phone = rawPhone(contact.phone);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(10,5,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ background: "#fdf6ed", borderRadius: "26px 26px 0 0", padding: "20px 18px 40px", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", overscrollBehavior: "contain" }}>
          <div style={{ width: 36, height: 4, background: "#ddd", borderRadius: 4, margin: "0 auto 18px" }} />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid #f0dfc4" }}>
            <span style={{ fontSize: 50 }}>{contact.emoji}</span>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 22, color: "#1e1006", fontWeight: 800 }}>{contact.name}</h2>
              {contact.label && <p style={{ fontSize: 11, color: "#9a6c3a", textTransform: "uppercase", letterSpacing: ".5px", marginTop: 2 }}>{contact.label}</p>}
              {contact.establishment && <p style={{ fontFamily: "Georgia,serif", fontSize: 13, color: "#5a3818", fontStyle: "italic", marginTop: 2 }}>{contact.establishment}</p>}
              <p style={{ fontSize: 13, color: "#7a5228", marginTop: 4 }}>{contact.phone}</p>
            </div>
            <button onClick={onEdit} style={{ flexShrink: 0, background: "rgba(184,94,34,.1)", border: "1.5px solid rgba(184,94,34,.25)", borderRadius: 12, padding: "8px 12px", fontSize: 13, color: "#b85e22", cursor: "pointer", fontWeight: 600 }}>✏️ Editar</button>
          </div>

          {/* Action buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            <a href={`tel:${phone}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "13px 8px", borderRadius: 14, background: "linear-gradient(135deg,#b85e22,#8f4214)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13, boxShadow: "0 4px 14px rgba(184,94,34,.35)" }}>
              <span style={{ fontSize: 20 }}>📞</span> Ligar
            </a>
            <a href={`https://wa.me/55${phone}`} target="_blank" rel="noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "13px 8px", borderRadius: 14, background: "linear-gradient(135deg,#25d366,#128c7e)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13, boxShadow: "0 4px 14px rgba(37,211,102,.3)" }}>
              <span style={{ fontSize: 20 }}>💬</span> WhatsApp
            </a>
            <button onClick={() => setShowNudge(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "13px 8px", borderRadius: 14, background: "linear-gradient(135deg,#f39c12,#d68910)", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 14px rgba(243,156,18,.35)" }}>
              <span style={{ fontSize: 20 }}>👋</span> Cutucar
            </button>
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: "#9a6c3a", textTransform: "uppercase", letterSpacing: ".5px" }}>Descrição</p>
              {!editDesc && <button onClick={() => setEditDesc(true)} style={{ background: "none", border: "none", fontSize: 12, color: "#b85e22", cursor: "pointer" }}>✏️ Editar</button>}
            </div>
            {editDesc ? (
              <div>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Atende aos sábados, pedir pelo João, aceita Pix..."
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #e0c9a8", background: "#fff", fontFamily: "Georgia,serif", fontSize: 14, color: "#1e1006", outline: "none", resize: "vertical", minHeight: 80, boxSizing: "border-box" }} />
                <button onClick={saveDesc} style={{ marginTop: 6, padding: "8px 18px", borderRadius: 10, border: "none", background: "#b85e22", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Salvar</button>
              </div>
            ) : (
              <p style={{ fontFamily: "Georgia,serif", fontSize: 14, color: desc ? "#3a2008" : "#b09070", fontStyle: desc ? "normal" : "italic", lineHeight: 1.6 }}>
                {desc || "Nenhuma descrição. Toque em editar para adicionar."}
              </p>
            )}
          </div>

          {/* Registrar interação */}
          <div style={{ background: "rgba(184,94,34,.06)", borderRadius: 16, padding: "16px 14px", marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: "#9a6c3a", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>📝 Registrar interação</p>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="O que foi feito? (ex: troquei os freios, pedi pizza...)" style={{ ...fS, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Valor gasto (opcional)" style={{ ...fS, flex: 1, marginBottom: 0 }} />
              <button onClick={addLog} disabled={saving} style={{ padding: "14px 18px", borderRadius: 14, border: "none", background: note.trim() ? "#b85e22" : "#ddd", color: note.trim() ? "#fff" : "#aaa", fontWeight: 700, fontSize: 14, cursor: note.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
                {saving ? "..." : "+ Salvar"}
              </button>
            </div>
          </div>

          {/* Histórico */}
          <div>
            <p style={{ fontSize: 11, color: "#9a6c3a", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>🕐 Histórico</p>
            {interactions.length === 0 ? (
              <p style={{ fontFamily: "Georgia,serif", fontSize: 13, color: "#b09070", fontStyle: "italic" }}>Nenhuma interação registrada ainda.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {interactions.map(entry => (
                  <div key={entry.id} style={{ background: "rgba(255,255,255,.8)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(210,170,110,.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "#9a6c3a" }}>{formatDate(entry.created_at)}</span>
                      {entry.amount && <span style={{ fontSize: 12, fontWeight: 700, color: "#b85e22" }}>💰 {entry.amount}</span>}
                    </div>
                    <p style={{ fontFamily: "Georgia,serif", fontSize: 14, color: "#3a2008", lineHeight: 1.5 }}>{entry.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showNudge && (
        <NudgeModal
          contact={contact}
          members={members}
          currentMember={currentMember}
          familyCode={familyCode}
          onClose={() => setShowNudge(false)}
          onSent={onToast}
        />
      )}
    </>
  );
}

// ── Contact Cards ─────────────────────────────────────────────────────────────
function ContactCardGrid({ contact, onDelete, onTap }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div onClick={() => !confirm && onTap()} style={{ background: "rgba(255,255,255,.8)", borderRadius: 20, padding: "18px 12px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, position: "relative", cursor: "pointer", boxShadow: "0 2px 18px rgba(100,50,0,.09)", border: "1px solid rgba(210,170,110,.3)", WebkitTapHighlightColor: "transparent" }}>
      <div style={{ fontSize: 38, lineHeight: 1 }}>{contact.emoji}</div>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 14, fontWeight: 700, color: "#1e1006", textAlign: "center", lineHeight: 1.25, wordBreak: "break-word", width: "100%" }}>{contact.name}</div>
      {contact.label && <div style={{ fontSize: 10, color: "#9a6c3a", textAlign: "center", textTransform: "uppercase", letterSpacing: ".4px" }}>{contact.label}</div>}
      {contact.establishment && <div style={{ fontFamily: "Georgia,serif", fontSize: 11, color: "#5a3818", textAlign: "center", fontStyle: "italic" }}>{contact.establishment}</div>}
      <div style={{ marginTop: 4, background: "#b85e22", color: "#fff", borderRadius: 30, padding: "5px 12px", fontSize: 11, fontWeight: 700 }}>{contact.phone}</div>
      {contact.last_interaction && <div style={{ marginTop: 4, fontSize: 10, color: "#9a6c3a", textAlign: "center", lineHeight: 1.4 }}>Último:<br /><span style={{ color: "#b85e22", fontWeight: 600 }}>{formatDate(contact.last_interaction)}</span></div>}
      {!confirm ? (
        <button onClick={e => { e.stopPropagation(); setConfirm(true); }} style={{ position: "absolute", top: 8, right: 9, background: "none", border: "none", fontSize: 14, cursor: "pointer", opacity: .25, color: "#1e1006", padding: 4 }}>✕</button>
      ) : (
        <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4, zIndex: 2 }}>
          <button onClick={onDelete} style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>Sim</button>
          <button onClick={() => setConfirm(false)} style={{ background: "#bbb", border: "none", borderRadius: 8, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>Não</button>
        </div>
      )}
    </div>
  );
}

function ContactCardList({ contact, onDelete, onTap }) {
  const [confirm, setConfirm] = useState(false);
  const phone = rawPhone(contact.phone);
  return (
    <div style={{ background: "rgba(255,255,255,.8)", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, position: "relative", boxShadow: "0 2px 12px rgba(100,50,0,.07)", border: "1px solid rgba(210,170,110,.3)" }}>
      <div onClick={() => !confirm && onTap()} style={{ fontSize: 36, lineHeight: 1, cursor: "pointer", flexShrink: 0 }}>{contact.emoji}</div>
      <div onClick={() => !confirm && onTap()} style={{ flex: 1, cursor: "pointer", minWidth: 0 }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 15, fontWeight: 700, color: "#1e1006", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contact.name}</div>
        {contact.label && <div style={{ fontSize: 10, color: "#9a6c3a", textTransform: "uppercase", letterSpacing: ".4px" }}>{contact.label}</div>}
        {contact.establishment && <div style={{ fontFamily: "Georgia,serif", fontSize: 12, color: "#5a3818", fontStyle: "italic" }}>{contact.establishment}</div>}
        <div style={{ fontSize: 12, color: "#7a5228", marginTop: 2 }}>{contact.phone}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <a href={`tel:${phone}`} onClick={e => e.stopPropagation()} style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#b85e22,#8f4214)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16 }}>📞</a>
        <a href={`https://wa.me/55${phone}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#25d366,#128c7e)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16 }}>💬</a>
      </div>
      {!confirm ? (
        <button onClick={e => { e.stopPropagation(); setConfirm(true); }} style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", fontSize: 13, cursor: "pointer", opacity: .25, color: "#1e1006", padding: 2 }}>✕</button>
      ) : (
        <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 6, right: 8, display: "flex", gap: 4, zIndex: 2 }}>
          <button onClick={onDelete} style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>Sim</button>
          <button onClick={() => setConfirm(false)} style={{ background: "#bbb", border: "none", borderRadius: 8, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>Não</button>
        </div>
      )}
    </div>
  );
}

// ── Add Modal ─────────────────────────────────────────────────────────────────
function AddModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [est, setEst] = useState("");
  const [phone, setPhone] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const [saving, setSaving] = useState(false);
  const valid = name.trim() && phone.replace(/\D/g, "").length >= 8;

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true);
    await onSave({ name: name.trim(), label: label.trim(), establishment: est.trim(), phone, emoji });
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,5,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fdf6ed", borderRadius: "26px 26px 0 0", padding: "24px 18px 40px", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: "#ddd", borderRadius: 4, margin: "0 auto 20px" }} />
        <h2 style={{ fontFamily: "Georgia,serif", fontSize: 22, color: "#1e1006", marginBottom: 18, fontWeight: 700 }}>Novo contato da família</h2>
        <EmojiInput value={emoji} onChange={setEmoji} />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome *" style={fS} />
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Tipo (ex: Mecânico, Médico...)" style={fS} />
        <input value={est} onChange={e => setEst(e.target.value)} placeholder="Estabelecimento (opcional)" style={fS} />
        <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="Telefone *" style={fS} inputMode="numeric" />
        <button onClick={handleSave} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: valid ? "linear-gradient(135deg,#b85e22,#8f4214)" : "#e0d0bc", color: valid ? "#fff" : "#bba07a", fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17, cursor: valid ? "pointer" : "not-allowed" }}>
          {saving ? "Salvando..." : "Salvar contato"}
        </button>
      </div>
    </div>
  );
}

// ── Members Modal ─────────────────────────────────────────────────────────────
function MembersModal({ members, family, onClose, onToast }) {
  function shareFamily() {
    const msg = `Oi! Entrei no *DaFamília* 🏡\n\nVem guardar os contatos da nossa família comigo!\n\n👉 https://da-familia.vercel.app\n🔑 Código: *${family.code}*\n🔒 Peça a senha pra mim`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    onToast("Compartilhando via WhatsApp! 🚀");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,5,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fdf6ed", borderRadius: "26px 26px 0 0", padding: "24px 18px 40px", width: "100%", maxWidth: 480, maxHeight: "70vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: "#ddd", borderRadius: 4, margin: "0 auto 20px" }} />
        <h2 style={{ fontFamily: "Georgia,serif", fontSize: 20, color: "#1e1006", marginBottom: 6, fontWeight: 700 }}>👨‍👩‍👧‍👦 Membros da família</h2>
        <p style={{ fontSize: 13, color: "#9a6c3a", marginBottom: 18 }}>Convide mais pessoas!</p>
        <div style={{ background: "rgba(184,94,34,.06)", borderRadius: 16, padding: "16px 14px", marginBottom: 20, border: "1.5px solid rgba(184,94,34,.15)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 10, border: "1px solid #e0c9a8" }}>
            <div>
              <p style={{ fontSize: 11, color: "#9a6c3a" }}>Código da família</p>
              <p style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 800, color: "#b85e22", letterSpacing: "4px" }}>{family.code}</p>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(family.code); onToast("Código copiado! 📋"); }} style={{ background: "rgba(184,94,34,.1)", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#b85e22", cursor: "pointer", fontWeight: 600 }}>Copiar</button>
          </div>
          <button onClick={shareFamily} style={{ width: "100%", padding: "13px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#25d366,#128c7e)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            💬 Compartilhar no WhatsApp
          </button>
        </div>
        {members.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,.7)", borderRadius: 12, marginBottom: 8, border: "1px solid rgba(210,170,110,.25)" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#b85e22,#8f4214)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>{m.name[0].toUpperCase()}</div>
            <span style={{ fontFamily: "Georgia,serif", fontSize: 16, color: "#1e1006" }}>{m.name}</span>
            {m.joined_at && <span style={{ marginLeft: "auto", fontSize: 11, color: "#9a6c3a" }}>{formatDate(m.joined_at)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [family, setFamily] = useState(null);
  const [currentMember, setCurrentMember] = useState("");
  const [contacts, setContacts] = useState([]);
  const [members, setMembers] = useState([]);
  const [nudges, setNudges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [layout, setLayout] = useState(() => localStorage.getItem("df_layout") || "grid");
  const [search, setSearch] = useState("");
  const [memberName, setMemberName] = useState("");
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPass, setJoinPass] = useState("");
  const [yourName, setYourName] = useState("");
  const [err, setErr] = useState("");
  const nudgeInterval = useRef(null);

  const bg = "radial-gradient(ellipse at 25% 0%,#f7e4c4 0%,#fdf7ee 50%,#ede4d4 100%)";

  // ── Auto-login ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("df_session");
    if (saved) {
      try {
        const { familyCode, memberNameSaved } = JSON.parse(saved);
        if (familyCode) {
          setLoadingText("Carregando sua família...");
          setLoading(true);
          supabase.from("families").select("*").eq("code", familyCode).single()
            .then(({ data: f }) => {
              if (f) {
                setFamily(f);
                setCurrentMember(memberNameSaved || "");
                return fetchFamilyData(familyCode);
              } else {
                localStorage.removeItem("df_session");
              }
            })
            .then(() => { setScreen("family"); setLoading(false); setLoadingText(""); })
            .catch(() => { setLoading(false); setLoadingText(""); });
        }
      } catch (e) { localStorage.removeItem("df_session"); }
    }
  }, []);

  // ── Poll nudges ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen === "family" && currentMember && family) {
      checkNudges();
      nudgeInterval.current = setInterval(checkNudges, 15000);
    }
    return () => clearInterval(nudgeInterval.current);
  }, [screen, currentMember, family]);

  async function checkNudges() {
    if (!currentMember || !family) return;
    const { data } = await supabase.from("nudges")
      .select("*").eq("family_code", family.code)
      .eq("to_member", currentMember).eq("seen", false)
      .order("created_at", { ascending: true });
    if (data && data.length > 0) setNudges(data);
  }

  async function dismissNudge(id) {
    await supabase.from("nudges").update({ seen: true }).eq("id", id);
    setNudges(prev => prev.filter(n => n.id !== id));
  }

  function saveSession(f, name) {
    localStorage.setItem("df_session", JSON.stringify({ familyCode: f.code, memberNameSaved: name }));
  }

  function toggleLayout(l) { setLayout(l); localStorage.setItem("df_layout", l); }

  async function fetchFamilyData(code) {
    const [{ data: cs }, { data: ms }] = await Promise.all([
      supabase.from("contacts").select("*").eq("family_code", code).order("created_at"),
      supabase.from("members").select("*").eq("family_code", code).order("joined_at")
    ]);
    setContacts(cs || []);
    setMembers(ms || []);
  }

  async function createFamily() {
    if (!newFamilyName.trim() || !newPass.trim() || !memberName.trim()) return;
    setLoadingText("Criando sua família...");
    setLoading(true);
    const code = generateCode();
    const hashed = await hashPassword(newPass.trim());
    const { error } = await supabase.from("families").insert({ code, name: newFamilyName.trim(), password: hashed });
    if (error) { setLoading(false); setLoadingText(""); setErr("Erro ao criar família."); return; }
    await supabase.from("members").insert({ family_code: code, name: memberName.trim() });
    const { data: f } = await supabase.from("families").select("*").eq("code", code).single();
    setFamily(f); setCurrentMember(memberName.trim()); saveSession(f, memberName.trim());
    await fetchFamilyData(code);
    setScreen("family"); setLoading(false); setLoadingText("");
    setToast(`Família criada! Código: ${code}`);
  }

  async function joinFamily() {
    const code = joinCode.trim().toUpperCase();
    if (!yourName.trim()) { setErr("Digite seu nome 👤"); return; }
    setLoadingText("Entrando na família...");
    setLoading(true);
    const { data: f } = await supabase.from("families").select("*").eq("code", code).single();
    if (!f) { setLoading(false); setLoadingText(""); setErr("Família não encontrada 😕"); return; }
    const hashed = await hashPassword(joinPass.trim());
    if (f.password !== hashed) { setLoading(false); setLoadingText(""); setErr("Senha incorreta 🔒"); return; }
    // Evitar membro duplicado
    const { data: existing } = await supabase.from("members").select("*").eq("family_code", code).eq("name", yourName.trim());
    if (!existing || existing.length === 0) {
      await supabase.from("members").insert({ family_code: code, name: yourName.trim() });
    }
    setFamily(f); setCurrentMember(yourName.trim()); saveSession(f, yourName.trim());
    await fetchFamilyData(code);
    setScreen("family"); setLoading(false); setLoadingText("");
    setToast(`Bem-vindo à família ${f.name}! 🏠`);
  }

  async function addContact(c) {
    const { data } = await supabase.from("contacts").insert({ family_code: family.code, name: c.name, label: c.label, establishment: c.establishment, phone: c.phone, emoji: c.emoji, description: "" }).select().single();
    if (data) setContacts([...contacts, data]);
    setShowAdd(false); setToast("Contato adicionado! ✅");
  }

  async function saveEditContact(updated) {
    await supabase.from("contacts").update({ name: updated.name, label: updated.label, establishment: updated.establishment, phone: updated.phone, emoji: updated.emoji }).eq("id", updated.id);
    const newContact = { ...selectedContact, ...updated };
    setContacts(contacts.map(c => c.id === updated.id ? newContact : c));
    setEditingContact(null);
    setSelectedContact(newContact);
    setToast("Contato atualizado! ✅");
  }

  async function deleteContact(id) {
    await supabase.from("contacts").delete().eq("id", id);
    setContacts(contacts.filter(c => c.id !== id));
    setToast("Contato removido");
  }

  function updateContact(updated) {
    setContacts(contacts.map(c => c.id === updated.id ? updated : c));
    setSelectedContact(updated);
  }

  function reset() {
    localStorage.removeItem("df_session");
    clearInterval(nudgeInterval.current);
    setFamily(null); setContacts([]); setMembers([]); setNudges([]);
    setCurrentMember(""); setScreen("home");
    setNewFamilyName(""); setNewPass(""); setJoinCode(""); setJoinPass("");
    setYourName(""); setMemberName(""); setErr(""); setSearch("");
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.label || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.establishment || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        input:focus, textarea:focus { border-color:#b85e22 !important; box-shadow:0 0 0 3px rgba(184,94,34,.12); }
        ::-webkit-scrollbar { width:0; }
        body { overscroll-behavior:none; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
      <div style={{ minHeight: "100vh", background: bg, fontFamily: "system-ui,sans-serif", maxWidth: 480, margin: "0 auto" }}>

        {/* NUDGE BANNER */}
        <NudgeBanner nudges={nudges} onDismiss={dismissNudge} />

        {/* HOME */}
        {screen === "home" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "32px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <div style={{ fontSize: 72, marginBottom: 8 }}>🏡</div>
              <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 48, fontWeight: 800, color: "#1e1006", letterSpacing: "-1.5px", lineHeight: .95 }}>
                Da<span style={{ color: "#b85e22" }}>Família</span>
              </h1>
              <p style={{ color: "#7a5228", fontSize: 14, margin: "14px auto 0", lineHeight: 1.65, maxWidth: 260 }}>
                A agenda de contatos da sua família, preservada de geração em geração.
              </p>
            </div>
            <div style={{ width: 44, height: 2, background: "linear-gradient(90deg,transparent,#b85e22,transparent)", marginBottom: 40 }} />
            <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 13 }}>
              <button onClick={() => setScreen("create")} style={{ padding: "18px 24px", borderRadius: 18, border: "none", background: "linear-gradient(135deg,#b85e22,#8f4214)", color: "#fff", fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(184,94,34,.45)", WebkitTapHighlightColor: "transparent" }}>✨ Criar minha família</button>
              <button onClick={() => { setScreen("join"); setErr(""); }} style={{ padding: "18px 24px", borderRadius: 18, border: "2px solid #ddc9a4", background: "rgba(255,255,255,.75)", color: "#5a3818", fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>🔗 Entrar em uma família</button>
            </div>
            <p style={{ marginTop: 32, fontSize: 12, color: "#b09070", textAlign: "center", lineHeight: 1.7, maxWidth: 230 }}>
              Nunca mais vai no mecânico errado 😄<br />Compartilhe o código com a família.
            </p>
          </div>
        )}

        {/* CREATE */}
        {screen === "create" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "32px 24px" }}>
            <div style={{ width: "100%", maxWidth: 360 }}>
              <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: "#7a5228", cursor: "pointer", fontSize: 14, marginBottom: 28, padding: 0 }}>← Voltar</button>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 34, color: "#1e1006", marginBottom: 8, fontWeight: 800 }}>Criar família</h2>
              <p style={{ color: "#7a5228", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>Você vai receber um código para convidar os membros.</p>
              <input value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="Seu nome 👤 *" style={fS} />
              <input value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} placeholder="Nome da família (ex: Família Silva)" style={fS} />
              <input value={newPass} onChange={e => setNewPass(e.target.value)} type="password" placeholder="Crie uma senha" style={fS} />
              {err && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 10 }}>{err}</p>}
              <button onClick={createFamily} style={{ width: "100%", padding: "17px", borderRadius: 16, border: "none", marginTop: 6, background: newFamilyName && newPass && memberName ? "linear-gradient(135deg,#b85e22,#8f4214)" : "#e0d0bc", color: newFamilyName && newPass && memberName ? "#fff" : "#c0a882", fontFamily: "'Playfair Display',Georgia,serif", fontSize: 19, fontWeight: 700, cursor: newFamilyName && newPass && memberName ? "pointer" : "not-allowed", WebkitTapHighlightColor: "transparent" }}>Criar família 🏡</button>
            </div>
          </div>
        )}

        {/* JOIN */}
        {screen === "join" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "32px 24px" }}>
            <div style={{ width: "100%", maxWidth: 360 }}>
              <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: "#7a5228", cursor: "pointer", fontSize: 14, marginBottom: 28, padding: 0 }}>← Voltar</button>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 34, color: "#1e1006", marginBottom: 8, fontWeight: 800 }}>Entrar na família</h2>
              <p style={{ color: "#7a5228", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>Peça o código de 6 letras para um membro da família.</p>
              <input value={yourName} onChange={e => { setYourName(e.target.value); setErr(""); }} placeholder="Seu nome 👤 *" style={fS} />
              <input value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setErr(""); }} maxLength={6} placeholder="CÓDIGO" style={{ ...fS, fontSize: "28px", textAlign: "center", letterSpacing: "10px", fontWeight: 800, fontFamily: "Georgia,serif" }} />
              <input value={joinPass} onChange={e => { setJoinPass(e.target.value); setErr(""); }} type="password" placeholder="Senha da família" style={fS} />
              {err && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 10, textAlign: "center" }}>{err}</p>}
              <button onClick={joinFamily} style={{ width: "100%", padding: "17px", borderRadius: 16, border: "none", background: joinCode.length === 6 && joinPass && yourName ? "linear-gradient(135deg,#b85e22,#8f4214)" : "#e0d0bc", color: joinCode.length === 6 && joinPass && yourName ? "#fff" : "#c0a882", fontFamily: "'Playfair Display',Georgia,serif", fontSize: 19, fontWeight: 700, cursor: joinCode.length === 6 && joinPass && yourName ? "pointer" : "not-allowed", WebkitTapHighlightColor: "transparent" }}>Entrar na família 🔑</button>
            </div>
          </div>
        )}

        {/* FAMILY */}
        {screen === "family" && family && (
          <div style={{ minHeight: "100vh", paddingTop: nudges.length > 0 ? 160 : 0 }}>
            <div style={{ padding: "18px 16px 12px", background: "rgba(253,247,238,.97)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(210,175,120,.25)", position: "sticky", top: nudges.length > 0 ? 160 : 0, zIndex: 100 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 20 }}>🏡</span>
                    <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20, fontWeight: 800, color: "#1e1006" }}>{family.name}</h1>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                    <span onClick={() => { navigator.clipboard?.writeText(family.code); setToast("Código copiado!"); }} style={{ fontSize: 11, fontWeight: 800, letterSpacing: "3px", color: "#b85e22", background: "rgba(184,94,34,.1)", padding: "2px 9px", borderRadius: 20, cursor: "pointer" }}>{family.code} 📋</span>
                    <button onClick={() => setShowMembers(true)} style={{ background: "none", border: "1px solid #ddc9a4", borderRadius: 20, padding: "2px 9px", fontSize: 11, color: "#7a5228", cursor: "pointer" }}>
                      👥 {members.length} {nudges.length > 0 && <span style={{ background: "#b85e22", color: "#fff", borderRadius: "50%", padding: "1px 5px", fontSize: 10, marginLeft: 4 }}>{nudges.length}</span>}
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", background: "rgba(0,0,0,.06)", borderRadius: 10, padding: 3, gap: 2 }}>
                    <button onClick={() => toggleLayout("grid")} style={{ padding: "5px 8px", borderRadius: 8, border: "none", background: layout === "grid" ? "#fff" : "transparent", cursor: "pointer", fontSize: 14, boxShadow: layout === "grid" ? "0 1px 4px rgba(0,0,0,.12)" : "none" }}>⊞</button>
                    <button onClick={() => toggleLayout("list")} style={{ padding: "5px 8px", borderRadius: 8, border: "none", background: layout === "list" ? "#fff" : "transparent", cursor: "pointer", fontSize: 14, boxShadow: layout === "list" ? "0 1px 4px rgba(0,0,0,.12)" : "none" }}>☰</button>
                  </div>
                  <button onClick={reset} style={{ background: "none", border: "1.5px solid #ddc9a4", borderRadius: 20, padding: "6px 12px", fontSize: 12, color: "#7a5228", cursor: "pointer" }}>Sair</button>
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, opacity: .5 }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contato..."
                  style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: 12, border: "1.5px solid #e0c9a8", background: "rgba(255,255,255,.9)", fontSize: "15px", color: "#1e1006", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ padding: "16px 14px 110px" }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "64px 0" }}>
                  <div style={{ fontSize: 56, marginBottom: 14 }}>{search ? "🔍" : "📒"}</div>
                  <p style={{ fontFamily: "Georgia,serif", fontSize: 18, color: "#7a5228", fontStyle: "italic" }}>{search ? "Nenhum contato encontrado" : "A agenda está vazia"}</p>
                  <p style={{ fontSize: 13, color: "#b09070", marginTop: 8, lineHeight: 1.6 }}>{search ? "Tente outro termo" : "Adicione o mecânico do pai,\no médico da família..."}</p>
                </div>
              ) : layout === "grid" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12 }}>
                  {filtered.map(c => <ContactCardGrid key={c.id} contact={c} onDelete={() => deleteContact(c.id)} onTap={() => setSelectedContact(c)} />)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filtered.map(c => <ContactCardList key={c.id} contact={c} onDelete={() => deleteContact(c.id)} onTap={() => setSelectedContact(c)} />)}
                </div>
              )}
            </div>

            <button onClick={() => setShowAdd(true)} style={{ position: "fixed", bottom: 24, right: 20, zIndex: 500, background: "linear-gradient(135deg,#b85e22,#8f4214)", color: "#fff", border: "none", borderRadius: 60, padding: "16px 22px", display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 8px 28px rgba(184,94,34,.5)", WebkitTapHighlightColor: "transparent" }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Novo contato
            </button>
          </div>
        )}

        {loading && <Loader text={loadingText} />}
        {showAdd && <AddModal onSave={addContact} onClose={() => setShowAdd(false)} />}
        {showMembers && family && <MembersModal members={members} family={family} onClose={() => setShowMembers(false)} onToast={setToast} />}
        {selectedContact && !editingContact && (
          <ContactDetail
            contact={selectedContact}
            members={members}
            currentMember={currentMember}
            familyCode={family?.code}
            onClose={() => setSelectedContact(null)}
            onUpdate={updateContact}
            onEdit={() => setEditingContact(selectedContact)}
            onToast={setToast}
          />
        )}
        {editingContact && (
          <EditModal contact={editingContact} onSave={saveEditContact} onClose={() => setEditingContact(null)} />
        )}
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}
