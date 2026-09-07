-- Create a group and add the signed-in user as owner in one step.
-- Avoids RLS blocking INSERT ... RETURNING before membership exists.
-- Run this in the Supabase SQL Editor once (New query).

create or replace function public.create_group(_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text;
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'You need to sign in before creating a group.';
  end if;

  cleaned := trim(coalesce(_name, ''));
  if char_length(cleaned) < 2 or char_length(cleaned) > 60 then
    raise exception 'Give your group a name.';
  end if;

  insert into public.groups (name, creator_id)
  values (cleaned, auth.uid())
  returning id into _id;

  insert into public.group_members (group_id, user_id, role)
  values (_id, auth.uid(), 'owner');

  return _id;
end;
$$;

grant execute on function public.create_group(text) to authenticated;

drop policy if exists "groups_select_creator" on public.groups;
create policy "groups_select_creator"
  on public.groups for select
  using (creator_id = auth.uid());
