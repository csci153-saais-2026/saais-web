export {
  apiClient,
  createSaaisApiClient,
  isPublicContractPath,
  PUBLIC_CONTRACT_PATHS,
  type SaaisApiClient,
  type SaaisApiClientOptions,
  type UnauthorizedEventContext,
} from './client'

export {
  getMockSessionToken,
  resolveCurrentAccessToken,
  setAccessTokenResolver,
  setMockSessionToken,
  type AccessTokenResolver,
} from './auth-token'

export {
  API_ERROR_CODES,
  ApiClientError,
  hasApiErrorCode,
  isApiClientError,
  normalizeApiError,
  parseRetryAfterSeconds,
  unwrapApiResult,
  type ContractErrorPayload,
  type GatewayAuthErrorPayload,
  type KnownApiErrorCode,
  type NormalizedApiError,
} from './errors'

export { parseContentRange, postgrestFilter } from './filters'

export type {
  ApiSchema,
  components,
  ContentRangeInfo,
  OperationPathParams,
  OperationQuery,
  OperationRequestBody,
  OperationResponse,
  operations,
  paths,
} from './types'
