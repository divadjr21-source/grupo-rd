'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Printer, Leaf } from 'lucide-react'
import Carregando from '@/components/Carregando'
import { supabase } from '@/lib/supabase'
import { formatarMoeda, formatarData, valorPorExtenso } from '@/lib/constantes'

// Recibo de pagamento (imprimir ou salvar em PDF)
export default function Recibo() {
  const { id } = useParams()
  const [dados, setDados] = useState(null)
  const [empresa, setEmpresa] = useState(null)

  useEffect(() => {
    supabase.from('cobrancas').select('*').eq('id', id).maybeSingle().then(({ data }) => setDados(data || false))
    supabase.from('empresa').select('*').eq('id', 1).maybeSingle().then(({ data }) => setEmpresa(data || {}))
  }, [id])

  if (dados === null || empresa === null) return <Carregando />
  if (!dados) return <p className="text-slate-500">Cobrança não encontrada.</p>
  if (dados.status !== 'pago') return <p className="text-slate-500">O recibo fica disponível depois de registrar o recebimento.</p>

  const numero = dados.id.slice(0, 8).toUpperCase()
  const local = empresa.cidade ? empresa.cidade.split(/[-–]/)[0].trim() : ''

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex justify-end print:hidden">
        <button onClick={() => window.print()} className="btn-primario"><Printer size={16} /> Imprimir / Salvar PDF</button>
      </div>

      <div className="rounded-2xl bg-white p-8 ring-1 ring-slate-200 print:p-0 print:ring-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-marca-600 text-white"><Leaf size={22} /></div>
            <div>
              <div className="text-lg font-semibold text-slate-900">{empresa.nome || 'Grupo RD'}</div>
              <div className="text-xs text-slate-500">
                {[empresa.cnpj && `CNPJ ${empresa.cnpj}`, empresa.endereco, empresa.cidade].filter(Boolean).join(' · ')}
              </div>
              <div className="text-xs text-slate-500">{[empresa.whatsapp && `WhatsApp ${empresa.whatsapp}`, empresa.email].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-400">Recibo nº {numero}</div>
            <div className="mt-1 rounded-lg bg-marca-50 px-3 py-1.5 text-xl font-semibold text-marca-800">{formatarMoeda(dados.valor)}</div>
          </div>
        </div>

        <h1 className="mt-6 text-center text-xl font-semibold tracking-wide text-slate-900">RECIBO</h1>

        <p className="mt-6 text-justify leading-relaxed text-slate-700">
          Recebemos de <strong>{dados.cliente_nome}</strong> a importância de <strong>{formatarMoeda(dados.valor)}</strong>{' '}
          (<em>{valorPorExtenso(dados.valor)}</em>), referente a <strong>{dados.descricao}</strong>
          {dados.forma_pagamento ? <>, pago via <strong>{dados.forma_pagamento}</strong></> : null}
          {' '}em {formatarData(dados.pago_em)}.
        </p>
        <p className="mt-3 leading-relaxed text-slate-700">Para clareza, firmamos o presente recibo, dando plena quitação do valor acima.</p>
        {dados.observacoes && <p className="mt-3 text-sm text-slate-500">Obs.: {dados.observacoes}</p>}

        <p className="mt-10 text-right text-slate-700">
          {local ? `${local}, ` : ''}{new Date(dados.pago_em + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>

        <div className="mx-auto mt-16 w-72 border-t border-slate-400 pt-2 text-center text-sm text-slate-700">
          {empresa.nome || 'Grupo RD'}
          {empresa.cnpj && <div className="text-xs text-slate-500">CNPJ {empresa.cnpj}</div>}
        </div>
      </div>
    </div>
  )
}
