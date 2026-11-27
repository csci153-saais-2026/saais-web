import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-3xl content-center gap-4 p-8">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        The address may be incorrect or the page may have moved.
      </p>
      <Link className="text-primary underline" to="/">
        Return to SAAIS
      </Link>
    </main>
  );
}
