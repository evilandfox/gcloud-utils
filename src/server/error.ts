import { GenericError } from '@shveitsar/toolbox'

/**
 * Класс исключения, позволяющий указать http-статус при выбросе исключения.
 *
 * передаваемый статус не валидируется, поэтому необходимо самому позаботиться о его корректности.
 * к примеру, если передать `200`, то это исключение будет рассматриваться как успешный ответ на стороне клиента.
 */
export class HttpGenericError extends GenericError {
  constructor(
    readonly httpCode: number,
    message?: string,
    data?: unknown
  ) {
    super(message, data)
  }
}
