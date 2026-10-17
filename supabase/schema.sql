-- =====================================================================
-- GRUPO RD — Limpeza & Jardinagem
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- PERFIS (admin e funcionários). Cada perfil é ligado a um login.
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id         uuid primary key references auth.users on delete cascade,
  nome       text not null,
  email      text,
  telefone   text,
  papel      text not null default 'funcionario' check (papel in ('admin', 'funcionario')),
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CLIENTES (condomínios e empresas)
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  tipo         text not null default 'condominio' check (tipo in ('condominio', 'empresa')),
  responsavel  text,
  telefone     text,
  email        text,
  endereco     text,
  observacoes  text,
  criado_em    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CHAMADOS / ORDENS DE SERVIÇO
-- Protocolo automático no formato 2026-0001
-- ---------------------------------------------------------------------
create sequence if not exists public.chamado_seq;

create table if not exists public.chamados (
  id                uuid primary key default gen_random_uuid(),
  protocolo         text unique not null
                    default (to_char(now(), 'YYYY') || '-' || lpad(nextval('public.chamado_seq')::text, 4, '0')),
  cliente_id        uuid references public.clientes on delete set null,
  nome_solicitante  text not null,
  telefone          text not null,
  endereco          text not null,
  servico           text not null check (servico in ('limpeza', 'jardinagem', 'limpeza_e_jardinagem', 'outro')),
  descricao         text not null,
  status            text not null default 'aberto'
                    check (status in ('aberto', 'agendado', 'em_andamento', 'concluido', 'cancelado')),
  data_agendada     date,
  observacoes_admin text,
  relatorio_equipe  text,
  fotos             text[] not null default '{}',
  fotos_conclusao   text[] not null default '{}',
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  concluido_em      timestamptz
);

create index if not exists chamados_status_idx on public.chamados (status);
create index if not exists chamados_criado_idx on public.chamados (criado_em desc);

-- Equipe do chamado (um chamado pode ter vários funcionários)
create table if not exists public.chamado_equipe (
  chamado_id      uuid not null references public.chamados on delete cascade,
  funcionario_id  uuid not null references public.perfis on delete cascade,
  primary key (chamado_id, funcionario_id)
);

-- Atualiza "atualizado_em" automaticamente
create or replace function public.tocar_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists chamados_atualizado on public.chamados;
create trigger chamados_atualizado before update on public.chamados
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- FUNÇÕES DE APOIO PARA AS REGRAS DE ACESSO
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and papel = 'admin' and ativo);
$$;

create or replace function public.is_membro(p_chamado uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chamado_equipe e join perfis p on p.id = e.funcionario_id
    where e.chamado_id = p_chamado and e.funcionario_id = auth.uid() and p.ativo
  );
$$;

-- ---------------------------------------------------------------------
-- REGRAS DE ACESSO (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.perfis         enable row level security;
alter table public.clientes       enable row level security;
alter table public.chamados       enable row level security;
alter table public.chamado_equipe enable row level security;

-- Perfis: cada um vê o próprio; admin vê e altera todos
drop policy if exists perfis_proprio on public.perfis;
create policy perfis_proprio on public.perfis for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists perfis_admin on public.perfis;
create policy perfis_admin on public.perfis for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Clientes: só admin
drop policy if exists clientes_admin on public.clientes;
create policy clientes_admin on public.clientes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Chamados: admin tudo; funcionário só lê os chamados da sua equipe
drop policy if exists chamados_admin on public.chamados;
create policy chamados_admin on public.chamados for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists chamados_equipe_le on public.chamados;
create policy chamados_equipe_le on public.chamados for select to authenticated
  using (public.is_membro(id));

-- Equipe: admin tudo; funcionário vê as próprias atribuições
drop policy if exists equipe_admin on public.chamado_equipe;
create policy equipe_admin on public.chamado_equipe for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists equipe_propria on public.chamado_equipe;
create policy equipe_propria on public.chamado_equipe for select to authenticated
  using (funcionario_id = auth.uid());

-- ---------------------------------------------------------------------
-- FUNÇÕES PÚBLICAS (usadas sem login)
-- ---------------------------------------------------------------------

-- Clientes também podem ser residências (casas e apartamentos)
alter table public.clientes drop constraint if exists clientes_tipo_check;
alter table public.clientes add constraint clientes_tipo_check
  check (tipo in ('residencia', 'condominio', 'empresa'));

-- Data e período desejados pelo cliente (também funciona em bancos já criados)
alter table public.chamados add column if not exists data_desejada date;
alter table public.chamados add column if not exists periodo_desejado text;
alter table public.chamados drop constraint if exists chamados_periodo_check;
alter table public.chamados add constraint chamados_periodo_check
  check (periodo_desejado is null or periodo_desejado in ('manha', 'tarde', 'qualquer'));

-- Versões antigas das funções (sem data desejada)
drop function if exists public.abrir_chamado(text, text, text, text, text, text[]);
drop function if exists public.consultar_chamado(text, text);

-- Abrir chamado pela tela pública. Retorna o protocolo.
create or replace function public.abrir_chamado(
  p_nome text, p_telefone text, p_endereco text,
  p_servico text, p_descricao text, p_fotos text[] default '{}',
  p_data_desejada date default null, p_periodo text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare v_protocolo text;
begin
  if coalesce(trim(p_nome), '') = '' or coalesce(trim(p_telefone), '') = ''
     or coalesce(trim(p_endereco), '') = '' or coalesce(trim(p_descricao), '') = '' then
    raise exception 'Preencha todos os campos obrigatórios.';
  end if;
  if length(p_descricao) > 3000 then
    raise exception 'Descrição muito longa.';
  end if;
  if coalesce(array_length(p_fotos, 1), 0) > 10 then
    raise exception 'Envie no máximo 10 arquivos.';
  end if;
  if p_data_desejada is not null and p_data_desejada < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'A data desejada não pode ser no passado.';
  end if;

  insert into chamados (nome_solicitante, telefone, endereco, servico, descricao, fotos,
                        data_desejada, periodo_desejado)
  values (trim(p_nome), trim(p_telefone), trim(p_endereco), p_servico, trim(p_descricao), coalesce(p_fotos, '{}'),
          p_data_desejada, nullif(p_periodo, ''))
  returning protocolo into v_protocolo;

  return v_protocolo;
end $$;

-- Consultar chamado pela tela pública (protocolo + telefone)
create or replace function public.consultar_chamado(p_protocolo text, p_telefone text)
returns table (protocolo text, servico text, status text, data_agendada date,
               data_desejada date, periodo_desejado text,
               criado_em timestamptz, concluido_em timestamptz)
language sql stable security definer set search_path = public as $$
  select c.protocolo, c.servico, c.status, c.data_agendada, c.data_desejada, c.periodo_desejado,
         c.criado_em, c.concluido_em
  from chamados c
  where upper(c.protocolo) = upper(trim(p_protocolo))
    and regexp_replace(c.telefone, '\D', '', 'g') = regexp_replace(p_telefone, '\D', '', 'g');
$$;

-- Funcionário atualiza o andamento do serviço (só nos chamados da sua equipe)
create or replace function public.atualizar_servico(
  p_id uuid, p_status text, p_relatorio text default null, p_fotos text[] default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_membro(p_id) then
    raise exception 'Você não faz parte da equipe deste chamado.';
  end if;
  if p_status not in ('em_andamento', 'concluido') then
    raise exception 'Status inválido.';
  end if;

  update chamados set
    status           = p_status,
    relatorio_equipe = coalesce(nullif(trim(p_relatorio), ''), relatorio_equipe),
    fotos_conclusao  = fotos_conclusao || coalesce(p_fotos, '{}'),
    concluido_em     = case when p_status = 'concluido' then now() else concluido_em end
  where id = p_id and status not in ('concluido', 'cancelado');
end $$;

revoke all on function public.abrir_chamado(text, text, text, text, text, text[], date, text) from public;
revoke all on function public.consultar_chamado(text, text) from public;
revoke all on function public.atualizar_servico(uuid, text, text, text[]) from public;
grant execute on function public.abrir_chamado(text, text, text, text, text, text[], date, text) to anon, authenticated;
grant execute on function public.consultar_chamado(text, text) to anon, authenticated;
grant execute on function public.atualizar_servico(uuid, text, text, text[]) to authenticated;

-- Permissões das tabelas para usuários logados (as regras acima limitam o que cada um vê)
grant select, insert, update, delete on public.perfis, public.clientes, public.chamados, public.chamado_equipe to authenticated;
grant usage, select on sequence public.chamado_seq to authenticated;

-- ---------------------------------------------------------------------
-- ARMAZENAMENTO DE FOTOS E VÍDEOS (limite de 50 MB por arquivo)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 52428800, array['image/*', 'video/*'])
on conflict (id) do nothing;

drop policy if exists "fotos_upload" on storage.objects;
create policy "fotos_upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'fotos');
