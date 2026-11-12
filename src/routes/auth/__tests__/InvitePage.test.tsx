import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import InvitePage from '../InvitePage'
import ForgotPasswordPage from '../ForgotPasswordPage'
import ResetPasswordPage from '../ResetPasswordPage'
import ChangePasswordPage from '../ChangePasswordPage'
import { apiClient } from '@/lib/api'

describe('InvitePage & Password Flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('displays an error if no invitation token is found in the URL hash', async () => {
    window.location.hash = ''
    render(
      <MemoryRouter>
        <InvitePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/No invitation token found/i)).toBeTruthy()
  })

  it('loads invitation preview details from hash token and removes the hash from browser history', async () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    window.location.hash = '#token=valid-invite-token-12345'

    vi.spyOn(apiClient, 'POST').mockResolvedValueOnce({
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
      <MemoryRouter>
        <InvitePage />
      </MemoryRouter>,
    )

    // Verify hash fragment was scrubbed from browser history immediately
    expect(replaceStateSpy).toHaveBeenCalled()

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Maria Santos/i)).toBeTruthy()
    })
    expect(screen.getByText('maria@vsu.edu.ph')).toBeTruthy()
    expect(screen.getAllByText('DCST').length).toBeGreaterThan(0)
    expect(screen.getByText('BSCS')).toBeTruthy()
  })

  it('enforces password policy and activates account via POST /functions/v1/auth/verify-invite', async () => {
    window.location.hash = '#token=valid-invite-token-12345'

    const postSpy = vi
      .spyOn(apiClient, 'POST')
      .mockResolvedValueOnce({
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
      .mockResolvedValueOnce({
        data: {
          message: 'Account activated successfully.',
          user_id: 'user-maria',
          role: 'student',
          roles: ['student'],
        },
        error: undefined,
        response: new Response(),
      } as never)

    render(
      <MemoryRouter>
        <InvitePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Maria Santos/i)).toBeTruthy()
    })

    // 1. Weak password rejected client-side
    fireEvent.change(screen.getByLabelText(/^Create Password$/i), {
      target: { value: 'short' },
    })
    fireEvent.change(screen.getByLabelText(/^Confirm Password$/i), {
      target: { value: 'short' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Activate Account/i }))

    expect(
      await screen.findByText(/Password must be between 12 and 128 characters/i),
    ).toBeTruthy()

    // 2. Valid password activates account
    fireEvent.change(screen.getByLabelText(/^Create Password$/i), {
      target: { value: 'ValidPassword123' },
    })
    fireEvent.change(screen.getByLabelText(/^Confirm Password$/i), {
      target: { value: 'ValidPassword123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Activate Account/i }))

    await waitFor(() => {
      expect(screen.getByText(/Account Activated!/i)).toBeTruthy()
    })

    expect(postSpy).toHaveBeenCalledWith('/functions/v1/auth/verify-invite', {
      body: { token: 'valid-invite-token-12345', password: 'ValidPassword123' },
    })
  })

  it('declines an invitation via POST /functions/v1/auth/decline-invite', async () => {
    window.location.hash = '#token=decline-token-99999'

    const postSpy = vi
      .spyOn(apiClient, 'POST')
      .mockResolvedValueOnce({
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
      .mockResolvedValueOnce({
        data: {
          message: 'Invitation declined.',
          invitation_status: 'declined',
        },
        error: undefined,
        response: new Response(),
      } as never)

    render(
      <MemoryRouter>
        <InvitePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Maria Santos/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Decline Invitation/i }))

    await waitFor(() => {
      expect(screen.getByText(/Invitation Declined/i)).toBeTruthy()
    })

    expect(postSpy).toHaveBeenCalledWith('/functions/v1/auth/decline-invite', {
      body: { token: 'decline-token-99999' },
    })
  })

  it('validates ForgotPasswordPage, ResetPasswordPage, and ChangePasswordPage', async () => {
    // ForgotPasswordPage rejects non-institutional email
    const { unmount: unmountForgot } = render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText(/Institutional email/i), {
      target: { value: 'user@gmail.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Send Recovery Email/i }))
    expect(
      await screen.findByText(/Please enter a valid institutional email address/i),
    ).toBeTruthy()
    unmountForgot()

    // ResetPasswordPage completes password reset with valid 12+ char password
    const { unmount: unmountReset } = render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText(/^New Password$/i), {
      target: { value: 'StrongNewPass123' },
    })
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), {
      target: { value: 'StrongNewPass123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }))
    expect(await screen.findByText(/Password Reset Complete/i)).toBeTruthy()
    unmountReset()

    // ChangePasswordPage rejects reusing the same current password
    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>,
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
