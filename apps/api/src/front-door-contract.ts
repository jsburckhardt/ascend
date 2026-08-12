export const ASCEND_FRONT_DOOR_TOKEN = 'ASCEND_FRONT_DOOR_TOKEN'
export const DEVELOPMENT_FRONT_DOOR_TOKEN = 'ascend-development-front-door-v1'

export const resolveFrontDoorToken = (
  configured = process.env[ASCEND_FRONT_DOOR_TOKEN]
): string => {
  if (configured === undefined) return DEVELOPMENT_FRONT_DOOR_TOKEN
  if (configured.length < 16 || configured.length > 256)
    throw new Error(
      ASCEND_FRONT_DOOR_TOKEN +
        ' must contain between 16 and 256 characters when configured'
    )
  return configured
}

export const hasTrustedFrontDoorHeaders = (
  headers: Record<string, unknown>
): boolean =>
  headers['x-ascend-front-door-authority'] !== undefined ||
  headers['x-ascend-front-door-token'] !== undefined
