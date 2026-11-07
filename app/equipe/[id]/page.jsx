'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Phone, Play, CheckCircle2, Loader2, CalendarDays, Info } from 'lucide-react'
import Carregando from '@/components/Carregando'
import StatusBadge from '@/components/StatusBadge'
import { Galeria, SeletorArquivos } from '@/components/Arquivos'
import { supabase } from '@/lib/supabase'
import { enviarArquivos } from '@/lib/upload'
import { SERVICOS, PERIODOS_AGENDA, formatarData, linkMapa } from '@/lib/constantes'

export default function ServicoDetalhe() {
  const { id } = useParams()
  const [chamado, setChamado] = useState(null)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [relatorio, setRelatorio] = useState('')
  const [arquivos, setArquivos] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar() {
    const { data } = await supabase.from('chamados').select('*').eq('id', id).single()
    if (!data) return setNaoEncontrado(true)
    setChamado(data)
    setRelatorio(data.relatorio_equipe || '')
  }
  useEffect(() => { carregar() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (naoEncontrado) return <p className="text-slate-500">Serviço não encontrado ou não atribuído a você.</p>
  if (!chamado) return <Carregando />

  async function atualizar(status) {
    if (status === 'concluido' && !relatorio.trim() && arquivos.length === 0) {
      setErro('Escreva um resumo ou anexe ao menos uma foto antes de concluir.')
      return
    }
    if (status === 'concluido' && !confirm('Confirmar a conclusão deste serviço?')) return
    setErro('')
    setEnviando(true)
    try {
      const fotos = arquivos.length ? await enviarArquivos(arquivos, `servicos/${chamado.id}`) : []
      const { error } = await supabase.rpc('atualizar_servico', {
        p_id: chamado.id, p_status: status, p_relatorio: relatorio, p_fotos: fotos,
      })
      if (error) throw new Error(error.message)
      if (status === 'concluido') {
        const { data: { session } } = await supabase.auth.getSession()
        fetch('/api/notificar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ tipo: 'concluido', chamado_id: chamado.id }),
        }).catch(() => {})
      }
      setArquivos([])
      await carregar()
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar.')
    } finally {
      setEnviando(false)
    }
  }

  const finalizado = ['concluido', 'cancelado'].includes(chamado.status)

  return (
    <div className="space-y-4">
      <Link href="/equipe" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Meus serviços
      </Link>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-400">#{chamado.protocolo} · {SERVICOS[chamado.servico]}</div>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">{chamado.nome_solicitante}</h1>
          </div>
          <StatusBadge status={chamado.status} />
        </div>

        <div className="mt-4 space-y-2.5 text-sm">
          {chamado.data_agendada && (
            <div className="flex items-center gap-2 text-slate-700"><CalendarDays size={16} className="text-slate-400" /> {formatarData(chamado.data_agendada)}{chamado.periodo_agendado ? ` · ${PERIODOS_AGENDA[chamado.periodo_agendado]}` : ''}</div>
          )}
          <a href={linkMapa(chamado.endereco)} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-marca-700 underline-offset-2 hover:underline">
            <MapPin size={16} className="mt-0.5 shrink-0" /> {chamado.endereco}
          </a>
          <a href={`tel:${chamado.telefone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-marca-700 underline-offset-2 hover:underline">
            <Phone size={16} /> {chamado.telefone}
          </a>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900">O que fazer</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{chamado.descricao}</p>
        {chamado.observacoes_admin && (
          <div className="mt-4 flex gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">
            <Info size={16} className="mt-0.5 shrink-0" />
            <p className="whitespace-pre-wrap">{chamado.observacoes_admin}</p>
          </div>
        )}
        {chamado.fotos?.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-semibold text-slate-900">Fotos enviadas pelo cliente</h3>
            <div className="mt-2"><Galeria links={chamado.fotos} /></div>
          </>
        )}
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Registro do serviço</h2>

        {chamado.fotos_conclusao?.length > 0 && <Galeria links={chamado.fotos_conclusao} />}

        {finalizado ? (
          <>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{chamado.relatorio_equipe || 'Sem observações.'}</p>
            {chamado.concluido_em && (
              <p className="flex items-center gap-1.5 text-sm text-marca-700">
                <CheckCircle2 size={16} /> Concluído em {formatarData(chamado.concluido_em, true)}
              </p>
            )}
          </>
        ) : (
          <>
            <div>
              <label className="label">Resumo do que foi feito</label>
              <textarea className="input min-h-[100px]" value={relatorio} onChange={(e) => setRelatorio(e.target.value)}
                placeholder="Ex.: Limpeza das áreas comuns e garagem. Faltou produto para vidros." />
            </div>
            <div>
              <span className="label">Fotos do serviço (antes/depois)</span>
              <SeletorArquivos arquivos={arquivos} onChange={setArquivos} texto="Tirar ou anexar fotos" />
            </div>
            {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {chamado.status !== 'em_andamento' ? (
                <button onClick={() => atualizar('em_andamento')} disabled={enviando} className="btn-secundario py-3">
                  {enviando ? <Loader2 size={17} className="animate-spin" /> : <Play size={17} />} Iniciar serviço
                </button>
              ) : (
                <button onClick={() => atualizar('em_andamento')} disabled={enviando} className="btn-secundario py-3">
                  {enviando ? <Loader2 size={17} className="animate-spin" /> : null} Salvar andamento
                </button>
              )}
              <button onClick={() => atualizar('concluido')} disabled={enviando} className="btn-primario py-3">
                {enviando ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} Concluir serviço
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
