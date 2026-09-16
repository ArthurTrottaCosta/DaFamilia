-- Only server code, after validating a user token, may invoke this transaction.
create function public.df_delete_account_transaction(target_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if target_user is null then raise exception 'Conta inválida.'; end if;
 -- Serialize with group membership changes/acceptance and ownership transfer.
 perform 1 from public.df_groups where owner_id=target_user order by id for update;
 if exists(select 1 from public.df_groups g join public.df_members m on m.group_id=g.id where g.owner_id=target_user and m.user_id<>target_user) then
  raise exception 'Transfira a responsabilidade dos grupos com outros membros.';
 end if;
 -- Foreign keys remove sessions/identities, own groups, memberships and devices,
 -- and anonymize attribution in surviving groups. No storage buckets are used.
 delete from auth.users where id=target_user;
end;$$;
revoke all on function public.df_delete_account_transaction(uuid) from public,anon,authenticated;
grant execute on function public.df_delete_account_transaction(uuid) to service_role;
