import { setupServer } from 'msw/node'
import { saaisMswHandlers } from './handlers'

export const saaisMockServer = setupServer(...saaisMswHandlers)
