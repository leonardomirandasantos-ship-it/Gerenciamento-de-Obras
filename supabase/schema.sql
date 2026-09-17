-- Zap da Obra — schema V1 (single-user, ver specs/03_DECISOES.md D40)
-- Rode este script inteiro no SQL Editor do Supabase.
-- Este script SUBSTITUI o modelo anterior (empresa/convite/lançamentos) —
-- dropa as tabelas antigas do protótipo pré-specs antes de recriar.

drop table if exists anexos cascade;
drop table if exists lancamentos cascade;
drop table if exists obra_membros cascade;
drop table if exists obras cascade;
drop table if exists convites cascade;
drop table if exists usuarios cascade;
drop table if exists empresas cascade;

drop function if exists usuario_atual_id() cascade;
drop function if exists empresa_atual() cascade;
drop function if exists papel_atual() cascade;
drop function if exists adicionar_criador_como_membro() cascade;
drop function if exists criar_empresa_inicial(text, text) cascade;
drop function if exists gerar_convite(text) cascade;
drop function if exists validar_convite(uuid) cascade;
drop function if exists aceitar_convite(uuid, text) cascade;

-- =========================================================
-- Tabelas
-- =========================================================

create table obras (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  client_name text,
  location text,
  photo_url text,
  start_date date,
  expected_end_date date,
  details text,
  current_phase_id uuid,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table fases (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  name text not null,
  color text not null,
  "order" int not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table obras
  add constraint obras_current_phase_fk
  foreign key (current_phase_id) references fases(id) on delete set null;

create table favorecidos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  name text not null,
  type text check (type in ('prestador', 'fornecedor')),
  created_at timestamptz not null default now(),
  unique (obra_id, name)
);

create table eventos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  kind text not null default 'unclassified' check (kind in (
    'E1_lista', 'E2_checklist', 'E3_decisao', 'E4_documentacao',
    'E5_documento', 'E6_comunicacao', 'E7_pagamento', 'E8_orcamento',
    'unclassified'
  )),
  confidence numeric(3, 2) not null default 0,
  phase_id uuid references fases(id) on delete set null,
  favorecido_id uuid references favorecidos(id) on delete set null,
  raw_text text,
  payload jsonb not null default '{}'::jsonb,
  caption text,
  edited boolean not null default false,
  deleted boolean not null default false,
  author_id uuid not null default auth.uid(),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table anexos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  url text not null,
  tipo text not null check (tipo in ('foto', 'video', 'pdf', 'audio')),
  created_at timestamptz not null default now()
);

create table sugestoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  evento_id uuid references eventos(id) on delete cascade,
  -- Sem check constraint de propósito: a engine de sugestão ganha casos novos
  -- com frequência e o valor é validado no código (ver src/lib/suggestions.ts).
  caso text not null,
  estado text not null default 'detected' check (estado in ('detected', 'offered', 'accepted', 'ignored', 'silenced')),
  trigger_desc text,
  proposta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- Funções auxiliares
-- =========================================================

create or replace function dono_da_obra(p_obra_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from obras where id = p_obra_id and owner_id = auth.uid());
$$;

create or replace function criar_fases_padrao()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into fases (obra_id, name, color, "order", is_default) values
    (new.id, 'Fundação', '#9B6A43', 0, true),
    (new.id, 'Estrutura', '#1F5C57', 1, true),
    (new.id, 'Hidráulica', '#3A6EA5', 2, true),
    (new.id, 'Elétrica', '#E0913A', 3, true),
    (new.id, 'Acabamento', '#3E8E5A', 4, true);
  return new;
end;
$$;

drop trigger if exists trg_criar_fases_padrao on obras;
create trigger trg_criar_fases_padrao
  after insert on obras
  for each row execute function criar_fases_padrao();

-- =========================================================
-- Row Level Security (D40 — single-user; owner_id = auth.uid())
-- =========================================================

alter table obras enable row level security;
alter table fases enable row level security;
alter table favorecidos enable row level security;
alter table eventos enable row level security;
alter table anexos enable row level security;
alter table sugestoes enable row level security;

create policy "obras: dono" on obras
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "fases: dono da obra" on fases
  for all using (dono_da_obra(obra_id)) with check (dono_da_obra(obra_id));

create policy "favorecidos: dono da obra" on favorecidos
  for all using (dono_da_obra(obra_id)) with check (dono_da_obra(obra_id));

create policy "eventos: dono da obra" on eventos
  for all using (dono_da_obra(obra_id)) with check (dono_da_obra(obra_id));

create policy "anexos: dono do evento" on anexos
  for all using (
    exists (select 1 from eventos e where e.id = anexos.evento_id and dono_da_obra(e.obra_id))
  ) with check (
    exists (select 1 from eventos e where e.id = anexos.evento_id and dono_da_obra(e.obra_id))
  );

create policy "sugestoes: dono da obra" on sugestoes
  for all using (dono_da_obra(obra_id)) with check (dono_da_obra(obra_id));

-- =========================================================
-- Storage (bucket de anexos: fotos, vídeos, pdf, áudio)
-- =========================================================
-- Rode manualmente (dashboard > Storage) ou via SQL abaixo: cria um bucket
-- privado "anexos", com acesso restrito ao próprio usuário autenticado via
-- prefixo de pasta = auth.uid().

insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;

create policy "anexos storage: dono le e escreve"
  on storage.objects for all
  using (bucket_id = 'anexos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'anexos' and auth.uid()::text = (storage.foldername(name))[1]);
