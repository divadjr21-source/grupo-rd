'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, Sparkles, Trees, Layers, HelpCircle } from 'lucide-react'
import CabecalhoPublico from '@/components/CabecalhoPublico'
import { SeletorArquivos } from '@/components/Arquivos'
import { supabase } from '@/lib/supabase'
import { enviarArquivos } from '@/lib/upload'
import { mascaraTelefone, hojeISO, PERIODOS } from '@/lib/constantes'

const OPCOES = [
  { valor: 'limpeza', nome: 'Limpeza', icone: Sparkles },
  { valor: 'jardinagem', nome: 'Jardinagem', icone: Trees },
  { valor: 'limpeza_e_jardinagem', nome: 'Os dois', icone: Layers },
  { valor: 'outro', nome: 'Outro', icone: HelpCircle },
]

export default function AbrirChamado() {
  const [form, setForm] = useState({ nome: '', telefone: '', endereco: '', servico: 'limpeza', descricao: '', data_desejada: '', periodo: 'qualquer' })
  const [arquivos, setArquivos] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [protocolo, setProtocolo] = useState(null)

  const alterar = (campo) => (e) =>
    setForm({ ...form, [campo]: campo === 'telefone' ? mascaraTelefone(e.target.value) : e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (form.telefone.replace(/\D/g, '').length < 10) {
      setErro('Informe um telefone com DDD.')
      return
    }
    setEnviando(true)
    try {
      const fotos = arquivos.length ? await enviarArquivos(arquivos, 'chamados') : []
      const { data, error } = await supabase.rpc('abrir_chamado', {
        p_nome: form.nome,
        p_telefone: form.telefone,
        p_endereco: form.endereco,
        p_servico: form.servico,
        p_descricao: form.descricao,
        p_fotos: fotos,
        p_data_desejada: form.data_desejada || null,
        p_periodo: form.data_desejada ? form.periodo : null,
      })
      if (error) throw new Error(error.message)
      setProtocolo(data)
    } catch (err) {
      setErro(err.message || 'Não foi possível enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (protocolo) {
    return (
      <div className="min-h-screen bg-slate-50">
        <CabecalhoPublico />
        <main className="mx-auto max-w-md px-4 py-12">
          <div className="card p-8 text-center">
            <CheckCircle2 size={44} className="mx-auto text-marca-600" />
            <h1 className="mt-4 text-xl font-semibold text-slate-900">Pedido recebido!</h1>
            <p className="mt-2 text-sm text-slate-500">Guarde o número do seu protocolo. Entraremos em contato pelo telefone informado.</p>
            <div className="mt-6 rounded-xl bg-marca-50 py-4">
              <div className="text-xs uppercase tracking-wide text-marca-700">Protocolo</div>
              <div className="mt-1 text-3xl font-semibold tracking-wider text-marca-900">{protocolo}</div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <Link href={`/acompanhar?protocolo=${protocolo}`} className="btn-primario">Acompanhar pedido</Link>
              <Link href="/" className="btn-secundario">Voltar ao início</Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <CabecalhoPublico />
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="titulo-pagina">Solicitar serviço</h1>
        <p className="mt-1 text-sm text-slate-500">Preencha os dados abaixo. Nossa equipe retorna em breve.</p>

        <form onSubmit={enviar} className="card mt-6 space-y-5 p-5 sm:p-6">
          <div>
            <span className="label">Tipo de serviço</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OPCOES.map(({ valor, nome, icone: Icone }) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setForm({ ...form, servico: valor })}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-medium transition ${
                    form.servico === valor
                      ? 'border-marca-500 bg-marca-50 text-marca-700 ring-2 ring-marca-100'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icone size={20} /> {nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="nome">Nome / Condomínio / Empresa</label>
            <input id="nome" className="input" required value={form.nome} onChange={alterar('nome')}
              placeholder="Ex.: João — Condomínio Jardim das Flores" />
          </div>

          <div>
            <label className="label" htmlFor="telefone">Telefone / WhatsApp</label>
            <input id="telefone" className="input" required inputMode="tel" value={form.telefone}
              onChange={alterar('telefone')} placeholder="(71) 99999-9999" />
          </div>

          <div>
            <label className="label" htmlFor="endereco">Endereço completo</label>
            <input id="endereco" className="input" required value={form.endereco} onChange={alterar('endereco')}
              placeholder="Rua, número, bairro, cidade" />
          </div>

          <div>
            <label className="label" htmlFor="descricao">O que precisa ser feito?</label>
            <textarea id="descricao" className="input min-h-[120px]" required maxLength={3000}
              value={form.descricao} onChange={alterar('descricao')}
              placeholder="Descreva o serviço e o local (bloco, área, andar…)." />
          </div>

          <div>
            <label className="label" htmlFor="data">Data prevista para o serviço (opcional)</label>
            <input id="data" type="date" className="input" min={hojeISO()} value={form.data_desejada}
              onChange={alterar('data_desejada')} />
            {form.data_desejada && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {Object.entries(PERIODOS).map(([valor, nome]) => (
                  <button key={valor} type="button" onClick={() => setForm({ ...form, periodo: valor })}
                    className={`rounded-xl border px-2 py-2 text-sm font-medium transition ${
                      form.periodo === valor
                        ? 'border-marca-500 bg-marca-50 text-marca-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {nome}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-xs text-slate-400">Vamos confirmar a data com você antes do atendimento.</p>
          </div>

          <div>
            <span className="label">Fotos ou vídeos (opcional)</span>
            <SeletorArquivos arquivos={arquivos} onChange={setArquivos} />
          </div>

          {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

          <button type="submit" disabled={enviando} className="btn-primario w-full py-3 text-base">
            {enviando ? <><Loader2 size={18} className="animate-spin" /> Enviando…</> : 'Enviar solicitação'}
          </button>
        </form>
      </main>
    </div>
  )
}
