-- Execute no SQL Editor do seu projeto Supabase.
-- Depois crie o bucket privado "interview-audios".

create table if not exists public.interviews (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  codigo text,
  data date,
  entrevistador text,
  municipio text,
  comunidade text,
  cadeia text,
  cadeia_label text,
  status text not null default 'in_progress',
  meta jsonb not null default '{}'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.interview_audios (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id text not null references public.interviews(id) on delete cascade,
  question_id text,
  storage_path text not null,
  mime text,
  created_at timestamptz not null default now()
);

create index if not exists interviews_user_id_idx on public.interviews(user_id);
create index if not exists interviews_updated_at_idx on public.interviews(updated_at);
create index if not exists interview_audios_interview_id_idx on public.interview_audios(interview_id);

alter table public.interviews enable row level security;
alter table public.interview_audios enable row level security;

revoke all on public.interviews from anon;
revoke all on public.interview_audios from anon;
grant select, insert, update, delete on public.interviews to authenticated;
grant select, insert, update, delete on public.interview_audios to authenticated;

drop policy if exists interviews_select_own on public.interviews;
drop policy if exists interviews_insert_own on public.interviews;
drop policy if exists interviews_update_own on public.interviews;
drop policy if exists interviews_delete_own on public.interviews;
create policy interviews_select_own on public.interviews for select to authenticated using ((select auth.uid()) = user_id);
create policy interviews_insert_own on public.interviews for insert to authenticated with check ((select auth.uid()) = user_id);
create policy interviews_update_own on public.interviews for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy interviews_delete_own on public.interviews for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists audios_select_own on public.interview_audios;
drop policy if exists audios_insert_own on public.interview_audios;
drop policy if exists audios_update_own on public.interview_audios;
drop policy if exists audios_delete_own on public.interview_audios;
create policy audios_select_own on public.interview_audios for select to authenticated using ((select auth.uid()) = user_id);
create policy audios_insert_own on public.interview_audios for insert to authenticated with check ((select auth.uid()) = user_id);
create policy audios_update_own on public.interview_audios for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy audios_delete_own on public.interview_audios for delete to authenticated using ((select auth.uid()) = user_id);

-- Storage: crie no Dashboard um bucket PRIVADO chamado interview-audios.
-- Em Storage > Policies, permita INSERT/SELECT/UPDATE/DELETE somente quando
-- (storage.foldername(name))[1] = (select auth.uid()::text).
