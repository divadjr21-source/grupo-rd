'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Plus, Repeat, X, Loader2, Users, CalendarDays, Wallet, Check, Power, Trash2, Pencil } from 'lucide-react'
import Carregando from '@/components/Carregando'
import { supabase } from '@/lib/supabase'
import {
  SERVICOS, PERIODOS_AGENDA, FREQUENCIAS, DIAS_SEMANA, descreverAgenda,
  formatarMoeda, formatarData, hojeISO,
} from '@/lib/constantes'

const VAZIO = {
  cliente_id: '', titulo: '', servico: 'limpeza', descricao: '', endereco: '',
  frequencia: 'semanal', dias_semana: [1, 3, 5], dia_mes: 10, periodo_agendado: 'manha',
  equipe: [], valor_mensal: '', dia_vencimento: 10, inicio: hojeISO(), fim: '', observacoes: '', ativo: true,
}

// Remove os serviços futuros ainda não iniciados (para recriar com a agenda nova)
async function limparFuturos(contratoId) {
  await supabase.from('chamados').delete()
    .eq('contrato_id', contratoId).eq('status', 'agendado').gt('data_agendada', hojeISO())
}

export default function Contratos() {
  const [contratos, setContratos] = useState(null)
  const [clientes, setClientes] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [form, setForm] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  async function carregar() {
    const { data } = await supabase.from('contratos').select('*, clientes(nome, telefone, endereco)').order('ativo', { ascending: false }).order('criado_em', { ascending: false })
    setContratos(data || [])
  }
  useEffect(() => {
    carregar()
    supabase.from('clientes').select('id, nome, endereco').order('nome').then(({ data }) => setClientes(data || []))
    supabase.from('perfis').select('id, nome, ativo').eq('papel', 'funcionario').order('nome').then(({ data }) => setFuncionarios(data || []))
  }, [])

  function mostrarAviso(t) { setAviso(t); setTimeout(() => setAviso(''), 4000) }

  function abrir(c) {
    setErro('')
    setForm(c ? {
      ...VAZIO, ...c,
      descricao: c.descricao || '', endereco: c.endereco || '', observacoes: c.observacoes || '', fim: c.fim || '',
      dia_mes: c.dia_mes || 10, periodo_agendado: c.periodo_agendado || '',
    } : { ...VAZIO })
  }

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })
  const alternar = (campo, valor) => setForm({
    ...form, [campo]: form[campo].includes(valor) ? form[campo].filter((x) => x !== valor) : [...form[campo], valor],
  })

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.cliente_id) return setErro('Escolha o cliente.')
    if (form.frequencia !== 'mensal' && form.dias_semana.length === 0) return setErro('Marque pelo menos um dia da semana.')
    setSalvando(true)
    const dados = {
      cliente_id: form.cliente_id,
      titulo: form.titulo.trim(),
      servico: form.servico,
      descricao: form.descricao.trim() || null,
      endereco: form.endereco.trim() || null,
      frequencia: form.frequencia,
      dias_semana: form.frequencia === 'mensal' ? [] : form.dias_semana,
      dia_mes: form.frequencia === 'mensal' ? Number(form.dia_mes) : null,
      periodo_agendado: form.periodo_agendado || null,
      equipe: form.equipe,
      valor_mensal: Number(String(form.valor_mensal).replace(',', '.')) || 0,
      dia_vencimento: Number(form.dia_vencimento) || 10,
      inicio: form.inicio,
      fim: form.fim || null,
      observacoes: form.observacoes.trim() || null,
      ativo: form.ativo,
    }
    let id = form.id
    if (id) {
      const { error } = await supabase.from('contratos').update(dados).eq('id', id)
      if (error) { setSalvando(false); return setErro(error.message) }
      await limparFuturos(id) // a agenda nova substitui a antiga
    } else {
      const { data, error } = await supabase.from('contratos').insert(dados).select('id').single()
      if (error) { setSalvando(false); return setErro(error.message) }
      id = data.id
    }
    const { data: gerados } = await supabase.rpc('gerar_servicos_contratos', { p_dias: 30 })
    await supabase.rpc('gerar_cobrancas')
    setSalvando(false)
    setForm(null)
    mostrarAviso(`Contrato salvo. ${gerados || 0} serviço(s) colocados na agenda dos próximos 30 dias.`)
    carregar()
  }

  async function alternarAtivo(c) {
    const msg = c.ativo
      ? `Encerrar o contrato "${c.titulo}"?\n\nOs serviços futuros que ainda não começaram saem da agenda. O histórico e as cobranças continuam.`
      : `Reativar o contrato "${c.titulo}"?`
    if (!confirm(msg)) return
    await supabase.from('contratos').update({ ativo: !c.ativo, fim: c.ativo ? hojeISO() : null }).eq('id', c.id)
    if (c.ativo) await limparFuturos(c.id)
    else await supabase.rpc('gerar_servicos_contratos', { p_dias: 30 })
    carregar()
  }

  async function excluir(c) {
    if (!confirm(`Excluir o contrato "${c.titulo}"?\n\nOs serviços futuros saem da agenda. Serviços já feitos e cobranças continuam salvos.\nEssa ação não pode ser desfeita.`)) return
    await limparFuturos(c.id)
    const { error } = await supabase.from('contratos').delete().eq('id', c.id)
    if (error) return alert('Não foi possível excluir: ' + error.message)
    setForm(null)
    carregar()
  }

  const ativos = (contratos || []).filter((c) => c.ativo)
  const receita = ativos.reduce((t, c) => t + Number(c.valor_mensal || 0), 0)
  const nomeFunc = (id) => funcionarios.find((f) => f.id === id)?.nome

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Contratos</h1>
          <p className="text-sm text-slate-500">Serviços fixos: entram na agenda e no financeiro sozinhos.</p>
        </div>
        <button onClick={() => abrir(null)} className="btn-primario"><Plus size={17} /> Novo contrato</button>
      </div>

      {aviso && <p className="mt-4 rounded-xl bg-marca-50 px-4 py-2.5 text-sm text-marca-800 ring-1 ring-marca-200">{aviso}</p>}

      {contratos && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="card p-4"><div className="text-sm text-slate-500">Contratos ativos</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{ativos.length}</div></div>
          <div className="card p-4"><div className="text-sm text-slate-500">Receita mensal fixa</div>
            <div className="mt-1 text-xl font-semibold text-marca-700">{formatarMoeda(receita)}</div></div>
        </div>
      )}

      <div className="mt-5">
        {!contratos ? <Carregando /> : contratos.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-500">
            <Repeat size={24} className="text-slate-300" />
            Nenhum contrato ainda. Cadastre, por exemplo, a limpeza fixa de um condomínio.
            <button onClick={() => abrir(null)} className="btn-primario mt-2"><Plus size={16} /> Criar o primeiro</button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {contratos.map((c) => (
              <div key={c.id} className={`card p-4 ${c.ativo ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{c.titulo}</div>
                    <div className="truncate text-sm text-slate-500">{c.clientes?.nome} · {SERVICOS[c.servico]}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    c.ativo ? 'bg-marca-50 text-marca-700 ring-marca-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
                    {c.ativo ? 'Ativo' : 'Encerrado'}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" /> {descreverAgenda(c)}</div>
                  <div className="flex items-start gap-2"><Users size={14} className="mt-0.5 text-slate-400" />
                    {c.equipe.length ? c.equipe.map(nomeFunc).filter(Boolean).join(', ') : <span className="text-amber-700">Sem equipe fixa</span>}
                  </div>
                  <div className="flex items-center gap-2"><Wallet size={14} className="text-slate-400" />
                    {formatarMoeda(c.valor_mensal)}/mês · vence dia {c.dia_vencimento}
                  </div>
                  <div className="text-xs text-slate-400">Desde {formatarData(c.inicio)}{c.fim ? ` até ${formatarData(c.fim)}` : ''}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => abrir(c)} className="btn-secundario px-3 py-1.5"><Pencil size={14} /> Editar</button>
                  <button onClick={() => alternarAtivo(c)} className="btn-secundario px-3 py-1.5"><Power size={14} /> {c.ativo ? 'Encerrar' : 'Reativar'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {form && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={() => setForm(null)}>
          <form onSubmit={salvar} onClick={(e) => e.stopPropagation()}
            className="max-h-[94vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{form.id ? 'Editar contrato' : 'Novo contrato'}</h2>
              <button type="button" onClick={() => setForm(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <div>
              <label className="label">Cliente</label>
              {clientes.length === 0 ? (
                <p className="text-sm text-slate-500">Cadastre o cliente primeiro em <Link href="/admin/clientes" className="font-medium text-marca-700 underline">Clientes</Link>.</p>
              ) : (
                <select className="input" required value={form.cliente_id} onChange={alterar('cliente_id')}>
                  <option value="">— Escolha —</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_190px]">
              <div>
                <label className="label">Nome do contrato</label>
                <input className="input" required value={form.titulo} onChange={alterar('titulo')} placeholder="Ex.: Limpeza das áreas comuns" />
              </div>
              <div>
                <label className="label">Serviço</label>
                <select className="input" value={form.servico} onChange={alterar('servico')}>
                  {Object.entries(SERVICOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div>
              <span className="label">Frequência</span>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(FREQUENCIAS).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setForm({ ...form, frequencia: k })}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium sm:text-sm ${form.frequencia === k ? 'border-marca-500 bg-marca-50 text-marca-700' : 'border-slate-200 text-slate-600'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {form.frequencia === 'mensal' ? (
              <div>
                <label className="label">Dia do mês</label>
                <input type="number" min={1} max={28} className="input w-28" value={form.dia_mes} onChange={alterar('dia_mes')} />
              </div>
            ) : (
              <div>
                <span className="label">Dias da semana</span>
                <div className="grid grid-cols-7 gap-1">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <button key={d} type="button" onClick={() => alternar('dias_semana', d)}
                      className={`rounded-lg border py-2 text-xs font-semibold ${form.dias_semana.includes(d) ? 'border-marca-600 bg-marca-600 text-white' : 'border-slate-200 text-slate-600'}`}>
                      {DIAS_SEMANA[d]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="label">Período</span>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(PERIODOS_AGENDA).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setForm({ ...form, periodo_agendado: form.periodo_agendado === k ? '' : k })}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium ${form.periodo_agendado === k ? 'border-marca-500 bg-marca-50 text-marca-700' : 'border-slate-200 text-slate-600'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="label flex items-center gap-1.5"><Users size={15} /> Equipe fixa</span>
              {funcionarios.filter((f) => f.ativo).length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum funcionário cadastrado ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {funcionarios.filter((f) => f.ativo || form.equipe.includes(f.id)).map((f) => {
                    const sel = form.equipe.includes(f.id)
                    return (
                      <button key={f.id} type="button" onClick={() => alternar('equipe', f.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm ${sel ? 'border-marca-500 bg-marca-50 text-marca-800' : 'border-slate-200 text-slate-600'}`}>
                        {sel && <Check size={13} />} {f.nome}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Valor mensal (R$)</label>
                <input className="input" inputMode="decimal" value={form.valor_mensal} onChange={alterar('valor_mensal')} placeholder="0,00" />
              </div>
              <div>
                <label className="label">Vencimento (dia)</label>
                <input type="number" min={1} max={28} className="input" value={form.dia_vencimento} onChange={alterar('dia_vencimento')} />
              </div>
              <div>
                <label className="label">Início</label>
                <input type="date" className="input" required value={form.inicio} onChange={alterar('inicio')} />
              </div>
              <div>
                <label className="label">Fim (opcional)</label>
                <input type="date" className="input" value={form.fim} onChange={alterar('fim')} />
              </div>
            </div>

            <div>
              <label className="label">Endereço do serviço (se diferente do cadastro)</label>
              <input className="input" value={form.endereco} onChange={alterar('endereco')}
                placeholder={clientes.find((c) => c.id === form.cliente_id)?.endereco || 'Usa o endereço do cliente'} />
            </div>
            <div>
              <label className="label">O que inclui</label>
              <textarea className="input min-h-[70px]" value={form.descricao} onChange={alterar('descricao')}
                placeholder="Ex.: Hall, escadas, elevadores, garagem e retirada do lixo." />
            </div>

            {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

            <div className="flex items-center justify-between gap-2 pt-1">
              {form.id ? (
                <button type="button" onClick={() => excluir(form)} className="btn-perigo"><Trash2 size={15} /> Excluir</button>
              ) : <span />}
              <button className="btn-primario" disabled={salvando}>
                {salvando && <Loader2 size={16} className="animate-spin" />} Salvar contrato
              </button>
            </div>
            <p className="text-center text-xs text-slate-400">Os serviços dos próximos 30 dias entram na agenda automaticamente, com a equipe escalada.</p>
          </form>
        </div>,
        document.body
      )}
    </div>
  )
}
