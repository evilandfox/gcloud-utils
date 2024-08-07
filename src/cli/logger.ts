/**
 * Логгер структуированных данных json
 *
 * Логи, сгенерированные методами данного класса,
 * будут корректно отображены в записях сервиса Logging,
 * без принудительного преобразования json в текст
 *
 * Использовать в GAE и GCR, а в GCF от Firebase не нужно т.к уже встроен
 */
export class Logger {
  constructor(readonly prefix = '') {}

  info(message: string, data?: { [key: string]: any }): void {
    this.write('INFO', message, data)
  }

  warning(message: string, data?: { [key: string]: any }): void {
    this.write('WARNING', message, data)
  }

  error(errorInstance: unknown): void
  error(message: string, data?: { [key: string]: any }): void
  error(
    messageOrError: unknown,
    data?: { [key: string]: any }
  ): void {
    if (typeof messageOrError === 'string') {
      this.write('ERROR', messageOrError, data)
    } else {
      this.write(
        'ERROR',
        (messageOrError as any)?.message ?? String(messageOrError),
        messageOrError as any
      )
    }
  }

  write(
    severity: LogEntry['severity'],
    message: string,
    data: { [key: string]: any } = {}
  ) {
    const preparedData = removeCircular(data)
    const entry: LogEntry =
      Array.isArray(preparedData) ||
      typeof preparedData !== 'object' ||
      !preparedData
        ? {
            data: preparedData,
            message: this.prefix + message,
            severity
          }
        : {
            ...preparedData,
            message: this.prefix + message,
            severity
          }
    const consoleMethod = severityLogger[entry.severity]
    console[consoleMethod](JSON.stringify(entry))
  }
}

/**
 * Инстанс логгера по умолчанию
 */
export const logger = new Logger()

/**
 * Тип данных для записи лога
 */
export interface LogEntry {
  /** Уровень критичности лога */
  severity: keyof typeof severityLogger
  /** текстовый payload - поясняющее сообщение */
  message?: string
  /** json payload */
  [key: string]: any
}

const severityLogger = {
  DEBUG: 'debug',
  INFO: 'info',
  NOTICE: 'info',
  WARNING: 'warn',
  ERROR: 'error',
  CRITICAL: 'error',
  ALERT: 'error',
  EMERGENCY: 'error'
} as const

function removeCircular(obj: any, refs = new Set<any>()): any {
  if (typeof obj !== 'object' || !obj) {
    return obj
  }
  if (typeof obj.toJSON === 'function') {
    return obj.toJSON()
  }
  if (refs.has(obj)) {
    return '[Circular]'
  }
  refs.add(obj)
  if (Array.isArray(obj)) {
    return obj.map((item) => removeCircular(item))
  } else {
    return Object.fromEntries(
      Object.entries(obj).map(([key, val]) => [
        key,
        removeCircular(val)
      ])
    )
  }
}

// скопировано с `firebase-functions` и упрощено
