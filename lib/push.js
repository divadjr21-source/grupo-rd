// Chave PÚBLICA das notificações (pode ficar no código).
// A chave PRIVADA fica só na Vercel, na variável VAPID_PRIVATE_KEY.
export const VAPID_PUBLICA =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BLo0W1LkMIXbxTnML0Sm5REA7GQrOZsVmu_l6m7nKovrwYVFXR2JmYrUDx00xJ5eBQHQusY5DZTbEMpuLJi9KtY'
