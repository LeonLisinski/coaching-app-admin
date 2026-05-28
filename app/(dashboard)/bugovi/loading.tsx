export default function BugoviLoading() {
  return (
    <div className="p-6 animate-pulse space-y-5">
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 bg-muted rounded-md" />
        <div className="h-8 w-24 bg-muted rounded-md" />
      </div>
      <div className="flex gap-2 mb-2">
        {[48, 72, 64, 60].map((w, i) => (
          <div key={i} className="h-7 rounded-md bg-muted" style={{ width: w }} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="border border-border rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-52 bg-muted rounded" />
              <div className="h-5 w-14 bg-muted/50 rounded-full" />
            </div>
            <div className="h-3 w-40 bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
