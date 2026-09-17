import * as ImageManipulator from 'expo-image-manipulator'
import { supabase } from '@/lib/supabase'

export const FUTTO_BUCKET = 'futto-bucket'

type UploadKind = 'terrains' | 'avatars' | 'covers' | 'tournaments' | 'matches' | 'feed'

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Compresse puis téléverse dans futto-bucket.
 * Utilise la sortie base64 native d'ImageManipulator convertie en ArrayBuffer
 * pour garantir que les octets binaires sont envoyés (évite les fichiers 0-byte du fetch file:// sur RN).
 */
export async function uploadCompressedImage(params: {
  uri: string
  kind: UploadKind
  userId: string
  maxWidth?: number
  quality?: number
}) {
  if (!supabase) throw new Error('Supabase non configuré')

  const { uri, kind, userId, maxWidth = 1280, quality = 0.82 } = params

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    {
      base64: true,
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  )

  let arrayBuffer: ArrayBuffer
  if (manipulated.base64) {
    arrayBuffer = base64ToArrayBuffer(manipulated.base64)
  } else {
    const response = await fetch(manipulated.uri)
    arrayBuffer = await response.arrayBuffer()
  }

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error('Image vide après compression (0 octet).')
  }

  const path = `${userId}/${kind}/${Date.now()}.jpg`
  console.log(`[Storage] Upload vers ${FUTTO_BUCKET}/${path} (${arrayBuffer.byteLength} octets)`)

  const { error } = await supabase.storage.from(FUTTO_BUCKET).upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (error) {
    console.warn('[Storage] Erreur upload:', error)
    throw error
  }

  const { data } = supabase.storage.from(FUTTO_BUCKET).getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}
