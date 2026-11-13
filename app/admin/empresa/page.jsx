'use client'

import { useEffect, useState } from 'react'
import { Building, Save, Loader2, Check, Download, DatabaseBackup } from 'lucide-react'
import { baixarBackup } from '@/lib/backup'
import Carregando from '@/components/Carregando'
import { supabase } from '@/lib/supabase'

function mascaraCnpj(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function Empresa() {
  const [form, setForm] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [status, setStatus] = useState('')
  const [backup, setBackup] = useState('') // texto de progresso / resultado
  const [gerando, setGerando] = useState(false)

  async function fazerBackup() {
    setGerando(true)
    setBackup('Preparando…')
    try {
      const r = await baixarBackup(setBackup)
      setBackup(`Pronto! Baixado com ${r.clientes} clientes, ${r.chamados} chamados, ${r.orcamentos} orçamentos, ${r.contratos} contratos e ${r.cobrancas} cobranças.`)
    } catch (e) {
      setBackup('erro:Não foi possível gerar o backup: ' + e.message)
    } finally {
      setGerando(false)
    }
  }

  useEffect(() => {
    supabase.from('empresa').select('*').eq('id', 1).maybeSingle().then(({ data, error }) => {
      if (error) setStatus('erro:' + 'A tabela da empresa ainda não foi criada no banco. Rode o comando SQL da atualização.')
      setForm({ nome: '', whatsapp: '', email: '', endereco: '', cidade: '', cnpj: '', chave_pix: '', ...(data || {}) })
    })
  }, [])

  if (!form) return <Carregando />

  const alterar = (campo) => (e) => {
    let v = e.target.value
    if (campo === 'whatsapp') v = v.replace(/\D/g, '').slice(0, 13)
    if (campo === 'cnpj') v = mascaraCnpj(v)
    setForm({ ...form, [campo]: v })
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setStatus('')
    const { id, atualizado_em, ...dados } = form
    const { error } = await supabase.from('empresa').upsert({ id: 1, ...dados, atualizado_em: new Date().toISOString() })
    setSalvando(false)
    if (error) return setStatus('erro:Não foi possível salvar: ' + error.message)
    setStatus('ok')
    setTimeout(() => setStatus(''), 2500)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-marca-50 text-marca-600"><Building size={21} /></div>
        <div>
          <h1 className="titulo-pagina">Empresa</h1>
          <p className="text-sm text-slate-500">Configure os dados da empresa e o WhatsApp de recebimento</p>
        </div>
      </div>

      <form onSubmit={salvar} className="card mt-6 space-y-5 p-5 sm:p-6">
        <div>
          <label className="label">Nome da empresa</label>
          <input className="input" required value={form.nome || ''} onChange={alterar('nome')} placeholder="Grupo RD" />
        </div>

        <div>
          <label className="label">WhatsApp para recebimento de chamados</label>
          <input className="input" inputMode="tel" value={form.whatsapp || ''} onChange={alterar('whatsapp')} placeholder="5571999999999" />
          <p className="mt-1.5 text-xs text-slate-400">
            Informe com DDI e DDD, exemplo: 5571999999999. Depois de abrir um pedido, o cliente vê um botão para avisar a empresa por esse WhatsApp.
          </p>
        </div>

        <div>
          <label className="label">Chave Pix</label>
          <input className="input" value={form.chave_pix || ''} onChange={alterar('chave_pix')} placeholder="CNPJ, e-mail, telefone ou chave aleatória" />
          <p className="mt-1.5 text-xs text-slate-400">Vai junto na mensagem de cobrança pelo WhatsApp e aparece no recibo.</p>
        </div>

        <div>
          <label className="label">E-mail</label>
          <input type="email" className="input" value={form.email || ''} onChange={alterar('email')} placeholder="contato@grupord.com.br" />
        </div>

        <div>
          <label className="label">Endereço</label>
          <input className="input" value={form.endereco || ''} onChange={alterar('endereco')} placeholder="Rua, número, bairro" />
        </div>

        <div>
          <label className="label">Cidade</label>
          <input className="input" value={form.cidade || ''} onChange={alterar('cidade')} placeholder="Cidade - UF" />
        </div>

        <div>
          <label className="label">CNPJ</label>
          <input className="input" inputMode="numeric" value={form.cnpj || ''} onChange={alterar('cnpj')} placeholder="00.000.000/0000-00" />
          <p className="mt-1.5 text-xs text-slate-400">Aparece no rodapé do site e será usado em recibos e orçamentos.</p>
        </div>

        {status.startsWith('erro:') && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{status.slice(5)}</p>
        )}

        <button className="btn-primario w-full py-3" disabled={salvando}>
          {salvando ? <Loader2 size={17} className="animate-spin" /> : status === 'ok' ? <Check size={17} /> : <Save size={17} />}
          {status === 'ok' ? 'Salvo!' : 'Salvar configurações'}
        </button>
      </form>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900"><DatabaseBackup size={18} className="text-marca-600" /> Backup dos dados</h2>
        <p className="mt-1 text-sm text-slate-500">
          Baixa uma planilha do Excel com abas de clientes, chamados, orçamentos, contratos, financeiro e usuários.
          Faça uma vez por mês e guarde no seu computador ou no Google Drive.
        </p>
        <button onClick={fazerBackup} disabled={gerando} className="btn-primario mt-4">
          {gerando ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />} Baixar backup (Excel)
        </button>
        {backup && (
          <p className={`mt-3 text-sm ${backup.startsWith('erro:') ? 'text-red-700' : 'text-slate-600'}`}>{backup.replace(/^erro:/, '')}</p>
        )}
      </section>
    </div>
  )
}
