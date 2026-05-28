export default function FinancijeLoading() {
  return (
    <div className="p-6 animate-pulse space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-6 w-32 bg-muted rounded-md" />
        <div className="h-4 w-48 bg-muted/60 rounded-md" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border border-border rounded-lg p-4 space-y-2">
            <div className="h-3 w-20 bg-muted/60 rounded" />
            <div className="h-7 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
      {/* Rows */}
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="border border-border rounded-lg px-4 py-3 flex gap-4">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted/60 rounded" />
            <div className="h-4 w-24 bg-muted/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
