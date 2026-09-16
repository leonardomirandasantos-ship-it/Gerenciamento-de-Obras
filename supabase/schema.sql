-- Gerenciamento de Obras — schema inicial
-- Rode este script inteiro no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/_/sql/new)

-- =========================================================
-- Tabelas
-- =========================================================

create table if not exists empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  auth_id uuid not null unique references auth.users(id) on delete cascade,
  nome text,
  email text not null,
  papel text not null check (papel in ('master', 'membro')),
  criado_em timestamptz not null default now()
);

create table if not exists convites (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  papel text not null check (papel in ('master', 'membro')),
  criado_por uuid not null references usuarios(id),
  usado_por uuid references usuarios(id),
  criado_em timestamptz not null default now(),
  usado_em timestamptz
);

create table if not exists obras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  criado_por uuid not null references usuarios(id),
  criado_em timestamptz not null default now(),
  status text not null default 'ativa' check (status in ('ativa', 'encerrada'))
);

create table if not exists obra_membros (
  obra_id uuid not null references obras(id) on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  primary key (obra_id, usuario_id)
);

create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  autor_id uuid not null references usuarios(id),
  tipo text not null check (tipo in ('gasto_reembolsar', 'pagamento_feito', 'lembrete', 'atualizacao')),
  valor numeric(12, 2),
  descricao text,
  pessoa_relacionada text,
  data_lembrete date,
  status text not null default 'pendente' check (status in ('pendente', 'reembolsado', 'pago', 'concluido')),
  criado_em timestamptz not null default now()
);

create table if not exists anexos (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null references lancamentos(id) on delete cascade,
  url_arquivo text not null,
  tipo text not null default 'comprovante' check (tipo in ('comprovante', 'foto')),
  criado_em timestamptz not null default now()
);

-- =========================================================
-- Funções auxiliares (security definer para evitar recursão de RLS)
-- =========================================================

create or replace function usuario_atual_id()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select id from usuarios where auth_id = auth.uid() limit 1;
$$;

create or replace function empresa_atual()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select empresa_id from usuarios where auth_id = auth.uid() limit 1;
$$;

create or replace function papel_atual()
returns text
language sql security definer stable
set search_path = public
as $$
  select papel from usuarios where auth_id = auth.uid() limit 1;
$$;

-- Ao criar uma obra, o criador já entra como membro dela
create or replace function adicionar_criador_como_membro()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into obra_membros (obra_id, usuario_id)
  values (new.id, new.criado_por)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_adicionar_criador_como_membro on obras;
create trigger trg_adicionar_criador_como_membro
  after insert on obras
  for each row execute function adicionar_criador_como_membro();

-- Preenche empresa_id/criado_por sozinho a partir de quem está logado, para
-- o client não precisar (e não conseguir) informar isso na mão
alter table obras alter column empresa_id set default empresa_atual();
alter table obras alter column criado_por set default usuario_atual_id();

-- =========================================================
-- RPCs de onboarding e convite
-- =========================================================

-- Primeiro master cria a empresa (só funciona enquanto não existir nenhuma empresa)
create or replace function criar_empresa_inicial(p_nome_empresa text, p_nome_usuario text)
returns usuarios
language plpgsql security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_usuario usuarios%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if exists (select 1 from usuarios where auth_id = auth.uid()) then
    raise exception 'Este usuário já pertence a uma empresa';
  end if;

  if exists (select 1 from empresas) then
    raise exception 'Já existe uma empresa cadastrada; peça um convite a um master';
  end if;

  insert into empresas (nome) values (p_nome_empresa) returning id into v_empresa_id;

  insert into usuarios (empresa_id, auth_id, nome, email, papel)
  values (
    v_empresa_id,
    auth.uid(),
    p_nome_usuario,
    (select email from auth.users where id = auth.uid()),
    'master'
  )
  returning * into v_usuario;

  return v_usuario;
end;
$$;

-- Master gera um link de convite (token) já com o papel definido
create or replace function gerar_convite(p_papel text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_usuario usuarios%rowtype;
  v_token uuid;
begin
  select * into v_usuario from usuarios where auth_id = auth.uid();

  if v_usuario.id is null or v_usuario.papel <> 'master' then
    raise exception 'Apenas master pode gerar convites';
  end if;

  insert into convites (empresa_id, papel, criado_por)
  values (v_usuario.empresa_id, p_papel, v_usuario.id)
  returning token into v_token;

  return v_token;
end;
$$;

-- Consulta pública e segura de um convite pelo token (não expõe a tabela toda)
create or replace function validar_convite(p_token uuid)
returns table(empresa_nome text, papel text)
language plpgsql security definer
set search_path = public
as $$
begin
  return query
    select e.nome, c.papel
    from convites c
    join empresas e on e.id = c.empresa_id
    where c.token = p_token and c.usado_por is null;
end;
$$;

-- Pessoa convidada aceita o convite depois de já ter feito signUp (auth.uid() disponível)
create or replace function aceitar_convite(p_token uuid, p_nome text)
returns usuarios
language plpgsql security definer
set search_path = public
as $$
declare
  v_convite convites%rowtype;
  v_usuario usuarios%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_convite from convites where token = p_token and usado_por is null for update;

  if v_convite.id is null then
    raise exception 'Convite inválido ou já utilizado';
  end if;

  insert into usuarios (empresa_id, auth_id, nome, email, papel)
  values (
    v_convite.empresa_id,
    auth.uid(),
    p_nome,
    (select email from auth.users where id = auth.uid()),
    v_convite.papel
  )
  returning * into v_usuario;

  update convites set usado_por = v_usuario.id, usado_em = now() where id = v_convite.id;

  return v_usuario;
end;
$$;

-- =========================================================
-- Row Level Security
-- =========================================================

alter table empresas enable row level security;
alter table usuarios enable row level security;
alter table convites enable row level security;
alter table obras enable row level security;
alter table obra_membros enable row level security;
alter table lancamentos enable row level security;
alter table anexos enable row level security;

-- empresas: só vê a própria empresa (toda escrita passa pelas RPCs acima)
create policy "empresas: ver a propria" on empresas
  for select using (id = empresa_atual());

-- usuarios: vê colegas da mesma empresa
create policy "usuarios: ver colegas da empresa" on usuarios
  for select using (empresa_id = empresa_atual());

-- convites: só master vê os convites que ele mesmo gerencia; validação de
-- token por quem ainda não logou acontece via validar_convite() (RPC acima)
create policy "convites: master ve convites da empresa" on convites
  for select using (empresa_id = empresa_atual() and papel_atual() = 'master');

-- obras: qualquer um da empresa vê a lista; só master cria
create policy "obras: ver da empresa" on obras
  for select using (empresa_id = empresa_atual());

create policy "obras: master cria" on obras
  for insert with check (empresa_id = empresa_atual() and papel_atual() = 'master');

-- obra_membros: visível pra quem é da empresa; só master adiciona gente
create policy "obra_membros: ver da empresa" on obra_membros
  for select using (
    exists (select 1 from obras o where o.id = obra_membros.obra_id and o.empresa_id = empresa_atual())
  );

create policy "obra_membros: master adiciona" on obra_membros
  for insert with check (
    papel_atual() = 'master'
    and exists (select 1 from obras o where o.id = obra_membros.obra_id and o.empresa_id = empresa_atual())
  );

-- lancamentos: visível pra quem participa da obra (ou é master da empresa)
create policy "lancamentos: ver se participa da obra" on lancamentos
  for select using (
    exists (
      select 1 from obras o
      where o.id = lancamentos.obra_id
        and o.empresa_id = empresa_atual()
        and (
          papel_atual() = 'master'
          or exists (
            select 1 from obra_membros om
            where om.obra_id = o.id and om.usuario_id = usuario_atual_id()
          )
        )
    )
  );

create policy "lancamentos: criar se participa da obra" on lancamentos
  for insert with check (
    autor_id = usuario_atual_id()
    and exists (
      select 1 from obras o
      where o.id = lancamentos.obra_id
        and o.empresa_id = empresa_atual()
        and (
          papel_atual() = 'master'
          or exists (
            select 1 from obra_membros om
            where om.obra_id = o.id and om.usuario_id = usuario_atual_id()
          )
        )
    )
  );

create policy "lancamentos: autor ou master atualiza status" on lancamentos
  for update using (
    autor_id = usuario_atual_id() or papel_atual() = 'master'
  );

-- anexos: seguem a visibilidade do lançamento ao qual pertencem
create policy "anexos: ver se ve o lancamento" on anexos
  for select using (
    exists (select 1 from lancamentos l where l.id = anexos.lancamento_id)
  );

create policy "anexos: criar se e autor do lancamento" on anexos
  for insert with check (
    exists (
      select 1 from lancamentos l
      where l.id = anexos.lancamento_id and l.autor_id = usuario_atual_id()
    )
  );
