import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { VAPID_PUBLICA } from '@/lib/push'

export const dynamic = 'force-dynamic'

const SERVICOS = { limpeza: 'Limpeza', jardinagem: 'Jardinagem', reforma: 'Reforma geral', limpeza_e_jardinagem: 'Limpeza e jardinagem', outro: 'Serviço' }
const PERIODOS = { manha: 'manhã', tarde: 'tarde', integral: 'dia todo' }
const RECENTE_MS = 10 * 60 * 1000 // só avisa eventos dos últimos 10 minutos

function ok(extra = {}) {
  return NextResponse.json({ ok: true, ...extra })
}

function dataBR(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}`
}

function servidor() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function usuarioLogado(req, sb) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user) return null
  const { data } = await sb.from('perfis').select('id, nome, papel, ativo').eq('id', user.id).single()
  return data?.ativo ? data : null
}

// Envia a notificação para todos os aparelhos das pessoas indicadas
async function enviar(sb, perfilIds, mensagem) {
  if (!perfilIds.length) return 0
  const { data: inscricoes } = await sb.from('push_inscricoes').select('endpoint, inscricao').in('perfil_id', perfilIds)
  let enviados = 0
  await Promise.all((inscricoes || []).map(async (i) => {
    try {
      await webpush.sendNotification(i.inscricao, JSON.stringify(mensagem), { TTL: 60 * 60 * 24 })
      enviados++
    } catch (e) {
      // Aparelho desinstalou ou bloqueou: remove a inscrição
      if (e.statusCode === 404 || e.statusCode === 410) {
        await sb.from('push_inscricoes').delete().eq('endpoint', i.endpoint)
      }
    }
  }))
  return enviados
}

async function admins(sb) {
  const { data } = await sb.from('perfis').select('id').eq('papel', 'admin').eq('ativo', true)
  return (data || []).map((p) => p.id)
}

export async function POST(req) {
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return ok({ ignorado: 'notificações não configuradas' })
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contato@grupord.com.br', VAPID_PUBLICA, process.env.VAPID_PRIVATE_KEY)

  const sb = servidor()
  const corpo = await req.json().catch(() => ({}))
  const agora = Date.now()

  // 1) Chamado novo aberto pelo site -> avisa os admins (uma vez só)
  if (corpo.tipo === 'chamado_novo') {
    const { data: c } = await sb.from('chamados')
      .select('id, protocolo, nome_solicitante, servico, criado_em, avisado_em')
      .eq('protocolo', String(corpo.protocolo || '')).maybeSingle()
    if (!c || c.avisado_em || agora - new Date(c.criado_em).getTime() > RECENTE_MS) return ok()
    await sb.from('chamados').update({ avisado_em: new Date().toISOString() }).eq('id', c.id)
    const n = await enviar(sb, await admins(sb), {
      titulo: `Novo pedido #${c.protocolo}`,
      corpo: `${SERVICOS[c.servico]} — ${c.nome_solicitante}`,
      url: `/admin/chamados/${c.id}`,
    })
    return ok({ enviados: n })
  }

  // 2) Cliente respondeu o orçamento -> avisa os admins (uma vez só)
  if (corpo.tipo === 'orcamento') {
    const { data: o } = await sb.from('orcamentos')
      .select('id, status, respondido_em, avisado_em, chamados(id, protocolo, nome_solicitante)')
      .eq('token', String(corpo.token || '')).maybeSingle()
    if (!o || o.avisado_em || !o.respondido_em || agora - new Date(o.respondido_em).getTime() > RECENTE_MS) return ok()
    await sb.from('orcamentos').update({ avisado_em: new Date().toISOString() }).eq('id', o.id)
    const aprovado = o.status === 'aprovado'
    const n = await enviar(sb, await admins(sb), {
      titulo: aprovado ? `Orçamento aprovado! #${o.chamados.protocolo}` : `Orçamento recusado #${o.chamados.protocolo}`,
      corpo: aprovado ? `${o.chamados.nome_solicitante} aprovou. Agende o serviço.` : `${o.chamados.nome_solicitante} recusou o orçamento.`,
      url: `/admin/chamados/${o.chamados.id}`,
    })
    return ok({ enviados: n })
  }

  // Os próximos exigem login
  const eu = await usuarioLogado(req, sb)
  if (!eu) return NextResponse.json({ erro: 'Acesso negado.' }, { status: 403 })

  // 3) Admin escalou funcionários -> avisa cada um
  if (corpo.tipo === 'equipe' && eu.papel === 'admin') {
    const { data: c } = await sb.from('chamados')
      .select('id, protocolo, servico, endereco, data_agendada, periodo_agendado').eq('id', corpo.chamado_id).maybeSingle()
    if (!c) return ok()
    const { data: equipe } = await sb.from('chamado_equipe').select('funcionario_id').eq('chamado_id', c.id)
    const naEquipe = new Set((equipe || []).map((e) => e.funcionario_id))
    const alvo = (corpo.funcionarios || []).filter((id) => naEquipe.has(id))
    const quando = c.data_agendada ? ` em ${dataBR(c.data_agendada)}${c.periodo_agendado ? ` (${PERIODOS[c.periodo_agendado]})` : ''}` : ''
    const n = await enviar(sb, alvo, {
      titulo: `Novo serviço para você${quando}`,
      corpo: `${SERVICOS[c.servico]} — ${c.endereco}`,
      url: `/equipe/${c.id}`,
    })
    return ok({ enviados: n })
  }

  // 4) Funcionário concluiu um serviço -> avisa os admins
  if (corpo.tipo === 'concluido') {
    const { data: c } = await sb.from('chamados')
      .select('id, protocolo, nome_solicitante, status, concluido_em').eq('id', corpo.chamado_id).maybeSingle()
    if (!c || c.status !== 'concluido' || agora - new Date(c.concluido_em).getTime() > RECENTE_MS) return ok()
    const { data: membro } = await sb.from('chamado_equipe').select('funcionario_id')
      .eq('chamado_id', c.id).eq('funcionario_id', eu.id).maybeSingle()
    if (!membro) return ok()
    const n = await enviar(sb, await admins(sb), {
      titulo: `Serviço concluído #${c.protocolo}`,
      corpo: `${eu.nome} concluiu o serviço de ${c.nome_solicitante}.`,
      url: `/admin/chamados/${c.id}`,
    })
    return ok({ enviados: n })
  }

  return ok()
}
