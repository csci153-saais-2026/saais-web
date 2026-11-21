import { LandingHeader } from '@/routes/landing/components/LandingHeader'

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <LandingHeader />
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="font-heading text-3xl font-bold">SAAIS</h1>
        <p className="mt-2 text-muted-foreground">
          Student Academic Advising Information System.
        </p>
      </main>
    </div>
  )
}
