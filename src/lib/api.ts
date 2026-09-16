import { db } from "./supabase";
import type {
  Appointment,
  Contact,
  ContactInput,
  FamilyData,
  Group,
  Invite,
} from "../types";
function result<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data;
}
export async function groups() {
  return result(
    await db().from("df_groups").select("*").order("created_at"),
  ) as Group[];
}
async function readAll(
  table: string,
  g: string,
  order: string,
  ascending = true,
) {
  const rows: unknown[] = [];
  for (let start = 0; ; start += 500) {
    const page =
      result(
        await db()
          .from(table)
          .select("*")
          .eq("group_id", g)
          .order(order, { ascending })
          .order(table === "df_members" ? "user_id" : "id")
          .range(start, start + 499),
      ) ?? [];
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
export async function loadFamily(g: string): Promise<FamilyData> {
  const rows = await Promise.all([
    readAll("df_contacts", g, "name"),
    readAll("df_members", g, "joined_at"),
    readAll("df_appointments", g, "starts_at"),
    readAll("df_interactions", g, "created_at", false),
    readAll("df_nudges", g, "created_at", false),
  ]);
  const [contacts, members, appointments, interactions, nudges] = rows;
  return {
    contacts,
    members,
    appointments,
    interactions,
    nudges,
  } as FamilyData;
}
export async function createGroup(name: string, member: string) {
  return result(
    await db().rpc("df_create_group", {
      group_name: name,
      member_name: member,
    }),
  ) as string;
}
export async function joinGroup(token: string, member: string) {
  return result(
    await db().rpc("df_accept_invite", { token, member_name: member }),
  ) as string;
}
export async function saveContact(g: string, input: ContactInput, id?: string) {
  return result(
    await (
      id
        ? db().from("df_contacts").update(input).eq("id", id).eq("group_id", g)
        : db()
            .from("df_contacts")
            .insert({ ...input, group_id: g })
    )
      .select()
      .single(),
  ) as Contact;
}
export async function removeContact(g: string, id: string) {
  const r = await db()
    .from("df_contacts")
    .delete()
    .eq("group_id", g)
    .eq("id", id)
    .select("id");
  if (!result(r)?.length)
    throw new Error(
      "O contato não foi removido. Atualize a lista e tente novamente.",
    );
}
export async function saveAppointment(
  g: string,
  input: Omit<Appointment, "id" | "group_id" | "created_by">,
) {
  return result(
    await db()
      .from("df_appointments")
      .insert({ ...input, group_id: g })
      .select()
      .single(),
  ) as Appointment;
}
export async function removeAppointment(g: string, id: string) {
  if (
    !result(
      await db()
        .from("df_appointments")
        .delete()
        .eq("group_id", g)
        .eq("id", id)
        .select("id"),
    )?.length
  )
    throw new Error("O compromisso não foi removido.");
}
export async function addInteraction(
  g: string,
  contact_id: string,
  note: string,
  amount: number | null,
) {
  result(
    await db()
      .from("df_interactions")
      .insert({ group_id: g, contact_id, note, amount })
      .select()
      .single(),
  );
}
export async function invite(g: string) {
  return result(await db().rpc("df_create_invite", { g })) as string;
}
export async function invites(g: string) {
  return result(
    await db()
      .from("df_invites")
      .select("id,expires_at,revoked_at,accepted_at")
      .eq("group_id", g)
      .is("revoked_at", null)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
  ) as Invite[];
}
export async function revokeInvite(invite_id: string) {
  result(await db().rpc("df_revoke_invite", { invite_id }));
}
export async function removeMember(g: string, member_id: string) {
  result(await db().rpc("df_remove_member", { g, member_id }));
}
export async function transfer(g: string, member_id: string) {
  result(await db().rpc("df_transfer_group", { g, member_id }));
}
export async function rename(g: string, group_name: string) {
  result(await db().rpc("df_rename_group", { g, group_name }));
}
export async function nudge(
  g: string,
  contact: string,
  recipient: string,
  nudge_action: "call" | "whatsapp",
) {
  const id = result(
    await db().rpc("df_send_nudge", { g, contact, recipient, nudge_action }),
  );
  // In-app delivery is durable even when push is unavailable; do not claim push success.
  if (import.meta.env.VITE_VAPID_PUBLIC_KEY)
    void db()
      .functions.invoke("notify", { body: { nudge_id: id } })
      .catch(() => {});
}
export async function seen(id: string) {
  result(
    await db()
      .from("df_nudges")
      .update({ seen_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single(),
  );
}
export async function enablePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    throw new Error(
      "Este navegador não oferece notificações. No iPhone, adicione o app à tela inicial primeiro.",
    );
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey)
    throw new Error(
      "As notificações no aparelho ainda estão em preparação. Os lembretes aparecem dentro do app.",
    );
  if ((await Notification.requestPermission()) !== "granted")
    throw new Error(
      "Notificações não autorizadas nas configurações do navegador.",
    );
  const reg = await navigator.serviceWorker.ready;
  const raw = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/"));
  const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    }));
  const {
    data: { user },
    error,
  } = await db().auth.getUser();
  if (error || !user) throw new Error("Entre novamente.");
  const r = await db()
    .from("df_push_subscriptions")
    .upsert({
      endpoint: sub.endpoint,
      user_id: user.id,
      subscription: sub.toJSON(),
    });
  if (r.error) {
    await sub.unsubscribe();
    throw r.error;
  }
}
export async function signOut() {
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const { error } = await db()
        .from("df_push_subscriptions")
        .delete()
        .eq("endpoint", sub.endpoint);
      const disabled = await sub.unsubscribe();
      if (error && !disabled)
        throw new Error(
          "Não foi possível desligar as notificações deste aparelho. Tente novamente com conexão.",
        );
    }
  }
  const { error } = await db().auth.signOut({ scope: "local" });
  if (error) throw error;
  for (const key of Object.keys(localStorage))
    if (key.startsWith("df_selected_group_v2")) localStorage.removeItem(key);
  localStorage.removeItem("df_session");
}
export async function deleteAccount() {
  const { error } = await db().functions.invoke("delete-account", {
    body: { confirmation: "EXCLUIR" },
  });
  if (error)
    throw new Error(
      "Não foi possível excluir a conta. Se você é responsável por um grupo com outras pessoas, transfira a responsabilidade primeiro.",
    );
  await db().auth.signOut({ scope: "local" });
}
