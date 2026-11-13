export const SERVICOS = {
  limpeza: 'Limpeza',
  jardinagem: 'Jardinagem',
  reforma: 'Reforma geral',
  seguranca: 'Segurança eletrônica',
  limpeza_e_jardinagem: 'Limpeza e jardinagem',
  outro: 'Outro',
}

export const STATUS = {
  aberto: { label: 'Aberto', cor: 'bg-amber-50 text-amber-700 ring-amber-200' },
  agendado: { label: 'Agendado', cor: 'bg-sky-50 text-sky-700 ring-sky-200' },
  em_andamento: { label: 'Em andamento', cor: 'bg-violet-50 text-violet-700 ring-violet-200' },
  concluido: { label: 'Concluído', cor: 'bg-marca-50 text-marca-700 ring-marca-200' },
  cancelado: { label: 'Cancelado', cor: 'bg-slate-100 text-slate-500 ring-slate-200' },
}

export const PERIODOS = {
  manha: 'Manhã',
  tarde: 'Tarde',
  qualquer: 'Qualquer horário',
}

// Data de hoje no formato AAAA-MM-DD (horário local)
export function hojeISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function formatarData(valor, comHora = false) {
  if (!valor) return '—'
  // Datas "YYYY-MM-DD" são tratadas como data local (sem fuso)
  const data = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(valor + 'T12:00:00') : new Date(valor)
  return data.toLocaleString('pt-BR', comHora
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function linkWhatsApp(telefone, mensagem = '') {
  let numero = (telefone || '').replace(/\D/g, '')
  if (numero.length <= 11) numero = '55' + numero
  return `https://wa.me/${numero}${mensagem ? '?text=' + encodeURIComponent(mensagem) : ''}`
}

export function linkMapa(endereco) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco || '')}`
}

export function mascaraTelefone(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Período do serviço agendado
export const PERIODOS_AGENDA = {
  manha: 'Manhã',
  tarde: 'Tarde',
  integral: 'Dia todo',
}

// Dois períodos no mesmo dia se sobrepõem? (sem período = dia todo)
export function periodosConflitam(a, b) {
  if (!a || !b || a === 'integral' || b === 'integral') return true
  return a === b
}

export function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Data AAAA-MM-DD somando dias
export function somarDias(iso, dias) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

// ---- Contratos ----
export const FREQUENCIAS = {
  semanal: 'Toda semana',
  quinzenal: 'A cada 15 dias',
  mensal: 'Uma vez por mês',
}
export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function juntar(lista) {
  if (lista.length <= 1) return lista.join('')
  return lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1]
}

// Ex.: "Seg, Qua e Sex · Manhã" / "Todo dia 15 · Tarde"
export function descreverAgenda(c) {
  let quando
  if (c.frequencia === 'mensal') quando = c.dia_mes ? `Todo dia ${c.dia_mes}` : 'Mensal'
  else {
    const dias = [...(c.dias_semana || [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DIAS_SEMANA[d])
    quando = (dias.length ? juntar(dias) : 'Sem dias') + (c.frequencia === 'quinzenal' ? ' (quinzenal)' : '')
  }
  return c.periodo_agendado ? `${quando} · ${PERIODOS_AGENDA[c.periodo_agendado]}` : quando
}

// ---- Financeiro ----
export const FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Transferência', 'Cartão', 'Boleto']

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze',
  'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function ate999(n) {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  const c = Math.floor(n / 100), r = n % 100, partes = []
  if (c) partes.push(CENTENAS[c])
  if (r) partes.push(r < 20 ? UNIDADES[r] : DEZENAS[Math.floor(r / 10)] + (r % 10 ? ' e ' + UNIDADES[r % 10] : ''))
  return partes.join(' e ')
}

function inteiroPorExtenso(n) {
  if (n === 0) return 'zero'
  const milhoes = Math.floor(n / 1e6), milhares = Math.floor((n % 1e6) / 1000), resto = n % 1000
  const partes = []
  if (milhoes) partes.push(milhoes === 1 ? 'um milhão' : ate999(milhoes) + ' milhões')
  if (milhares) partes.push(milhares === 1 ? 'mil' : ate999(milhares) + ' mil')
  if (resto) partes.push(ate999(resto))
  if (partes.length > 1 && resto && (resto < 100 || resto % 100 === 0)) {
    const ultimo = partes.pop()
    return partes.join(' ') + ' e ' + ultimo
  }
  return partes.join(' ')
}

// 1860.5 -> "mil oitocentos e sessenta reais e cinquenta centavos"
export function valorPorExtenso(valor) {
  const total = Math.round(Number(valor || 0) * 100)
  const reais = Math.floor(total / 100), centavos = total % 100
  const partes = []
  if (reais) partes.push(inteiroPorExtenso(reais) + (reais === 1 ? ' real' : (reais % 1e6 === 0 ? ' de reais' : ' reais')))
  if (centavos) partes.push(inteiroPorExtenso(centavos) + (centavos === 1 ? ' centavo' : ' centavos'))
  return partes.length ? partes.join(' e ') : 'zero real'
}
