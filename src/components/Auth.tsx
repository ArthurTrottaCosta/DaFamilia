import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { Brand } from "./Brand";
import { configured, db, launchReady } from "../lib/supabase";
import { humanError } from "../lib/utils";
export function Auth() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendAt, setResendAt] = useState(0);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (sent) {
        const { error } = await db().auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: token.trim(),
          type: "email",
        });
        if (error) throw error;
      } else {
        const { error } = await db().auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: { emailRedirectTo: location.origin + "/app" },
        });
        if (error) throw error;
        setSent(true);
        setResendAt(Date.now() + 60000);
      }
    } catch (e) {
      setError(humanError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <Brand />
      <a className="back-link" href="/">
        <ArrowLeft size={16} />
        Voltar ao site
      </a>
      <section className="auth-card">
        <div className="round-icon">
          <Mail />
        </div>
        <p className="eyebrow">SEU CANTINHO, COMPARTILHADO</p>
        <h1>{sent ? "Confira seu e-mail." : "Você está em casa."}</h1>
        <p>
          {sent
            ? "Enviamos um código de acesso para " +
              email +
              ". Ele vale por 10 minutos."
            : "Uma conta só sua. Os contatos que vocês compartilham, sempre por perto."}
        </p>
        {configured && (launchReady || import.meta.env.DEV) ? (
          <form onSubmit={submit}>
            {!sent ? (
              <label>
                Seu e-mail
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="voce@exemplo.com"
                />
              </label>
            ) : (
              <label>
                Código de acesso
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                  required
                  placeholder="000000"
                />
              </label>
            )}
            {error && (
              <p role="alert" className="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? "Só um instante…" : sent ? "Entrar" : "Receber código"}
              <ArrowRight size={18} />
            </button>
            {sent && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  if (Date.now() < resendAt) {
                    setError("Aguarde um minuto antes de pedir outro código.");
                    return;
                  }
                  setSent(false);
                  setToken("");
                  setError("");
                }}
              >
                Usar outro e-mail ou reenviar
              </button>
            )}
          </form>
        ) : (
          <div className="notice">
            <strong>A nova versão está chegando.</strong>
            <p>
              O cadastro será liberado depois dos testes de segurança. Você já
              pode conhecer a experiência.
            </p>
            <a className="button primary full" href="/demo">
              Explorar demonstração
              <ArrowRight size={18} />
            </a>
          </div>
        )}
        <p className="auth-note">
          <ShieldCheck size={16} />
          Seu acesso é individual. Nunca compartilhe seu código.
        </p>
        <p className="legal-note">
          Saiba como tratamos seus dados na{" "}
          <a href="/privacidade">política de privacidade</a>.
        </p>
      </section>
    </main>
  );
}
