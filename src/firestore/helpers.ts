import type {
  DocumentReference,
  Query
} from '@google-cloud/firestore'
import { type DocumentId } from '@shveitsar/toolbox'

/** получить данные документа */
export async function firestoreDocData<T>(
  ref: DocumentReference<T>
): Promise<(T & DocumentId) | null> {
  const snapshot = await ref.get()
  const data = snapshot.data()
  return data
    ? {
        id: ref.id,
        ...data
      }
    : null
}

/** получить данные запроса */
export async function firestoreQueryData<T>(
  query: Query<T>
): Promise<(T & DocumentId)[]> {
  const querySnapshot = await query.get()
  return querySnapshot.docs.map((snapshot) => ({
    id: snapshot.id,
    ...snapshot.data()
  }))
}
