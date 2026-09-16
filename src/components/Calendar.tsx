import { useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import type { Appointment, FamilyData } from "../types";
import { Modal } from "./Modal";
import { localDateInput, humanError } from "../lib/utils";
export function Calendar({
  data,
  userId,
  onSave,
  onDelete,
}: {
  data: FamilyData;
  userId: string;
  onSave: (
    a: Omit<Appointment, "id" | "group_id" | "created_by">,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(localDateInput());
  const [person, setPerson] = useState(userId);
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const list = data.appointments
    .filter(
      (a) =>
        showPast || new Date(a.starts_at).getTime() >= Date.now() - 3600000,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return (
    <>
      <div className="section-row">
        <div>
          <p className="eyebrow">COMBINADO EM FAMÍLIA</p>
          <h1>A próxima coisa boa.</h1>
          <p className="muted">
            Compromissos e cuidados que vocês organizam juntos.
          </p>
        </div>
        <button className="button primary" onClick={() => setAdding(true)}>
          <Plus size={18} />
          Novo compromisso
        </button>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={showPast}
          onChange={(e) => setShowPast(e.target.checked)}
        />
        Mostrar compromissos passados
      </label>
      <div className="events-list">
        {list.length ? (
          list.map((a) => {
            const date = new Date(a.starts_at);
            return (
              <article className="event-card" key={a.id}>
                <div className="date-tile">
                  <small>
                    {date
                      .toLocaleDateString("pt-BR", { month: "short" })
                      .replace(".", "")
                      .toUpperCase()}
                  </small>
                  <strong>{date.getDate()}</strong>
                </div>
                <div>
                  <span className="eyebrow">
                    {date.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <h3>{a.title}</h3>
                  <p>
                    {data.members.find((m) => m.user_id === a.assigned_to)
                      ?.display_name || "Toda a família"}
                    {a.contact_id
                      ? " · " +
                        (data.contacts.find((c) => c.id === a.contact_id)
                          ?.name ?? "Contato")
                      : ""}
                  </p>
                  {a.notes && <small>{a.notes}</small>}
                </div>
                <button
                  className="icon-btn"
                  aria-label={"Remover " + a.title}
                  onClick={() => setRemoving(a.id)}
                >
                  <Trash2 size={17} />
                </button>
              </article>
            );
          })
        ) : (
          <div className="empty-state">
            <CalendarDays size={34} />
            <h3>Um espaço para combinar.</h3>
            <p>Adicione o primeiro compromisso da família.</p>
            <button
              className="button secondary"
              onClick={() => setAdding(true)}
            >
              Criar compromisso
            </button>
          </div>
        )}
      </div>
      {adding && (
        <Modal title="Novo compromisso" onClose={() => setAdding(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await onSave({
                  title: title.trim(),
                  starts_at: new Date(when).toISOString(),
                  assigned_to: person || null,
                  contact_id: contact || null,
                  notes: notes.trim(),
                });
                setAdding(false);
                setTitle("");
                setNotes("");
              } catch (e) {
                setError(humanError(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Título
              <input
                autoFocus
                required
                minLength={2}
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Revisão do carro"
              />
            </label>
            <label>
              Data e hora
              <input
                type="datetime-local"
                required
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </label>
            <p className="legal-note">
              Horário do seu aparelho:{" "}
              {Intl.DateTimeFormat().resolvedOptions().timeZone}.
            </p>
            <label>
              Responsável
              <select
                value={person}
                onChange={(e) => setPerson(e.target.value)}
              >
                <option value="">Toda a família</option>
                {data.members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Contato relacionado
              <select
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              >
                <option value="">Sem contato</option>
                {data.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Observações
              <textarea
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </label>
            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? "Salvando…" : "Combinar com a família"}
            </button>
          </form>
        </Modal>
      )}
      {removing && (
        <Modal title="Remover compromisso?" onClose={() => setRemoving(null)}>
          <p>Ele deixará de aparecer para todos os membros do grupo.</p>
          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
          <button
            className="button danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await onDelete(removing);
                setRemoving(null);
              } catch (e) {
                setError(humanError(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Remover compromisso
          </button>
        </Modal>
      )}
    </>
  );
}
