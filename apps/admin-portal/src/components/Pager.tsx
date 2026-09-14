interface PagerProps {
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
}

// Shared Prev/Next pager for every paginated admin table — renders nothing
// when everything already fits on one page, so it's safe to drop in
// unconditionally below any list.
export function Pager({ page, total, pageSize, onChange }: PagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between pt-1 text-sm">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-border px-3 py-1.5 text-foreground disabled:opacity-40"
      >
        Prev
      </button>
      <span className="text-muted-foreground">
        Page {page} of {totalPages} · {total} total
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg border border-border px-3 py-1.5 text-foreground disabled:opacity-40"
      >
        Next
      </button>
    </div>
  )
}
