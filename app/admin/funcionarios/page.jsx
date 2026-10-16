'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Loader2, ShieldCheck, Phone, Mail } from 'lucide-react'
import Carregando from '@/components/Carregando'
import { supabase } from '@/lib/supabase'
import { mascaraTelefone } from '@/lib/constantes'

async function chamarApi(metodo, corpo) {
  const { data: { session } } = await supabase.auth.getSession()
  const r = await fetch('/api/usuarios', {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify(corpo),
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(json.erro || 'Erro ao salvar.')
}

export default function Funcionarios() {
  const [pessoas, setPessoas] = useState(null)
  const [editando, setEditando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar() {
    const { data } = await supabase.from('perfis').select('*').order('papel', { ascending: false }).order('nome')
    setPessoas(data || [])
  }
  useEffect(() => { carregar() }, [])

  function abrir(p) {
    setErro('')
    setEditando(p ? { ...p, senha: '' } : { nome: '', email: '', telefone: '', senha: '', papel: 'funcionario', ativo: true })
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      if (editando.id) {
        await chamarApi('PATCH', {
          id: editando.id, nome: editando.nome, telefone: editando.telefone,
          ativo: editando.ativo, senha: editando.senha || undefined,
        })
      } else {
        await chamarApi('POST', editando)
      }
      setEditando(null)
      carregar()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const alterar = (campo) => (e) =>
    setEditando({ ...editando, [campo]: campo === 'telefone' ? mascaraTelefone(e.target.value) : e.target.value })

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Equipe</h1>
          <p className="text-sm text-slate-500">Funcionários de campo e administradores</p>
        </div>
        <button onClick={() => abrir(null)} className="btn-primario"><Plus size={17} /> Novo</button>
      </div>

      <div className="mt-6">
        {!pessoas ? <Carregando /> : (
          <ul className="card divide-y divide-slate-100 overflow-hidden">
            {pessoas.map((p) => (
              <li key={p.id}>
                <button onClick={() => abrir(p)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    p.ativo ? 'bg-marca-50 text-marca-700' : 'bg-slate-100 text-slate-400'}`}>
                    {p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate font-medium ${p.ativo ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{p.nome}</span>
                      {p.papel === 'admin' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white">
                          <ShieldCheck size={11} /> Admin
                        </span>
                      )}
                      {!p.ativo && <span className="text-xs text-slate-400">Inativo</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-slate-500">
                      {p.email && <span className="inline-flex items-center gap-1"><Mail size={13} /> {p.email}</span>}
                      {p.telefone && <span className="inline-flex items-center gap-1"><Phone size={13} /> {p.telefone}</span>}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/30 sm:items-center sm:p-4" onClick={() => setEditando(null)}>
          <form onSubmit={salvar} onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{editando.id ? 'Editar' : 'Novo membro da equipe'}</h2>
              <button type="button" onClick={() => setEditando(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div>
              <label className="label">Nome</label>
              <input className="input" required value={editando.nome} onChange={alterar('nome')} />
            </div>
            <div>
              <label className="label">E-mail (login)</label>
              <input type="email" className="input disabled:bg-slate-50 disabled:text-slate-500" required={!editando.id}
                disabled={!!editando.id} value={editando.email || ''} onChange={alterar('email')} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" inputMode="tel" value={editando.telefone || ''} onChange={alterar('telefone')} />
            </div>
            <div>
              <label className="label">{editando.id ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial'}</label>
              <input type="text" className="input" minLength={6} required={!editando.id} autoComplete="new-password"
                value={editando.senha} onChange={alterar('senha')} placeholder="Mínimo de 6 caracteres" />
            </div>
            {!editando.id && (
              <div>
                <label className="label">Tipo de acesso</label>
                <select className="input" value={editando.papel} onChange={alterar('papel')}>
                  <option value="funcionario">Funcionário (vê só os próprios serviços)</option>
                  <option value="admin">Administrador (acesso total)</option>
                </select>
              </div>
            )}
            {editando.id && (
              <label className="flex items-center gap-2.5 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 accent-marca-600" checked={editando.ativo}
                  onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })} />
                Acesso ativo
              </label>
            )}
            {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <button className="btn-primario w-full" disabled={salvando}>
              {salvando && <Loader2 size={17} className="animate-spin" />} Salvar
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
