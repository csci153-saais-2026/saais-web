import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest'
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from '@testing-library/react'
import * as React from 'react'
import { MemoryRouter } from 'react-router'
import InvitePage from '../InvitePage'
import ForgotPasswordPage from '../ForgotPasswordPage'
import ResetPasswordPage from '../ResetPasswordPage'
import ChangePasswordPage from '../ChangePasswordPage'
import { AuthProvider } from '@/context/AuthProvider'
import { apiClient, createSaaisApiClient } from '@/lib/api'
import { MOCK_PERSONAS } from '@/mocks/personas'
import { getMockDatabase, resetMockDatabase } from '@/mocks/store'
import {
  ensureSyntheticProfilesInMockStore,
  SYNTHETIC_INVITED_ADVISER_ID,
} from '@/lib/auth/mock-auth-service'
import { saaisMockServer } from '@/mocks/node'

describe('InvitePage & Password Flows', () => {
  beforeAll(() => {
    saaisMockServer.listen()
  })

  afterAll(() => {
    saaisMockServer.close()
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    resetMockDatabase()
    ensureSyntheticProfilesInMockStore()
  })

  afterEach(() => {
    saaisMockServer.resetHandlers()
    cleanup()
    window.history.replaceState(null, '', '/')
  })

  it('displays an error if no invitation token is found in the URL hash', async () => {
    window.location.hash = ''
    render(
      <AuthProvider>
        <MemoryRouter>
          <InvitePage />
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(await screen.findByText(/No invitation token found/i)).toBeTruthy()
  })

  it('preserves window.history.state when scrubbing #token=... under React StrictMode', async () => {
    window.history.replaceState({ usr: { fromRouter: true }, idx: 3 }, '', '/invite#token=valid-invite-token-12345')
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')

    vi.spyOn(apiClient, 'POST').mockResolvedValue({
      data: {
        valid: true,
        status: 'pending',
        email: 'maria@vsu.edu.ph',
        full_name: 'Maria Santos',
        role: 'student',
        roles: ['student'],
        faculty_name: 'Faculty of Computing',
        department_name: 'DCST',
        program_code: 'BSCS',
        expires_at: '2026-12-31T23:59:59Z',
      },
      error: undefined,
      response: new Response(),
    } as never)

    render(
      <React.StrictMode>
        <AuthProvider>
          <MemoryRouter>
            <InvitePage />
          </MemoryRouter>
        </AuthProvider>
      </React.StrictMode>,
    )

    expect(replaceStateSpy).toHaveBeenCalledWith(
      { usr: { fromRouter: true }, idx: 3 },
      '',
      '/invite',
    )

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Maria Santos/i)).toBeTruthy()
    })
  })

  it('isolates mock invitation acceptance to ONLY the invited profile for that token', async () => {
    const db = getMockDatabase()
    const studentBefore = db.profiles.find(
      (p) => p.id === MOCK_PERSONAS.student_secondary.profileId,
    )
    const adviserBefore = db.profiles.find(
      (p) => p.id === SYNTHETIC_INVITED_ADVISER_ID,
    )
    expect(studentBefore?.status).toBe('invited')
    expect(adviserBefore?.status).toBe('invited')

    // Accept ONLY student_secondary's invitation token via the MSW mock handler
    const client = createSaaisApiClient({
      baseUrl: 'https://saais-mock.supabase.co',
      mode: 'mock',
      apiKey: 'sb_publishable_mock_key',
    })
    const { data, error } = await client.POST('/functions/v1/auth/verify-invite', {
      body: {
        token: `invite:${MOCK_PERSONAS.student_secondary.profileId}`,
        password: 'ValidPassword123',
      },
    })
    expect(error).toBeUndefined()
    expect(data?.success).toBe(true)

    const studentAfter = db.profiles.find(
      (p) => p.id === MOCK_PERSONAS.student_secondary.profileId,
    )
    const adviserAfter = db.profiles.find(
      (p) => p.id === SYNTHETIC_INVITED_ADVISER_ID,
    )
    expect(studentAfter?.status).toBe('active')
    expect(studentAfter?.invitation_status).toBe('accepted')
    expect(adviserAfter?.status).toBe('invited')
    expect(adviserAfter?.invitation_status).toBe('pending')
  })

  it('keeps ForgotPasswordPage responses neutral for existing, unknown, and disabled accounts', async () => {
    const emails = [
      MOCK_PERSONAS.adviser.email,
      'does.not.exist@vsu.edu.ph',
      'inactive.user@vsu.edu.ph',
    ]

    for (const email of emails) {
      const { unmount } = render(
        <AuthProvider>
          <MemoryRouter>
            <ForgotPasswordPage />
          </MemoryRouter>
        </AuthProvider>,
      )
      fireEvent.change(screen.getByLabelText(/Institutional email/i), {
        target: { value: email },
      })
      fireEvent.click(
        screen.getByRole('button', { name: /Send Recovery Email/i }),
      )
      expect(await screen.findByText(/Recovery Email Sent/i)).toBeTruthy()
      unmount()
    }
  })

  it('blocks ResetPasswordPage unless arrived via a valid recovery link, and allows valid recovery', async () => {
    // 1. Without recovery indicator -> shows Invalid or Expired Recovery Link
    window.history.replaceState(null, '', '/reset-password')
    const { unmount } = render(
      <AuthProvider>
        <MemoryRouter>
          <ResetPasswordPage />
        </MemoryRouter>
      </AuthProvider>,
    )
    expect(
      await screen.findByText(/Invalid or Expired Recovery Link/i),
    ).toBeTruthy()
    unmount()

    // 2. With type=recovery -> allows updating password
    window.history.replaceState(null, '', '/reset-password?type=recovery')
    render(
      <AuthProvider>
        <MemoryRouter>
          <ResetPasswordPage />
        </MemoryRouter>
      </AuthProvider>,
    )
    fireEvent.change(screen.getByLabelText(/^New Password$/i), {
      target: { value: 'StrongNewPass123' },
    })
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), {
      target: { value: 'StrongNewPass123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }))
    expect(await screen.findByText(/Password Reset Complete/i)).toBeTruthy()
  })

  it('validates ChangePasswordPage policy inside <AuthProvider>', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <ChangePasswordPage />
        </MemoryRouter>
      </AuthProvider>,
    )
    fireEvent.change(screen.getByLabelText(/^Current Password$/i), {
      target: { value: 'SamePassword123' },
    })
    fireEvent.change(screen.getByLabelText(/^New Password$/i), {
      target: { value: 'SamePassword123' },
    })
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), {
      target: { value: 'SamePassword123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }))
    expect(
      await screen.findByText(/must not be identical to your current password/i),
    ).toBeTruthy()
  })
})
