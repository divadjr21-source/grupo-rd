'use client'

import { useEffect, useState } from 'react'
import { Search, Loader2, Check } from 'lucide-react'
import CabecalhoPublico from '@/components/CabecalhoPublico'
import StatusBadge from '@/components/StatusBadge'
import { supabase } from '@/lib/supabase'
import { SERVICOS, PERIODOS, formatarData, mascaraTelefone } from '@/lib/constantes'

const ETAPAS = [
  { chave: 'aberto', nome: 'Recebido' },
  { chave: 'agendado', nome: 'Agendado' },
  { chave: 'em_andamento', nome: 'Em andamento' },
  { chave: 'concluido', nome: 'Concluído' },
]

export default function Acompanhar() {
  const [protocolo, setProtocolo] = useState('')
  const [telefone, setTelefone] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('protocolo')
    if (p) setProtocolo(p)
  }, [])

  async function buscar(e) {
    e.preventDefault()
    setErro('')
    setResultado(null)
    setBuscando(true)
    const { data, error } = await supabase.rpc('consultar_chamado', { p_protocolo: protocolo, p_telefone: telefone })
    setBuscando(false)
    if (error) return setErro('Não foi possível consultar agora. Tente novamente.')
    if (!data || data.length === 0) return setErro('Nenhum pedido encontrado. Confira o protocolo e o telefone.')
    setResultado(data[0])
  }

  const indiceAtual = resultado ? ETAPAS.findIndex((e) => e.chave === resultado.status) : -1

  return (
    <div className="min-h-screen bg-slate-50">
      <CabecalhoPublico />
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="titulo-pagina">Acompanhar pedido</h1>
        <p className="mt-1 text-sm text-slate-500">Informe o protocolo e o telefone usados na solicitação.</p>

        <form onSubmit={buscar} className="card mt-6 grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
          <div>
            <label className="label" htmlFor="protocolo">Protocolo</label>
            <input id="protocolo" className="input" required placeholder="2026-0001" value={protocolo}
              onChange={(e) => setProtocolo(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="tel">Telefone</label>
            <input id="tel" className="input" required inputMode="tel" placeholder="(71) 99999-9999" value={telefone}
              onChange={(e) => setTelefone(mascaraTelefone(e.target.value))} />
          </div>
          <button className="btn-primario h-[46px]" disabled={buscando}>
            {buscando ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} Consultar
          </button>
        </form>

        {erro && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{erro}</p>}

        {resultado && (
          <div className="card mt-6 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Protocolo</div>
                <div className="text-xl font-semibold text-slate-900">{resultado.protocolo}</div>
                <div className="mt-0.5 text-sm text-slate-500">{SERVICOS[resultado.servico]}</div>
              </div>
              <StatusBadge status={resultado.status} />
            </div>

            {resultado.status === 'cancelado' ? (
              <p className="mt-6 text-sm text-slate-500">Este pedido foi cancelado. Em caso de dúvida, entre em contato conosco.</p>
            ) : (
              <ol className="mt-6 space-y-4">
                {ETAPAS.map((etapa, i) => {
                  const feito = i <= indiceAtual
                  return (
                    <li key={etapa.chave} className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        feito ? 'bg-marca-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {feito ? <Check size={15} /> : i + 1}
                      </span>
                      <span className={feito ? 'font-medium text-slate-900' : 'text-slate-400'}>{etapa.nome}</span>
                      {etapa.chave === 'agendado' && resultado.data_agendada && (
                        <span className="ml-auto text-sm text-slate-500">{formatarData(resultado.data_agendada)}</span>
                      )}
                      {etapa.chave === 'agendado' && !resultado.data_agendada && resultado.data_desejada && (
                        <span className="ml-auto text-right text-xs text-slate-400">
                          Data sugerida: {formatarData(resultado.data_desejada)}
                          {resultado.periodo_desejado ? ` · ${PERIODOS[resultado.periodo_desejado]}` : ''}
                        </span>
                      )}
                      {etapa.chave === 'concluido' && resultado.concluido_em && (
                        <span className="ml-auto text-sm text-slate-500">{formatarData(resultado.concluido_em)}</span>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}

            <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
              Aberto em {formatarData(resultado.criado_em, true)}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
