import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
const status = JSON.parse(
  execFileSync(
    process.execPath,
    ["node_modules/supabase/dist/supabase.js", "status", "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ),
);
const url = status.API_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):56421$/.test(url))
  throw new Error("Security tests are LOCAL ONLY.");
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const service = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, service, options);
const anon = createClient(url, key, options);
const users = [];
let passed = 0;
function ok(r) {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
function check(label, fn) {
  fn();
  passed++;
  console.log("PASS " + label);
}
async function user(label) {
  const email = "security-" + label + "-" + Date.now() + "@example.test";
  const password = crypto.randomUUID() + "aA!";
  const u = ok(
    await admin.auth.admin.createUser({ email, password, email_confirm: true }),
  ).user;
  users.push(u.id);
  const client = createClient(url, key, options);
  ok(await client.auth.signInWithPassword({ email, password }));
  return { client, id: u.id };
}
async function forbidden(label, query) {
  const r = await query;
  check(label, () =>
    assert.ok(r.error || (Array.isArray(r.data) && r.data.length === 0)),
  );
}
try {
  const a = await user("a"),
    b = await user("b"),
    c = await user("c");
  const ga = ok(
    await a.client.rpc("df_create_group", {
      group_name: "Security family A",
      member_name: "Alice",
    }),
  );
  const gb = ok(
    await b.client.rpc("df_create_group", {
      group_name: "Security family B",
      member_name: "Bob",
    }),
  );
  const contact = ok(
    await a.client
      .from("df_contacts")
      .insert({
        group_id: ga,
        name: "Synthetic electrician",
        phone: "+5511999991111",
        category: "Casa",
      })
      .select()
      .single(),
  );
  const contactB = ok(
    await b.client
      .from("df_contacts")
      .insert({
        group_id: gb,
        name: "Synthetic dentist",
        phone: "+5511999992222",
        category: "Saúde",
      })
      .select()
      .single(),
  );
  check("creator sees own family", () => assert.equal(contact.group_id, ga));
  await forbidden(
    "anonymous cannot read contacts",
    anon.from("df_contacts").select("*"),
  );
  await forbidden(
    "anonymous cannot create groups",
    anon.rpc("df_create_group", {
      group_name: "Attack",
      member_name: "Attacker",
    }),
  );
  await forbidden(
    "other family cannot read contact",
    b.client.from("df_contacts").select("*").eq("id", contact.id),
  );
  await forbidden(
    "other family cannot edit by ID",
    b.client
      .from("df_contacts")
      .update({ name: "Attack" })
      .eq("id", contact.id)
      .select(),
  );
  await forbidden(
    "other family cannot delete by ID",
    b.client.from("df_contacts").delete().eq("id", contact.id).select(),
  );
  await forbidden(
    "cannot insert into other family",
    b.client
      .from("df_contacts")
      .insert({
        group_id: ga,
        name: "Attack",
        phone: "+5511999991111",
        category: "Casa",
      }),
  );
  await forbidden(
    "cannot forge contact author",
    a.client
      .from("df_contacts")
      .insert({
        group_id: ga,
        name: "Attack",
        phone: "+5511999991111",
        category: "Casa",
        created_by: b.id,
      }),
  );
  await forbidden(
    "cannot forge membership",
    b.client
      .from("df_members")
      .insert({
        group_id: ga,
        user_id: b.id,
        display_name: "Attack",
        role: "owner",
      }),
  );
  await forbidden(
    "cannot self-promote role",
    a.client
      .from("df_members")
      .update({ role: "owner" })
      .eq("group_id", gb)
      .select(),
  );
  await forbidden(
    "foreign contact cannot attach to appointment",
    a.client
      .from("df_appointments")
      .insert({
        group_id: ga,
        title: "Foreign appointment",
        starts_at: new Date().toISOString(),
        contact_id: contactB.id,
      }),
  );
  await forbidden(
    "foreign member cannot own appointment",
    a.client
      .from("df_appointments")
      .insert({
        group_id: ga,
        title: "Foreign assignee",
        starts_at: new Date().toISOString(),
        assigned_to: b.id,
      }),
  );
  await forbidden(
    "cannot insert history against foreign contact",
    a.client
      .from("df_interactions")
      .insert({ group_id: ga, contact_id: contactB.id, note: "Attack" }),
  );
  const token = ok(await a.client.rpc("df_create_invite", { g: ga }));
  check("invite uses 256 random bits", () =>
    assert.match(token, /^[a-f0-9]{64}$/),
  );
  await forbidden(
    "outsider cannot read invitation hashes",
    b.client.from("df_invites").select("*").eq("group_id", ga),
  );
  const joined = ok(
    await b.client.rpc("df_accept_invite", { token, member_name: "Bob in A" }),
  );
  check("valid invite joins correct group", () => assert.equal(joined, ga));
  await forbidden(
    "used invite cannot be replayed",
    c.client.rpc("df_accept_invite", { token, member_name: "Charlie" }),
  );
  await forbidden(
    "ordinary member cannot create invitation",
    b.client.rpc("df_create_invite", { g: ga }),
  );
  await forbidden(
    "member cannot move contact to another joined family",
    b.client
      .from("df_contacts")
      .update({ group_id: gb })
      .eq("id", contact.id)
      .select(),
  );
  const badToken = ok(await a.client.rpc("df_create_invite", { g: ga }));
  const inv = ok(
    await a.client
      .from("df_invites")
      .select("*")
      .eq("group_id", ga)
      .is("accepted_at", null)
      .single(),
  );
  ok(await a.client.rpc("df_revoke_invite", { invite_id: inv.id }));
  await forbidden(
    "revoked invite cannot join",
    c.client.rpc("df_accept_invite", {
      token: badToken,
      member_name: "Charlie",
    }),
  );
  const expiredToken = ok(await a.client.rpc("df_create_invite", { g: ga }));
  ok(
    await admin
      .from("df_invites")
      .update({ expires_at: new Date(0).toISOString() })
      .eq("group_id", ga)
      .is("accepted_at", null)
      .is("revoked_at", null),
  );
  await forbidden(
    "expired invite cannot join",
    c.client.rpc("df_accept_invite", {
      token: expiredToken,
      member_name: "Charlie",
    }),
  );
  const nudge = ok(
    await a.client.rpc("df_send_nudge", {
      g: ga,
      contact: contact.id,
      recipient: b.id,
      nudge_action: "call",
    }),
  );
  check("member can send validated nudge", () => assert.ok(nudge));
  const authA = (await a.client.auth.getSession()).data.session.access_token;
  const post = (name, body, token, origin = "http://127.0.0.1:5178") =>
    fetch(url + "/functions/v1/" + name, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Origin: origin,
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(body),
    });
  for (const fn of ["notify", "delete-account"]) {
    const r = await post(fn, {});
    check(fn + " rejects anonymous HTTP request", () =>
      assert.equal(r.status, 401),
    );
    const bad = await post(fn, {}, "invalid-token");
    check(fn + " rejects forged JWT", () => assert.equal(bad.status, 401));
    const cross = await post(fn, {}, authA, "https://untrusted.example");
    check(fn + " rejects foreign origin", () =>
      assert.equal(cross.status, 403),
    );
  }
  const push = await post("notify", { nudge_id: nudge }, authA);
  check("valid push reports missing configuration honestly", () =>
    assert.equal(push.status, 503),
  );
  const invalidPush = await post("notify", { nudge_id: "not-an-id" }, authA);
  check("push rejects invalid input", () =>
    assert.equal(invalidPush.status, 400),
  );
  const ownerDelete = await post(
    "delete-account",
    { confirmation: "EXCLUIR" },
    authA,
  );
  check("HTTP deletion blocks shared group owner", () =>
    assert.equal(ownerDelete.status, 409),
  );

  await forbidden(
    "client cannot spoof arbitrary nudge sender",
    a.client
      .from("df_nudges")
      .insert({
        group_id: ga,
        contact_id: contact.id,
        from_user: b.id,
        to_user: a.id,
        action: "call",
      }),
  );
  await forbidden(
    "client cannot claim privileged push delivery",
    b.client
      .from("df_nudges")
      .update({ push_claimed_at: new Date().toISOString() })
      .eq("id", nudge),
  );
  await forbidden(
    "client cannot delete any account via service RPC",
    a.client.rpc("df_delete_account_transaction", { target_user: b.id }),
  );
  await forbidden(
    "owner with other members must transfer before deleting",
    admin.rpc("df_delete_account_transaction", { target_user: a.id }),
  );
  await forbidden(
    "owner cannot remove self leaving orphan group",
    a.client.rpc("df_remove_member", { g: ga, member_id: a.id }),
  );
  ok(await a.client.rpc("df_remove_member", { g: ga, member_id: b.id }));
  await forbidden(
    "removed member old token cannot read contacts",
    b.client.from("df_contacts").select("*").eq("group_id", ga),
  );
  await forbidden(
    "removed member old token cannot edit",
    b.client
      .from("df_contacts")
      .update({ name: "Stale token" })
      .eq("id", contact.id)
      .select(),
  );
  await forbidden(
    "removed member cannot send nudge",
    b.client.rpc("df_send_nudge", {
      g: ga,
      contact: contact.id,
      recipient: a.id,
      nudge_action: "call",
    }),
  );
  const sub = {
    endpoint:
      "https://fcm.googleapis.com/fcm/send/local-security-test-" + Date.now(),
    keys: { auth: "synthetic", p256dh: "synthetic" },
  };
  ok(
    await a.client
      .from("df_push_subscriptions")
      .insert({ endpoint: sub.endpoint, user_id: a.id, subscription: sub }),
  );
  await forbidden(
    "other user cannot read subscriptions",
    b.client
      .from("df_push_subscriptions")
      .select("*")
      .eq("endpoint", sub.endpoint),
  );
  await forbidden(
    "other user cannot overwrite device ownership",
    b.client
      .from("df_push_subscriptions")
      .upsert({ endpoint: sub.endpoint, user_id: b.id, subscription: sub }),
  );
  const rejoin = ok(await a.client.rpc("df_create_invite", { g: ga }));
  ok(
    await c.client.rpc("df_accept_invite", {
      token: rejoin,
      member_name: "Charlie",
    }),
  );
  ok(
    await c.client
      .from("df_contacts")
      .insert({
        group_id: ga,
        name: "Shared by deleted member",
        phone: "+5511999993333",
        category: "Outros",
      }),
  );
  const authC = (await c.client.auth.getSession()).data.session.access_token;
  const badDelete = await post(
    "delete-account",
    { confirmation: "wrong" },
    authC,
  );
  check("HTTP deletion requires explicit confirmation", () =>
    assert.equal(badDelete.status, 400),
  );
  const deletion = await post(
    "delete-account",
    { confirmation: "EXCLUIR" },
    authC,
  );
  check("HTTP deletion removes authenticated account", () =>
    assert.equal(deletion.status, 200),
  );
  const removed = ok(
    await a.client
      .from("df_members")
      .select("user_id")
      .eq("group_id", ga)
      .eq("user_id", c.id),
  );
  check("deleted member is removed", () => assert.equal(removed.length, 0));
  const shared = ok(
    await a.client
      .from("df_contacts")
      .select("created_by")
      .eq("group_id", ga)
      .eq("name", "Shared by deleted member")
      .single(),
  );
  check("shared contact anonymized on account deletion", () =>
    assert.equal(shared.created_by, null),
  );
  await forbidden(
    "deleted user retained JWT cannot read group",
    c.client.from("df_contacts").select("*").eq("group_id", ga),
  );
  const retained = ok(
    await a.client
      .from("df_contacts")
      .select("name")
      .eq("id", contact.id)
      .single(),
  );
  check("owner still reads own data after attacks", () =>
    assert.equal(retained.name, "Synthetic electrician"),
  );
  console.log(
    JSON.stringify({ result: "PASS", checks: passed, environment: url }),
  );
} finally {
  for (const id of users.reverse()) {
    const r = await admin.auth.admin.deleteUser(id);
    if (r.error && !/not found/i.test(r.error.message))
      console.error(
        "Cleanup failed for synthetic local user:",
        r.error.code ?? "error",
      );
  }
}
