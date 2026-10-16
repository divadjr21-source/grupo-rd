# Grupo RD — Limpeza & Jardinagem

Sistema de chamados para serviços de limpeza e jardinagem em condomínios e empresas.

- **Tela pública** (sem login): solicitar serviço com fotos/vídeos e acompanhar pelo protocolo.
- **Painel do Admin** (`/admin`): chamados, clientes, equipe e atribuição de funcionários.
- **Área da Equipe** (`/equipe`): cada funcionário vê só os serviços da sua equipe, inicia, conclui e envia fotos.

Tecnologias: Next.js 14 · Supabase (banco, login e fotos) · Vercel (hospedagem).

---

## Passo a passo para colocar no ar

### 1. Supabase (banco de dados)

1. Acesse https://supabase.com e crie um **novo projeto** (ex.: `grupo-rd`). Região: *South America (São Paulo)*.
2. No menu, abra **SQL Editor → New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
   Isso cria as tabelas, as regras de acesso e a pasta de fotos.
3. Em **Authentication → Sign In / Providers → Email**, desative **"Allow new users to sign up"**.
   (Só o admin cria logins, pelo próprio sistema.)
4. Crie o **primeiro administrador**:
   - **Authentication → Users → Add user → Create new user**: informe seu e-mail e senha e marque *Auto Confirm User*.
   - Volte ao **SQL Editor** e rode (trocando o e-mail e o nome):
     ```sql
     insert into public.perfis (id, nome, email, papel)
     select id, 'Seu Nome', email, 'admin' from auth.users where email = 'seu@email.com';
     ```
5. Em **Project Settings → API**, copie:
   - `Project URL`
   - `anon public` key
   - `service_role` key (secreta)

### 2. GitHub (código)

1. Crie um repositório novo, ex.: `grupo-rd` (pode ser privado).
2. Envie esta pasta para ele:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/grupo-rd.git
   git push -u origin main
   ```
   (Ou, pelo site do GitHub: *Add file → Upload files* e arraste o conteúdo da pasta, **sem** a pasta `node_modules`.)

### 3. Vercel (hospedagem)

1. Em https://vercel.com, clique em **Add New → Project** e importe o repositório `grupo-rd`.
2. Antes de publicar, em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave `anon public` |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave `service_role` |

3. Clique em **Deploy**. Pronto: o sistema estará em `https://grupo-rd.vercel.app` (ou similar).
4. Acesse `/login` com o admin criado no passo 1.4 e cadastre seus funcionários em **Equipe**.

---

## Rodar no computador (opcional)

```bash
cp .env.example .env.local   # preencha com as chaves do Supabase
npm install
npm run dev                  # abre em http://localhost:3000
```

## Como funciona o fluxo

1. Cliente abre o pedido em `/chamado` e recebe um protocolo (ex.: `2026-0001`).
2. Admin vê em **Início/Chamados**, vincula ao cliente, escolhe a data e marca os funcionários da equipe.
   Ao salvar com data e equipe, o status passa para **Agendado** automaticamente.
3. Funcionário entra em `/login`, vê o serviço em **Meus serviços**, toca **Iniciar** e depois **Concluir**,
   com resumo e fotos.
4. Cliente acompanha em `/acompanhar` com protocolo + telefone.

## Estrutura

```
app/
  page.jsx              Início (público)
  chamado/              Solicitar serviço (público)
  acompanhar/           Acompanhar pedido (público)
  login/                Login da equipe
  admin/                Painel do admin (início, chamados, clientes, equipe)
  equipe/               Área do funcionário
  api/usuarios/         Cria/edita logins (usa a chave secreta, só no servidor)
components/             Peças reutilizadas (logo, lista, fotos…)
lib/                    Conexão com Supabase e funções de apoio
supabase/schema.sql     Banco de dados completo
```

## Segurança

- As regras ficam no próprio banco (Row Level Security): mesmo que alguém tente acessar direto,
  o funcionário só enxerga os chamados da sua equipe e o público não lê nenhum chamado.
- O público só consegue **abrir** um chamado e **consultar o status** informando protocolo e telefone.
- A chave `service_role` só existe na Vercel; nunca coloque no código nem compartilhe.
