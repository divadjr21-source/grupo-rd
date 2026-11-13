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

-- Serviço de reforma geral
alter table public.chamados drop constraint if exists chamados_servico_check;
alter table public.chamados add constraint chamados_servico_check
  check (servico in ('limpeza', 'jardinagem', 'limpeza_e_jardinagem', 'reforma', 'seguranca', 'outro'));

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

-- ---------------------------------------------------------------------
-- DADOS DA EMPRESA (uma linha só, editada pelo admin)
-- ---------------------------------------------------------------------
create table if not exists public.empresa (
  id            int primary key default 1 check (id = 1),
  nome          text not null default 'Grupo RD',
  whatsapp      text,
  email         text,
  endereco      text,
  cidade        text,
  cnpj          text,
  atualizado_em timestamptz not null default now()
);
insert into public.empresa (id) values (1) on conflict (id) do nothing;

alter table public.empresa enable row level security;

drop policy if exists empresa_le on public.empresa;
create policy empresa_le on public.empresa for select to authenticated using (true);

drop policy if exists empresa_admin on public.empresa;
create policy empresa_admin on public.empresa for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.empresa to authenticated;

-- Dados públicos da empresa (tela do cliente: WhatsApp e rodapé)
create or replace function public.contato_empresa()
returns table (nome text, whatsapp text, cidade text, cnpj text)
language sql stable security definer set search_path = public as $$
  select nome, whatsapp, cidade, cnpj from empresa where id = 1;
$$;
revoke all on function public.contato_empresa() from public;
grant execute on function public.contato_empresa() to anon, authenticated;

-- =====================================================================
-- AGENDA, ORÇAMENTOS E NOTIFICAÇÕES
-- =====================================================================

-- Período do serviço agendado (manhã, tarde ou dia todo)
alter table public.chamados add column if not exists periodo_agendado text;
alter table public.chamados drop constraint if exists chamados_periodo_agendado_check;
alter table public.chamados add constraint chamados_periodo_agendado_check
  check (periodo_agendado is null or periodo_agendado in ('manha', 'tarde', 'integral'));
-- Controle para não avisar o mesmo chamado novo duas vezes
alter table public.chamados add column if not exists avisado_em timestamptz;
create index if not exists chamados_data_idx on public.chamados (data_agendada);

-- ORÇAMENTOS (um por chamado; o cliente aprova pelo link)
create table if not exists public.orcamentos (
  id            uuid primary key default gen_random_uuid(),
  chamado_id    uuid not null unique references public.chamados on delete cascade,
  token         text not null unique default replace(gen_random_uuid()::text, '-', ''),
  itens         jsonb not null default '[]',
  desconto      numeric(12,2) not null default 0,
  validade      date,
  prazo         text,
  condicoes     text,
  observacoes   text,
  status        text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  resposta_obs  text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  enviado_em    timestamptz,
  respondido_em timestamptz,
  avisado_em    timestamptz
);

drop trigger if exists orcamentos_atualizado on public.orcamentos;
create trigger orcamentos_atualizado before update on public.orcamentos
  for each row execute function public.tocar_atualizado_em();

alter table public.orcamentos enable row level security;
drop policy if exists orcamentos_admin on public.orcamentos;
create policy orcamentos_admin on public.orcamentos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.orcamentos to authenticated;

-- Total do orçamento (itens: [{descricao, qtd, valor}])
create or replace function public.total_orcamento(p_itens jsonb, p_desconto numeric) returns numeric
language sql immutable as $$
  select greatest(coalesce(sum((i->>'qtd')::numeric * (i->>'valor')::numeric), 0) - coalesce(p_desconto, 0), 0)
  from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) i;
$$;

-- Ver orçamento pelo link (cliente, sem login)
create or replace function public.ver_orcamento(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'status', o.status, 'itens', o.itens, 'desconto', o.desconto,
    'total', public.total_orcamento(o.itens, o.desconto),
    'validade', o.validade, 'prazo', o.prazo, 'condicoes', o.condicoes, 'observacoes', o.observacoes,
    'resposta_obs', o.resposta_obs, 'enviado_em', o.enviado_em, 'respondido_em', o.respondido_em,
    'protocolo', c.protocolo, 'nome', c.nome_solicitante, 'endereco', c.endereco,
    'servico', c.servico, 'descricao', c.descricao,
    'empresa', (select to_jsonb(e) - 'id' - 'atualizado_em' from empresa e where e.id = 1)
  )
  from orcamentos o join chamados c on c.id = o.chamado_id
  where o.token = p_token and o.status <> 'rascunho';
$$;

-- Cliente aprova ou recusa
create or replace function public.responder_orcamento(p_token text, p_aprovar boolean, p_obs text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare v_orc orcamentos%rowtype;
begin
  select * into v_orc from orcamentos where token = p_token for update;
  if not found or v_orc.status = 'rascunho' then raise exception 'Orçamento não encontrado.'; end if;
  if v_orc.status <> 'enviado' then raise exception 'Este orçamento já foi respondido.'; end if;
  if v_orc.validade is not null and v_orc.validade < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Este orçamento venceu. Peça um novo orçamento à empresa.';
  end if;

  update orcamentos set
    status = case when p_aprovar then 'aprovado' else 'recusado' end,
    resposta_obs = nullif(trim(coalesce(p_obs, '')), ''),
    respondido_em = now(), avisado_em = null
  where id = v_orc.id;

  -- Aprovado e já com data e equipe: o serviço passa a "agendado"
  if p_aprovar then
    update chamados c set status = 'agendado'
    where c.id = v_orc.chamado_id and c.status = 'aberto' and c.data_agendada is not null
      and exists (select 1 from chamado_equipe e where e.chamado_id = c.id);
  end if;

  return case when p_aprovar then 'aprovado' else 'recusado' end;
end $$;

revoke all on function public.ver_orcamento(text) from public;
revoke all on function public.responder_orcamento(text, boolean, text) from public;
grant execute on function public.ver_orcamento(text) to anon, authenticated;
grant execute on function public.responder_orcamento(text, boolean, text) to anon, authenticated;

-- Acompanhar pedido: agora mostra período e o link do orçamento
drop function if exists public.consultar_chamado(text, text);
create or replace function public.consultar_chamado(p_protocolo text, p_telefone text)
returns table (protocolo text, servico text, status text, data_agendada date, periodo_agendado text,
               data_desejada date, periodo_desejado text,
               criado_em timestamptz, concluido_em timestamptz,
               orcamento_token text, orcamento_status text)
language sql stable security definer set search_path = public as $$
  select c.protocolo, c.servico, c.status, c.data_agendada, c.periodo_agendado,
         c.data_desejada, c.periodo_desejado, c.criado_em, c.concluido_em,
         case when o.status <> 'rascunho' then o.token end, case when o.status <> 'rascunho' then o.status end
  from chamados c left join orcamentos o on o.chamado_id = c.id
  where upper(c.protocolo) = upper(trim(p_protocolo))
    and regexp_replace(c.telefone, '\D', '', 'g') = regexp_replace(p_telefone, '\D', '', 'g');
$$;
revoke all on function public.consultar_chamado(text, text) from public;
grant execute on function public.consultar_chamado(text, text) to anon, authenticated;

-- NOTIFICAÇÕES NO CELULAR (cada aparelho que ativou os avisos)
create table if not exists public.push_inscricoes (
  endpoint   text primary key,
  perfil_id  uuid not null references public.perfis on delete cascade,
  inscricao  jsonb not null,
  criado_em  timestamptz not null default now()
);
alter table public.push_inscricoes enable row level security;
drop policy if exists push_proprias on public.push_inscricoes;
create policy push_proprias on public.push_inscricoes for all to authenticated
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
grant select, insert, update, delete on public.push_inscricoes to authenticated;

-- =====================================================================
-- CONTRATOS RECORRENTES E FINANCEIRO
-- =====================================================================

-- Chave Pix da empresa (aparece na cobrança e no recibo)
alter table public.empresa add column if not exists chave_pix text;

-- CONTRATOS (serviço fixo: ex. limpeza 3x por semana)
create table if not exists public.contratos (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.clientes on delete restrict,
  titulo           text not null,
  servico          text not null check (servico in ('limpeza', 'jardinagem', 'limpeza_e_jardinagem', 'reforma', 'seguranca', 'outro')),
  descricao        text,
  endereco         text,
  frequencia       text not null default 'semanal' check (frequencia in ('semanal', 'quinzenal', 'mensal')),
  dias_semana      int[] not null default '{}',          -- 0 = domingo ... 6 = sábado
  dia_mes          int check (dia_mes between 1 and 28), -- para frequência mensal
  periodo_agendado text check (periodo_agendado is null or periodo_agendado in ('manha', 'tarde', 'integral')),
  equipe           uuid[] not null default '{}',
  valor_mensal     numeric(12,2) not null default 0 check (valor_mensal >= 0),
  dia_vencimento   int not null default 10 check (dia_vencimento between 1 and 28),
  inicio           date not null default current_date,
  fim              date,
  ativo            boolean not null default true,
  observacoes      text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

drop trigger if exists contratos_atualizado on public.contratos;
create trigger contratos_atualizado before update on public.contratos
  for each row execute function public.tocar_atualizado_em();

alter table public.contratos enable row level security;
drop policy if exists contratos_admin on public.contratos;
create policy contratos_admin on public.contratos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.contratos to authenticated;

-- Serviços gerados pelo contrato
alter table public.chamados add column if not exists contrato_id uuid references public.contratos on delete set null;
create unique index if not exists chamados_contrato_data on public.chamados (contrato_id, data_agendada) where contrato_id is not null;

-- COBRANÇAS (serviços avulsos e mensalidades de contrato)
create table if not exists public.cobrancas (
  id              uuid primary key default gen_random_uuid(),
  chamado_id      uuid unique references public.chamados on delete set null,
  contrato_id     uuid references public.contratos on delete set null,
  competencia     date,
  cliente_nome    text not null,
  telefone        text,
  descricao       text not null,
  valor           numeric(12,2) not null check (valor >= 0),
  vencimento      date not null,
  status          text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  pago_em         date,
  forma_pagamento text,
  observacoes     text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create unique index if not exists cobrancas_contrato_mes on public.cobrancas (contrato_id, competencia) where contrato_id is not null;
create index if not exists cobrancas_status_idx on public.cobrancas (status, vencimento);

drop trigger if exists cobrancas_atualizado on public.cobrancas;
create trigger cobrancas_atualizado before update on public.cobrancas
  for each row execute function public.tocar_atualizado_em();

alter table public.cobrancas enable row level security;
drop policy if exists cobrancas_admin on public.cobrancas;
create policy cobrancas_admin on public.cobrancas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.cobrancas to authenticated;

create or replace function public.nome_servico(p text) returns text language sql immutable as $$
  select case p when 'limpeza' then 'Limpeza' when 'jardinagem' then 'Jardinagem'
    when 'limpeza_e_jardinagem' then 'Limpeza e jardinagem' when 'reforma' then 'Reforma geral'
    when 'seguranca' then 'Segurança eletrônica' else 'Serviço' end;
$$;

-- Coloca na agenda os serviços dos contratos ativos (próximos N dias)
create or replace function public.gerar_servicos_contratos(p_dias int default 30) returns int
language plpgsql security definer set search_path = public as $$
declare
  k record; d date; v_id uuid; v_total int := 0;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_ok boolean;
begin
  if not public.is_admin() then raise exception 'Acesso negado.'; end if;
  for k in
    select ct.*, cl.nome as cli_nome, cl.telefone as cli_tel, cl.endereco as cli_end
    from contratos ct join clientes cl on cl.id = ct.cliente_id
    where ct.ativo
  loop
    for d in select generate_series(greatest(k.inicio, v_hoje),
                                    least(coalesce(k.fim, v_hoje + p_dias), v_hoje + p_dias), interval '1 day')::date
    loop
      v_ok := case k.frequencia
        when 'semanal' then extract(dow from d)::int = any(k.dias_semana)
        when 'quinzenal' then extract(dow from d)::int = any(k.dias_semana)
             and (((d - date_trunc('week', k.inicio)::date) / 7) % 2) = 0
        when 'mensal' then extract(day from d)::int = k.dia_mes
        else false end;
      continue when not v_ok;

      v_id := null;
      insert into chamados (cliente_id, contrato_id, nome_solicitante, telefone, endereco, servico, descricao,
                            status, data_agendada, periodo_agendado, avisado_em)
      values (k.cliente_id, k.id, k.cli_nome, coalesce(k.cli_tel, ''), coalesce(nullif(k.endereco, ''), k.cli_end, ''),
              k.servico, 'Contrato: ' || k.titulo || coalesce(E'\n' || nullif(k.descricao, ''), ''),
              'agendado', d, k.periodo_agendado, now())
      on conflict (contrato_id, data_agendada) where contrato_id is not null do nothing
      returning id into v_id;

      if v_id is not null then
        v_total := v_total + 1;
        insert into chamado_equipe (chamado_id, funcionario_id)
        select v_id, p.id from perfis p where p.id = any(k.equipe) and p.ativo
        on conflict do nothing;
      end if;
    end loop;
  end loop;
  return v_total;
end $$;

-- Cria as cobranças: serviços concluídos com orçamento aprovado + mensalidades dos contratos
create or replace function public.gerar_cobrancas() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_total int := 0; n int; k record; m date;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_admin() then raise exception 'Acesso negado.'; end if;

  insert into cobrancas (chamado_id, cliente_nome, telefone, descricao, valor, vencimento)
  select c.id, coalesce(cl.nome, c.nome_solicitante), c.telefone,
         'Pedido #' || c.protocolo || ' — ' || public.nome_servico(c.servico),
         public.total_orcamento(o.itens, o.desconto),
         coalesce((c.concluido_em at time zone 'America/Sao_Paulo')::date, v_hoje)
  from chamados c
  join orcamentos o on o.chamado_id = c.id and o.status = 'aprovado'
  left join clientes cl on cl.id = c.cliente_id
  where c.status = 'concluido' and c.contrato_id is null
    and not exists (select 1 from cobrancas b where b.chamado_id = c.id);
  get diagnostics n = row_count; v_total := v_total + n;

  for k in
    select ct.*, cl.nome as cli_nome, cl.telefone as cli_tel
    from contratos ct join clientes cl on cl.id = ct.cliente_id
    where ct.ativo and ct.valor_mensal > 0
  loop
    for m in select generate_series(
               greatest(date_trunc('month', k.inicio), date_trunc('month', k.criado_em at time zone 'America/Sao_Paulo')),
               least(date_trunc('month', v_hoje), date_trunc('month', coalesce(k.fim, v_hoje))),
               interval '1 month')::date
    loop
      insert into cobrancas (contrato_id, competencia, cliente_nome, telefone, descricao, valor, vencimento)
      values (k.id, m, k.cli_nome, k.cli_tel,
              'Contrato: ' || k.titulo || ' — ' || to_char(m, 'MM/YYYY'),
              k.valor_mensal, (m + (k.dia_vencimento - 1))::date)
      on conflict (contrato_id, competencia) where contrato_id is not null do nothing;
      get diagnostics n = row_count; v_total := v_total + n;
    end loop;
  end loop;
  return v_total;
end $$;

revoke all on function public.gerar_servicos_contratos(int) from public;
revoke all on function public.gerar_cobrancas() from public;
grant execute on function public.gerar_servicos_contratos(int) to authenticated;
grant execute on function public.gerar_cobrancas() to authenticated;
