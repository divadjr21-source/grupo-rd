'use client'

import { useEffect, useState } from 'react'
import { UserPlus, UserRound, ShieldCheck, KeyRound, Power, Trash2, Pencil, X, Loader2, Phone } from 'lucide-react'
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
  if (!r.ok) throw new Error(json.erro || 'Não foi possível salvar.')
}

const NOVO = { nome: '', email: '', telefone: '', senha: '', papel: 'funcionario' }

function Janela({ titulo, onFechar, children }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
          <button type="button" onClick={onFechar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Selo({ children, cor }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cor}`}>{children}</span>
}

export default function Usuarios() {
  const [pessoas, setPessoas] = useState(null)
  const [meuId, setMeuId] = useState(null)
  const [janela, setJanela] = useState(null) // { tipo: 'novo'|'editar'|'senha', dados }
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  async function carregar() {
    const { data } = await supabase.from('perfis').select('*').order('papel').order('nome')
    setPessoas(data || [])
  }
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMeuId(data.session?.user.id))
    carregar()
  }, [])

  function abrir(tipo, dados) {
    setErro('')
    setJanela({ tipo, dados: { ...dados, senha: '' } })
  }

  function mostrarAviso(texto) {
    setAviso(texto)
    setTimeout(() => setAviso(''), 3000)
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    const d = janela.dados
    try {
      if (janela.tipo === 'novo') {
        await chamarApi('POST', d)
        mostrarAviso(`${d.nome} cadastrado. Envie o e-mail e a senha para ele entrar.`)
      } else if (janela.tipo === 'editar') {
        await chamarApi('PATCH', { id: d.id, nome: d.nome, telefone: d.telefone, papel: d.papel })
        mostrarAviso('Dados atualizados.')
      } else {
        await chamarApi('PATCH', { id: d.id, senha: d.senha })
        mostrarAviso(`Senha de ${d.nome} redefinida.`)
      }
      setJanela(null)
      carregar()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtivo(p) {
    const acao = p.ativo ? 'desativar' : 'ativar'
    if (!confirm(`Deseja ${acao} o acesso de ${p.nome}?`)) return
    try {
      await chamarApi('PATCH', { id: p.id, ativo: !p.ativo })
      carregar()
    } catch (err) {
      alert(err.message)
    }
  }

  async function excluir(p) {
    if (!confirm(`Excluir ${p.nome}? O login será apagado e não poderá ser recuperado. Os chamados antigos continuam salvos.`)) return
    try {
      await chamarApi('DELETE', { id: p.id })
      mostrarAviso(`${p.nome} excluído.`)
      carregar()
    } catch (err) {
      alert(err.message)
    }
  }

  const alterar = (campo) => (e) =>
    setJanela({ ...janela, dados: { ...janela.dados, [campo]: campo === 'telefone' ? mascaraTelefone(e.target.value) : e.target.value } })

  const d = janela?.dados

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Usuários</h1>
          <p className="text-sm text-slate-500">Cadastre a equipe com acesso limitado e os administradores com acesso total.</p>
        </div>
        <button onClick={() => abrir('novo', NOVO)} className="btn-primario"><UserPlus size={17} /> Cadastrar usuário</button>
      </div>

      {aviso && <p className="mt-4 rounded-xl bg-marca-50 px-4 py-2.5 text-sm text-marca-800 ring-1 ring-marca-200">{aviso}</p>}

      <div className="mt-6 space-y-3">
        {!pessoas ? <Carregando /> : pessoas.map((p) => {
          const admin = p.papel === 'admin'
          const souEu = p.id === meuId
          return (
            <div key={p.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  admin ? 'bg-amber-50 text-amber-600' : 'bg-marca-50 text-marca-600'}`}>
                  {admin ? <ShieldCheck size={20} /> : <UserRound size={20} />}
                </div>
                <div className="min-w-0">
                  <div className={`truncate font-semibold ${p.ativo ? 'text-slate-900' : 'text-slate-400'}`}>
                    {p.nome}{souEu && <span className="ml-1.5 text-xs font-normal text-slate-400">(você)</span>}
                  </div>
                  <div className="truncate text-sm text-slate-500">{p.email || '—'}</div>
                  {p.telefone && <div className="flex items-center gap-1 text-xs text-slate-400"><Phone size={11} /> {p.telefone}</div>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {admin
                  ? <Selo cor="bg-amber-50 text-amber-700 ring-amber-200">Admin</Selo>
                  : <Selo cor="bg-slate-100 text-slate-600 ring-slate-200">Funcionário</Selo>}
                {p.ativo
                  ? <Selo cor="bg-marca-50 text-marca-700 ring-marca-200">Ativo</Selo>
                  : <Selo cor="bg-red-50 text-red-600 ring-red-200">Inativo</Selo>}

                <button onClick={() => abrir('editar', p)} className="btn-secundario px-3 py-1.5"><Pencil size={14} /> Editar</button>
                <button onClick={() => abrir('senha', p)} className="btn-secundario px-3 py-1.5"><KeyRound size={14} /> Redefinir senha</button>
                {!souEu && (
                  <>
                    <button onClick={() => alternarAtivo(p)} className="btn-secundario px-3 py-1.5">
                      <Power size={14} /> {p.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => excluir(p)} className="btn-perigo px-3 py-1.5"><Trash2 size={14} /> Excluir</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-center gap-2 font-medium text-slate-900"><UserRound size={16} className="text-marca-600" /> Funcionário</div>
          <p className="mt-1 text-slate-500">Vê só os serviços em que foi colocado na equipe. Pode iniciar, concluir e enviar fotos.</p>
        </div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-center gap-2 font-medium text-slate-900"><ShieldCheck size={16} className="text-amber-600" /> Admin</div>
          <p className="mt-1 text-slate-500">Acesso total: chamados, clientes, usuários e dados da empresa.</p>
        </div>
      </div>

      {janela && (
        <Janela
          titulo={janela.tipo === 'novo' ? 'Cadastrar usuário' : janela.tipo === 'editar' ? `Editar ${d.nome}` : `Redefinir senha — ${d.nome}`}
          onFechar={() => setJanela(null)}
        >
          <form onSubmit={salvar} className="space-y-4">
            {janela.tipo !== 'senha' && (
              <>
                <div>
                  <label className="label">Nome</label>
                  <input className="input" required value={d.nome} onChange={alterar('nome')} />
                </div>
                <div>
                  <label className="label">E-mail (login)</label>
                  <input type="email" className="input disabled:bg-slate-50 disabled:text-slate-500" required
                    disabled={janela.tipo === 'editar'} value={d.email || ''} onChange={alterar('email')} />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input className="input" inputMode="tel" value={d.telefone || ''} onChange={alterar('telefone')} />
                </div>
                {!(janela.tipo === 'editar' && d.id === meuId) && (
                  <div>
                    <span className="label">Tipo de acesso</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[['funcionario', 'Funcionário', 'Acesso limitado', UserRound], ['admin', 'Admin', 'Acesso total', ShieldCheck]].map(([valor, nome, desc, Icone]) => (
                        <button key={valor} type="button" onClick={() => setJanela({ ...janela, dados: { ...d, papel: valor } })}
                          className={`rounded-xl border p-3 text-left transition ${
                            d.papel === valor ? 'border-marca-500 bg-marca-50 ring-2 ring-marca-100' : 'border-slate-200 hover:border-slate-300'}`}>
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Icone size={15} /> {nome}</div>
                          <div className="text-xs text-slate-500">{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {janela.tipo !== 'editar' && (
              <div>
                <label className="label">{janela.tipo === 'novo' ? 'Senha inicial' : 'Nova senha'}</label>
                <input type="text" className="input" required minLength={6} autoComplete="new-password"
                  value={d.senha} onChange={alterar('senha')} placeholder="Mínimo de 6 caracteres" />
                <p className="mt-1 text-xs text-slate-400">Anote e envie para a pessoa. Ela entra pela "Área da Equipe".</p>
              </div>
            )}

            {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <button className="btn-primario w-full py-3" disabled={salvando}>
              {salvando && <Loader2 size={17} className="animate-spin" />}
              {janela.tipo === 'novo' ? 'Cadastrar' : janela.tipo === 'editar' ? 'Salvar' : 'Redefinir senha'}
            </button>
          </form>
        </Janela>
      )}
    </div>
  )
}
