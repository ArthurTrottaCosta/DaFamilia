import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d?.close();
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <dialog ref={ref} className="modal" aria-label={title} onCancel={onClose}>
      <header>
        <h2>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
