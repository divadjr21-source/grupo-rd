'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SERVICOS, mascaraTelefone } from '@/lib/constantes'

export default function NovoChamado() {
  const router = useRouter()
  const [clientes, setClientes] = useState([])
  const [form, setForm] = useState({
    cliente_id: '', nome_solicitante: '', telefone: '', endereco: '',
    servico: 'limpeza', descricao: '', data_agendada: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase.from('clientes').select('*').order('nome').then(({ data }) => setClientes(data || []))
  }, [])

  function escolherCliente(id) {
    const c = clientes.find((x) => x.id === id)
    setForm({
      ...form,
      cliente_id: id,
      nome_solicitante: c ? (c.responsavel ? `${c.responsavel} — ${c.nome}` : c.nome) : form.nome_solicitante,
      telefone: c?.telefone || form.telefone,
      endereco: c?.endereco || form.endereco,
    })
  }

  const alterar = (campo) => (e) =>
    setForm({ ...form, [campo]: campo === 'telefone' ? mascaraTelefone(e.target.value) : e.target.value })

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    const { data, error } = await supabase.from('chamados').insert({
      ...form,
      cliente_id: form.cliente_id || null,
      data_agendada: form.data_agendada || null,
      status: form.data_agendada ? 'agendado' : 'aberto',
    }).select('id').single()
    setSalvando(false)
    if (error) return setErro('Não foi possível salvar: ' + error.message)
    router.replace(`/admin/chamados/${data.id}`)
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin/chamados" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Chamados
      </Link>
      <h1 className="titulo-pagina mt-2">Novo chamado</h1>

      <form onSubmit={salvar} className="card mt-6 space-y-4 p-5 sm:p-6">
        <div>
          <label className="label">Cliente cadastrado (opcional)</label>
          <select className="input" value={form.cliente_id} onChange={(e) => escolherCliente(e.target.value)}>
            <option value="">— Nenhum —</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Solicitante</label>
            <input className="input" required value={form.nome_solicitante} onChange={alterar('nome_solicitante')} />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input" required inputMode="tel" value={form.telefone} onChange={alterar('telefone')} />
          </div>
        </div>
        <div>
          <label className="label">Endereço</label>
          <input className="input" required value={form.endereco} onChange={alterar('endereco')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Serviço</label>
            <select className="input" value={form.servico} onChange={alterar('servico')}>
              {Object.entries(SERVICOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data agendada (opcional)</label>
            <input type="date" className="input" value={form.data_agendada} onChange={alterar('data_agendada')} />
          </div>
        </div>
        <div>
          <label className="label">Descrição</label>
          <textarea className="input min-h-[110px]" required value={form.descricao} onChange={alterar('descricao')} />
        </div>
        {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <div className="flex justify-end gap-2">
          <Link href="/admin/chamados" className="btn-secundario">Cancelar</Link>
          <button className="btn-primario" disabled={salvando}>
            {salvando && <Loader2 size={17} className="animate-spin" />} Criar chamado
          </button>
        </div>
      </form>
    </div>
  )
}
