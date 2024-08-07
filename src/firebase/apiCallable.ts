import { serializeError } from '@shveitsar/toolbox'
import { logger } from 'firebase-functions/v1'
import {
  HttpsError,
  type CallableContext
} from 'firebase-functions/v1/https'
import { isPromise } from 'node:util/types'
import { serializer } from '../firestore'

export type { CallableContext } from 'firebase-functions/v1/https'

/**
 * Создает обработчик под httpsCallable на основе реализации API
 * Используйте `this` для доступа к контексту {@link CallableContext}
 * @param handlers объект произвольной вложенности с api-методами
 */
export function createCloudFunctionsCallableApiEndpoint<T>(
  handlers: T & ThisType<CallableContext>
) {
  return function (
    data: any,
    context: CallableContext
  ): any | Promise<any> {
    const methodPath = context.rawRequest.path.substring(1).split('/')
    const method = methodPath.reduce(
      (result, key) => result?.[key],
      handlers as any
    )
    if (typeof method !== 'function') {
      throw new HttpsError(
        'not-found',
        `Метод ${methodPath.join('.')} не существует`
      )
    }
    let parsedData: any
    try {
      parsedData = serializer.parse(data)
    } catch (e) {
      throw new HttpsError(
        'invalid-argument',
        'Данные запроса повреждены',
        {
          cause: e
        }
      )
    }
    const promisableResult = (method as Function).apply(
      context,
      Array.isArray(parsedData) ? parsedData : [parsedData]
    )
    if (isPromise(promisableResult)) {
      return promisableResult.then((syncResult) =>
        serializer.serialize(syncResult)
      )
    } else {
      return serializer.serialize(promisableResult)
    }
  }
}

/**
 * Создает обработчик {@link createCloudFunctionsCallableApiEndpoint}
 * с логированием всех запросов
 */
export function createCloudFunctionsCallableApiEndpointWithLogging<T>(
  name: string,
  handlers: T & ThisType<CallableContext>
) {
  const apiHandler = createCloudFunctionsCallableApiEndpoint(handlers)
  return async (data: any, context: CallableContext) => {
    const path = context.rawRequest.path
    logger.info(`[${name}] ${path} api call`, {
      path,
      url: context.rawRequest.url,
      uid: context.auth?.uid,
      token: context.auth?.token,
      data
    })
    try {
      const result = await apiHandler(data, context)
      logger.info(`[${name}] ${path} result`, result)
      return result
    } catch (error) {
      logger.warn(`[${name}] ${path} error`, serializeError(error))
      throw error
    }
  }
}

export function cloudFunctionMiddleware<A extends any[], R>(
  fn: (this: CallableContext, ...args: A) => Promise<R>,
  ...middlewares: ((
    ctx: CallableContext,
    args: A,
    next: () => Promise<R>
  ) => Promise<R>)[]
) {
  const callNext = (
    ctx: CallableContext,
    args: A,
    i = 0
  ): Promise<R> => {
    const middleware = middlewares.at(i)
    if (middleware) {
      return middleware(ctx, args, () => callNext(ctx, args, i + 1))
    }
    return fn.apply(ctx, args)
  }
  return function (this: CallableContext, ...args: A): Promise<R> {
    return callNext(this, args)
  }
}
