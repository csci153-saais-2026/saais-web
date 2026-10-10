import React, { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Alert } from '../../components/ui/alert'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@') || !email.endsWith('.edu.ph')) {
      setErrorMessage(
        `Sign-in was rejected: ${email || 'Provided email'} is not a registered institutional profile. Contact an administrator.`
      )
      return
    }
    setErrorMessage(null)
    console.log('Logging in with:', { email, password, keepSignedIn })
  }

  return (
    <div className="flex min-h-screen bg-[#FBF8EF]">
      <aside className="hidden lg:flex w-[580px] xl:w-[620px] shrink-0 bg-[#1D2F0A] p-[56px_52px] flex-col relative overflow-hidden">
        <div
          className="absolute -left-[140px] -bottom-[180px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 40% 40%, rgba(224,168,46,0.16), rgba(224,168,46,0) 65%)',
            width: '520px',
            height: '520px',
          }}
        />

        <div className="relative flex items-center gap-[11px]">
          <img
            src="/logo-mark.png"
            alt="SAAIS Logo"
            className="w-[40px] h-[40px] rounded-[8px]"
          />
          <span className="dsp text-[23px] text-[#FBF8EF]">SAAIS</span>
        </div>

        <div className="grow" />

        <div className="relative">
          <div className="kick text-[#E0A82E]">Signing in</div>
          <h2 className="dsp text-[38px] text-[#FBF8EF] mt-4 max-w-[16ch]">
            The advising file, exactly as your role may see it.
          </h2>

          <div className="flex flex-col gap-[13px] mt-[30px] pt-[24px] border-t border-[rgba(246,242,228,0.14)]">
            <div className="flex items-center gap-[9px] text-[13px] text-[rgba(246,242,228,0.62)]">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="#E0A82E"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3l7.5 3v6c0 4.4-3.1 7.6-7.5 9-4.4-1.4-7.5-4.6-7.5-9V6z" />
                <path d="M9 12l2.2 2.2L15.5 10" />
              </svg>
              <span>Accounts are provisioned by an administrator — there is no public sign-up.</span>
            </div>

            <div className="flex items-center gap-[9px] text-[13px] text-[rgba(246,242,228,0.62)]">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="#E0A82E"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4.5" y="10" width="15" height="10.5" rx="1.6" />
                <path d="M8 10V7a4 4 0 018 0v3" />
              </svg>
              <span>Google sign-in is matched against the pre-registered profile server-side.</span>
            </div>

            <div className="flex items-center gap-[9px] text-[13px] text-[rgba(246,242,228,0.62)]">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="#E0A82E"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13.5 3H7a1.5 1.5 0 00-1.5 1.5v15A1.5 1.5 0 007 21h10a1.5 1.5 0 001.5-1.5V8z" />
                <path d="M13.5 3v5H18.5" />
              </svg>
              <span>Every sign-in and role change is written to the audit log.</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="grow flex items-center justify-center p-6 sm:p-14">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-[10px] mb-8">
            <img src="/logo-mark.png" alt="SAAIS Logo" className="w-8 h-8 rounded-md" />
            <span className="dsp text-[20px] text-[#1D2F0A]">SAAIS</span>
          </div>

          <h1 className="dsp text-[32px] text-[#16200C]">Sign in</h1>
          <p className="text-[14.5px] text-[#6E6C58] mt-2 leading-[1.5]">
            Use your institutional account. If your email is not registered, ask your department administrator to provision it.
          </p>

          <Button
            type="button"
            variant="secondary"
            className="w-full flex items-center justify-center gap-[11px] mt-7"
            onClick={() => console.log('Google Auth clicked')}
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill="#5F6368">
              <path d="M21 12.2c0-.7-.06-1.36-.18-2H12v3.8h5.05a4.32 4.32 0 01-1.87 2.83v2.35h3.02C19.96 17.5 21 15.1 21 12.2z" />
              <path d="M12 21.5c2.53 0 4.65-.84 6.2-2.27l-3.02-2.35c-.84.56-1.9.9-3.18.9-2.44 0-4.5-1.65-5.24-3.87H3.64v2.42A9.5 9.5 0 0012 21.5z" />
              <path d="M6.76 13.9a5.7 5.7 0 010-3.64V7.84H3.64a9.5 9.5 0 000 8.48z" />
              <path d="M12 6.4c1.38 0 2.61.47 3.58 1.4l2.68-2.68C16.64 3.6 14.52 2.7 12 2.7a9.5 9.5 0 00-8.36 5.14l3.12 2.42C7.5 8.04 9.56 6.4 12 6.4z" />
            </svg>
            <span>Continue with Google</span>
          </Button>

          <div className="flex items-center gap-[14px] my-[22px] text-[#8C8A76] text-[12px]">
            <div className="grow h-[1px] bg-[#E1DBC6]" />
            <span>OR</span>
            <div className="grow h-[1px] bg-[#E1DBC6]" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email">Institutional email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria.bautista@university.edu.ph"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-2 text-[13.5px] text-[#6E6C58] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-[15px] h-[15px] accent-[#2F4A12] rounded-[3px]"
                />
                <span>Keep me signed in</span>
              </label>
              <a href="#forgot-password" className="text-[13.5px] font-semibold text-[#2F4A12] hover:text-[#B0761A]">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-1"
            >
              Sign in
            </Button>
          </form>

          {errorMessage && (
            <div className="mt-6">
              <Alert variant="error">{errorMessage}</Alert>
            </div>
          )}

          <p className="text-[12.5px] text-[#8C8A76] mt-[22px] leading-[1.55]">
            By signing in you accept that your academic records are processed under the institution's privacy notice.{' '}
            <a href="#privacy-notice" className="text-[#2F4A12] hover:text-[#B0761A]">
              Read the notice
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
