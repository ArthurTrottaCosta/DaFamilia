import { useState, useEffect, useRef, useCallback } from "react";

const DB = {};

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function formatPhone(v) {
  const n = v.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

const SUGGESTED = ["🔧","🩺","✂️","⚖️","🦷","🏠","💊","🐾","🔌","🚿","📦","🍕","🏦","🌿","🧹","🚗","📸","👟","💈","🎓","🏋️","🔑","🖥️","🧰"];

function Toast({ msg, onClose }) {
  const handleClose = useCallback(onClose, [onClose]);
  useEffect(() => {
    const t = setTimeout(handleClose, 2500);
    return () => clearTimeout(t);
  }, [handleClose]);
  return (
    <div style={{
      position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)",
      background:"#1a0f00", color:"#fdf0e0", padding:"11px 22px", borderRadius:50,
      fontSize:13, zIndex:9999, whiteSpace:"nowrap",
      boxShadow:"0 6px 28px rgba(0,0,0,.35)", pointerEvents:"none"
    }}>{msg}</div>
  );
}

function ContactCard({ contact, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div style={{
      background:"rgba(255,255,255,.8)", borderRadius:20,
      padding:"20px 12px 16px", display:"flex", flexDirection:"column",
      alignItems:"center", gap:6, position:"relative",
      boxShadow:"0 2px 18px rgba(100,50,0,.09)", border:"1px solid rgba(210,170,110,.3)",
      WebkitTapHighlightColor:"transparent"
    }}>
      <div style={{fontSize:38, lineHeight:1}}>{contact.emoji}</div>
      <div style={{fontFamily:"Georgia,serif", fontSize:14, fontWeight:700, color:"#1e1006", textAlign:"center", lineHeight:1.25, wordBreak:"break-word", width:"100%"}}>{contact.name}</div>
      {contact.label && <div style={{fontSize:10, color:"#9a6c3a", textAlign:"center", textTransform:"uppercase", letterSpacing:".5px"}}>{contact.label}</div>}
      {contact.establishment && <div style={{fontFamily:"Georgia,serif", fontSize:12, color:"#5a3818", textAlign:"center", fontStyle:"italic", lineHeight:1.3}}>{contact.establishment}</div>}
      <a href={`tel:${contact.phone.replace(/\D/g,"")}`} style={{
        marginTop:4, background:"#b85e22", color:"#fff", borderRadius:30,
        padding:"6px 13px", fontSize:12, fontWeight:700, textDecoration:"none",
        letterSpacing:".2px", boxShadow:"0 3px 10px rgba(184,94,34,.3)"
      }}>{contact.phone}</a>
      {!confirm ? (
        <button onClick={()=>setConfirm(true)} style={{
          position:"absolute", top:8, right:9, background:"none", border:"none",
          fontSize:14, cursor:"pointer", opacity:.25, color:"#1e1006", padding:4,
          WebkitTapHighlightColor:"transparent"
        }}>✕</button>
      ) : (
        <div style={{position:"absolute", top:8, right:8, display:"flex", gap:4, zIndex:2}}>
          <button onClick={onDelete} style={{background:"#c0392b", color:"#fff", border:"none", borderRadius:8, fontSize:11, padding:"4px 8px", cursor:"pointer"}}>Sim</button>
          <button onClick={()=>setConfirm(false)} style={{background:"#bbb", border:"none", borderRadius:8, fontSize:11, padding:"4px 8px", cursor:"pointer"}}>Não</button>
        </div>
      )}
    </div>
  );
}

function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const inputRef = useRef();

  function pick(e) { onChange(e); setOpen(false); }

  function handleCustom(e) {
    const val = e.target.value;
    const match = [...val].filter(c => c.codePointAt(0) > 255);
    if (match.length > 0) { onChange(match[0]); setOpen(false); setCustom(""); }
    else setCustom(val);
  }

  return (
    <div style={{marginBottom:14}}>
      <p style={{fontSize:11, color:"#9a6c3a", marginBottom:8, textTransform:"uppercase", letterSpacing:".5px"}}>Ícone do contato</p>
      <button onClick={()=>{ setOpen(!open); setTimeout(()=>inputRef.current?.focus(),100); }} style={{
        width:"100%", padding:"14px", borderRadius:14, border:"2px solid "+(open?"#b85e22":"#e0c9a8"),
        background:"rgba(255,255,255,.9)", cursor:"pointer", display:"flex", alignItems:"center",
        gap:12, WebkitTapHighlightColor:"transparent"
      }}>
        <span style={{fontSize:32}}>{value}</span>
        <span style={{fontFamily:"Georgia,serif", fontSize:15, color:"#5a3818"}}>Toque para trocar o ícone</span>
        <span style={{marginLeft:"auto", fontSize:12, color:"#b85e22"}}>{open?"▲":"▼"}</span>
      </button>

      {open && (
        <div style={{
          marginTop:8, background:"#fff8f0", borderRadius:16, padding:"16px 14px",
          border:"1.5px solid #e8d4b4", boxShadow:"0 4px 20px rgba(0,0,0,.1)"
        }}>
          <p style={{fontSize:10, color:"#9a6c3a", marginBottom:8, textTransform:"uppercase", letterSpacing:".5px"}}>Sugestões</p>
          <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:14}}>
            {SUGGESTED.map(e => (
              <button key={e} onClick={()=>pick(e)} style={{
                fontSize:26, padding:"6px 8px", borderRadius:10, cursor:"pointer",
                border: value===e ? "2px solid #b85e22" : "2px solid transparent",
                background: value===e ? "rgba(184,94,34,.12)" : "rgba(0,0,0,.04)",
                WebkitTapHighlightColor:"transparent"
              }}>{e}</button>
            ))}
          </div>

          <p style={{fontSize:10, color:"#9a6c3a", marginBottom:6, textTransform:"uppercase", letterSpacing:".5px"}}>
            Ou use o emoji do seu celular 📱
          </p>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <input
              ref={inputRef}
              value={custom}
              onChange={handleCustom}
              placeholder="😊 cole ou digite aqui"
              style={{
                flex:1, padding:"12px 14px", borderRadius:12, fontSize:22,
                border:"1.5px solid #e0c9a8", background:"#fff", outline:"none",
                fontFamily:"system-ui", textAlign:"center"
              }}
            />
            <span style={{fontSize:11, color:"#b85e22", maxWidth:80, lineHeight:1.4, textAlign:"center"}}>
              No celular: toque no 😊 do teclado
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const fieldStyle = {
  width:"100%", padding:"14px 16px", borderRadius:14, border:"1.5px solid #e0c9a8",
  background:"rgba(255,255,255,.9)", fontFamily:"Georgia,serif", fontSize:"16px", color:"#1e1006",
  marginBottom:11, outline:"none", boxSizing:"border-box", WebkitAppearance:"none",
};

function AddModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [est, setEst] = useState("");
  const [phone, setPhone] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const valid = name.trim() && phone.replace(/\D/g,"").length >= 8;

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(10,5,0,.55)",
      display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:1000,
      WebkitBackdropFilter:"blur(4px)", backdropFilter:"blur(4px)"
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:"#fdf6ed", borderRadius:"26px 26px 0 0",
        padding:"24px 18px 40px", width:"100%", maxWidth:480,
        maxHeight:"92vh", overflowY:"auto", overscrollBehavior:"contain"
      }}>
        <div style={{width:36, height:4, background:"#ddd", borderRadius:4, margin:"0 auto 20px"}}/>
        <h2 style={{fontFamily:"Georgia,serif", fontSize:22, color:"#1e1006", marginBottom:18, fontWeight:700}}>
          Novo contato da família
        </h2>
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome *" style={fieldStyle}/>
        <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Tipo (ex: Mecânico, Médico...)" style={fieldStyle}/>
        <input value={est} onChange={e=>setEst(e.target.value)} placeholder="Estabelecimento (opcional)" style={fieldStyle}/>
        <input value={phone} onChange={e=>setPhone(formatPhone(e.target.value))}
          placeholder="Telefone *" style={fieldStyle} inputMode="numeric"/>
        <button onClick={()=>valid&&onSave({name:name.trim(),label:label.trim(),establishment:est.trim(),phone,emoji})} style={{
          width:"100%", padding:"16px", borderRadius:16, border:"none",
          background:valid?"linear-gradient(135deg,#b85e22,#8f4214)":"#e0d0bc",
          color:valid?"#fff":"#bba07a",
          fontFamily:"Georgia,serif", fontWeight:700, fontSize:17,
          cursor:valid?"pointer":"not-allowed",
          boxShadow:valid?"0 6px 20px rgba(184,94,34,.4)":"none",
          WebkitTapHighlightColor:"transparent"
        }}>Salvar contato</button>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [family, setFamily] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPass, setJoinPass] = useState("");
  const [err, setErr] = useState("");

  const bg = "radial-gradient(ellipse at 25% 0%,#f7e4c4 0%,#fdf7ee 50%,#ede4d4 100%)";

  function createFamily() {
    if(!newName.trim()||!newPass.trim()) return;
    const code = generateCode();
    const f = {code, name:newName.trim(), password:newPass.trim(), contacts:[]};
    DB[code] = f;
    setFamily({...f});
    setScreen("family");
    setToast(`Família criada! Código: ${code}`);
  }

  function joinFamily() {
    const code = joinCode.trim().toUpperCase();
    const f = DB[code];
    if(!f) { setErr("Família não encontrada 😕"); return; }
    if(f.password !== joinPass.trim()) { setErr("Senha incorreta 🔒"); return; }
    setFamily({...f});
    setScreen("family");
    setToast(`Bem-vindo à família ${f.name}! 🏠`);
  }

  function addContact(c) {
    const updated = {...family, contacts:[...family.contacts, {...c, id:Date.now()}]};
    DB[family.code] = updated;
    setFamily(updated);
    setShowAdd(false);
    setToast("Contato adicionado! ✅");
  }

  function deleteContact(id) {
    const updated = {...family, contacts:family.contacts.filter(c=>c.id!==id)};
    DB[family.code] = updated;
    setFamily(updated);
    setToast("Contato removido");
  }

  function reset() {
    setFamily(null); setScreen("home");
    setNewName(""); setNewPass(""); setJoinCode(""); setJoinPass(""); setErr("");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        input:focus { border-color:#b85e22 !important; box-shadow:0 0 0 3px rgba(184,94,34,.12); }
        ::-webkit-scrollbar { width:0; }
        body { overscroll-behavior:none; }
      `}</style>

      <div style={{minHeight:"100vh", background:bg, fontFamily:"system-ui,sans-serif", maxWidth:480, margin:"0 auto", position:"relative"}}>

        {screen==="home" && (
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:"32px 24px"}}>
            <div style={{textAlign:"center", marginBottom:44}}>
              <div style={{fontSize:72, marginBottom:8, filter:"drop-shadow(0 4px 12px rgba(0,0,0,.12))"}}>🏡</div>
              <h1 style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:48, fontWeight:800, color:"#1e1006", letterSpacing:"-1.5px", lineHeight:.95}}>
                Da<span style={{color:"#b85e22"}}>Família</span>
              </h1>
              <p style={{color:"#7a5228", fontSize:14, marginTop:14, lineHeight:1.65, maxWidth:260, margin:"14px auto 0"}}>
                A agenda de contatos da sua família, preservada de geração em geração.
              </p>
            </div>
            <div style={{width:44, height:2, background:"linear-gradient(90deg,transparent,#b85e22,transparent)", marginBottom:40}}/>
            <div style={{width:"100%", maxWidth:320, display:"flex", flexDirection:"column", gap:13}}>
              <button onClick={()=>setScreen("create")} style={{
                padding:"18px 24px", borderRadius:18, border:"none",
                background:"linear-gradient(135deg,#b85e22,#8f4214)", color:"#fff",
                fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, fontWeight:700,
                cursor:"pointer", boxShadow:"0 8px 24px rgba(184,94,34,.45)",
                WebkitTapHighlightColor:"transparent", letterSpacing:".2px"
              }}>✨ Criar minha família</button>
              <button onClick={()=>{setScreen("join");setErr("");}} style={{
                padding:"18px 24px", borderRadius:18, border:"2px solid #ddc9a4",
                background:"rgba(255,255,255,.75)", color:"#5a3818",
                fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, fontWeight:700,
                cursor:"pointer", WebkitTapHighlightColor:"transparent"
              }}>🔗 Entrar em uma família</button>
            </div>
            <p style={{marginTop:32, fontSize:12, color:"#b09070", textAlign:"center", lineHeight:1.7, maxWidth:230}}>
              Nunca mais vai no mecânico errado 😄<br/>Compartilhe o código com a família.
            </p>
          </div>
        )}

        {screen==="create" && (
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:"32px 24px"}}>
            <div style={{width:"100%", maxWidth:360}}>
              <button onClick={()=>setScreen("home")} style={{background:"none", border:"none", color:"#7a5228", cursor:"pointer", fontSize:14, marginBottom:28, padding:0}}>← Voltar</button>
              <h2 style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:34, color:"#1e1006", marginBottom:8, fontWeight:800}}>Criar família</h2>
              <p style={{color:"#7a5228", fontSize:14, marginBottom:28, lineHeight:1.6}}>Você vai receber um código para convidar os membros da família.</p>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nome da família (ex: Família Silva)" style={fieldStyle}/>
              <input value={newPass} onChange={e=>setNewPass(e.target.value)} type="password" placeholder="Crie uma senha" style={fieldStyle}/>
              <button onClick={createFamily} style={{
                width:"100%", padding:"17px", borderRadius:16, border:"none", marginTop:6,
                background:newName&&newPass?"linear-gradient(135deg,#b85e22,#8f4214)":"#e0d0bc",
                color:newName&&newPass?"#fff":"#c0a882",
                fontFamily:"'Playfair Display',Georgia,serif", fontSize:19, fontWeight:700,
                cursor:newName&&newPass?"pointer":"not-allowed",
                boxShadow:newName&&newPass?"0 6px 20px rgba(184,94,34,.4)":"none",
                WebkitTapHighlightColor:"transparent"
              }}>Criar família 🏡</button>
            </div>
          </div>
        )}

        {screen==="join" && (
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:"32px 24px"}}>
            <div style={{width:"100%", maxWidth:360}}>
              <button onClick={()=>setScreen("home")} style={{background:"none", border:"none", color:"#7a5228", cursor:"pointer", fontSize:14, marginBottom:28, padding:0}}>← Voltar</button>
              <h2 style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:34, color:"#1e1006", marginBottom:8, fontWeight:800}}>Entrar na família</h2>
              <p style={{color:"#7a5228", fontSize:14, marginBottom:28, lineHeight:1.6}}>Peça o código de 6 letras para um membro da família.</p>
              <input value={joinCode} onChange={e=>{setJoinCode(e.target.value.toUpperCase());setErr("");}} maxLength={6}
                placeholder="A B C 1 2 3" style={{...fieldStyle, fontSize:"28px", textAlign:"center", letterSpacing:"10px", fontWeight:800, fontFamily:"Georgia,serif"}}/>
              <input value={joinPass} onChange={e=>{setJoinPass(e.target.value);setErr("");}} type="password" placeholder="Senha da família" style={fieldStyle}/>
              {err && <p style={{color:"#c0392b", fontSize:13, marginBottom:10, textAlign:"center"}}>{err}</p>}
              <button onClick={joinFamily} style={{
                width:"100%", padding:"17px", borderRadius:16, border:"none",
                background:joinCode.length===6&&joinPass?"linear-gradient(135deg,#b85e22,#8f4214)":"#e0d0bc",
                color:joinCode.length===6&&joinPass?"#fff":"#c0a882",
                fontFamily:"'Playfair Display',Georgia,serif", fontSize:19, fontWeight:700,
                cursor:joinCode.length===6&&joinPass?"pointer":"not-allowed",
                WebkitTapHighlightColor:"transparent"
              }}>Entrar na família 🔑</button>
            </div>
          </div>
        )}

        {screen==="family" && family && (
          <div style={{minHeight:"100vh"}}>
            <div style={{
              padding:"20px 18px 14px",
              background:"rgba(253,247,238,.95)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
              borderBottom:"1px solid rgba(210,175,120,.25)",
              position:"sticky", top:0, zIndex:100,
              display:"flex", alignItems:"center", justifyContent:"space-between"
            }}>
              <div>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  <span style={{fontSize:22}}>🏡</span>
                  <h1 style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:22, fontWeight:800, color:"#1e1006"}}>{family.name}</h1>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:6, marginTop:3}}>
                  <span style={{fontSize:10, color:"#9a6c3a"}}>código:</span>
                  <span onClick={()=>setToast(`Código: ${family.code}`)} style={{
                    fontSize:11, fontWeight:800, letterSpacing:"4px", color:"#b85e22",
                    background:"rgba(184,94,34,.1)", padding:"3px 10px", borderRadius:20, cursor:"pointer"
                  }}>{family.code} 📋</span>
                </div>
              </div>
              <button onClick={reset} style={{
                background:"none", border:"1.5px solid #ddc9a4", borderRadius:20,
                padding:"7px 14px", fontSize:12, color:"#7a5228", cursor:"pointer",
                WebkitTapHighlightColor:"transparent"
              }}>Sair</button>
            </div>

            <div style={{padding:"18px 14px 110px"}}>
              {family.contacts.length===0 ? (
                <div style={{textAlign:"center", padding:"64px 0"}}>
                  <div style={{fontSize:60, marginBottom:14}}>📒</div>
                  <p style={{fontFamily:"Georgia,serif", fontSize:20, color:"#7a5228", fontStyle:"italic"}}>A agenda está vazia</p>
                  <p style={{fontSize:13, color:"#b09070", marginTop:8, lineHeight:1.6}}>
                    Adicione o mecânico do pai,<br/>o médico da família...
                  </p>
                </div>
              ) : (
                <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:12}}>
                  {family.contacts.map(c=>(
                    <ContactCard key={c.id} contact={c} onDelete={()=>deleteContact(c.id)}/>
                  ))}
                </div>
              )}
            </div>

            <button onClick={()=>setShowAdd(true)} style={{
              position:"fixed", bottom:24, right:20, zIndex:500,
              background:"linear-gradient(135deg,#b85e22,#8f4214)", color:"#fff",
              border:"none", borderRadius:60, padding:"16px 22px",
              display:"flex", alignItems:"center", gap:9,
              fontWeight:700, fontSize:15, cursor:"pointer",
              boxShadow:"0 8px 28px rgba(184,94,34,.5)",
              WebkitTapHighlightColor:"transparent"
            }}>
              <span style={{fontSize:20, lineHeight:1}}>+</span>
              Novo contato
            </button>
          </div>
        )}

        {showAdd && <AddModal onSave={addContact} onClose={()=>setShowAdd(false)}/>}
        {toast && <Toast msg={toast} onClose={()=>setToast(null)}/>}
      </div>
    </>
  );
}