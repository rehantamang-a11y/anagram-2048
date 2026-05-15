do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'reactions'
  ) then
    create table public.reactions (
      emoji text primary key check (emoji in ('fire', 'brain', 'tough', 'fun')),
      count integer not null default 0 check (count >= 0),
      updated_at timestamptz not null default now()
    );
  end if;
end;
$$;

alter table public.reactions
add column if not exists updated_at timestamptz not null default now();

insert into public.reactions (emoji, count)
values
  ('fire', 0),
  ('brain', 0),
  ('tough', 0),
  ('fun', 0)
on conflict (emoji) do nothing;

alter table public.reactions enable row level security;

drop policy if exists "Anyone can read reaction counts" on public.reactions;

create policy "Anyone can read reaction counts"
on public.reactions
for select
to anon, authenticated
using (true);

create or replace function public.increment_reaction(reaction_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if reaction_key not in ('fire', 'brain', 'tough', 'fun') then
    raise exception 'Invalid reaction';
  end if;

  update public.reactions as reaction
  set count = reaction.count + 1,
      updated_at = now()
  where reaction.emoji = reaction_key
  returning jsonb_build_object('emoji', reaction.emoji, 'count', reaction.count)
  into result;

  return result;
end;
$$;

drop function if exists public.decrement_reaction(text);

create function public.decrement_reaction(reaction_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if reaction_key not in ('fire', 'brain', 'tough', 'fun') then
    raise exception 'Invalid reaction';
  end if;

  update public.reactions as reaction
  set count = greatest(reaction.count - 1, 0),
      updated_at = now()
  where reaction.emoji = reaction_key
  returning jsonb_build_object('emoji', reaction.emoji, 'count', reaction.count)
  into result;

  return result;
end;
$$;

revoke all on function public.increment_reaction(text) from public;
revoke all on function public.decrement_reaction(text) from public;
grant usage on schema public to anon, authenticated;
grant select on public.reactions to anon, authenticated;
grant execute on function public.increment_reaction(text) to anon, authenticated;
grant execute on function public.decrement_reaction(text) to anon, authenticated;
