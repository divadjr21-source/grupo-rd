'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Phone, CheckCircle2, Loader2, CalendarDays, Info, LogIn, Camera, ListChecks,
  PenLine, Plus, Check, Clock, FileText,
} from 'lucide-react'
import Carregando from '@/components/Carregando'
import StatusBadge from '@/components/StatusBadge'
import Assinatura from '@/components/Assinatura'
import { Galeria, SeletorArquivos } from '@/components/Arquivos'
import { supabase } from '@/lib/supabase'
import { enviarArquivos } from '@/lib/upload'
import { checklistPadrao } from '@/lib/checklists'
import { SERVICOS, PERIODOS_AGENDA, formatarData, linkMapa } from '@/lib/constantes'

// Pega a localização do celular (se a pessoa permitir). Não trava se negar.
function pegarLocal() {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok({})
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ p_lat: p.coords.latitude, p_lng: p.coords.longitude, p_precisao: Math.round(p.coords.accuracy) }),
      () => ok({}),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    )
  })
}

function hora(iso) {
  return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
}

function Etapa({ numero, titulo, icone: Icone, feito, children }) {
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${feito ? 'bg-marca-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
          {feito ? <Check size={14} /> : numero}
        </span>
        <Icone size={16} className="text-slate-400" /> {titulo}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function ServicoDetalhe() {
  const { id } = useParams()
  const [chamado, setChamado] = useState(null)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [checklist, setChecklist] = useState([])
  const [novoItem, setNovoItem] = useState('')
  const [relatorio, setRelatorio] = useState('')
  const [antes, setAntes] = useState([])
  const [depois, setDepois] = useState([])
  const [responsavel, setResponsavel] = useState('')
  const [semAssinatura, setSemAssinatura] = useState(false)
  const [ocupado, setOcupado] = useState('') // 'chegada' | 'antes' | 'depois' | 'concluir'
  const [erro, setErro] = useState('')
  const assinatura = useRef(null)
  const timer = useRef(null)

  async function carregar() {
    const { data } = await supabase.from('chamados').select('*').eq('id', id).single()
    if (!data) return setNaoEncontrado(true)
    setChamado(data)
    setRelatorio(data.relatorio_equipe || '')
    setChecklist(data.checklist?.length ? data.checklist : checklistPadrao(data.servico))
    setResponsavel(data.assinatura_nome || '')
  }
  useEffect(() => { carregar() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (naoEncontrado) return <p className="text-slate-500">Serviço não encontrado ou não atribuído a você.</p>
  if (!chamado) return <Carregando />

  const finalizado = ['concluido', 'cancelado'].includes(chamado.status)
  const chegou = !!chamado.checkin_em
  const feitos = checklist.filter((i) => i.feito).length

  async function chegada() {
    setErro('')
    setOcupado('chegada')
    const local = await pegarLocal()
    const { error } = await supabase.rpc('registrar_chegada', { p_id: id, ...local })
    setOcupado('')
    if (error) return setErro(error.message)
    carregar()
  }

  // Salva o checklist automaticamente (1 segundo depois da última mudança)
  function mudarChecklist(nova) {
    setChecklist(nova)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      supabase.rpc('salvar_relatorio', { p_id: id, p_checklist: nova })
    }, 1000)
  }

  async function enviarFotos(tipo) {
    const lista = tipo === 'antes' ? antes : depois
    if (!lista.length) return
    setErro('')
    setOcupado(tipo)
    try {
      const links = await enviarArquivos(lista, `servicos/${id}/${tipo}`)
      const { error } = await supabase.rpc('salvar_relatorio', {
        p_id: id, p_fotos_antes: tipo === 'antes' ? links : [], p_fotos_depois: tipo === 'depois' ? links : [],
      })
      if (error) throw error
      tipo === 'antes' ? setAntes([]) : setDepois([])
      await carregar()
    } catch (e) {
      setErro(e.message || 'Não foi possível enviar as fotos.')
    } finally {
      setOcupado('')
    }
  }

  async function concluir() {
    setErro('')
    const pendentes = checklist.length - feitos
    const temAssinatura = assinatura.current && !assinatura.current.vazio()
    if (!temAssinatura && !semAssinatura) return setErro('Peça a assinatura do responsável ou marque "Responsável não estava no local".')
    if (temAssinatura && !responsavel.trim()) return setErro('Informe o nome de quem assinou.')
    if (!relatorio.trim() && !chamado.fotos_conclusao?.length && !depois.length) return setErro('Escreva um resumo ou envie ao menos uma foto de depois.')
    if (!confirm(`Concluir o serviço?${pendentes ? `\n\nAtenção: ${pendentes} item(ns) do checklist não foram marcados.` : ''}`)) return

    setOcupado('concluir')
    try {
      const fotosDepois = depois.length ? await enviarArquivos(depois, `servicos/${id}/depois`) : []
      let urlAssinatura = null
      if (temAssinatura) {
        const arq = await assinatura.current.arquivo()
        if (arq) [urlAssinatura] = await enviarArquivos([arq], `servicos/${id}/assinatura`)
      }
      const local = await pegarLocal()
      const { error } = await supabase.rpc('concluir_servico', {
        p_id: id, p_checklist: checklist, p_relatorio: relatorio, p_fotos_depois: fotosDepois,
        p_assinatura_url: urlAssinatura, p_assinatura_nome: temAssinatura ? responsavel : null, ...local,
      })
      if (error) throw error
      // Avisa o admin no celular
      const { data: { session } } = await supabase.auth.getSession()
      fetch('/api/notificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ tipo: 'concluido', chamado_id: id }),
      }).catch(() => {})
      setDepois([])
      await carregar()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setErro(e.message || 'Não foi possível concluir.')
    } finally {
      setOcupado('')
    }
  }

  return (
    <div className="space-y-4 pb-10">
      <Link href="/equipe" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Meus serviços
      </Link>

      {/* Dados do serviço */}
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
          {chamado.telefone && (
            <a href={`tel:${chamado.telefone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-marca-700 underline-offset-2 hover:underline">
              <Phone size={16} /> {chamado.telefone}
            </a>
          )}
        </div>
        <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-4 text-sm text-slate-600">{chamado.descricao}</p>
        {chamado.observacoes_admin && (
          <div className="mt-3 flex gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">
            <Info size={16} className="mt-0.5 shrink-0" /><p className="whitespace-pre-wrap">{chamado.observacoes_admin}</p>
          </div>
        )}
        {chamado.fotos?.length > 0 && <div className="mt-3"><Galeria links={chamado.fotos} /></div>}
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      {/* Serviço concluído */}
      {finalizado && (
        <div className="card space-y-3 p-5">
          <p className="flex items-center gap-2 font-semibold text-marca-700"><CheckCircle2 size={18} /> Serviço concluído</p>
          <p className="flex items-center gap-1.5 text-sm text-slate-600">
            <Clock size={14} /> Chegada {hora(chamado.checkin_em)} · Saída {hora(chamado.checkout_em)} · {formatarData(chamado.concluido_em)}
          </p>
          {chamado.relatorio_equipe && <p className="whitespace-pre-wrap text-sm text-slate-600">{chamado.relatorio_equipe}</p>}
          {chamado.fotos_conclusao?.length > 0 && <Galeria links={chamado.fotos_conclusao} />}
          {chamado.relatorio_token && (
            <a href={`/relatorio/${chamado.relatorio_token}`} target="_blank" rel="noreferrer" className="btn-secundario w-full">
              <FileText size={16} /> Ver relatório do serviço
            </a>
          )}
        </div>
      )}

      {/* 1. Chegada */}
      {!finalizado && (
        <Etapa numero={1} titulo="Chegada ao local" icone={LogIn} feito={chegou}>
          {chegou ? (
            <p className="text-sm text-slate-600">Chegada registrada às <strong>{hora(chamado.checkin_em)}</strong>{chamado.checkin_local ? ' com a localização.' : '.'}</p>
          ) : (
            <>
              <button onClick={chegada} disabled={!!ocupado} className="btn-primario w-full py-4 text-base">
                {ocupado === 'chegada' ? <Loader2 size={19} className="animate-spin" /> : <LogIn size={19} />} Cheguei no local
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">Registra o horário e a localização (se você permitir).</p>
            </>
          )}
        </Etapa>
      )}

      {!finalizado && chegou && (
        <>
          {/* 2. Fotos de antes */}
          <Etapa numero={2} titulo="Fotos de antes" icone={Camera} feito={chamado.fotos_antes?.length > 0}>
            {chamado.fotos_antes?.length > 0 && <div className="mb-3"><Galeria links={chamado.fotos_antes} /></div>}
            <SeletorArquivos arquivos={antes} onChange={setAntes} texto="Tirar fotos de como estava" />
            {antes.length > 0 && (
              <button onClick={() => enviarFotos('antes')} disabled={!!ocupado} className="btn-secundario mt-3 w-full">
                {ocupado === 'antes' && <Loader2 size={16} className="animate-spin" />} Enviar {antes.length} foto(s)
              </button>
            )}
          </Etapa>

          {/* 3. Checklist */}
          <Etapa numero={3} titulo={`Checklist (${feitos}/${checklist.length})`} icone={ListChecks} feito={checklist.length > 0 && feitos === checklist.length}>
            <div className="space-y-1.5">
              {checklist.map((it, i) => (
                <button key={i} type="button"
                  onClick={() => mudarChecklist(checklist.map((x, j) => (j === i ? { ...x, feito: !x.feito } : x)))}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
                    it.feito ? 'border-marca-200 bg-marca-50 text-marca-900' : 'border-slate-200 text-slate-700'}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${it.feito ? 'border-marca-600 bg-marca-600 text-white' : 'border-slate-300'}`}>
                    {it.feito && <Check size={15} />}
                  </span>
                  {it.item}
                </button>
              ))}
            </div>
            <form className="mt-2 flex gap-2" onSubmit={(e) => {
              e.preventDefault()
              if (!novoItem.trim()) return
              mudarChecklist([...checklist, { item: novoItem.trim(), feito: true }])
              setNovoItem('')
            }}>
              <input className="input py-2 text-sm" placeholder="Outro item feito…" value={novoItem} onChange={(e) => setNovoItem(e.target.value)} />
              <button className="btn-secundario px-3" aria-label="Adicionar item"><Plus size={16} /></button>
            </form>
          </Etapa>

          {/* 4. Fotos de depois e resumo */}
          <Etapa numero={4} titulo="Fotos de depois e resumo" icone={Camera} feito={chamado.fotos_conclusao?.length > 0}>
            {chamado.fotos_conclusao?.length > 0 && <div className="mb-3"><Galeria links={chamado.fotos_conclusao} /></div>}
            <SeletorArquivos arquivos={depois} onChange={setDepois} texto="Tirar fotos do serviço pronto" />
            {depois.length > 0 && (
              <button onClick={() => enviarFotos('depois')} disabled={!!ocupado} className="btn-secundario mt-3 w-full">
                {ocupado === 'depois' && <Loader2 size={16} className="animate-spin" />} Enviar {depois.length} foto(s)
              </button>
            )}
            <label className="label mt-4">Resumo / observações</label>
            <textarea className="input min-h-[90px]" value={relatorio} onChange={(e) => setRelatorio(e.target.value)}
              onBlur={() => relatorio.trim() && supabase.rpc('salvar_relatorio', { p_id: id, p_relatorio: relatorio })}
              placeholder="Ex.: Serviço feito conforme combinado. Uma lâmpada da garagem está queimada." />
          </Etapa>

          {/* 5. Assinatura e conclusão */}
          <Etapa numero={5} titulo="Assinatura do responsável" icone={PenLine} feito={false}>
            {!semAssinatura && (
              <>
                <label className="label">Nome de quem assina</label>
                <input className="input mb-3" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Ex.: João (síndico) / Maria (moradora)" />
                <Assinatura ref={assinatura} />
              </>
            )}
            <label className="mt-3 flex items-center gap-2.5 text-sm text-slate-600">
              <input type="checkbox" className="h-4 w-4 accent-marca-600" checked={semAssinatura} onChange={(e) => setSemAssinatura(e.target.checked)} />
              Responsável não estava no local
            </label>

            <button onClick={concluir} disabled={!!ocupado} className="btn-primario mt-5 w-full py-4 text-base">
              {ocupado === 'concluir' ? <Loader2 size={19} className="animate-spin" /> : <CheckCircle2 size={19} />} Concluir serviço
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">Registra a saída e gera o relatório do serviço com fotos e assinatura.</p>
          </Etapa>
        </>
      )}
    </div>
  )
}
