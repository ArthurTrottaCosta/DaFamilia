import { useState } from "react";
import {
  Phone,
  MessageCircle,
  Star,
  Edit3,
  Download,
  Trash2,
  Heart,
  Clock,
} from "lucide-react";
import { Modal } from "./Modal";
import type { Contact, FamilyData } from "../types";
import {
  displayPhone,
  initials,
  download,
  vCard,
  humanError,
} from "../lib/utils";
export function ContactDetail({
  contact,
  data,
  userId,
  demo,
  onClose,
  onEdit,
  onPin,
  onDelete,
  onInteraction,
  onNudge,
}: {
  contact: Contact;
  data: FamilyData;
  userId: string;
  demo: boolean;
  onClose: () => void;
  onEdit: () => void;
  onPin: () => Promise<void>;
  onDelete: () => Promise<void>;
  onInteraction: (note: string, amount: number | null) => Promise<void>;
  onNudge: (recipient: string, action: "call" | "whatsapp") => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState("");
  const [action, setAction] = useState<"call" | "whatsapp">("call");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  async function run(fn: () => Promise<void>) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(humanError(e));
    } finally {
      setBusy(false);
    }
  }
  const history = data.interactions.filter((i) => i.contact_id === contact.id);
  return (
    <Modal title="Contato de confiança" onClose={onClose}>
      <div className="detail-hero">
        <span
          className={
            "avatar huge " + (contact.category === "Saúde" ? "sage" : "peach")
          }
        >
          {initials(contact.name)}
        </span>
        <h2>{contact.name}</h2>
        <p>{contact.specialty || contact.category}</p>
        <span className="pill">{contact.category}</span>
      </div>
      <div className="detail-actions">
        {demo ? (
          <p className="notice">
            Contato fictício. Ligações e mensagens ficam disponíveis nos seus
            contatos reais.
          </p>
        ) : (
          <>
            <a className="button primary" href={"tel:" + contact.phone}>
              <Phone size={17} />
              Ligar
            </a>
            <a
              className="button secondary"
              href={"https://wa.me/" + contact.phone.replace(/\D/g, "")}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>
          </>
        )}
      </div>
      <p className="detail-phone">{displayPhone(contact.phone)}</p>
      {contact.recommended_by && (
        <p className="recommendation">
          <Heart size={16} />
          Indicação de <strong>{contact.recommended_by}</strong>
        </p>
      )}
      {contact.notes && <p className="contact-note">{contact.notes}</p>}
      <div className="toolbar">
        <button disabled={busy} onClick={() => void run(onPin)}>
          <Star size={16} fill={contact.pinned ? "currentColor" : "none"} />
          {contact.pinned ? "Desafixar" : "Favoritar"}
        </button>
        <button onClick={onEdit}>
          <Edit3 size={16} />
          Editar
        </button>
        <button
          disabled={demo}
          onClick={() =>
            download(
              contact.name + ".vcf",
              vCard(contact.name, contact.phone),
              "text/vcard",
            )
          }
        >
          <Download size={16} />
          Salvar no celular
        </button>
      </div>
      <section className="detail-section">
        <h3>
          <Clock size={17} />
          Histórico de experiências
        </h3>
        {history.length === 0 ? (
          <p className="muted">
            A primeira experiência pode ajudar todo mundo.
          </p>
        ) : (
          history.map((h) => (
            <article className="history-item" key={h.id}>
              <p>{h.note}</p>
              <small>
                {new Date(h.created_at).toLocaleDateString("pt-BR")}
                {h.amount !== null
                  ? " · " +
                    Number(h.amount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : ""}
              </small>
            </article>
          ))
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await onInteraction(note.trim(), amount ? Number(amount) : null);
              setNote("");
              setAmount("");
              setMessage("Experiência registrada.");
            });
          }}
        >
          <label>
            Nova experiência
            <textarea
              required
              value={note}
              maxLength={1500}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Como foi o atendimento? Evite dados sensíveis."
              rows={2}
            />
          </label>
          <label>
            Valor pago (opcional)
            <input
              type="number"
              min="0"
              max="9999999999"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <button className="button secondary small" disabled={busy}>
            Registrar experiência
          </button>
        </form>
      </section>
      <section className="detail-section">
        <h3>Dar um toque em alguém</h3>
        <p className="muted">Um lembrete para falar com esse contato.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await onNudge(target, action);
              setMessage("Lembrete salvo para aparecer no app da pessoa.");
            });
          }}
        >
          <div className="form-grid">
            <label>
              Para quem?
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
              >
                <option value="">Escolha uma pessoa</option>
                {data.members
                  .filter((m) => m.user_id !== userId)
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              O que fazer?
              <select
                value={action}
                onChange={(e) =>
                  setAction(e.target.value as "call" | "whatsapp")
                }
              >
                <option value="call">Ligar</option>
                <option value="whatsapp">Mandar mensagem</option>
              </select>
            </label>
          </div>
          <button className="button secondary small" disabled={busy || !target}>
            Enviar lembrete
          </button>
        </form>
      </section>
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
      <div className="danger-zone">
        {confirmDelete ? (
          <>
            <p>
              Remover este contato e seu histórico do grupo? Os compromissos
              serão mantidos, sem o vínculo ao contato.
            </p>
            <button
              className="button danger small"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await onDelete();
                  onClose();
                })
              }
            >
              Sim, remover contato
            </button>
            <button
              className="text-button"
              onClick={() => setConfirmDelete(false)}
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            className="text-button danger-text"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={15} />
            Remover contato
          </button>
        )}
      </div>
    </Modal>
  );
}
