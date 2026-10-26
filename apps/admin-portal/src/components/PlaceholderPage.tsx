export interface PlannedSection {
  title: string
  items: string[]
}

interface PlaceholderPageProps {
  title: string
  description: string
  // What has to exist before this page can be wired up (e.g. the customer
  // app's backend). Shown so nobody mistakes an empty page for a broken one.
  waitingOn?: string
  // What the page will manage once built - lets a reserved page double as
  // its own spec instead of just saying "not yet implemented".
  planned?: PlannedSection[]
}

export function PlaceholderPage({ title, description, waitingOn, planned }: PlaceholderPageProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      {waitingOn && (
        <p className="inline-block rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Coming soon — waiting on: {waitingOn}
        </p>
      )}
      {planned ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {planned.map((section) => (
            <div key={section.title} className="rounded-xl border border-dashed border-border p-5">
              <h2 className="text-sm font-semibold">{section.title}</h2>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Not yet implemented.
        </div>
      )}
    </div>
  )
}
