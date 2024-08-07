import {
  GeoPoint,
  Timestamp,
  type DocumentSnapshot
} from '@google-cloud/firestore'
import { isPlainObject, type FireData } from '@shveitsar/toolbox'
import type { Change } from 'firebase-functions'

/** проверяет, изменилось ли значение одного из указанных полей у изменения firestore-документа */
export function isFireChangeFieldsChanged<T>(
  change: Change<DocumentSnapshot<T>>,
  ...fields: (keyof T)[]
) {
  for (const field of fields) {
    if (
      !isFireDatasEqual(
        change.before.get(field)!,
        change.after.get(field)!
      )
    ) {
      return false
    }
  }
  return true
}

export function isFireDatasEqual(a: FireData, b: FireData): boolean {
  if (a === b) {
    return true
  }
  if (a instanceof Timestamp || a instanceof GeoPoint) {
    return a.isEqual(b as any)
  }
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) &&
      a.every((ai, i) => isFireDatasEqual(ai, b[i]))
    )
  }
  if (isPlainObject(a)) {
    return (
      isPlainObject(b) &&
      Object.entries(a).every(([aKey, aValue]) =>
        isFireDatasEqual(aValue, b[aKey])
      )
    )
  }
  if (a instanceof Date) {
    return b instanceof Date && +a === +b
  }
  return false
}
