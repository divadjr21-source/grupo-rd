import Link from 'next/link'
import { Sparkles, Trees, Hammer, ClipboardList, Send, BadgeCheck, Clock, Users } from 'lucide-react'
import CabecalhoPublico from '@/components/CabecalhoPublico'
import RodapeEmpresa from '@/components/RodapeEmpresa'
import { IMAGENS } from '@/lib/imagens'

const SERVICOS = [
  {
    nome: 'Limpeza',
    texto: 'Casas e apartamentos, áreas comuns de condomínios, escritórios, vidros e limpeza pós-obra.',
    icone: Sparkles,
    foto: IMAGENS.limpeza,
  },
  {
    nome: 'Jardinagem',
    texto: 'Jardins de casas, condomínios e empresas: poda, roçagem, manutenção e paisagismo.',
    icone: Trees,
    foto: IMAGENS.jardinagem,
  },
  {
    nome: 'Reforma geral',
    texto: 'Pintura, pisos e revestimentos, elétrica, hidráulica, gesso e pequenos reparos.',
    icone: Hammer,
    foto: IMAGENS.reforma,
  },
]

export default function Inicio() {
  return (
    <div className="min-h-screen bg-white">
      <CabecalhoPublico />

      {/* Capa com foto */}
      <section className="relative isolate overflow-hidden bg-slate-900">
        <img src={IMAGENS.capa} alt="" className="absolute inset-0 -z-10 h-full w-full -scale-x-100 object-cover object-[30%_center]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-slate-900/30" />
        <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/25 backdrop-blur">
            Residências, condomínios e empresas
          </span>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Limpeza, jardinagem e reforma com padrão profissional.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-slate-200">
            Equipe treinada e uniformizada. Solicite em poucos minutos e acompanhe pelo número de protocolo.
          </p>
          <div className="mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <Link href="/chamado" className="btn-primario flex-1 py-3 text-base shadow-lg shadow-marca-900/30">
              <Send size={18} /> Solicitar serviço
            </Link>
            <Link href="/acompanhar" className="btn flex-1 border border-white/40 bg-white/10 py-3 text-base text-white backdrop-blur hover:bg-white/20">
              <ClipboardList size={18} /> Acompanhar pedido
            </Link>
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6 text-sm text-slate-600 sm:grid-cols-3">
          <div className="flex items-center gap-2.5"><BadgeCheck size={18} className="text-marca-600" /> Profissionais treinados</div>
          <div className="flex items-center gap-2.5"><Clock size={18} className="text-marca-600" /> Pontualidade no agendamento</div>
          <div className="flex items-center gap-2.5"><Users size={18} className="text-marca-600" /> Equipes para cada tipo de serviço</div>
        </div>
      </section>

      {/* Serviços */}
      <main className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Nossos serviços</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {SERVICOS.map(({ nome, texto, icone: Icone, foto }) => (
            <Link key={nome} href="/chamado" className="card group overflow-hidden transition hover:shadow-lg">
              <div className="relative h-44 overflow-hidden bg-slate-100">
                <img src={foto} alt={nome} loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-marca-700 shadow">
                  <Icone size={18} />
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-slate-900">{nome}</h3>
                <p className="mt-1 text-sm text-slate-500">{texto}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <RodapeEmpresa />
    </div>
  )
}
