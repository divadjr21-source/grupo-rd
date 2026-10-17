import Link from 'next/link'
import { Sparkles, Trees, ClipboardList, Send, ShieldCheck } from 'lucide-react'
import CabecalhoPublico from '@/components/CabecalhoPublico'

export default function Inicio() {
  return (
    <div className="min-h-screen bg-white">
      <CabecalhoPublico />

      <main className="mx-auto max-w-5xl px-4">
        <section className="pb-12 pt-14 text-center sm:pt-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-marca-50 px-3 py-1 text-xs font-medium text-marca-700 ring-1 ring-inset ring-marca-200">
            Residências, condomínios e empresas
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Limpeza e jardinagem sem complicação.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
            Solicite um serviço em poucos minutos e acompanhe o andamento pelo número de protocolo.
          </p>

          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <Link href="/chamado" className="btn-primario flex-1 py-3 text-base">
              <Send size={18} /> Solicitar serviço
            </Link>
            <Link href="/acompanhar" className="btn-secundario flex-1 py-3 text-base">
              <ClipboardList size={18} /> Acompanhar pedido
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2">
          <div className="card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Sparkles size={20} />
            </div>
            <h2 className="mt-4 font-semibold text-slate-900">Limpeza</h2>
            <p className="mt-1 text-sm text-slate-500">
              Casas e apartamentos, áreas comuns de condomínios, escritórios, vidros e limpeza pós-obra.
            </p>
          </div>
          <div className="card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-marca-50 text-marca-600">
              <Trees size={20} />
            </div>
            <h2 className="mt-4 font-semibold text-slate-900">Jardinagem</h2>
            <p className="mt-1 text-sm text-slate-500">
              Jardins de casas, condomínios e empresas: poda, roçagem, manutenção e paisagismo.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <span className="inline-flex items-center gap-1"><ShieldCheck size={13} /> Seus dados são usados apenas para o atendimento.</span>
        <div className="mt-1">© {new Date().getFullYear()} Grupo RD</div>
      </footer>
    </div>
  )
}
