import { useEffect, useState } from "react";
import {
  Users,
  Link,
  Copy,
  Download,
  Bell,
  LogOut,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { FamilyData, Group, Invite } from "../types";
import * as api from "../lib/api";
import { download, humanError, initials } from "../lib/utils";
import { Modal } from "./Modal";
export function Family({
  group,
  data,
  userId,
  demo,
  reload,
  onNewGroup,
}: {
  group: Group;
  data: FamilyData;
  userId: string;
  demo: boolean;
  reload: () => Promise<void>;
  onNewGroup: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [name, setName] = useState(group.name);
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    action: () => Promise<void>;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const me = data.members.find((m) => m.user_id === userId);
  const admin = me?.role === "owner" || me?.role === "admin";
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (demo)
        throw new Error(
          "Na demonstração, convites, notificações e alterações de conta ficam desativados.",
        );
      await fn();
      await reload();
      if (admin) setInvites(await api.invites(group.id));
    } catch (e) {
      setError(humanError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let alive = true;
    if (!demo && admin)
      api
        .invites(group.id)
        .then((v) => {
          if (alive) setInvites(v);
        })
        .catch((e) => {
          if (alive) setError(humanError(e));
        });
    return () => {
      alive = false;
    };
  }, [group.id, demo, admin]);
  return (
    <>
      <div className="section-row">
        <div>
          <p className="eyebrow">QUEM FAZ PARTE</p>
          <h1>Nosso cantinho.</h1>
          <p className="muted">
            Pessoas, convites e os cuidados com seu grupo.
          </p>
        </div>
        <button className="button secondary" onClick={onNewGroup}>
          <Users size={17} />
          Outro grupo
        </button>
      </div>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      <div className="family-grid">
        <section className="panel">
          <h2>{group.name}</h2>
          <p className="muted">
            {data.members.length} pessoas compartilham este espaço.
          </p>
          {data.members.map((m) => (
            <div className="member-row" key={m.user_id}>
              <span className="avatar small sage">
                {initials(m.display_name)}
              </span>
              <div>
                <strong>
                  {m.display_name}
                  {m.user_id === userId ? " (você)" : ""}
                </strong>
                <small>
                  {m.role === "owner"
                    ? "Responsável"
                    : m.role === "admin"
                      ? "Administrador"
                      : "Membro"}
                </small>
              </div>
              {admin && m.user_id !== userId && m.role !== "owner" && (
                <button
                  className="icon-btn"
                  aria-label={"Remover " + m.display_name}
                  onClick={() =>
                    setConfirm({
                      title: "Remover participante?",
                      body:
                        m.display_name +
                        " perderá o acesso a este grupo. Cópias já exportadas não podem ser recolhidas.",
                      action: () => api.removeMember(group.id, m.user_id),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              )}
              {group.owner_id === userId && m.user_id !== userId && (
                <button
                  className="text-button compact"
                  onClick={() =>
                    setConfirm({
                      title: "Transferir responsabilidade?",
                      body:
                        m.display_name +
                        " passará a ser responsável pelo grupo e você continuará como administrador.",
                      action: () => api.transfer(group.id, m.user_id),
                    })
                  }
                >
                  Transferir
                </button>
              )}
            </div>
          ))}
          {admin && (
            <>
              <button
                className="button primary full"
                disabled={busy || demo}
                onClick={() =>
                  void run(async () => {
                    const token = await api.invite(group.id);
                    setLink(location.origin + "/app?convite=" + token);
                    setMessage(
                      "Convite criado. Válido por 48 horas e para uma pessoa.",
                    );
                  })
                }
              >
                <Link size={17} />
                Criar convite seguro
              </button>
              {link && (
                <div className="invite-link">
                  <label>
                    Compartilhe pessoalmente
                    <input readOnly value={link} />
                  </label>
                  <button
                    className="button secondary small"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(link);
                        setMessage("Link copiado.");
                      } catch {
                        setError(
                          "Não foi possível copiar. Selecione e copie o link.",
                        );
                      }
                    }}
                  >
                    <Copy size={15} />
                    Copiar link
                  </button>
                </div>
              )}
              {invites.map((i) => (
                <div className="invite-row" key={i.id}>
                  <span>
                    Convite até {new Date(i.expires_at).toLocaleString("pt-BR")}
                  </span>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await api.revokeInvite(i.id);
                        setLink("");
                        setMessage("Convite revogado.");
                      })
                    }
                  >
                    Revogar
                  </button>
                </div>
              ))}
              <p className="legal-note">
                <ShieldCheck size={14} />
                Convites de uso único. A senha da sua conta nunca é
                compartilhada.
              </p>
            </>
          )}
        </section>
        <div>
          <section className="panel">
            <h2>Do seu jeito</h2>
            {admin && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await api.rename(group.id, name);
                    setMessage("Nome atualizado.");
                  });
                }}
              >
                <label>
                  Nome do grupo
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={60}
                  />
                </label>
                <button
                  className="button secondary small"
                  disabled={busy || demo}
                >
                  Salvar nome
                </button>
              </form>
            )}
            <button
              className="settings-action"
              disabled={demo}
              onClick={() =>
                void run(async () => {
                  await api.enablePush();
                  setMessage("Este aparelho está inscrito para notificações.");
                })
              }
            >
              <Bell size={18} />
              <span>Ativar notificações neste aparelho</span>
            </button>
            <button
              className="settings-action"
              onClick={() => {
                download(
                  "dafamilia-exportacao.json",
                  JSON.stringify(
                    {
                      exported_at: new Date().toISOString(),
                      demo,
                      group,
                      ...data,
                    },
                    null,
                    2,
                  ),
                );
                setMessage(
                  "Exportação preparada. Guarde o arquivo com cuidado.",
                );
              }}
            >
              <Download size={18} />
              <span>Exportar dados deste grupo</span>
            </button>
            <p className="legal-note">
              A exportação contém dados compartilhados com você. Proteja o
              arquivo.
            </p>
          </section>
          <section className="panel">
            <h2>Conta e privacidade</h2>
            <a className="settings-action" href="/privacidade">
              <ShieldCheck size={18} />
              Como cuidamos dos dados
            </a>
            {group.owner_id !== userId && (
              <button
                className="settings-action"
                disabled={demo}
                onClick={() =>
                  setConfirm({
                    title: "Sair deste grupo?",
                    body: "Você perderá o acesso aos contatos e compromissos. Para voltar, precisará de um novo convite.",
                    action: () => api.removeMember(group.id, userId),
                  })
                }
              >
                <LogOut size={18} />
                Sair do grupo
              </button>
            )}
            <button
              className="settings-action danger-text"
              disabled={demo}
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={18} />
              Excluir minha conta
            </button>
          </section>
        </div>
      </div>
      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}>
          <p>{confirm.body}</p>
          <button
            className="button danger"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await confirm.action();
                setConfirm(null);
              })
            }
          >
            Confirmar
          </button>
          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
      {deleting && (
        <Modal title="Excluir sua conta?" onClose={() => setDeleting(false)}>
          <p>
            A exclusão remove sua conta, participações, lembretes e aparelhos
            inscritos. Seus grupos sem outros membros também serão excluídos.
            Dados compartilhados em grupos que continuam existindo permanecem
            sem atribuição à sua conta.
          </p>
          <p>
            Transfira primeiro os grupos dos quais você é responsável e que têm
            outras pessoas.
          </p>
          <label>
            Digite EXCLUIR para confirmar
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
          <button
            className="button danger full"
            disabled={busy || confirmation !== "EXCLUIR"}
            onClick={() =>
              void run(async () => {
                await api.deleteAccount();
                location.href = "/";
              })
            }
          >
            Excluir minha conta e encerrar acesso
          </button>
        </Modal>
      )}
    </>
  );
}
