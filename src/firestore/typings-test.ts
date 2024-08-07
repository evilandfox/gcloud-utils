import firestore from '@google-cloud/firestore'
import './typings'

declare module '@google-cloud/firestore' {
  interface CollectionsSchema {
    passports: [
      {
        photoUrl: {
          main?: string
          selfie?: string
          visa?: string
        }
        firstName?: string
        lastName?: string
        createdAt: Timestamp
      }
    ]
    tenant: [
      {
        id: string
        phoneNumber: string
        createdAt: Timestamp
      },
      {
        rates: [
          {
            value: 0 | 1 | 2 | 3 | 4 | 5
            by: string
          }
        ]
        scoring: [
          {
            key: string
            someParam: number
          },
          {
            likes: [
              {
                by: string
              }
            ]
          }
        ]
      }
    ]
  }
}

export async function main() {
  const db = new firestore.Firestore()

  /** можно создать collection group любой коллекции, подсказки, типы ок */
  const scoringsCollectionGroupRef = db.collectionGroup('scoring')
  /** проверяем вывод подсказок для субколлеций, все ок, подсказки есть, типы корректные */
  const tenantsCollectionRef = db.collection('tenant')
  /** создаем ссылку на документ конкретного пользователя */
  const tenantRef = tenantsCollectionRef.doc('some-tenant-id')
  /** и самый важный момент - вложенные коллекции, работает, урра */
  const ratesCollectionRef = tenantRef.collection('rates')
  const scoringsRef = tenantRef.collection('scoring').doc()
  /** доступ к далеко вложенному документу  */
  const twiceNestesRef = tenantRef
    .collection('scoring')
    .doc('some-scoring-id')
    .collection('likes')
    .doc('like-id')

  /** получаем данные поля */
  const passportSnap = await db
    .collection('passports')
    .doc('id')
    .get()
  const firstName = passportSnap.get('firstName')

  /** переход к родительскому рефу */
  const tenantsCollectionRef2 =
    twiceNestesRef.parent.parentDoc.parent.parentDoc.parent
  const ratesCollectionRef2 = tenantsCollectionRef2
    .doc()
    .collection('rates')
}
