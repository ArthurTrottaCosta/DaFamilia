import { useCallback, useEffect, useRef, useState } from "react";
import {
  Users,
  CalendarDays,
  House,
  Search,
  Plus,
  Star,
  ArrowUpRight,
  Heart,
  Bell,
  LogOut,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { DeleteAccount } from "./DeleteAccount";
import { Brand } from "./Brand";
import { ContactForm } from "./ContactForm";
import { ContactDetail } from "./ContactDetail";
import { Calendar } from "./Calendar";
import { Family } from "./Family";
import { GroupForm } from "./GroupForm";
import { categories } from "../types";
import type {
  Contact,
  ContactInput,
  FamilyData,
  Group,
  Appointment,
} from "../types";
import * as api from "../lib/api";
import { demoData, demoGroup } from "../lib/demo";
import { humanError, initials, searchText, displayPhone } from "../lib/utils";
const empty: FamilyData = {
  contacts: [],
  members: [],
  appointments: [],
  interactions: [],
  nudges: [],
};
export function Workspace({
  demo = false,
  userId,
  email,
}: {
  demo?: boolean;
  userId: string;
  email?: string;
}) {
  const [allGroups, setAllGroups] = useState<Group[]>(demo ? [demoGroup] : []);
  const [group, setGroup] = useState<Group | null>(demo ? demoGroup : null);
  const [data, setData] = useState<FamilyData>(demo ? demoData : () => empty);
  const [tab, setTab] = useState<"contacts" | "calendar" | "family">(
    "contacts",
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [favorites, setFavorites] = useState(false);
  const [loading, setLoading] = useState(!demo);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Contact | undefined>();
  const [detail, setDetail] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const selected = useRef(
    demo
      ? demoGroup.id
      : (localStorage.getItem("df_selected_group_v2:" + userId) ?? ""),
  );
  const sequence = useRef(0);
  const inviteToken = useRef(
    new URLSearchParams(location.search).get("convite") ?? "",
  );
  const refresh = useCallback(
    async (target?: string) => {
      if (demo) return;
      const seq = ++sequence.current;
      setRefreshing(true);
      try {
        const gs = await api.groups();
        const g =
          gs.find((x) => x.id === (target ?? selected.current)) ??
          gs[0] ??
          null;
        const d = g ? await api.loadFamily(g.id) : empty;
        if (seq !== sequence.current) return;
        setAllGroups(gs);
        setGroup(g);
        setData(d);
        selected.current = g?.id ?? "";
        if (g) localStorage.setItem("df_selected_group_v2:" + userId, g.id);
        else localStorage.removeItem("df_selected_group_v2:" + userId);
        setError("");
      } catch (e) {
        if (seq === sequence.current) setError(humanError(e));
      } finally {
        if (seq === sequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [demo, userId],
  );
  useEffect(() => {
    void refresh();
    if (!demo && inviteToken.current) setCreatingGroup(true);
    const focus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    const timer = setInterval(focus, 30000);
    return () => {
      sequence.current++;
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh, demo]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const contact = data.contacts.find((c) => c.id === detail);
  const me = data.members.find((m) => m.user_id === userId);
  const unseen = data.nudges.filter((n) => n.to_user === userId && !n.seen_at);
  const contacts = data.contacts
    .filter(
      (c) =>
        (category === "Todos" || c.category === category) &&
        (!favorites || c.pinned) &&
        searchText(
          [c.name, c.specialty, c.recommended_by, c.category, c.phone].join(
            " ",
          ),
        ).includes(searchText(query)),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  async function save(input: ContactInput, id?: string) {
    if (!group) return;
    if (demo) {
      const now = new Date().toISOString();
      setData((d) => ({
        ...d,
        contacts: id
          ? d.contacts.map((c) =>
              c.id === id ? { ...c, ...input, updated_at: now } : c,
            )
          : [
              ...d.contacts,
              {
                ...input,
                id: crypto.randomUUID(),
                group_id: group.id,
                created_by: userId,
                created_at: now,
                updated_at: now,
              },
            ],
      }));
    } else {
      await api.saveContact(group.id, input, id);
      await refresh();
    }
    setToast(id ? "Contato atualizado." : "Uma boa indicação guardada.");
  }
  async function remove() {
    if (!group || !contact) return;
    if (demo)
      setData((d) => ({
        ...d,
        contacts: d.contacts.filter((c) => c.id !== contact.id),
        interactions: d.interactions.filter((i) => i.contact_id !== contact.id),
        appointments: d.appointments.map((a) =>
          a.contact_id === contact.id ? { ...a, contact_id: null } : a,
        ),
      }));
    else {
      await api.removeContact(group.id, contact.id);
      await refresh();
    }
    setToast("Contato removido.");
  }
  async function saveEvent(
    input: Omit<Appointment, "id" | "group_id" | "created_by">,
  ) {
    if (!group) return;
    if (demo)
      setData((d) => ({
        ...d,
        appointments: [
          ...d.appointments,
          {
            ...input,
            id: crypto.randomUUID(),
            group_id: group.id,
            created_by: userId,
          },
        ],
      }));
    else {
      await api.saveAppointment(group.id, input);
      await refresh();
    }
    setToast("Compromisso combinado.");
  }
  async function deleteEvent(id: string) {
    if (!group) return;
    if (demo)
      setData((d) => ({
        ...d,
        appointments: d.appointments.filter((a) => a.id !== id),
      }));
    else {
      await api.removeAppointment(group.id, id);
      await refresh();
    }
  }
  async function exit() {
    try {
      await api.signOut();
      location.href = "/";
    } catch (e) {
      setError(humanError(e));
    }
  }
  function navigate(next: typeof tab) {
    setTab(next);
    setMenu(false);
    setQuery("");
  }
  return (
    <div className="app-shell">
      {demo && (
        <div className="demo-banner">
          <span>
            <Sparkle />
            Demonstração · dados fictícios · alterações não são salvas
          </span>
          <a href="/app">
            Quero minha família
            <ArrowUpRight size={14} />
          </a>
        </div>
      )}
      <aside className={"sidebar" + (menu ? " mobile-open" : "")}>
        <Brand />
        <button
          className="icon-btn sidebar-close"
          onClick={() => setMenu(false)}
          aria-label="Fechar menu"
        >
          <X />
        </button>
        <div className="group-switch">
          <span className="group-icon">
            <House size={20} />
          </span>
          <div>
            <small>NOSSO ESPAÇO</small>
            {allGroups.length > 1 ? (
              <select
                aria-label="Selecionar grupo"
                value={group?.id ?? ""}
                onChange={(e) => {
                  setDetail(null);
                  void refresh(e.target.value);
                }}
              >
                {allGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            ) : (
              <strong>{group?.name ?? "Sua família"}</strong>
            )}
          </div>
        </div>
        <p className="nav-label">JUNTOS NO DIA A DIA</p>
        <nav aria-label="Seções do aplicativo">
          <button
            className={tab === "contacts" ? "active" : ""}
            onClick={() => navigate("contacts")}
          >
            <Users size={19} />
            Contatos<span>{data.contacts.length}</span>
          </button>
          <button
            className={tab === "calendar" ? "active" : ""}
            onClick={() => navigate("calendar")}
          >
            <CalendarDays size={19} />
            Agenda
          </button>
          <button
            className={tab === "family" ? "active" : ""}
            onClick={() => navigate("family")}
          >
            <House size={19} />
            Família
          </button>
        </nav>
        <div className="sidebar-note">
          <Heart size={22} />
          <p>
            Confiança é ainda melhor
            <br />
            <strong>quando compartilhada.</strong>
          </p>
          <small>Seu grupo. Suas boas indicações.</small>
        </div>
        <div className="sidebar-bottom">
          <a href="/ajuda">
            Precisa de uma mão?
            <ArrowUpRight size={14} />
          </a>
          <div className="user-row">
            <span className="avatar small peach">
              {initials(me?.display_name ?? "Você")}
            </span>
            <div>
              <strong>{me?.display_name ?? "Você"}</strong>
              <small>{demo ? "Conta de demonstração" : email}</small>
            </div>
            {!demo && (
              <button
                className="icon-btn"
                aria-label="Sair da conta"
                onClick={() => void exit()}
              >
                <LogOut size={17} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="app-topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-toggle"
              aria-label="Abrir menu"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <span>{group?.name ?? "DaFamília"}</span>
            <ChevronRight size={14} />
            <strong>
              {tab === "contacts"
                ? "Contatos"
                : tab === "calendar"
                  ? "Agenda"
                  : "Família"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="private-pill">
              <ShieldCheck size={14} />
              Grupo privado
            </span>
            <button
              className="icon-btn"
              disabled={refreshing}
              onClick={() => void refresh()}
              aria-label="Atualizar dados"
            >
              <RefreshCw size={17} className={refreshing ? "spinning" : ""} />
            </button>
            <button
              className="icon-btn notification-button"
              aria-label={
                "Lembretes" + (unseen.length ? " (" + unseen.length + ")" : "")
              }
              onClick={() => setNotifications((v) => !v)}
            >
              <Bell size={19} />
              {unseen.length > 0 && <b>{unseen.length}</b>}
            </button>
          </div>
        </header>
        {notifications && (
          <div className="notification-panel">
            <h3>Um toque da família</h3>
            {unseen.length ? (
              unseen.map((n) => (
                <article key={n.id}>
                  <p>
                    <strong>
                      {data.members.find((m) => m.user_id === n.from_user)
                        ?.display_name ?? "Alguém do grupo"}
                    </strong>{" "}
                    pediu para{" "}
                    {n.action === "call" ? "ligar" : "mandar mensagem"} para{" "}
                    {data.contacts.find((c) => c.id === n.contact_id)?.name ??
                      "um contato"}
                    .
                  </p>
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        if (demo)
                          setData((d) => ({
                            ...d,
                            nudges: d.nudges.map((x) =>
                              x.id === n.id
                                ? { ...x, seen_at: new Date().toISOString() }
                                : x,
                            ),
                          }));
                        else {
                          await api.seen(n.id);
                          await refresh();
                        }
                        setDetail(n.contact_id);
                        setNotifications(false);
                      } catch (e) {
                        setError(humanError(e));
                      }
                    }}
                  >
                    Ver contato
                    <ArrowUpRight size={14} />
                  </button>
                </article>
              ))
            ) : (
              <p className="muted">
                Tudo tranquilo por aqui. Nenhum lembrete pendente.
              </p>
            )}
          </div>
        )}
        <main className="app-main">
          {error && (
            <div className="alert" role="alert">
              {error}
              <button className="text-button" onClick={() => void refresh()}>
                Tentar novamente
              </button>
            </div>
          )}
          {loading ? (
            <div className="empty-state" role="status">
              <RefreshCw className="spinning" />
              <p>Reunindo as informações da família…</p>
            </div>
          ) : !group ? (
            <div className="empty-state welcome-empty">
              <div className="round-icon">
                <House />
              </div>
              <p className="eyebrow">VAMOS COMEÇAR</p>
              <h1>
                As melhores indicações
                <br />
                começam com alguém.
              </h1>
              <p>Crie um grupo ou aceite o convite de uma pessoa da família.</p>
              <button
                className="button primary"
                onClick={() => setCreatingGroup(true)}
              >
                <Plus size={18} />
                Reunir minha família
              </button>
              {!demo && <DeleteAccount />}
            </div>
          ) : tab === "contacts" ? (
            <>
              <div className="section-row">
                <div>
                  <p className="eyebrow">BOAS INDICAÇÕES, SEMPRE POR PERTO</p>
                  <h1>De quem você precisa hoje?</h1>
                  <p className="muted">
                    Os contatos de confiança de vocês, em um só lugar.
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setAdding(true)}
                >
                  <Plus size={18} />
                  Adicionar contato
                </button>
              </div>
              <div className="family-highlight">
                <div>
                  <span className="round-icon">
                    <Heart size={22} />
                  </span>
                  <div>
                    <h3>Uma boa indicação faz toda a diferença.</h3>
                    <p>
                      Guarde o contato de quem cuidou bem de você. Sua família
                      agradece.
                    </p>
                  </div>
                </div>
                <button className="text-button" onClick={() => setAdding(true)}>
                  Compartilhar indicação
                  <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="search-row">
                <label className="search-input">
                  <Search size={19} />
                  <input
                    aria-label="Buscar contatos"
                    placeholder="Busque por nome, serviço ou quem indicou…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <button
                  className={"favorite-filter" + (favorites ? " selected" : "")}
                  onClick={() => setFavorites((v) => !v)}
                  aria-pressed={favorites}
                >
                  <Star size={17} />
                  Favoritos
                </button>
              </div>
              <div className="category-tabs" aria-label="Filtrar categoria">
                {["Todos", ...categories].map((c) => (
                  <button
                    key={c}
                    className={category === c ? "active" : ""}
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                    {c === "Todos" && <span>{data.contacts.length}</span>}
                  </button>
                ))}
              </div>
              <div className="results-label">
                <span>
                  {category === "Todos"
                    ? "NOSSOS CONTATOS"
                    : category.toUpperCase()}
                </span>
                <small>
                  {contacts.length}{" "}
                  {contacts.length === 1 ? "contato" : "contatos"}
                </small>
              </div>
              <div className="contact-grid">
                {contacts.map((c) => (
                  <button
                    className="contact-card"
                    key={c.id}
                    onClick={() => setDetail(c.id)}
                  >
                    <div className="card-top">
                      <span
                        className={
                          "avatar " +
                          (c.category === "Saúde"
                            ? "sage"
                            : c.category === "Serviços"
                              ? "lavender"
                              : c.category === "Família"
                                ? "sand"
                                : "peach")
                        }
                      >
                        {initials(c.name)}
                      </span>
                      <span
                        className={
                          "category-badge " +
                          (c.category === "Saúde" ? "sage" : "")
                        }
                      >
                        {c.category}
                      </span>
                      {c.pinned && (
                        <Star
                          className="pinned-star"
                          size={15}
                          fill="currentColor"
                        />
                      )}
                    </div>
                    <h3>{c.name}</h3>
                    <p>{c.specialty || c.category}</p>
                    <span className="card-phone">{displayPhone(c.phone)}</span>
                    <div className="card-footer">
                      <span>
                        <Heart size={13} />
                        {c.recommended_by
                          ? "Indicação de " + c.recommended_by
                          : "Um contato da família"}
                      </span>
                      <ArrowUpRight size={18} />
                    </div>
                  </button>
                ))}
              </div>
              {contacts.length === 0 && (
                <div className="empty-state">
                  <Search size={32} />
                  <h3>
                    {query || category !== "Todos" || favorites
                      ? "Nenhum contato por aqui."
                      : "A primeira indicação é sua."}
                  </h3>
                  <p>
                    {query
                      ? "Tente outro nome, serviço ou categoria."
                      : "Adicione alguém em quem sua família confia."}
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      if (query || category !== "Todos" || favorites) {
                        setQuery("");
                        setCategory("Todos");
                        setFavorites(false);
                      } else setAdding(true);
                    }}
                  >
                    {query || category !== "Todos" || favorites
                      ? "Limpar filtros"
                      : "Adicionar contato"}
                  </button>
                </div>
              )}
              <p className="app-footnote">
                <LockIcon />
                Compartilhado somente com as pessoas do seu grupo.
              </p>
            </>
          ) : tab === "calendar" ? (
            <Calendar
              data={data}
              userId={userId}
              onSave={saveEvent}
              onDelete={deleteEvent}
            />
          ) : (
            <Family
              key={group.id}
              group={group}
              data={data}
              userId={userId}
              demo={demo}
              reload={refresh}
              onNewGroup={() => setCreatingGroup(true)}
            />
          )}
        </main>
      </div>
      <nav className="mobile-bottom" aria-label="Navegação móvel">
        <button
          className={tab === "contacts" ? "active" : ""}
          onClick={() => navigate("contacts")}
        >
          <Users size={20} />
          Contatos
        </button>
        <button
          className={tab === "calendar" ? "active" : ""}
          onClick={() => navigate("calendar")}
        >
          <CalendarDays size={20} />
          Agenda
        </button>
        <button
          className={tab === "family" ? "active" : ""}
          onClick={() => navigate("family")}
        >
          <House size={20} />
          Família
        </button>
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {(adding || editing) && (
        <ContactForm
          contact={editing}
          onSave={save}
          onClose={() => {
            setAdding(false);
            setEditing(undefined);
          }}
        />
      )}
      {contact && !editing && (
        <ContactDetail
          contact={contact}
          data={data}
          userId={userId}
          demo={demo}
          onClose={() => setDetail(null)}
          onEdit={() => setEditing(contact)}
          onPin={() =>
            save({ ...contact, pinned: !contact.pinned }, contact.id)
          }
          onDelete={remove}
          onInteraction={async (note, amount) => {
            if (demo)
              setData((d) => ({
                ...d,
                interactions: [
                  {
                    id: crypto.randomUUID(),
                    group_id: group!.id,
                    contact_id: contact.id,
                    note,
                    amount,
                    created_at: new Date().toISOString(),
                    created_by: userId,
                  },
                  ...d.interactions,
                ],
              }));
            else {
              await api.addInteraction(group!.id, contact.id, note, amount);
              await refresh();
            }
          }}
          onNudge={async (recipient, action) => {
            if (demo)
              setData((d) => ({
                ...d,
                nudges: [
                  {
                    id: crypto.randomUUID(),
                    group_id: group!.id,
                    contact_id: contact.id,
                    from_user: userId,
                    to_user: recipient,
                    action,
                    seen_at: null,
                    created_at: new Date().toISOString(),
                  },
                  ...d.nudges,
                ],
              }));
            else {
              await api.nudge(group!.id, contact.id, recipient, action);
              await refresh();
            }
          }}
        />
      )}
      {creatingGroup && (
        <GroupForm
          initialToken={inviteToken.current}
          onClose={() => setCreatingGroup(false)}
          onSubmit={async (mode, value, name) => {
            if (demo)
              throw new Error(
                "Para criar um grupo real, entre com seu e-mail fora da demonstração.",
              );
            const id =
              mode === "create"
                ? await api.createGroup(value, name)
                : await api.joinGroup(value, name);
            inviteToken.current = "";
            history.replaceState(null, "", "/app");
            await refresh(id);
            setToast(
              mode === "create"
                ? "Seu grupo está pronto."
                : "Bem-vindo à família.",
            );
          }}
        />
      )}
    </div>
  );
}
function Sparkle() {
  return <Heart size={13} />;
}
function LockIcon() {
  return <ShieldCheck size={13} />;
}
