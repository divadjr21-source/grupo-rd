import { supabase } from './supabase'
import { SERVICOS, STATUS, PERIODOS_AGENDA, descreverAgenda } from './constantes'

// Busca todas as linhas de uma tabela (de 1000 em 1000)
async function tudo(tabela, colunas, ordem = 'criado_em') {
  const linhas = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select(colunas).order(ordem, { ascending: true }).range(de, de + 999)
    if (error) throw new Error(`${tabela}: ${error.message}`)
    linhas.push(...(data || []))
    if (!data || data.length < 1000) return linhas
  }
}

const data = (v) => (v ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T12:00:00' : v) : null)
const total = (itens, desconto) => Math.max((itens || []).reduce((t, i) => t + (Number(i.qtd) || 0) * (Number(i.valor) || 0), 0) - (Number(desconto) || 0), 0)

// Gera e baixa um Excel com todas as informações do sistema
export async function baixarBackup(aoProgresso = () => {}) {
  const ExcelJS = (await import('exceljs')).default
  const pasta = new ExcelJS.Workbook()
  pasta.creator = 'Grupo RD'
  pasta.created = new Date()

  function aba(nome, colunas, linhas) {
    const ws = pasta.addWorksheet(nome, { views: [{ state: 'frozen', ySplit: 1 }] })
    ws.columns = colunas.map(([titulo, chave, largura = 18, formato]) => ({ header: titulo, key: chave, width: largura, style: formato ? { numFmt: formato } : {} }))
    ws.addRows(linhas)
    const cab = ws.getRow(1)
    cab.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cab.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF178A49' } }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colunas.length } }
  }
  const MOEDA = '"R$" #,##0.00'
  const DIA = 'dd/mm/yyyy'
  const HORA = 'dd/mm/yyyy hh:mm'

  aoProgresso('Clientes…')
  const clientes = await tudo('clientes', '*')
  aba('Clientes', [['Nome', 'nome', 32], ['Tipo', 'tipo', 13], ['Responsável', 'responsavel', 22], ['Telefone', 'telefone', 17], ['E-mail', 'email', 26], ['Endereço', 'endereco', 40], ['Observações', 'observacoes', 30], ['Cadastrado em', 'criado_em', 16, DIA]],
    clientes.map((c) => ({ ...c, tipo: { residencia: 'Residência', condominio: 'Condomínio', empresa: 'Empresa' }[c.tipo] || c.tipo, criado_em: data(c.criado_em) })))

  aoProgresso('Chamados…')
  const chamados = await tudo('chamados', '*, clientes(nome), chamado_equipe(perfis(nome))')
  aba('Chamados', [
    ['Protocolo', 'protocolo', 12], ['Aberto em', 'criado_em', 16, HORA], ['Status', 'status', 14], ['Serviço', 'servico', 20],
    ['Cliente', 'cliente', 28], ['Solicitante', 'nome_solicitante', 26], ['Telefone', 'telefone', 17], ['Endereço', 'endereco', 40],
    ['Descrição', 'descricao', 45], ['Data agendada', 'data_agendada', 13, DIA], ['Período', 'periodo', 11], ['Equipe', 'equipe', 26],
    ['Chegada', 'checkin_em', 16, HORA], ['Saída', 'checkout_em', 16, HORA], ['Concluído em', 'concluido_em', 16, HORA],
    ['Checklist', 'checklist', 10], ['Resumo da equipe', 'relatorio_equipe', 40], ['Assinado por', 'assinatura_nome', 22],
    ['Nota do cliente', 'avaliacao_nota', 9], ['Comentário do cliente', 'avaliacao_comentario', 40],
    ['Fotos do cliente', 'fotos', 30], ['Fotos antes', 'fotos_antes', 30], ['Fotos depois', 'fotos_conclusao', 30],
  ], chamados.map((c) => ({
    ...c,
    criado_em: data(c.criado_em), data_agendada: data(c.data_agendada), checkin_em: data(c.checkin_em), checkout_em: data(c.checkout_em), concluido_em: data(c.concluido_em),
    status: STATUS[c.status]?.label || c.status, servico: SERVICOS[c.servico] || c.servico, cliente: c.clientes?.nome || '',
    periodo: PERIODOS_AGENDA[c.periodo_agendado] || '', equipe: (c.chamado_equipe || []).map((e) => e.perfis?.nome).join(', '),
    checklist: c.checklist?.length ? `${c.checklist.filter((i) => i.feito).length}/${c.checklist.length}` : '',
    fotos: (c.fotos || []).join('\n'), fotos_antes: (c.fotos_antes || []).join('\n'), fotos_conclusao: (c.fotos_conclusao || []).join('\n'),
  })))

  aoProgresso('Orçamentos…')
  const orcamentos = await tudo('orcamentos', '*, chamados(protocolo, nome_solicitante)')
  aba('Orçamentos', [['Protocolo', 'protocolo', 12], ['Cliente', 'cliente', 28], ['Situação', 'status', 14], ['Itens', 'itens', 60], ['Desconto', 'desconto', 12, MOEDA], ['Total', 'total', 14, MOEDA], ['Validade', 'validade', 12, DIA], ['Prazo', 'prazo', 18], ['Pagamento', 'condicoes', 30], ['Enviado em', 'enviado_em', 16, HORA], ['Respondido em', 'respondido_em', 16, HORA], ['Comentário do cliente', 'resposta_obs', 30]],
    orcamentos.map((o) => ({
      ...o, protocolo: o.chamados?.protocolo, cliente: o.chamados?.nome_solicitante,
      status: { rascunho: 'Rascunho', enviado: 'Aguardando', aprovado: 'Aprovado', recusado: 'Recusado' }[o.status],
      itens: (o.itens || []).map((i) => `${i.qtd} x ${i.descricao} (R$ ${Number(i.valor).toFixed(2).replace('.', ',')})`).join('\n'),
      desconto: Number(o.desconto), total: total(o.itens, o.desconto),
      validade: data(o.validade), enviado_em: data(o.enviado_em), respondido_em: data(o.respondido_em),
    })))

  aoProgresso('Contratos…')
  const contratos = await tudo('contratos', '*, clientes(nome)')
  const nomes = Object.fromEntries((await tudo('perfis', 'id, nome')).map((p) => [p.id, p.nome]))
  aba('Contratos', [['Contrato', 'titulo', 30], ['Cliente', 'cliente', 28], ['Serviço', 'servico', 20], ['Agenda', 'agenda', 26], ['Equipe fixa', 'equipe', 26], ['Valor mensal', 'valor_mensal', 14, MOEDA], ['Vence dia', 'dia_vencimento', 10], ['Início', 'inicio', 12, DIA], ['Fim', 'fim', 12, DIA], ['Situação', 'ativo', 11], ['O que inclui', 'descricao', 40]],
    contratos.map((c) => ({
      ...c, cliente: c.clientes?.nome, servico: SERVICOS[c.servico], agenda: descreverAgenda(c),
      equipe: (c.equipe || []).map((id) => nomes[id]).filter(Boolean).join(', '), valor_mensal: Number(c.valor_mensal),
      inicio: data(c.inicio), fim: data(c.fim), ativo: c.ativo ? 'Ativo' : 'Encerrado',
    })))

  aoProgresso('Financeiro…')
  const cobrancas = await tudo('cobrancas', '*', 'vencimento')
  aba('Financeiro', [['Cliente', 'cliente_nome', 28], ['Referente a', 'descricao', 40], ['Valor', 'valor', 14, MOEDA], ['Vencimento', 'vencimento', 12, DIA], ['Situação', 'status', 12], ['Pago em', 'pago_em', 12, DIA], ['Forma', 'forma_pagamento', 14], ['Telefone', 'telefone', 17], ['Observações', 'observacoes', 30]],
    cobrancas.map((c) => ({ ...c, valor: Number(c.valor), vencimento: data(c.vencimento), pago_em: data(c.pago_em), status: { pendente: 'Em aberto', pago: 'Pago', cancelado: 'Cancelado' }[c.status] })))

  aoProgresso('Usuários…')
  const perfis = await tudo('perfis', 'nome, email, telefone, papel, ativo, criado_em')
  aba('Usuários', [['Nome', 'nome', 28], ['E-mail', 'email', 30], ['Telefone', 'telefone', 17], ['Acesso', 'papel', 14], ['Situação', 'ativo', 11], ['Cadastrado em', 'criado_em', 16, DIA]],
    perfis.map((p) => ({ ...p, papel: p.papel === 'admin' ? 'Admin' : 'Funcionário', ativo: p.ativo ? 'Ativo' : 'Inativo', criado_em: data(p.criado_em) })))

  aoProgresso('Gerando o arquivo…')
  const buffer = await pasta.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const hoje = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `backup-grupo-rd-${hoje}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(link.href), 5000)
  return { clientes: clientes.length, chamados: chamados.length, orcamentos: orcamentos.length, contratos: contratos.length, cobrancas: cobrancas.length }
}
