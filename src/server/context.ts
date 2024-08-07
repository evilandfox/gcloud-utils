import type express from 'express'
import { AsyncLocalStorage } from 'node:async_hooks'
import { Logger, type LogEntry } from '../cli'

/**
 * Контекст запроса вызова API-метода
 */
export interface ApiHandlerContext {
  /** объект родительского express-роутера */
  readonly app: express.Application
  /** путь, использовавшийся для вызова метода */
  readonly path: string
  /** исходный объект запроса */
  readonly req: express.Request
  /** исходный объект ответа */
  readonly resp: express.Response
  /** логгер в контексте запроса */
  readonly logger: Logger
}

/**
 * Логгер в контексте http-запроса
 */
export class RequestContextLogger extends Logger {
  constructor(req: express.Request) {
    super()
    const traceHeader = req.header('X-Cloud-Trace-Context')
    if (traceHeader) {
      const [trace] = traceHeader.split('/')
      const project =
        process.env.GOOGLE_CLOUD_PROJECT ?? 'shveitsar-rents'
      this.globFields[
        'logging.googleapis.com/trace'
      ] = `projects/${project}/traces/${trace}`
    }
  }
  private globFields: { [key: string]: any } = {}

  override write(
    severity: LogEntry['severity'],
    message: string,
    data?: { [key: string]: any }
  ) {
    super.write(severity, message, { ...this.globFields, ...data })
  }
}

export class ApiHandlerContextClass implements ApiHandlerContext {
  constructor(
    readonly app: express.Application,
    readonly path: string,
    readonly req: express.Request,
    readonly resp: express.Response
  ) {}
  get logger(): Logger {
    return (this._logger ??= new RequestContextLogger(this.req))
  }
  private _logger?: Logger
}

class TestEnvApiHandlerContextClass implements ApiHandlerContext {
  get app(): express.Application {
    throw new Error('Test environment!')
  }
  get path(): string {
    throw new Error('Test environment!')
  }
  get req(): express.Request {
    throw new Error('Test environment!')
  }
  get resp(): express.Response {
    throw new Error('Test environment!')
  }
  readonly logger: Logger = {
    error: console.error,
    info: console.info,
    warning: console.warn,
    write: console.debug,
    prefix: 'test'
  }
  private static _instance: undefined | TestEnvApiHandlerContextClass
  static instance() {
    return (this._instance ??= new TestEnvApiHandlerContextClass())
  }
}

/**
 * возвращает контекст текущего API-запроса,
 * вызовы извне генерируют исключение
 */
export function getRequestContext(): ApiHandlerContext {
  const ctx = apiHandlerContextStorage.getStore()
  if (ctx) {
    return ctx
  }
  if (process.env.NODE_ENV === 'test') {
    return TestEnvApiHandlerContextClass.instance()
  }
  throw new Error(
    'No request context found. Check that current place execution was triggered by request handler ancestor'
  )
}

export const apiHandlerContextStorage =
  new AsyncLocalStorage<ApiHandlerContext>()
