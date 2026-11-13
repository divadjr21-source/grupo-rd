'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, MapPin, MessageCircle, Loader2, Check, Users, AlertTriangle, Send, Trash2 } from 'lucide-react'
import Carregando from '@/components/Carregando'
import StatusBadge from '@/components/StatusBadge'
import { Galeria } from '@/components/Arquivos'
import { supabase } from '@/lib/supabase'
import EditorOrcamento from '@/components/EditorOrcamento'
import { SERVICOS, STATUS, PERIODOS, PERIODOS_AGENDA, formatarData, linkWhatsApp, linkMapa, periodosConflitam } from '@/lib/constantes'
import { mensagensCliente } from '@/lib/mensagens'
import { useEmpresa } from '@/lib/useEmpresa'

async function avisarEquipe(chamadoId, funcionarios) {
  if (!funcionarios.length) return
  const { data: { session } } = await supabase.auth.getSession()
  fetch('/api/notificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify({ tipo: 'equipe', chamado_id: chamadoId, funcionarios }),
  }).catch(() => {})
}

export default function DetalheChamado() {
  const { id } = useParams()
  const router = useRouter()
  const [excluindo, setExcluindo] = useState(false)
  const abrirOrcamento = useSearchParams().get('orcamento') === 'novo'
  const [chamado, setChamado] = useState(null)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [clientes, setClientes] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [equipe, setEquipe] = useState([])
  const [form, setForm] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [orcamento, setOrcamento] = useState(null)
  const [equipeSalva, setEquipeSalva] = useState([])
  const [conflitos, setConflitos] = useState([])
  const empresa = useEmpresa()

  useEffect(() => {
    async function carregar() {
      const [c, cl, f, e, o] = await Promise.all([
        supabase.from('chamados').select('*').eq('id', id).single(),
        supabase.from('clientes').select('id, nome').order('nome'),
        supabase.from('perfis').select('id, nome, ativo').eq('papel', 'funcionario').order('nome'),
        supabase.from('chamado_equipe').select('funcionario_id').eq('chamado_id', id),
        supabase.from('orcamentos').select('*').eq('chamado_id', id).maybeSingle(),
      ])
      if (!c.data) return setNaoEncontrado(true)
      setChamado(c.data)
      setForm({
        status: c.data.status,
        data_agendada: c.data.data_agendada || '',
        periodo_agendado: c.data.periodo_agendado || c.data.periodo_desejado?.replace('qualquer', '') || '',
        cliente_id: c.data.cliente_id || '',
        observacoes_admin: c.data.observacoes_admin || '',
      })
      setClientes(cl.data || [])
      setFuncionarios(f.data || [])
      setEquipe((e.data || []).map((x) => x.funcionario_id))
      setEquipeSalva((e.data || []).map((x) => x.funcionario_id))
      setOrcamento(o.data || null)
      if (abrirOrcamento && !o.data) setTimeout(() => document.getElementById('orcamento')?.scrollIntoView({ behavior: 'smooth' }), 300)
    }
    carregar()
  }, [id])

  // Verifica se alguém da equipe já está em outro serviço no mesmo dia e período
  useEffect(() => {
    if (!form?.data_agendada || equipe.length === 0) { setConflitos([]); return }
    let ativo = true
    supabase
      .from('chamado_equipe')
      .select('funcionario_id, perfis(nome), chamados!inner(id, protocolo, data_agendada, periodo_agendado, status)')
      .in('funcionario_id', equipe)
      .eq('chamados.data_agendada', form.data_agendada)
      .neq('chamado_id', id)
      .then(({ data }) => {
        if (!ativo) return
        setConflitos((data || []).filter((x) =>
          !['concluido', 'cancelado'].includes(x.chamados.status) &&
          periodosConflitam(form.periodo_agendado || null, x.chamados.periodo_agendado)))
      })
    return () => { ativo = false }
  }, [form?.data_agendada, form?.periodo_agendado, equipe, id])

  if (naoEncontrado) return <p className="text-slate-500">Chamado não encontrado.</p>
  if (!chamado || !form) return <Carregando />

  function alternarMembro(fid) {
    setEquipe((atual) => (atual.includes(fid) ? atual.filter((x) => x !== fid) : [...atual, fid]))
  }

  async function excluir() {
    const extra = orcamento ? '\n\nO orçamento deste chamado também será apagado.' : ''
    if (!confirm(`Excluir o chamado #${chamado.protocolo} de ${chamado.nome_solicitante}?${extra}\n\nEssa ação não pode ser desfeita.`)) return
    setExcluindo(true)
    const { error } = await supabase.from('chamados').delete().eq('id', id)
    if (error) {
      setExcluindo(false)
      return alert('Não foi possível excluir: ' + error.message)
    }
    router.replace('/admin/chamados')
  }

  async function salvar() {
    setSalvando(true)
    setMensagem('')
    let status = form.status
    // Se ainda está "aberto" e já tem data e equipe, passa para "agendado"
    if (status === 'aberto' && form.data_agendada && equipe.length > 0) status = 'agendado'

    const atualizacao = {
      status,
      data_agendada: form.data_agendada || null,
      periodo_agendado: form.periodo_agendado || null,
      cliente_id: form.cliente_id || null,
      observacoes_admin: form.observacoes_admin || null,
      concluido_em: status === 'concluido' ? (chamado.concluido_em || new Date().toISOString()) : null,
    }
    const { data, error } = await supabase.from('chamados').update(atualizacao).eq('id', id).select('*').single()
    if (error) {
      setSalvando(false)
      return setMensagem('Erro ao salvar: ' + error.message)
    }

    // Atualiza a equipe (remove quem saiu, adiciona quem entrou)
    await supabase.from('chamado_equipe').delete().eq('chamado_id', id)
    if (equipe.length) {
      const { error: erroEquipe } = await supabase
        .from('chamado_equipe')
        .insert(equipe.map((fid) => ({ chamado_id: id, funcionario_id: fid })))
      if (erroEquipe) {
        setSalvando(false)
        return setMensagem('Erro ao salvar a equipe: ' + erroEquipe.message)
      }
    }

    // Avisa no celular quem entrou agora na equipe
    avisarEquipe(id, equipe.filter((fid) => !equipeSalva.includes(fid)))
    setEquipeSalva(equipe)

    setChamado(data)
    setForm({ ...form, status: data.status })
    setSalvando(false)
    setMensagem('ok')
    setTimeout(() => setMensagem(''), 2500)
  }

  const textoWhats = `Olá! Aqui é do ${empresa?.nome || 'Grupo RD'}, sobre o seu pedido #${chamado.protocolo}.`
  const site = typeof window !== 'undefined' ? window.location.origin : ''
  const mensagens = mensagensCliente(chamado, empresa, site, orcamento)
  const enviarWhats = (texto) => window.open(linkWhatsApp(chamado.telefone, texto), '_blank')
  const funcionariosVisiveis = funcionarios.filter((f) => f.ativo || equipe.includes(f.id))

  return (
    <div>
      <Link href="/admin/chamados" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Chamados
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="titulo-pagina">#{chamado.protocolo}</h1>
        <StatusBadge status={chamado.status} />
      </div>
      <p className="text-sm text-slate-500">
        {SERVICOS[chamado.servico]} · aberto em {formatarData(chamado.criado_em, true)}
        {chamado.contrato_id && <> · <Link href="/admin/contratos" className="font-medium text-violet-700 underline">serviço de contrato</Link></>}
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Informações do pedido */}
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="font-semibold text-slate-900">{chamado.nome_solicitante}</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2"><Phone size={15} className="text-slate-400" /> {chamado.telefone}</div>
              <a href={linkMapa(chamado.endereco)} target="_blank" rel="noreferrer" className="flex items-start gap-2 hover:text-marca-700">
                <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" /> {chamado.endereco}
              </a>
            </div>
            <a href={linkWhatsApp(chamado.telefone, textoWhats)} target="_blank" rel="noreferrer" className="btn-secundario mt-4">
              <MessageCircle size={16} /> Chamar no WhatsApp
            </a>
          </section>

          <section className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900">Descrição</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{chamado.descricao}</p>
            <h3 className="mt-5 text-sm font-semibold text-slate-900">Fotos do cliente</h3>
            <div className="mt-2"><Galeria links={chamado.fotos} /></div>
          </section>

          <EditorOrcamento
            key={orcamento ? 'com' : 'sem'}
            iniciarEditando={abrirOrcamento}
            chamadoId={id}
            orcamento={orcamento}
            onAlterado={setOrcamento}
            onEnviarWhatsApp={(o) => {
              const m = mensagensCliente(chamado, empresa, site, o).find((x) => x.chave === 'orcamento')
              if (m) enviarWhats(m.texto)
            }}
          />

          <section className="card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Send size={15} /> Avisar o cliente no WhatsApp</h3>
            <p className="mt-1 text-xs text-slate-500">Mensagens prontas. Toque, confira no WhatsApp e envie.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {mensagens.map((m) => (
                <button key={m.chave} onClick={() => enviarWhats(m.texto)} className="btn-secundario px-3 py-1.5">
                  <MessageCircle size={14} className="text-marca-600" /> {m.nome}
                </button>
              ))}
            </div>
          </section>

          {(chamado.relatorio_equipe || chamado.fotos_conclusao?.length > 0) && (
            <section className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900">Relatório da equipe</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{chamado.relatorio_equipe || '—'}</p>
              <h3 className="mt-5 text-sm font-semibold text-slate-900">Fotos do serviço</h3>
              <div className="mt-2"><Galeria links={chamado.fotos_conclusao} /></div>
              {chamado.concluido_em && (
                <p className="mt-4 text-xs text-slate-400">Concluído em {formatarData(chamado.concluido_em, true)}</p>
              )}
            </section>
          )}
        </div>

        {/* Gestão */}
        <section className="card h-fit space-y-4 p-5">
          <h2 className="font-semibold text-slate-900">Atendimento</h2>

          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Data do serviço</label>
            <input type="date" className="input" value={form.data_agendada}
              onChange={(e) => setForm({ ...form, data_agendada: e.target.value })} />
            {chamado.data_desejada && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <span>
                  Cliente quer: <strong>{formatarData(chamado.data_desejada)}</strong>
                  {chamado.periodo_desejado ? ` · ${PERIODOS[chamado.periodo_desejado]}` : ''}
                </span>
                {form.data_agendada !== chamado.data_desejada && (
                  <button type="button" onClick={() => setForm({ ...form, data_agendada: chamado.data_desejada })}
                    className="shrink-0 font-semibold text-amber-900 underline underline-offset-2">
                    Usar
                  </button>
                )}
              </div>
            )}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {Object.entries(PERIODOS_AGENDA).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setForm({ ...form, periodo_agendado: form.periodo_agendado === k ? '' : k })}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                    form.periodo_agendado === k ? 'border-marca-500 bg-marca-50 text-marca-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Cliente</label>
            <select className="input" value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
              <option value="">— Não vinculado —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <span className="label flex items-center gap-1.5"><Users size={15} /> Equipe</span>
            {funcionariosVisiveis.length === 0 ? (
              <p className="text-sm text-slate-400">
                Nenhum funcionário cadastrado. <Link href="/admin/usuarios" className="text-marca-700 underline">Cadastrar</Link>
              </p>
            ) : (
              <div className="space-y-1.5">
                {funcionariosVisiveis.map((f) => {
                  const marcado = equipe.includes(f.id)
                  return (
                    <button key={f.id} type="button" onClick={() => alternarMembro(f.id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition ${
                        marcado ? 'border-marca-500 bg-marca-50 text-marca-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        marcado ? 'border-marca-600 bg-marca-600 text-white' : 'border-slate-300'}`}>
                        {marcado && <Check size={13} />}
                      </span>
                      {f.nome}{!f.ativo && <span className="text-xs text-slate-400">(inativo)</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {conflitos.length > 0 && (
            <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800 ring-1 ring-red-200">
              <div className="flex items-center gap-1.5 font-medium"><AlertTriangle size={15} /> Atenção: conflito de agenda</div>
              <ul className="mt-1 space-y-0.5 text-xs">
                {conflitos.map((c, i) => (
                  <li key={i}>
                    {c.perfis?.nome} já está no <Link href={`/admin/chamados/${c.chamados.id}`} className="underline">#{c.chamados.protocolo}</Link>
                    {c.chamados.periodo_agendado ? ` (${PERIODOS_AGENDA[c.chamados.periodo_agendado]})` : ' (sem período)'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="label">Observações internas</label>
            <textarea className="input min-h-[80px]" value={form.observacoes_admin}
              onChange={(e) => setForm({ ...form, observacoes_admin: e.target.value })}
              placeholder="Visível para a equipe de campo" />
          </div>

          {mensagem && mensagem !== 'ok' && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{mensagem}</p>}
          <button onClick={salvar} disabled={salvando} className="btn-primario w-full">
            {salvando ? <Loader2 size={17} className="animate-spin" /> : mensagem === 'ok' ? <Check size={17} /> : null}
            {mensagem === 'ok' ? 'Salvo' : 'Salvar alterações'}
          </button>
          <button onClick={excluir} disabled={excluindo || salvando} className="btn-perigo w-full">
            {excluindo ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Excluir chamado
          </button>
          <p className="text-center text-xs text-slate-400">Para manter o histórico, prefira mudar o status para "Cancelado".</p>
        </section>
      </div>
    </div>
  )
}
