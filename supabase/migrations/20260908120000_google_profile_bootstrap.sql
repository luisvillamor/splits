-- Google OAuth users send name + picture in user metadata, not always full_name/avatar_url.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'user_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Friend'
    ),
    80
  );

  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    display_name,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  );
  return new;
end;
$$;
