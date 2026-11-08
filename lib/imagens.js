// Fotos do Unsplash (uso gratuito, inclusive comercial — unsplash.com/license)
const foto = (id, largura) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${largura}&q=75`

export const IMAGENS = {
  capa: foto('1708111890355-016f3cb276ac', 2000),        // Praia do Forte (Litoral Norte da BA), vista aérea
  limpeza: foto('1758273238415-01ec03d9ef27', 900),      // limpeza de apartamento
  jardinagem: foto('1779636489740-6077a4198be6', 900),   // equipe cortando grama
  reforma: foto('1731168273756-e02cae42265b', 900),      // profissional cortando piso
  seguranca: foto('1621905251189-08b45d6a269e', 900),    // técnico de capacete fazendo instalação
}

// Profissionais em ação (mosaico da capa)
export const EQUIPE = [
  { nome: 'Limpeza', foto: foto('1581578731548-c64695cc6952', 500) },       // limpeza de janela
  { nome: 'Jardinagem', foto: foto('1780419748459-075ce111534a', 500) },    // corte de grama
  { nome: 'Reforma', foto: foto('1505798577917-a65157d3320a', 500) },       // serra de esquadria
  { nome: 'Segurança', foto: foto('1646640381839-02748ae8ddf0', 500) },     // instalação com furadeira
]
