// Checklist padrão de cada tipo de serviço (a equipe pode acrescentar itens no local)
export const CHECKLISTS = {
  limpeza: [
    'Hall de entrada e portaria',
    'Escadas e corredores',
    'Elevadores',
    'Vidros e espelhos',
    'Banheiros',
    'Garagem / área externa',
    'Retirada do lixo',
  ],
  jardinagem: [
    'Corte da grama',
    'Poda de arbustos e cercas vivas',
    'Retirada de ervas daninhas',
    'Limpeza dos canteiros',
    'Rega',
    'Recolhimento dos resíduos verdes',
  ],
  limpeza_e_jardinagem: [
    'Áreas comuns limpas',
    'Vidros e espelhos',
    'Retirada do lixo',
    'Corte da grama',
    'Poda',
    'Recolhimento dos resíduos verdes',
  ],
  reforma: [
    'Área protegida antes do serviço',
    'Serviço executado conforme combinado',
    'Teste final (elétrica/hidráulica, se houver)',
    'Retirada de entulho e sobras',
    'Limpeza final do local',
  ],
  seguranca: [
    'Câmeras funcionando e com boa imagem',
    'Gravador (DVR/NVR) gravando',
    'Alarme / sensores testados',
    'Cerca elétrica / portão / interfone testados',
    'Acesso pelo celular configurado',
    'Orientação ao responsável',
  ],
  outro: ['Serviço executado conforme combinado', 'Local limpo e organizado'],
}

export function checklistPadrao(servico) {
  return (CHECKLISTS[servico] || CHECKLISTS.outro).map((item) => ({ item, feito: false }))
}
