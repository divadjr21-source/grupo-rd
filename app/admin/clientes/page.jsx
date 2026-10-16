'use client'

import { useEffect, useState } from 'react'
import { Plus, Building2, Briefcase, Phone, MapPin, X, Loader2, Search } from 'lucide-react'
import Carregando from '@/components/Carregando'
import { supabase } from '@/lib/supabase'
import { mascaraTelefone } from '@/lib/constantes'

const VAZIO = { nome: '', tipo: 'condominio', responsavel: '', telefone: '', email: '', endereco: '', observacoes: '' }

export default function Clientes() {
  const [clientes, setClientes] = useState(null)
  const [editando, setEditando] = useState(null) // objeto do formulário, ou null
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  async function carregar() {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
  }
  useEffect(() => { carregar() }, [])

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    const { id, criado_em, ...dados } = editando
    const consulta = id
      ? supabase.from('clientes').update(dados).eq('id', id)
      : supabase.from('clientes').insert(dados)
    const { error } = await consulta
    setSalvando(false)
    if (error) return setErro(error.message)
    setEditando(null)
    carregar()
  }

  async function excluir() {
    if (!confirm(`Excluir o cliente "${editando.nome}"? Os chamados dele serão mantidos.`)) return
    await supabase.from('clientes').delete().eq('id', editando.id)
    setEditando(null)
    carregar()
  }

  const alterar = (campo) => (e) =>
    setEditando({ ...editando, [campo]: campo === 'telefone' ? mascaraTelefone(e.target.value) : e.target.value })

  const lista = (clientes || []).filter((c) =>
    [c.nome, c.responsavel, c.endereco].some((v) => (v || '').toLowerCase().includes(busca.trim().toLowerCase())))

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="titulo-pagina">Clientes</h1>
        <button onClick={() => { setErro(''); setEditando({ ...VAZIO }) }} className="btn-primario"><Plus size={17} /> Novo cliente</button>
      </div>

      <div className="relative mt-5">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-10" placeholder="Buscar cliente" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="mt-4">
        {!clientes ? <Carregando /> : lista.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-400">Nenhum cliente cadastrado.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {lista.map((c) => {
              const Icone = c.tipo === 'empresa' ? Briefcase : Building2
              return (
                <button key={c.id} onClick={() => { setErro(''); setEditando({ ...VAZIO, ...c }) }}
                  className="card p-4 text-left transition hover:border-marca-200 hover:shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icone size={18} /></div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">{c.nome}</div>
                      <div className="text-xs text-slate-400">{c.tipo === 'empresa' ? 'Empresa' : 'Condomínio'}{c.responsavel ? ` · ${c.responsavel}` : ''}</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-500">
                    {c.telefone && <div className="flex items-center gap-2"><Phone size={14} /> {c.telefone}</div>}
                    {c.endereco && <div className="flex items-center gap-2 truncate"><MapPin size={14} className="shrink-0" /> <span className="truncate">{c.endereco}</span></div>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {editando && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/30 sm:items-center sm:p-4" onClick={() => setEditando(null)}>
          <form onSubmit={salvar} onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{editando.id ? 'Editar cliente' : 'Novo cliente'}</h2>
              <button type="button" onClick={() => setEditando(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
              <div>
                <label className="label">Nome</label>
                <input className="input" required value={editando.nome} onChange={alterar('nome')} />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={editando.tipo} onChange={alterar('tipo')}>
                  <option value="condominio">Condomínio</option>
                  <option value="empresa">Empresa</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Responsável / Síndico</label>
                <input className="input" value={editando.responsavel || ''} onChange={alterar('responsavel')} />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="input" inputMode="tel" value={editando.telefone || ''} onChange={alterar('telefone')} />
              </div>
            </div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" value={editando.email || ''} onChange={alterar('email')} />
            </div>
            <div>
              <label className="label">Endereço</label>
              <input className="input" value={editando.endereco || ''} onChange={alterar('endereco')} />
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input min-h-[70px]" value={editando.observacoes || ''} onChange={alterar('observacoes')} />
            </div>
            {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <div className="flex items-center justify-between gap-2 pt-1">
              {editando.id ? <button type="button" onClick={excluir} className="btn-perigo">Excluir</button> : <span />}
              <button className="btn-primario" disabled={salvando}>
                {salvando && <Loader2 size={17} className="animate-spin" />} Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
