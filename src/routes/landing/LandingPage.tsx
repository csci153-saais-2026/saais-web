import { FeatureTabsSection } from '@/routes/landing/components/FeatureTabsSection'
import { HeroChecklistPreview } from '@/routes/landing/components/HeroChecklistPreview'
import { LandingHeader } from '@/routes/landing/components/LandingHeader'
import { LandingHero } from '@/routes/landing/components/LandingHero'
import { MissionBand } from '@/routes/landing/components/MissionBand'
import { PortalsOverviewSection } from '@/routes/landing/components/PortalsOverviewSection'
import { PrerequisiteShowcaseSection } from '@/routes/landing/components/PrerequisiteShowcaseSection'
import { RoadmapSection } from '@/routes/landing/components/RoadmapSection'
import { RulesEngineGrid } from '@/routes/landing/components/RulesEngineGrid'
import { TrustAndMetricsSection } from '@/routes/landing/components/TrustAndMetricsSection'
import { WorkflowStepsSection } from '@/routes/landing/components/WorkflowStepsSection'

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
        <FeatureTabsSection />
        <PrerequisiteShowcaseSection />
        <TrustAndMetricsSection />
        <WorkflowStepsSection />
        <RulesEngineGrid />
        <RoadmapSection />
      </main>
    </div>
  )
}
