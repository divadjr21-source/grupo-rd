import { SERVICOS, PERIODOS_AGENDA, formatarData } from './constantes'

// Mensagens prontas de WhatsApp para o cliente, em cada etapa do atendimento
export function mensagensCliente(chamado, empresa, site, orcamento) {
  const nome = (chamado.nome_solicitante || '').split(/[—-]/)[0].trim().split(' ')[0] || ''
  const assinatura = `\n\n${empresa?.nome || 'Grupo RD'}`
  const servico = SERVICOS[chamado.servico] || 'serviço'
  const quando = chamado.data_agendada
    ? `${formatarData(chamado.data_agendada)}${chamado.periodo_agendado ? `, ${PERIODOS_AGENDA[chamado.periodo_agendado].toLowerCase()}` : ''}`
    : null

  const lista = []
  lista.push({
    chave: 'recebido',
    nome: 'Pedido recebido',
    texto: `Olá, ${nome}! Recebemos o seu pedido #${chamado.protocolo} (${servico}). Em breve confirmamos a data com você.${assinatura}`,
  })
  if (orcamento?.token && orcamento.status !== 'rascunho') {
    lista.push({
      chave: 'orcamento',
      nome: 'Enviar orçamento',
      texto: `Olá, ${nome}! Segue o orçamento do pedido #${chamado.protocolo}:\n${site}/orcamento/${orcamento.token}\n\nPelo link você vê todos os detalhes e pode aprovar com um clique.${assinatura}`,
    })
  }
  if (quando) {
    lista.push({
      chave: 'agendado',
      nome: 'Serviço agendado',
      texto: `Olá, ${nome}! Seu serviço de ${servico.toLowerCase()} (pedido #${chamado.protocolo}) está agendado para ${quando}.\nEndereço: ${chamado.endereco}\n\nSe precisar mudar, é só responder esta mensagem.${assinatura}`,
    })
    lista.push({
      chave: 'lembrete',
      nome: 'Lembrete (véspera)',
      texto: `Olá, ${nome}! Passando para lembrar do serviço de ${servico.toLowerCase()} amanhã (${quando}). Está tudo certo para recebermos a equipe?${assinatura}`,
    })
  }
  lista.push({
    chave: 'caminho',
    nome: 'Equipe a caminho',
    texto: `Olá, ${nome}! Nossa equipe já está a caminho para o serviço #${chamado.protocolo}.${assinatura}`,
  })
  lista.push({
    chave: 'concluido',
    nome: 'Serviço concluído',
    texto: chamado.status === 'concluido' && chamado.relatorio_token
      ? `Olá, ${nome}! O serviço #${chamado.protocolo} foi concluído. Segue o relatório com o checklist, as fotos de antes e depois e a assinatura:\n${site}/relatorio/${chamado.relatorio_token}\n\nObrigado pela confiança! Ficamos à disposição.${assinatura}`
      : `Olá, ${nome}! O serviço #${chamado.protocolo} foi concluído. Você pode acompanhar em:\n${site}/acompanhar?protocolo=${chamado.protocolo}\n\nObrigado pela confiança! Ficamos à disposição.${assinatura}`,
  })
  return lista
}
