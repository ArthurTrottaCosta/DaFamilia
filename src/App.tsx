import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { Landing } from "./components/Landing";
import { Auth } from "./components/Auth";
import { Legal } from "./components/Legal";
import { Workspace } from "./components/Workspace";
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const path = location.pathname;
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive) {
          setSession(error ? null : data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (alive) {
        setSession(s);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  if (path === "/") return <Landing />;
  if (["/privacidade", "/ajuda", "/excluir-conta"].includes(path))
    return <Legal page={path} />;
  if (path === "/demo") return <Workspace demo userId="demo-ana" />;
  if (path !== "/app")
    return (
      <main className="legal-page">
        <h1>Este caminho não existe.</h1>
        <a href="/">Voltar ao DaFamília</a>
      </main>
    );
  if (loading)
    return (
      <main className="loading-page" role="status">
        Preparando seu cantinho…
      </main>
    );
  return session ? (
    <Workspace userId={session.user.id} email={session.user.email} />
  ) : (
    <Auth />
  );
}
