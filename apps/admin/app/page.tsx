export default function Page() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Linkaro — Administration
        </h1>
        <p className="text-muted-foreground">
          Pilotage des clients et supervision technique. L&apos;accès sera
          réservé à l&apos;équipe, avec double authentification.
        </p>
      </div>
    </main>
  )
}
