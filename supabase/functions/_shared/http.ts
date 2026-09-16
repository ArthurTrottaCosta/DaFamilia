import { createClient } from "npm:@supabase/supabase-js@2.116.0";
export const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
export function cors(req: Request) {
  const allowed = (
    Deno.env.get("ALLOWED_ORIGINS") ??
    "http://127.0.0.1:5178,http://localhost:5178"
  ).split(",");
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin)
      ? origin
      : allowed[0],
    "Access-Control-Allow-Headers":
      "authorization,apikey,content-type,x-client-info",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    Vary: "Origin",
  };
}
export function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
export async function caller(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const { data, error } = await admin.auth.getUser(header.slice(7));
  return error ? null : data.user;
}
export function validOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return (
    !origin ||
    (
      Deno.env.get("ALLOWED_ORIGINS") ??
      "http://127.0.0.1:5178,http://localhost:5178"
    )
      .split(",")
      .includes(origin)
  );
}
