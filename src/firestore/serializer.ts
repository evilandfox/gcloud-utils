import { GeoPoint, Timestamp } from '@google-cloud/firestore'
import { Serializer } from '@shveitsar/callable-common'

export const serializer = Serializer.createDefault(
  Timestamp,
  GeoPoint
)
