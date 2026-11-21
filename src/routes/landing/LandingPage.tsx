import { HeroChecklistPreview } from '@/routes/landing/components/HeroChecklistPreview'
import { LandingHeader } from '@/routes/landing/components/LandingHeader'
import { LandingHero } from '@/routes/landing/components/LandingHero'
import { MissionBand } from '@/routes/landing/components/MissionBand'
import { PortalsOverviewSection } from '@/routes/landing/components/PortalsOverviewSection'

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <LandingHeader />
      <main>
        <LandingHero>
          <HeroChecklistPreview />
        </LandingHero>
        <PortalsOverviewSection />
        <MissionBand />
      </main>
    </div>
  )
}
