import type { FastifyServerOptions } from 'fastify'

export const REQUEST_URL_REDACTION_PATH = 'req.url' as const
export const REQUEST_URL_REDACTION_CENSOR = '[request-url-redacted]' as const

type LoggerConfiguration = Record<string, unknown>

function existingRedactionPaths(redact: unknown): string[] {
  if (Array.isArray(redact)) {
    return redact.filter((value): value is string => typeof value === 'string')
  }
  if (typeof redact === 'object' && redact !== null && 'paths' in redact) {
    const paths = (redact as { paths?: unknown }).paths
    return Array.isArray(paths)
      ? paths.filter((value): value is string => typeof value === 'string')
      : []
  }
  return []
}

export function safeRequestLoggerOptions(
  logger: LoggerConfiguration = {}
): LoggerConfiguration {
  const configuredRedact = logger.redact
  const configuredObject =
    typeof configuredRedact === 'object' &&
    configuredRedact !== null &&
    !Array.isArray(configuredRedact)
      ? (configuredRedact as LoggerConfiguration)
      : {}
  return {
    ...logger,
    redact: {
      ...configuredObject,
      paths: [
        ...new Set([
          ...existingRedactionPaths(configuredRedact),
          REQUEST_URL_REDACTION_PATH,
        ]),
      ],
      censor:
        typeof configuredObject.censor === 'string'
          ? configuredObject.censor
          : REQUEST_URL_REDACTION_CENSOR,
    },
  }
}

export function withSafeRequestLogging(
  options: FastifyServerOptions | undefined
): FastifyServerOptions {
  if (options === undefined) {
    return { logger: safeRequestLoggerOptions() } as FastifyServerOptions
  }
  if (options.logger === true) {
    return {
      ...options,
      logger: safeRequestLoggerOptions(),
    } as FastifyServerOptions
  }
  if (typeof options.logger === 'object' && options.logger !== null) {
    return {
      ...options,
      logger: safeRequestLoggerOptions(
        options.logger as unknown as LoggerConfiguration
      ),
    } as FastifyServerOptions
  }
  return options
}
