import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { deleteAccount } from "../lib/api";
import { humanError } from "../lib/utils";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button className="text-button danger-text" onClick={() => setOpen(true)}>
        <Trash2 size={16} />
        Excluir minha conta
      </button>
      {open && (
        <Modal
          title="Excluir sua conta?"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>
            Sua conta e suas participações serão removidas. Grupos sem outras
            pessoas também serão excluídos. Registros compartilhados em grupos
            que continuam existindo permanecem sem atribuição à sua conta.
          </p>
          <label>
            Digite EXCLUIR para confirmar
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          <button
            className="button danger full"
            disabled={busy || confirmation !== "EXCLUIR"}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await deleteAccount();
                location.href = "/";
              } catch (e) {
                setError(humanError(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Excluir minha conta e encerrar acesso
          </button>
        </Modal>
      )}
    </>
  );
}
