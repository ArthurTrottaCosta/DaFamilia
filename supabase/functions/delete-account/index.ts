import { admin, caller, cors, json, validOrigin } from "../_shared/http.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST")
    return json(req, { error: "Método não permitido." }, 405);
  if (!validOrigin(req))
    return json(req, { error: "Origem não autorizada." }, 403);
  const user = await caller(req);
  if (!user) return json(req, { error: "Entre novamente." }, 401);
  try {
    const raw = await req.text();
    if (raw.length > 128)
      return json(req, { error: "Confirmação inválida." }, 400);
    if (JSON.parse(raw).confirmation !== "EXCLUIR")
      return json(req, { error: "Confirme a exclusão." }, 400);
    const { error } = await admin.rpc("df_delete_account_transaction", {
      target_user: user.id,
    });
    if (error)
      return json(
        req,
        {
          error:
            "Transfira os grupos com outros participantes antes de excluir sua conta.",
        },
        409,
      );
    return json(req, { deleted: true });
  } catch {
    return json(req, { error: "Não foi possível excluir a conta." }, 500);
  }
});
