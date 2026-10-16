import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Cliente com chave secreta: roda SOMENTE no servidor (Vercel)
function clienteServidor() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function resposta(mensagem, status) {
  return NextResponse.json({ erro: mensagem }, { status })
}

async function quemChamouEhAdmin(req, sb) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return false
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user) return false
  const { data } = await sb.from('perfis').select('papel, ativo').eq('id', user.id).single()
  return data?.papel === 'admin' && data?.ativo === true
}

function traduzir(msg = '') {
  if (/already been registered|already exists/i.test(msg)) return 'Este e-mail já está cadastrado.'
  if (/password/i.test(msg)) return 'Senha inválida. Use pelo menos 6 caracteres.'
  if (/email/i.test(msg)) return 'E-mail inválido.'
  return msg
}

// Criar novo usuário (funcionário ou admin)
export async function POST(req) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return resposta('SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel.', 500)
  const sb = clienteServidor()
  if (!(await quemChamouEhAdmin(req, sb))) return resposta('Acesso negado.', 403)

  const { nome, email, senha, telefone, papel } = await req.json()
  if (!nome?.trim() || !email?.trim()) return resposta('Informe nome e e-mail.', 400)
  if (!senha || senha.length < 6) return resposta('A senha precisa ter pelo menos 6 caracteres.', 400)

  const { data, error } = await sb.auth.admin.createUser({ email: email.trim(), password: senha, email_confirm: true })
  if (error) return resposta(traduzir(error.message), 400)

  const { error: erroPerfil } = await sb.from('perfis').insert({
    id: data.user.id,
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    telefone: telefone || null,
    papel: papel === 'admin' ? 'admin' : 'funcionario',
  })
  if (erroPerfil) {
    await sb.auth.admin.deleteUser(data.user.id)
    return resposta(erroPerfil.message, 400)
  }
  return NextResponse.json({ ok: true })
}

// Alterar usuário: nome, telefone, ativo, nova senha
export async function PATCH(req) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return resposta('SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel.', 500)
  const sb = clienteServidor()
  if (!(await quemChamouEhAdmin(req, sb))) return resposta('Acesso negado.', 403)

  const { id, nome, telefone, ativo, senha } = await req.json()
  if (!id) return resposta('Usuário não informado.', 400)

  const dados = {}
  if (nome !== undefined) dados.nome = nome.trim()
  if (telefone !== undefined) dados.telefone = telefone || null
  if (ativo !== undefined) dados.ativo = !!ativo
  if (Object.keys(dados).length) {
    const { error } = await sb.from('perfis').update(dados).eq('id', id)
    if (error) return resposta(error.message, 400)
  }

  if (senha) {
    if (senha.length < 6) return resposta('A senha precisa ter pelo menos 6 caracteres.', 400)
    const { error } = await sb.auth.admin.updateUserById(id, { password: senha })
    if (error) return resposta(traduzir(error.message), 400)
  }
  return NextResponse.json({ ok: true })
}
