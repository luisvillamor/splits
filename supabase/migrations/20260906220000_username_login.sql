-- Username login lookup. Does not change existing tables.
-- Run this in the Supabase SQL Editor once.

create or replace function public.resolve_login_email(_identifier text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  cleaned text;
  result text;
begin
  cleaned := lower(trim(coalesce(_identifier, '')));
  if cleaned = '' then
    return null;
  end if;

  if position('@' in cleaned) > 0 then
    return cleaned;
  end if;

  select u.email
    into result
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.full_name) = cleaned
  limit 1;

  return result;
end;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;
