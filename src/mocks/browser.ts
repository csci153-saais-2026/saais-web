import { setupWorker } from 'msw/browser'
import { saaisMswHandlers } from './handlers'

export const saaisMockWorker = setupWorker(...saaisMswHandlers)

export async function startBrowserMockWorker(): Promise<void> {
  await saaisMockWorker.start()
}
