export { saaisMswHandlers } from './handlers'
export {
  canAccessDepartment,
  canAccessFaculty,
  hasMockRole,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  MOCK_PERSONAS,
  resolveMockPersonaFromAuthHeader,
  type MockPersona,
  type MockPersonaKey,
  type MockRoleScope,
  type SaaisRole,
  type SaaisScopeType,
} from './personas'
export {
  getMockDatabase,
  resetMockDatabase,
  type MockDatabaseState,
} from './store'
