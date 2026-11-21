import { useState } from 'react'
import { FeatureTabsSection } from '@/routes/landing/components/FeatureTabsSection'
import { HeroChecklistPreview } from '@/routes/landing/components/HeroChecklistPreview'
import { LandingCtaSection } from '@/routes/landing/components/LandingCtaSection'
import { LandingFooter } from '@/routes/landing/components/LandingFooter'
import { LandingHeader } from '@/routes/landing/components/LandingHeader'
import { LandingHero } from '@/routes/landing/components/LandingHero'
import { MissionBand } from '@/routes/landing/components/MissionBand'
import { PortalsOverviewSection } from '@/routes/landing/components/PortalsOverviewSection'
import { PrerequisiteShowcaseSection } from '@/routes/landing/components/PrerequisiteShowcaseSection'
import { RoadmapSection } from '@/routes/landing/components/RoadmapSection'
import { RulesEngineGrid } from '@/routes/landing/components/RulesEngineGrid'
import { TrustAndMetricsSection } from '@/routes/landing/components/TrustAndMetricsSection'
import { WalkthroughDialog } from '@/routes/landing/components/WalkthroughDialog'
import { WorkflowStepsSection } from '@/routes/landing/components/WorkflowStepsSection'

export default function LandingPage() {
  const [walkthroughOpen, setWalkthroughOpen] = useState(false)
  const openWalkthrough = () => setWalkthroughOpen(true)

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <LandingHeader onRequestWalkthrough={openWalkthrough} />
      <main>
        <LandingHero onRequestWalkthrough={openWalkthrough}>
          <HeroChecklistPreview />
        </LandingHero>
        <PortalsOverviewSection />
        <MissionBand />
        <FeatureTabsSection />
        <PrerequisiteShowcaseSection />
        <TrustAndMetricsSection />
        <WorkflowStepsSection />
        <RulesEngineGrid />
        <RoadmapSection />
        <LandingCtaSection onRequestWalkthrough={openWalkthrough} />
      </main>
      <LandingFooter />
      <WalkthroughDialog
        open={walkthroughOpen}
        onOpenChange={setWalkthroughOpen}
      />
    </div>
  )
}
