import { randomUUID } from 'node:crypto'
import type { storage } from 'firebase-admin'

export type Storage = storage.Storage
export type Bucket = ReturnType<Storage['bucket']>
export type File = ReturnType<Bucket['file']>

/**
 * Получает публичную ссылку к файлу cloud storage по секретным технологиям гугла
 *
 * {@link https://www.sentinelstand.com/article/guide-to-firebase-storage-download-urls-tokens}
 */
export async function getStorageFileDownloadUrl(
  file: File,
  emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST
) {
  const [metadata] = await file.getMetadata()
  let firebaseStorageDownloadTokens: string | undefined =
    metadata.metadata?.firebaseStorageDownloadTokens
  if (!firebaseStorageDownloadTokens) {
    firebaseStorageDownloadTokens = randomUUID()
    await file.setMetadata({
      metadata: {
        firebaseStorageDownloadTokens
      }
    })
  }
  const origin = !emulatorHost
    ? `https://firebasestorage.googleapis.com`
    : `http://${emulatorHost}`
  const bucket = file.bucket.name
  const encodedPath = encodeURIComponent(file.name)
  return `${origin}/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${firebaseStorageDownloadTokens}`
}
