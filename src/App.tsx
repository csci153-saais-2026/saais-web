import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router"

const StyleguidePage = lazy(() => import("@/routes/styleguide/StyleguidePage"))

function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl">SAAIS</h1>
      <p className="text-muted-foreground">Design system setup. Components live in src/components/ui.</p>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/styleguide" element={<StyleguidePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
