-- Separate v2 schema. Never overwrite or claim ownership of legacy families.
create extension if not exists pgcrypto with schema extensions;
create table public.df_groups (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 60),
 owner_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now()
);
create table public.df_members (
 group_id uuid not null references public.df_groups(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(length(trim(display_name)) between 2 and 50),
 role text not null default 'member' check(role in ('owner','admin','member')), joined_at timestamptz not null default now(),
 primary key(group_id,user_id)
);
create table public.df_invites (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.df_groups(id) on delete cascade,
 token_hash text unique not null, created_by uuid references auth.users(id) on delete set null,
 expires_at timestamptz not null default now()+interval '48 hours', revoked_at timestamptz, accepted_by uuid references auth.users(id) on delete set null,
 accepted_at timestamptz, created_at timestamptz not null default now()
);
create table public.df_contacts (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.df_groups(id) on delete cascade,
 name text not null check(length(trim(name)) between 2 and 100), phone text not null check(phone ~ '^\+[1-9][0-9]{7,14}$'),
 category text not null check(category in ('Casa','Saúde','Serviços','Família','Outros')),
 specialty text not null default '' check(length(specialty)<=100), recommended_by text not null default '' check(length(recommended_by)<=80),
 notes text not null default '' check(length(notes)<=2000), pinned boolean not null default false,
 created_by uuid default auth.uid() references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,group_id)
);
create table public.df_appointments (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.df_groups(id) on delete cascade,
 title text not null check(length(trim(title)) between 2 and 150), starts_at timestamptz not null, contact_id uuid,
 assigned_to uuid, notes text not null default '' check(length(notes)<=2000),
 created_by uuid default auth.uid() references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(contact_id,group_id) references public.df_contacts(id,group_id) on delete set null(contact_id),
 foreign key(group_id,assigned_to) references public.df_members(group_id,user_id) on delete set null(assigned_to)
);
create table public.df_interactions (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.df_groups(id) on delete cascade, contact_id uuid not null,
 note text not null check(length(trim(note)) between 1 and 1500), amount numeric(12,2) check(amount>=0),
 created_by uuid default auth.uid() references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 foreign key(contact_id,group_id) references public.df_contacts(id,group_id) on delete cascade
);
create table public.df_nudges (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.df_groups(id) on delete cascade,
 contact_id uuid not null, from_user uuid not null references auth.users(id) on delete cascade, to_user uuid not null,
 action text not null check(action in ('call','whatsapp')), seen_at timestamptz, push_claimed_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key(contact_id,group_id) references public.df_contacts(id,group_id) on delete cascade,
 foreign key(group_id,to_user) references public.df_members(group_id,user_id) on delete cascade
);
create table public.df_push_subscriptions (
 endpoint text primary key check(length(endpoint) < 2048 and endpoint like 'https://%'), user_id uuid not null references auth.users(id) on delete cascade,
 subscription jsonb not null, created_at timestamptz not null default now()
);
create index on public.df_members(user_id);
create index on public.df_contacts(group_id);
create index on public.df_appointments(group_id,starts_at);
create index on public.df_interactions(group_id,contact_id);
create index on public.df_nudges(to_user,group_id,created_at);
create index on public.df_invites(group_id);
create index on public.df_push_subscriptions(user_id);

create function public.df_is_member(g uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.df_members m where m.group_id=g and m.user_id=auth.uid());
$$;
create function public.df_is_admin(g uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.df_members m where m.group_id=g and m.user_id=auth.uid() and m.role in ('owner','admin'));
$$;
revoke all on function public.df_is_member(uuid), public.df_is_admin(uuid) from public,anon;
grant execute on function public.df_is_member(uuid), public.df_is_admin(uuid) to authenticated;

-- Prevent moving a record across groups or forging attribution during edits.
create function public.df_keep_identity() returns trigger language plpgsql set search_path='' as $$
begin
 if new.group_id is distinct from old.group_id or new.id is distinct from old.id or new.created_at is distinct from old.created_at or (new.created_by is distinct from old.created_by and not (new.created_by is null and pg_trigger_depth()>1)) then
  raise exception 'A identidade do registro não pode ser alterada.' using errcode='42501';
 end if;
 new.updated_at=now(); return new;
end;$$;
create trigger df_contact_identity before update on public.df_contacts for each row execute function public.df_keep_identity();
create trigger df_appointment_identity before update on public.df_appointments for each row execute function public.df_keep_identity();

alter table public.df_groups enable row level security;
alter table public.df_members enable row level security;
alter table public.df_invites enable row level security;
alter table public.df_contacts enable row level security;
alter table public.df_appointments enable row level security;
alter table public.df_interactions enable row level security;
alter table public.df_nudges enable row level security;
alter table public.df_push_subscriptions enable row level security;

revoke all on public.df_groups,public.df_members,public.df_invites,public.df_contacts,public.df_appointments,public.df_interactions,public.df_nudges,public.df_push_subscriptions from public,anon,authenticated;
grant select on public.df_groups,public.df_members,public.df_invites to authenticated;
grant select,insert,update,delete on public.df_contacts,public.df_appointments to authenticated;
grant select,insert,delete on public.df_interactions to authenticated;
grant select on public.df_nudges to authenticated;
grant update(seen_at) on public.df_nudges to authenticated;
grant select,insert,update,delete on public.df_push_subscriptions to authenticated;
grant all on public.df_groups,public.df_members,public.df_invites,public.df_contacts,public.df_appointments,public.df_interactions,public.df_nudges,public.df_push_subscriptions to service_role;
create policy groups_read on public.df_groups for select to authenticated using(public.df_is_member(id));
create policy members_read on public.df_members for select to authenticated using(public.df_is_member(group_id));
create policy invites_read on public.df_invites for select to authenticated using(public.df_is_admin(group_id));
create policy contacts_read on public.df_contacts for select to authenticated using(public.df_is_member(group_id));
create policy contacts_add on public.df_contacts for insert to authenticated with check(public.df_is_member(group_id) and created_by=auth.uid());
create policy contacts_edit on public.df_contacts for update to authenticated using(public.df_is_member(group_id)) with check(public.df_is_member(group_id));
create policy contacts_remove on public.df_contacts for delete to authenticated using(public.df_is_member(group_id));
create policy appointments_read on public.df_appointments for select to authenticated using(public.df_is_member(group_id));
create policy appointments_add on public.df_appointments for insert to authenticated with check(public.df_is_member(group_id) and created_by=auth.uid());
create policy appointments_edit on public.df_appointments for update to authenticated using(public.df_is_member(group_id)) with check(public.df_is_member(group_id));
create policy appointments_remove on public.df_appointments for delete to authenticated using(public.df_is_member(group_id));
create policy interactions_read on public.df_interactions for select to authenticated using(public.df_is_member(group_id));
create policy interactions_add on public.df_interactions for insert to authenticated with check(public.df_is_member(group_id) and created_by=auth.uid());
create policy interactions_remove on public.df_interactions for delete to authenticated using(public.df_is_member(group_id) and (created_by=auth.uid() or public.df_is_admin(group_id)));
create policy nudges_read on public.df_nudges for select to authenticated using(public.df_is_member(group_id) and (to_user=auth.uid() or from_user=auth.uid()));
create policy nudges_seen on public.df_nudges for update to authenticated using(to_user=auth.uid() and public.df_is_member(group_id)) with check(to_user=auth.uid() and public.df_is_member(group_id));
create policy subscriptions_own on public.df_push_subscriptions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and subscription->>'endpoint'=endpoint and jsonb_typeof(subscription->'keys')='object');

create function public.df_create_group(group_name text, member_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare g uuid;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from public.df_groups where owner_id=auth.uid())>=5 then raise exception 'Limite de cinco grupos por responsável.'; end if;
 insert into public.df_groups(name,owner_id) values(trim(group_name),auth.uid()) returning id into g;
 insert into public.df_members(group_id,user_id,display_name,role) values(g,auth.uid(),trim(member_name),'owner');
 return g;
end;$$;

create function public.df_create_invite(g uuid) returns text language plpgsql security definer set search_path='' as $$
declare token text:=encode(extensions.gen_random_bytes(32),'hex');
begin
 if not public.df_is_admin(g) then raise exception 'Somente administradores podem convidar.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(g::text));
 if (select count(*) from public.df_invites where group_id=g and created_at>now()-interval '1 hour')>=20 then raise exception 'Aguarde antes de criar mais convites.'; end if;
 insert into public.df_invites(group_id,token_hash,created_by) values(g,encode(extensions.digest(token,'sha256'),'hex'),auth.uid());
 return token;
end;$$;

create function public.df_accept_invite(token text, member_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare invite public.df_invites;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode='42501'; end if;
 if length(token)<>64 then raise exception 'Convite inválido ou expirado.'; end if;
 select * into invite from public.df_invites where token_hash=encode(extensions.digest(token,'sha256'),'hex') for update;
 if invite.id is null or invite.revoked_at is not null or invite.expires_at<=now() or invite.accepted_at is not null then raise exception 'Convite inválido ou expirado.'; end if;
 perform pg_advisory_xact_lock(hashtext(invite.group_id::text));
 if (select count(*) from public.df_members where group_id=invite.group_id)>=50 then raise exception 'O grupo atingiu o limite de 50 pessoas.'; end if;
 insert into public.df_members(group_id,user_id,display_name) values(invite.group_id,auth.uid(),trim(member_name)) on conflict do nothing;
 update public.df_invites set accepted_at=now(),accepted_by=auth.uid() where id=invite.id;
 return invite.group_id;
end;$$;

create function public.df_revoke_invite(invite_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.df_invites set revoked_at=now() where id=invite_id and public.df_is_admin(group_id);
 if not found then raise exception 'Convite não encontrado.' using errcode='42501'; end if;
end;$$;
create function public.df_remove_member(g uuid, member_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.df_groups where id=g for update;
 if not public.df_is_member(g) or (member_id<>auth.uid() and not public.df_is_admin(g)) then raise exception 'Sem permissão.' using errcode='42501'; end if;
 if exists(select 1 from public.df_groups where id=g and owner_id=member_id) then raise exception 'Transfira a responsabilidade antes de sair.'; end if;
 delete from public.df_members where group_id=g and user_id=member_id;
end;$$;
create function public.df_transfer_group(g uuid, member_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.df_groups where id=g and owner_id=auth.uid() for update;
 if not found or member_id=auth.uid() or not exists(select 1 from public.df_members where group_id=g and user_id=member_id) then raise exception 'Transferência não permitida.' using errcode='42501'; end if;
 update public.df_members set role=case when user_id=member_id then 'owner' else 'admin' end where group_id=g and user_id in (member_id,auth.uid());
 update public.df_groups set owner_id=member_id where id=g;
end;$$;
create function public.df_rename_group(g uuid, group_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.df_groups set name=trim(group_name) where id=g and public.df_is_admin(g);
 if not found then raise exception 'Sem permissão.' using errcode='42501'; end if;
end;$$;
create function public.df_send_nudge(g uuid, contact uuid, recipient uuid, nudge_action text) returns uuid language plpgsql security definer set search_path='' as $$
declare n uuid;
begin
 if not public.df_is_member(g) then raise exception 'Sem permissão.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from public.df_nudges where from_user=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Limite de dez lembretes por hora. Tente mais tarde.'; end if;
 if recipient=auth.uid() then raise exception 'Escolha outra pessoa.'; end if;
 insert into public.df_nudges(group_id,contact_id,from_user,to_user,action) values(g,contact,auth.uid(),recipient,nudge_action) returning id into n;
 return n;
end;$$;

-- Restrict RPCs: PostgreSQL otherwise grants EXECUTE to PUBLIC by default.
revoke all on function public.df_create_group(text,text),public.df_create_invite(uuid),public.df_accept_invite(text,text),public.df_revoke_invite(uuid),public.df_remove_member(uuid,uuid),public.df_transfer_group(uuid,uuid),public.df_rename_group(uuid,text),public.df_send_nudge(uuid,uuid,uuid,text) from public,anon;
grant execute on function public.df_create_group(text,text),public.df_create_invite(uuid),public.df_accept_invite(text,text),public.df_revoke_invite(uuid),public.df_remove_member(uuid,uuid),public.df_transfer_group(uuid,uuid),public.df_rename_group(uuid,text),public.df_send_nudge(uuid,uuid,uuid,text) to authenticated;
revoke all on function public.df_keep_identity() from public,anon,authenticated;

-- Legacy data is preserved but no longer accessible through anonymous/shared-code access.
-- Export and migrate only after proving individual ownership, never by possession of old code.
do $$ declare t text; begin
 foreach t in array array['families','members','contacts','appointments','interactions','nudges','push_subscriptions'] loop
  if to_regclass('public.'||t) is not null then
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on table public.%I from public, anon, authenticated',t);
  end if;
 end loop;
end $$;
