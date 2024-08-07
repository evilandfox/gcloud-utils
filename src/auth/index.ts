import { toStandardPhoneNumber } from '@shveitsar/toolbox'
import type { auth, FirebaseError } from 'firebase-admin'

/**
 * возвращает данные пользователя из firebase auth по номеру телефона,
 * регистрирует нового если такого пользователя не существует
 */
export async function getOrRegisterUserByPhoneNumber(
  phoneNumber: string,
  authApp: auth.Auth
) {
  try {
    return await authApp.getUserByPhoneNumber(
      toStandardPhoneNumber(phoneNumber)
    )
  } catch (error) {
    if ((error as FirebaseError)?.code === 'auth/user-not-found') {
      return await authApp.createUser({
        phoneNumber,
        disabled: false
      })
    }
    throw error
  }
}
