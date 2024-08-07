import { GenericError } from '@shveitsar/toolbox'
import cors from 'cors'
import express from 'express'
import { serializer } from '../firestore'
import {
  ApiHandlerContextClass,
  apiHandlerContextStorage
} from './context'
import { HttpGenericError } from './error'

/**
 * создает и настраивает express-приложение для обработки клиентских API-запросов.
 *
 * Вызов API-метода на клиенте, по факту, приводит к идентичному вызову
 * одноименного метода у объекта имплементации {@link handlersMap} на сервере с теми же параметрами;
 * результат выполнения в неизменном виде возвращается обратно на клиент;
 * то же самое относится к исключениям, которые также будут выброшены на клиенте с идентичными данными (есть нюансы).
 *
 * @template T - интерфейс, декларирующий API
 * @param handlersMap - имплементация API в виде простого объекта, например, namespaced-импорт всех функций, реализующих методы,
 * в случае инстанса класса необходимо его предварительно обернуть в `wrapClassInstance`
 */

export function createApiApp<T extends {} | Function>(
  handlersMap: T,
  app = express()
): express.Application {
  app.disable('x-powered-by')
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cors())
  applyApiHandlers(handlersMap, app)
  return app
}

/**
 * Применяет обработчики API-методов к express-роутеру
 * - path метода соответствует пути в объекте (метод `'a.b'` в обработчике `{a: {b: () => 'hello'}}` имеет путь `/a/b`)
 * - вызов методов выполняется через post с передачей массива аргументов в теле запроса
 * - исходные `req` и `resp` (а также express `app` и `path`) можно получить через `this` (соответственно это не работает для arrow-функций)
 * - поддерживаются JSON-совместимые данные а также {@link Date}, {@link Timestamp} и {@link GeoPoint}
 * - результат `null` либо `undefined` соответствует `resp.status(204).send()`
 * - для методов, названия которых оканчиваются на `Webhook` и `-webhook`, возвращаемый результат отдается как `resp.status(200).send(result)`
 * - исключения {@link GenericError} также выбрасываются на клиенте без изменений
 * - для прочих исключений будет выброшено 'Unknown server error' с http-кодом 500
 * - для выброса исключений с http-кодом, отличными от 500, необходимо использовать {@link HttpGenericError}
 */
export function applyApiHandlers<T extends {} | Function>(
  handlersMap: T,
  app: express.Application
): void {
  app.post('*', (req, resp, next) => {
    let handler: any = handlersMap
    let instance: any = null
    for (let pathSegment of req.path.split('/')) {
      if (pathSegment === '') {
        continue
      }
      // приватные переменные начинаются с _, возможно попытка доступа к ним
      if (pathSegment.startsWith('_')) {
        return next()
      }
      instance = handler
      handler = instance[pathSegment]
      if (handler == null) {
        return next()
      }
    }
    if (typeof handler !== 'function') {
      return next()
    }

    const ctx = new ApiHandlerContextClass(app, req.path, req, resp)
    return apiHandlerContextStorage.run(
      ctx,
      requestHandlerWrapper,
      handler,
      instance,
      ctx
    )
  })
}

function requestHandlerWrapper(
  handler: Function,
  handlerInstance: any,
  ctx: ApiHandlerContextClass
) {
  return requestHandler(handler, handlerInstance, ctx)
}

async function requestHandler(
  handler: Function,
  handlerInstance: any,
  ctx: ApiHandlerContextClass
) {
  try {
    const args = serializer.parse(ctx.req.body)
    const isWebhook =
      ctx.path.endsWith('Webhook') || ctx.path.endsWith('-webhook')

    const handlerArgs =
      !isWebhook && Array.isArray(args) ? args : [args]
    const result = await handler.apply(handlerInstance, handlerArgs)

    if (result != null) {
      const serializedResult = serializer.serialize(result)
      if (!isWebhook) {
        ctx.resp.json(serializedResult)
      } else {
        ctx.resp.send(serializedResult)
      }
    } else {
      ctx.resp.status(204).send()
    }
  } catch (error) {
    const httpGenericError =
      error instanceof GenericError
        ? error
        : error instanceof Error
        ? new GenericError(error.message, { error })
        : new GenericError('Unknown server error', { error })
    const errData = httpGenericError.data as any
    const status: number =
      error instanceof HttpGenericError
        ? error.httpCode
        : errData && typeof errData === 'object'
        ? errData.httpCode ??
          errData.httpStatus ??
          errData.status ??
          500
        : 500
    const payload = httpGenericError.toJSON()
    ctx.logger.error(
      (error as any)?.message ?? String(error),
      payload
    )
    ctx.resp.status(status).json(payload)
  }
}

// TODO добавить поддержку авторизованных запросов (firebase auth)
// TODO добавить возможность указать префикс path ("base path")
