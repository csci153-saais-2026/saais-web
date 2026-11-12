import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router"

const StyleguidePage = lazy(() => import("@/routes/styleguide/StyleguidePage"))
const LoginPage = lazy(() => import("@/routes/auth/LoginPage"))
const DocsHubPage = lazy(() => import("@/routes/docs/DocsHubPage"))
const OpenApiDocsPage = lazy(() => import("@/routes/docs/OpenApiDocsPage"))

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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/docs" element={<DocsHubPage />} />
          <Route path="/docs/openapi" element={<OpenApiDocsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
