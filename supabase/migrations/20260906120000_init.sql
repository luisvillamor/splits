-- Splits MVP schema
-- Money is stored as integer centavos (BIGINT). Do not store pesos as floats.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  avatar_url text,
  creator_id uuid not null references public.profiles (id),
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Split sessions
-- ---------------------------------------------------------------------------
create table public.split_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  creator_id uuid not null references public.profiles (id),
  name text not null check (char_length(name) between 1 and 80),
  emoji text not null default '🧾',
  occurred_on date not null default (timezone('Asia/Manila', now()))::date,
  status text not null default 'open' check (status in ('open', 'finalized')),
  finalized_at timestamptz,
  finalized_by uuid references public.profiles (id),
  snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.split_participants (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.split_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  unique (split_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Expenses, fees, receipts
-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.split_sessions (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  name text not null check (char_length(name) between 1 and 80),
  amount_centavos bigint not null check (amount_centavos >= 0),
  type text not null check (type in ('individual', 'shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_participants (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  unique (expense_id, user_id)
);

create table public.fees (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.split_sessions (id) on delete cascade,
  type text not null check (type in ('tax', 'service', 'other')),
  name text not null,
  amount_centavos bigint not null check (amount_centavos >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null unique references public.split_sessions (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  file_path text not null,
  receipt_total_centavos bigint not null check (receipt_total_centavos >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Who paid the restaurant (not the same as friend-to-friend settlement)
create table public.bill_contributions (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.split_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  amount_centavos bigint not null check (amount_centavos >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (split_id, user_id)
);

-- Frozen at finalize. Payment status can still change.
create table public.settlement_transfers (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.split_sessions (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id),
  to_user_id uuid not null references public.profiles (id),
  amount_centavos bigint not null check (amount_centavos > 0),
  status text not null default 'unpaid' check (status in ('unpaid', 'pending', 'paid', 'failed')),
  payment_method text check (payment_method in ('manual', 'gcash')),
  provider_ref text,
  paid_at timestamptz,
  marked_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.split_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  action text not null,
  entity_type text,
  entity_id uuid,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index group_members_user_idx on public.group_members (user_id);
create index group_members_group_idx on public.group_members (group_id);
create index groups_invite_code_idx on public.groups (invite_code);
create index split_sessions_group_idx on public.split_sessions (group_id, occurred_on desc);
create index split_participants_user_idx on public.split_participants (user_id);
create index expenses_split_idx on public.expenses (split_id, created_at);
create index expense_participants_user_idx on public.expense_participants (user_id);
create index fees_split_idx on public.fees (split_id);
create index contributions_split_idx on public.bill_contributions (split_id);
create index settlements_split_idx on public.settlement_transfers (split_id, status);
create index activity_split_idx on public.activity_logs (split_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.groups
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.split_sessions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.fees
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.receipts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.bill_contributions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.settlement_transfers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth profile bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Invite codes
-- ---------------------------------------------------------------------------
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i int;
begin
  loop
    result := '';
    for i in 1..8 loop
      result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = result);
  end loop;
  return result;
end;
$$;

create or replace function public.set_group_invite_code()
returns trigger
language plpgsql
as $$
begin
  if new.invite_code is null or new.invite_code = '' then
    new.invite_code := public.generate_invite_code();
  end if;
  return new;
end;
$$;

create trigger set_group_invite_code
  before insert on public.groups
  for each row execute function public.set_group_invite_code();

-- ---------------------------------------------------------------------------
-- Membership helpers (security definer to avoid RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_group_member(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = _group_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_split_participant(_split_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.split_participants
    where split_id = _split_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_split_creator(_split_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.split_sessions
    where id = _split_id
      and creator_id = auth.uid()
  );
$$;

create or replace function public.split_is_open(_split_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.split_sessions
    where id = _split_id
      and status = 'open'
  );
$$;

create or replace function public.expense_split_id(_expense_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select split_id from public.expenses where id = _expense_id;
$$;

-- ---------------------------------------------------------------------------
-- Join by invite code
-- ---------------------------------------------------------------------------
create or replace function public.join_group_by_code(_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _group public.groups%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You need to sign in before joining a group.';
  end if;

  select * into _group
  from public.groups
  where upper(invite_code) = upper(trim(_code));

  if not found then
    raise exception 'That invite code is not valid.';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (_group.id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return _group.id;
end;
$$;

create or replace function public.preview_group_by_code(_code text)
returns table (id uuid, name text, member_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select g.id, g.name, count(m.id)
  from public.groups g
  left join public.group_members m on m.group_id = g.id
  where upper(g.invite_code) = upper(trim(_code))
  group by g.id, g.name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.split_sessions enable row level security;
alter table public.split_participants enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;
alter table public.fees enable row level security;
alter table public.receipts enable row level security;
alter table public.bill_contributions enable row level security;
alter table public.settlement_transfers enable row level security;
alter table public.activity_logs enable row level security;

-- Profiles
create policy "profiles_select_related"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.group_members me
      join public.group_members them on them.group_id = me.group_id
      where me.user_id = auth.uid()
        and them.user_id = profiles.id
    )
  );

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

-- Groups
create policy "groups_select_member"
  on public.groups for select
  using (public.is_group_member(id));

create policy "groups_insert_auth"
  on public.groups for insert
  with check (auth.uid() = creator_id);

create policy "groups_update_owner"
  on public.groups for update
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

-- Group members
create policy "group_members_select"
  on public.group_members for select
  using (public.is_group_member(group_id));

create policy "group_members_insert_owner"
  on public.group_members for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.groups g
      where g.id = group_id and g.creator_id = auth.uid()
    )
  );

-- Split sessions
create policy "splits_select_member"
  on public.split_sessions for select
  using (public.is_group_member(group_id));

create policy "splits_insert_member"
  on public.split_sessions for insert
  with check (
    creator_id = auth.uid()
    and public.is_group_member(group_id)
  );

create policy "splits_update_creator"
  on public.split_sessions for update
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

-- Split participants
create policy "split_participants_select"
  on public.split_participants for select
  using (public.is_split_participant(split_id) or public.is_group_member(
    (select group_id from public.split_sessions s where s.id = split_id)
  ));

create policy "split_participants_insert_creator"
  on public.split_participants for insert
  with check (
    public.is_split_creator(split_id)
    and public.split_is_open(split_id)
  );

create policy "split_participants_delete_creator"
  on public.split_participants for delete
  using (
    public.is_split_creator(split_id)
    and public.split_is_open(split_id)
  );

-- Expenses
create policy "expenses_select"
  on public.expenses for select
  using (public.is_split_participant(split_id));

create policy "expenses_insert"
  on public.expenses for insert
  with check (
    created_by = auth.uid()
    and public.is_split_participant(split_id)
    and public.split_is_open(split_id)
  );

create policy "expenses_update"
  on public.expenses for update
  using (
    public.split_is_open(split_id)
    and (
      public.is_split_creator(split_id)
      or created_by = auth.uid()
    )
  )
  with check (
    public.split_is_open(split_id)
    and (
      public.is_split_creator(split_id)
      or created_by = auth.uid()
    )
  );

create policy "expenses_delete"
  on public.expenses for delete
  using (
    public.split_is_open(split_id)
    and (
      public.is_split_creator(split_id)
      or created_by = auth.uid()
    )
  );

-- Expense participants
create policy "expense_participants_select"
  on public.expense_participants for select
  using (public.is_split_participant(public.expense_split_id(expense_id)));

create policy "expense_participants_write"
  on public.expense_participants for all
  using (
    public.split_is_open(public.expense_split_id(expense_id))
    and (
      public.is_split_creator(public.expense_split_id(expense_id))
      or exists (
        select 1 from public.expenses e
        where e.id = expense_id and e.created_by = auth.uid()
      )
    )
  )
  with check (
    public.split_is_open(public.expense_split_id(expense_id))
    and public.is_split_participant(public.expense_split_id(expense_id))
  );

-- Fees, receipts, contributions: creator while open
create policy "fees_select"
  on public.fees for select
  using (public.is_split_participant(split_id));

create policy "fees_write_creator"
  on public.fees for all
  using (public.is_split_creator(split_id) and public.split_is_open(split_id))
  with check (public.is_split_creator(split_id) and public.split_is_open(split_id));

create policy "receipts_select"
  on public.receipts for select
  using (public.is_split_participant(split_id));

create policy "receipts_write_creator"
  on public.receipts for all
  using (public.is_split_creator(split_id) and public.split_is_open(split_id))
  with check (public.is_split_creator(split_id) and public.split_is_open(split_id));

create policy "contributions_select"
  on public.bill_contributions for select
  using (public.is_split_participant(split_id));

create policy "contributions_write_creator"
  on public.bill_contributions for all
  using (public.is_split_creator(split_id) and public.split_is_open(split_id))
  with check (public.is_split_creator(split_id) and public.split_is_open(split_id));

-- Settlements: readable by participants; payment status updatable after finalize
create policy "settlements_select"
  on public.settlement_transfers for select
  using (public.is_split_participant(split_id));

create policy "settlements_insert_creator"
  on public.settlement_transfers for insert
  with check (public.is_split_creator(split_id));

create policy "settlements_update_payment"
  on public.settlement_transfers for update
  using (
    public.is_split_participant(split_id)
    and (
      from_user_id = auth.uid()
      or to_user_id = auth.uid()
      or public.is_split_creator(split_id)
    )
  )
  with check (
    public.is_split_participant(split_id)
    and (
      from_user_id = auth.uid()
      or to_user_id = auth.uid()
      or public.is_split_creator(split_id)
    )
  );

create policy "activity_select"
  on public.activity_logs for select
  using (public.is_split_participant(split_id));

create policy "activity_insert"
  on public.activity_logs for insert
  with check (
    user_id = auth.uid()
    and public.is_split_participant(split_id)
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- Last-write-wins: clients refetch the split bundle on any change.
-- ---------------------------------------------------------------------------
alter table public.expenses replica identity full;
alter table public.expense_participants replica identity full;
alter table public.fees replica identity full;
alter table public.receipts replica identity full;
alter table public.bill_contributions replica identity full;
alter table public.settlement_transfers replica identity full;
alter table public.split_sessions replica identity full;
alter table public.split_participants replica identity full;
alter table public.activity_logs replica identity full;

alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.expense_participants;
alter publication supabase_realtime add table public.fees;
alter publication supabase_realtime add table public.receipts;
alter publication supabase_realtime add table public.bill_contributions;
alter publication supabase_realtime add table public.settlement_transfers;
alter publication supabase_realtime add table public.split_sessions;
alter publication supabase_realtime add table public.split_participants;
alter publication supabase_realtime add table public.activity_logs;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false), ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatar_own_write"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "receipts_participant_read"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and public.is_split_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "receipts_creator_write"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and public.is_split_creator(((storage.foldername(name))[1])::uuid)
  );

create policy "receipts_creator_update"
  on storage.objects for update
  using (
    bucket_id = 'receipts'
    and public.is_split_creator(((storage.foldername(name))[1])::uuid)
  );

grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.preview_group_by_code(text) to authenticated, anon;
grant execute on function public.is_group_member(uuid) to authenticated, anon;
grant execute on function public.is_split_participant(uuid) to authenticated, anon;
grant execute on function public.is_split_creator(uuid) to authenticated, anon;
grant execute on function public.split_is_open(uuid) to authenticated, anon;
grant execute on function public.expense_split_id(uuid) to authenticated, anon;
