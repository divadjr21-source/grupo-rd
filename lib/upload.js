import { supabase } from './supabase'

// Envia arquivos para o Storage e devolve os links públicos
export async function enviarArquivos(arquivos, pasta) {
  const links = []
  for (const arquivo of arquivos) {
    const extensao = (arquivo.name.split('.').pop() || 'bin').toLowerCase()
    const caminho = `${pasta}/${crypto.randomUUID()}.${extensao}`
    const { error } = await supabase.storage
      .from('fotos')
      .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false })
    if (error) throw new Error('Não foi possível enviar o arquivo ' + arquivo.name)
    links.push(supabase.storage.from('fotos').getPublicUrl(caminho).data.publicUrl)
  }
  return links
}

export function ehVideo(link) {
  return /\.(mp4|mov|webm|m4v|3gp|avi|mkv)$/i.test(link)
}
