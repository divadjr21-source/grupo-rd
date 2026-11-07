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

// Confere se quem chamou é um admin ativo. Devolve o id dele, ou null.
async function adminLogado(req, sb) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user) return null
  const { data } = await sb.from('perfis').select('papel, ativo').eq('id', user.id).single()
  return data?.papel === 'admin' && data?.ativo === true ? user.id : null
}

function traduzir(msg = '') {
  if (/already been registered|already exists/i.test(msg)) return 'Este e-mail já está cadastrado.'
  if (/password/i.test(msg)) return 'Senha inválida. Use pelo menos 6 caracteres.'
  if (/email/i.test(msg)) return 'E-mail inválido.'
  return msg
}

async function preparar(req) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { erro: resposta('SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel.', 500) }
  }
  const sb = clienteServidor()
  const meuId = await adminLogado(req, sb)
  if (!meuId) return { erro: resposta('Acesso negado.', 403) }
  return { sb, meuId }
}

// Criar novo usuário (funcionário ou admin)
export async function POST(req) {
  const { sb, erro } = await preparar(req)
  if (erro) return erro

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

// Alterar usuário: nome, telefone, tipo de acesso, ativo, nova senha
export async function PATCH(req) {
  const { sb, meuId, erro } = await preparar(req)
  if (erro) return erro

  const { id, nome, telefone, papel, ativo, senha } = await req.json()
  if (!id) return resposta('Usuário não informado.', 400)
  if (id === meuId && ativo === false) return resposta('Você não pode desativar o seu próprio acesso.', 400)
  if (id === meuId && papel && papel !== 'admin') return resposta('Você não pode tirar o seu próprio acesso de admin.', 400)

  const dados = {}
  if (nome !== undefined) dados.nome = nome.trim()
  if (telefone !== undefined) dados.telefone = telefone || null
  if (papel !== undefined) dados.papel = papel === 'admin' ? 'admin' : 'funcionario'
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

// Excluir usuário (o histórico dos chamados continua, só sai da equipe)
export async function DELETE(req) {
  const { sb, meuId, erro } = await preparar(req)
  if (erro) return erro

  const { id } = await req.json()
  if (!id) return resposta('Usuário não informado.', 400)
  if (id === meuId) return resposta('Você não pode excluir o seu próprio usuário.', 400)

  const { error } = await sb.auth.admin.deleteUser(id)
  if (error) return resposta(error.message, 400)
  return NextResponse.json({ ok: true })
}
