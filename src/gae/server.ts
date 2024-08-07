import express from 'express'
import { createApiApp } from '../server'

/**
 * создает и настраивает express-приложение,
 * оптимизированное для среды App Engine
 * @param initFn - асинхронная функция инициализации приложения (создание тяжелых объектов итд)
 */
export function createCallableAppEngineApp<T extends {} | Function>(
  callablesMap: T,
  app = express(),
  initFn?: (command: string) => Promise<void>
): express.Application {
  /** GAE requirement */
  app.set('trust proxy', true)
  /** warming/start requests */
  app.get('/_ah/:command', async (req, resp) => {
    if (initFn) {
      await initFn(req.params.command)
    }
    resp.status(204).send()
  })
  return createApiApp(callablesMap, app)
}
