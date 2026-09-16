import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { categories } from "../types";
import type { Contact, ContactInput, Category } from "../types";
import { normalizePhone, humanError } from "../lib/utils";
export function ContactForm({
  contact,
  onSave,
  onClose,
}: {
  contact?: Contact;
  onSave: (input: ContactInput, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [category, setCategory] = useState<Category>(
    contact?.category ?? "Casa",
  );
  const [specialty, setSpecialty] = useState(contact?.specialty ?? "");
  const [by, setBy] = useState(contact?.recommended_by ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(
        {
          name: name.trim(),
          phone: normalizePhone(phone),
          category,
          specialty: specialty.trim(),
          recommended_by: by.trim(),
          notes: notes.trim(),
          pinned: contact?.pinned ?? false,
        },
        contact?.id,
      );
      onClose();
    } catch (e) {
      setError(humanError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={contact ? "Editar contato" : "Uma boa indicação"}
      onClose={onClose}
    >
      <p className="muted">Guarde quem faz parte da rotina de vocês.</p>
      <form onSubmit={submit}>
        <label>
          Nome do contato
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            placeholder="Ex.: Carlos, eletricista"
          />
        </label>
        <div className="form-grid">
          <label>
            Telefone com DDD
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="(11) 99999-9999"
              maxLength={22}
            />
          </label>
          <label>
            Categoria
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          O que essa pessoa faz?
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            maxLength={100}
            placeholder="Ex.: Elétrica residencial"
          />
        </label>
        <label>
          Quem indicou?
          <input
            value={by}
            onChange={(e) => setBy(e.target.value)}
            maxLength={80}
            placeholder="Ex.: A Lúcia indicou"
          />
        </label>
        <label>
          O que vale lembrar?
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Informações úteis que podem ser vistas por todo o grupo."
          />
        </label>
        <p className="legal-note">
          Este contato será compartilhado com seu grupo. Evite informações
          sensíveis.
        </p>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? "Salvando…" : "Guardar contato"}
        </button>
      </form>
    </Modal>
  );
}
