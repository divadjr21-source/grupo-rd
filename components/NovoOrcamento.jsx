'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { X, Search, Loader2, ChevronRight, ClipboardList, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SERVICOS, formatarData, mascaraTelefone } from '@/lib/constantes'

const VAZIO = { cliente_id: '', nome_solicitante: '', telefone: '', endereco: '', servico: 'reforma', descricao: '' }

// Janela "Novo orçamento": escolher um chamado existente ou cadastrar um cliente novo
export default function NovoOrcamento({ onFechar }) {
  const router = useRouter()
  const [aba, setAba] = useState('chamado')
  const [chamados, setChamados] = useState(null)
  const [busca, setBusca] = useState('')
  const [clientes, setClientes] = useState([])
  const [form, setForm] = useState(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    // Chamados em aberto que ainda não têm orçamento
    supabase
      .from('chamados')
      .select('id, protocolo, nome_solicitante, servico, status, criado_em, clientes(nome), orcamentos(id)')
      .in('status', ['aberto', 'agendado', 'em_andamento'])
      .order('criado_em', { ascending: false })
      .limit(200)
      .then(({ data }) => setChamados((data || []).filter((c) => {
        const o = c.orcamentos
        return Array.isArray(o) ? o.length === 0 : !o
      })))
    supabase.from('clientes').select('*').order('nome').then(({ data }) => setClientes(data || []))
  }, [])

  function abrir(id) {
    router.push(`/admin/chamados/${id}?orcamento=novo`)
  }

  function escolherCliente(id) {
    const c = clientes.find((x) => x.id === id)
    setForm({
      ...form,
      cliente_id: id,
      nome_solicitante: c ? (c.responsavel ? `${c.responsavel} — ${c.nome}` : c.nome) : '',
      telefone: c?.telefone || '',
      endereco: c?.endereco || '',
    })
  }

  const alterar = (campo) => (e) =>
    setForm({ ...form, [campo]: campo === 'telefone' ? mascaraTelefone(e.target.value) : e.target.value })

  async function criar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    const { data, error } = await supabase.from('chamados').insert({
      ...form,
      cliente_id: form.cliente_id || null,
      descricao: form.descricao.trim() || 'Orçamento',
      status: 'aberto',
    }).select('id').single()
    setSalvando(false)
    if (error) return setErro('Não foi possível criar: ' + error.message)
    abrir(data.id)
  }

  const termo = busca.trim().toLowerCase()
  const lista = (chamados || []).filter((c) => !termo ||
    [c.protocolo, c.nome_solicitante, c.clientes?.nome].some((v) => (v || '').toLowerCase().includes(termo)))

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-lg font-semibold text-slate-900">Novo orçamento</h2>
          <button onClick={onFechar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="mx-5 mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {[['chamado', 'De um chamado', ClipboardList], ['novo', 'Cliente novo', UserPlus]].map(([k, n, Icone]) => (
            <button key={k} onClick={() => setAba(k)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${aba === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              <Icone size={15} /> {n}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {aba === 'chamado' ? (
            <>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-10" placeholder="Buscar por protocolo ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />
              </div>
              <div className="mt-3">
                {!chamados ? (
                  <div className="flex justify-center py-8 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
                ) : lista.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    Nenhum chamado em aberto sem orçamento.
                    <button onClick={() => setAba('novo')} className="mt-2 block w-full font-medium text-marca-700 underline">Orçar um cliente novo</button>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                    {lista.map((c) => (
                      <li key={c.id}>
                        <button onClick={() => abrir(c.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-400">#{c.protocolo} · {SERVICOS[c.servico]}</div>
                            <div className="truncate font-medium text-slate-900">{c.clientes?.nome || c.nome_solicitante}</div>
                            <div className="text-xs text-slate-400">Aberto em {formatarData(c.criado_em)}</div>
                          </div>
                          <ChevronRight size={17} className="text-slate-300" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <form id="form-novo-orc" onSubmit={criar} className="space-y-4">
              {clientes.length > 0 && (
                <div>
                  <label className="label">Cliente cadastrado (opcional)</label>
                  <select className="input" value={form.cliente_id} onChange={(e) => escolherCliente(e.target.value)}>
                    <option value="">— Novo cliente —</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Nome do cliente</label>
                <input className="input" required value={form.nome_solicitante} onChange={alterar('nome_solicitante')} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Telefone / WhatsApp</label>
                  <input className="input" required inputMode="tel" value={form.telefone} onChange={alterar('telefone')} placeholder="(71) 99999-9999" />
                </div>
                <div>
                  <label className="label">Serviço</label>
                  <select className="input" value={form.servico} onChange={alterar('servico')}>
                    {Object.entries(SERVICOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Endereço</label>
                <input className="input" required value={form.endereco} onChange={alterar('endereco')} />
              </div>
              <div>
                <label className="label">O que será feito (opcional)</label>
                <textarea className="input min-h-[80px]" value={form.descricao} onChange={alterar('descricao')}
                  placeholder="Ex.: Pintura completa do apartamento, 3 quartos." />
              </div>
              {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            </form>
          )}
        </div>

        {aba === 'novo' && (
          <div className="border-t border-slate-100 p-5">
            <button form="form-novo-orc" className="btn-primario w-full py-3" disabled={salvando}>
              {salvando && <Loader2 size={17} className="animate-spin" />} Continuar para os itens
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">É criado um chamado para este cliente, e o orçamento fica dentro dele.</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
