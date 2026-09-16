import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { humanError } from "../lib/utils";
export function GroupForm({
  onSubmit,
  onClose,
  initialToken = "",
}: {
  onSubmit: (
    mode: "create" | "join",
    group: string,
    name: string,
  ) => Promise<void>;
  onClose: () => void;
  initialToken?: string;
}) {
  const [mode, setMode] = useState<"create" | "join">(
    initialToken ? "join" : "create",
  );
  const [group, setGroup] = useState(initialToken);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let value = group.trim();
      if (mode === "join" && value.includes("://"))
        value = new URL(value).searchParams.get("convite") ?? "";
      await onSubmit(mode, value, name.trim());
      onClose();
    } catch (e) {
      setError(humanError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        mode === "create" ? "Vamos reunir sua família?" : "Entrar em um grupo"
      }
      onClose={onClose}
    >
      <div className="segmented">
        <button
          className={mode === "create" ? "active" : ""}
          onClick={() => {
            setMode("create");
            setGroup("");
          }}
        >
          Criar grupo
        </button>
        <button
          className={mode === "join" ? "active" : ""}
          onClick={() => {
            setMode("join");
            setGroup(initialToken);
          }}
        >
          Tenho um convite
        </button>
      </div>
      <form onSubmit={submit}>
        <label>
          Como você quer ser chamado?
          <input
            autoFocus
            required
            minLength={2}
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />
        </label>
        <label>
          {mode === "create"
            ? "Nome da família ou grupo"
            : "Link ou código do convite"}
          <input
            required
            minLength={mode === "create" ? 2 : 64}
            maxLength={mode === "create" ? 60 : 512}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder={
              mode === "create"
                ? "Ex.: Família Oliveira"
                : "Cole o convite que recebeu"
            }
          />
        </label>
        <p className="legal-note">
          {mode === "create"
            ? "Você será responsável pelo grupo e poderá convidar outras pessoas."
            : "Convites expiram em 48 horas e podem ser usados uma única vez."}
        </p>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy
            ? "Só um instante…"
            : mode === "create"
              ? "Criar meu grupo"
              : "Aceitar convite"}
        </button>
      </form>
    </Modal>
  );
}
