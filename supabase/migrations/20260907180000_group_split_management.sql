-- Owner-only group/split deletion, member removal, and unfinalize.
-- Run this in the Supabase SQL Editor once (New query).

create or replace function public.is_group_owner(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups
    where id = _group_id
      and creator_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS: deletes that the UI also performs through SECURITY DEFINER RPCs
-- ---------------------------------------------------------------------------
drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner"
  on public.groups for delete
  using (creator_id = auth.uid());

drop policy if exists "group_members_delete_owner" on public.group_members;
create policy "group_members_delete_owner"
  on public.group_members for delete
  using (
    public.is_group_owner(group_id)
    and user_id <> auth.uid()
    and role <> 'owner'
  );

drop policy if exists "splits_delete_creator" on public.split_sessions;
create policy "splits_delete_creator"
  on public.split_sessions for delete
  using (creator_id = auth.uid());

drop policy if exists "settlements_delete_creator" on public.settlement_transfers;
create policy "settlements_delete_creator"
  on public.settlement_transfers for delete
  using (public.is_split_creator(split_id));

-- ---------------------------------------------------------------------------
-- RPCs: cascade and cleanup need to bypass child-table RLS
-- ---------------------------------------------------------------------------
create or replace function public.delete_group(_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in to continue.';
  end if;

  if not public.is_group_owner(_group_id) then
    raise exception 'Only the group owner can delete this group.';
  end if;

  delete from public.groups where id = _group_id;
end;
$$;

create or replace function public.remove_group_member(_group_id uuid, _user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in to continue.';
  end if;

  if not public.is_group_owner(_group_id) then
    raise exception 'Only the group owner can remove members.';
  end if;

  if _user_id = auth.uid() then
    raise exception 'You cannot remove yourself from the group.';
  end if;

  if exists (
    select 1
    from public.group_members
    where group_id = _group_id
      and user_id = _user_id
      and role = 'owner'
  ) then
    raise exception 'The group owner cannot be removed.';
  end if;

  if not exists (
    select 1
    from public.group_members
    where group_id = _group_id
      and user_id = _user_id
  ) then
    raise exception 'That person is not in this group.';
  end if;

  if exists (
    select 1
    from public.split_sessions
    where group_id = _group_id
      and creator_id = _user_id
  ) then
    raise exception 'This person created a Split in this group. Delete those Splits first.';
  end if;

  -- Drop them from open sessions only. Finalized history stays intact.
  delete from public.expense_participants
  where user_id = _user_id
    and expense_id in (
      select e.id
      from public.expenses e
      join public.split_sessions s on s.id = e.split_id
      where s.group_id = _group_id
        and s.status = 'open'
    );

  delete from public.bill_contributions
  where user_id = _user_id
    and split_id in (
      select s.id
      from public.split_sessions s
      where s.group_id = _group_id
        and s.status = 'open'
    );

  delete from public.split_participants
  where user_id = _user_id
    and split_id in (
      select s.id
      from public.split_sessions s
      where s.group_id = _group_id
        and s.status = 'open'
    );

  delete from public.group_members
  where group_id = _group_id
    and user_id = _user_id;
end;
$$;

create or replace function public.delete_split(_split_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in to continue.';
  end if;

  if not public.is_split_creator(_split_id) then
    raise exception 'Only the Split owner can delete this Split.';
  end if;

  delete from public.split_sessions where id = _split_id;
end;
$$;

create or replace function public.unfinalize_split(_split_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _row public.split_sessions%rowtype;
  _paid_count integer;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to continue.';
  end if;

  select * into _row
  from public.split_sessions
  where id = _split_id;

  if not found then
    raise exception 'This Split could not be found.';
  end if;

  if _row.creator_id <> auth.uid() then
    raise exception 'Only the Split owner can reopen this Split.';
  end if;

  if _row.status <> 'finalized' then
    raise exception 'This Split is already open.';
  end if;

  select count(*) into _paid_count
  from public.settlement_transfers
  where split_id = _split_id
    and status = 'paid';

  delete from public.settlement_transfers where split_id = _split_id;

  update public.split_sessions
  set
    status = 'open',
    finalized_at = null,
    finalized_by = null,
    snapshot = null,
    updated_at = now()
  where id = _split_id;

  insert into public.activity_logs (
    split_id,
    user_id,
    action,
    entity_type,
    entity_id,
    previous_data,
    new_data
  )
  values (
    _split_id,
    auth.uid(),
    'unfinalized_split',
    'split',
    _split_id,
    jsonb_build_object(
      'finalized_at', _row.finalized_at,
      'finalized_by', _row.finalized_by,
      'paid_count', _paid_count
    ),
    jsonb_build_object('status', 'open')
  );
end;
$$;

grant execute on function public.is_group_owner(uuid) to authenticated;
grant execute on function public.delete_group(uuid) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.delete_split(uuid) to authenticated;
grant execute on function public.unfinalize_split(uuid) to authenticated;
