export const SERVICOS = {
  limpeza: 'Limpeza',
  jardinagem: 'Jardinagem',
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
