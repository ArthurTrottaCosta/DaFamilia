import webpush from "npm:web-push@3.6.7";
import { admin, caller, cors, json, validOrigin } from "../_shared/http.ts";
function validEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      (u.hostname === "fcm.googleapis.com" ||
        u.hostname === "updates.push.services.mozilla.com" ||
        u.hostname.endsWith(".push.apple.com") ||
        u.hostname === "web.push.apple.com" ||
        u.hostname.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST")
    return json(req, { error: "Método não permitido." }, 405);
  if (!validOrigin(req))
    return json(req, { error: "Origem não autorizada." }, 403);
  const user = await caller(req);
  if (!user) return json(req, { error: "Entre na sua conta." }, 401);
  try {
    const raw = await req.text();
    if (raw.length > 1024)
      return json(req, { error: "Requisição inválida." }, 400);
    const { nudge_id } = JSON.parse(raw);
    if (typeof nudge_id !== "string" || !/^[-a-f0-9]{36}$/.test(nudge_id))
      return json(req, { error: "Lembrete inválido." }, 400);
    const { data: n, error } = await admin
      .from("df_nudges")
      .select("*")
      .eq("id", nudge_id)
      .eq("from_user", user.id)
      .is("push_claimed_at", null)
      .gt("created_at", new Date(Date.now() - 300000).toISOString())
      .maybeSingle();
    if (error || !n) return json(req, { error: "Lembrete indisponível." }, 404);
    const { data: members, error: memberError } = await admin
      .from("df_members")
      .select("user_id")
      .eq("group_id", n.group_id)
      .in("user_id", [user.id, n.to_user]);
    if (memberError || members?.length !== 2)
      return json(req, { error: "Participação encerrada." }, 403);
    const pub = Deno.env.get("VAPID_PUBLIC_KEY"),
      priv = Deno.env.get("VAPID_PRIVATE_KEY"),
      subject = Deno.env.get("VAPID_SUBJECT");
    if (!pub || !priv || !subject)
      return json(
        req,
        {
          error:
            "Push ainda não configurado. Lembrete disponível no aplicativo.",
        },
        503,
      );
    const { data: claim, error: claimError } = await admin
      .from("df_nudges")
      .update({ push_claimed_at: new Date().toISOString() })
      .eq("id", n.id)
      .is("push_claimed_at", null)
      .select("id");
    if (claimError || !claim?.length)
      return json(req, { error: "Lembrete já processado." }, 409);
    webpush.setVapidDetails(subject, pub, priv);
    const { data: subs, error: subsError } = await admin
      .from("df_push_subscriptions")
      .select("endpoint,subscription")
      .eq("user_id", n.to_user);
    if (subsError)
      return json(
        req,
        { error: "Não foi possível consultar os aparelhos." },
        503,
      );
    let accepted = 0;
    for (const row of subs ?? []) {
      if (!validEndpoint(row.endpoint)) continue;
      try {
        // Generic lock-screen text: never transmit contact names, numbers or medical context.
        await webpush.sendNotification(
          row.subscription,
          JSON.stringify({
            title: "DaFamília",
            body: "Você tem um novo lembrete no seu grupo.",
          }),
          { TTL: 3600, timeout: 10000 },
        );
        accepted++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410)
          await admin
            .from("df_push_subscriptions")
            .delete()
            .eq("endpoint", row.endpoint)
            .eq("user_id", n.to_user);
      }
    }
    return json(req, { accepted, delivered: false }); // Provider acceptance is not proof of delivery.
  } catch {
    return json(req, { error: "Não foi possível processar o lembrete." }, 400);
  }
});
