import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import AdminSettingsPage from './AdminSettingsPage'

const { getMock, putMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
  postMock: vi.fn(),
}))

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    apiClient: { GET: getMock, PUT: putMock, POST: postMock },
  }
})

const institutionSettings = {
  id: 'settings-institution',
  department_id: null,
  warning_pct: 25,
  probation_pct: 50,
  dismissal_pct: 75,
  sender_email: 'saais-noreply@vsu.edu.ph',
  last_backup_at: '2026-11-10T09:00:00Z',
  last_backup_by: 'admin-profile',
  last_backup_reference: 'BKP-2026-11-10-001',
  last_backup_location: 'institutional-storage/backups/latest.dump',
  last_backup_scope: 'institution_wide',
  updated_at: '2026-11-10T09:00:00Z',
} as const

const departmentSettings = {
  ...institutionSettings,
  id: 'settings-department',
  department_id: 'department-1',
  warning_pct: 5,
  probation_pct: 10,
  dismissal_pct: 20,
  sender_email: 'department@vsu.edu.ph',
} as const

function result(data: unknown) {
  return { data, error: undefined, response: new Response(null) }
}

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    putMock.mockReset()
    postMock.mockReset()
    getMock.mockResolvedValue(
      result([departmentSettings, institutionSettings]),
    )
    putMock.mockResolvedValue(result(institutionSettings))
    postMock.mockResolvedValue(result(institutionSettings))
  })

  afterEach(() => cleanup())

  it('loads a bounded safe projection and uses only institution-wide settings', async () => {
    render(<AdminSettingsPage />)

    expect(await screen.findByDisplayValue('25')).toBeTruthy()
    expect(screen.getByDisplayValue('50')).toBeTruthy()
    expect(screen.getByDisplayValue('75')).toBeTruthy()
    expect(screen.getByDisplayValue('saais-noreply@vsu.edu.ph')).toBeTruthy()
    expect(screen.getByText('BKP-2026-11-10-001')).toBeTruthy()
    expect(getMock).toHaveBeenCalledWith(
      '/rest/v1/system_settings',
      {
        params: {
          query: {
            select:
              'id,department_id,warning_pct,probation_pct,dismissal_pct,sender_email,last_backup_at,last_backup_reference,last_backup_location,last_backup_scope,updated_at',
            order: 'department_id.asc.nullsfirst,id.asc',
            limit: 1000,
          },
        },
      },
    )
  })

  it('does not use department settings if the institution-wide record is absent', async () => {
    getMock.mockResolvedValue(result([departmentSettings]))
    render(<AdminSettingsPage />)

    expect(
      await screen.findByText(
        'Institution-wide settings are not available. No department settings were used.',
      ),
    ).toBeTruthy()
    expect(screen.queryByDisplayValue('5')).toBeNull()
  })

  it('validates threshold ordering before saving and sends only threshold values', async () => {
    render(<AdminSettingsPage />)
    const warning = await screen.findByLabelText('Warning from (%)')
    const probation = screen.getByLabelText('Probation from (%)')
    const dismissal = screen.getByLabelText('Dismissal from (%)')

    fireEvent.change(warning, { target: { value: '50' } })
    fireEvent.change(probation, { target: { value: '50' } })
    fireEvent.change(dismissal, { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save thresholds' }))

    expect(await screen.findByText('Warning must be less than probation.')).toBeTruthy()
    expect(putMock).not.toHaveBeenCalled()

    fireEvent.change(warning, { target: { value: '20' } })
    fireEvent.change(probation, { target: { value: '45' } })
    fireEvent.change(dismissal, { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save thresholds' }))

    await waitFor(() => {
      expect(putMock).toHaveBeenCalledWith('/functions/v1/settings', {
        body: { warning_pct: 20, probation_pct: 45, dismissal_pct: 80 },
      })
    })
    expect(await screen.findByText('Academic-standing thresholds saved.')).toBeTruthy()
  })

  it('validates and saves sender email independently', async () => {
    render(<AdminSettingsPage />)
    const email = await screen.findByLabelText('Sender email')
    fireEvent.change(email, { target: { value: 'invalid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save sender email' }))

    expect(
      await screen.findByText(
        'Enter a valid email address (254 characters maximum).',
      ),
    ).toBeTruthy()
    expect(putMock).not.toHaveBeenCalled()

    fireEvent.change(email, { target: { value: 'notices@vsu.edu.ph' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save sender email' }))
    await waitFor(() => {
      expect(putMock).toHaveBeenCalledWith('/functions/v1/settings', {
        body: { sender_email: 'notices@vsu.edu.ph' },
      })
    })
    expect(await screen.findByText('Notification sender email saved.')).toBeTruthy()
  })

  it('shows API errors when a settings update fails', async () => {
    putMock.mockRejectedValueOnce(new Error('Settings update rejected.'))
    render(<AdminSettingsPage />)
    await screen.findByLabelText('Warning from (%)')
    fireEvent.click(screen.getByRole('button', { name: 'Save thresholds' }))

    expect(await screen.findByText('Settings update rejected.')).toBeTruthy()
  })

  it('records completed backup metadata without sending client actor or timestamp', async () => {
    render(<AdminSettingsPage />)
    await screen.findByText('BKP-2026-11-10-001')
    fireEvent.click(
      screen.getByRole('button', { name: 'Record completed backup' }),
    )

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        '/functions/v1/settings/record-backup',
        { body: { scope: 'institution_wide' } },
      )
    })
    expect(
      await screen.findByText(
        'Completed backup metadata recorded. This action did not create or run a backup.',
      ),
    ).toBeTruthy()
  })

  it('surfaces errors from the completed-backup metadata operation', async () => {
    postMock.mockRejectedValueOnce(new Error('Backup record rejected.'))
    render(<AdminSettingsPage />)
    await screen.findByText('BKP-2026-11-10-001')
    fireEvent.click(
      screen.getByRole('button', { name: 'Record completed backup' }),
    )

    expect(await screen.findByText('Backup record rejected.')).toBeTruthy()
  })
})
