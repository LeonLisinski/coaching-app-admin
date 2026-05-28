export default function DostupnostLoading() {
  return (
    <div className="p-6 max-w-2xl mx-auto animate-pulse space-y-8">
      <div className="space-y-1.5">
        <div className="h-3 w-28 bg-muted/50 rounded mb-3" />
        <div className="h-6 w-52 bg-muted rounded-md" />
        <div className="h-4 w-64 bg-muted/60 rounded-md" />
      </div>
      <div className="space-y-3">
        <div className="h-3.5 w-32 bg-muted/60 rounded" />
        <div className="border border-border rounded-lg overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
              <div className="flex gap-4">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-28 bg-muted/60 rounded" />
              </div>
              <div className="h-7 w-7 bg-muted/40 rounded-md" />
            </div>
          ))}
          <div className="p-4 bg-muted/30 space-y-2">
            <div className="h-3 w-24 bg-muted/50 rounded" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-9 bg-muted rounded-md" />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
