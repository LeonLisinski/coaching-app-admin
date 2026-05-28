export default function TreneriLoading() {
  return (
    <div className="p-6 animate-pulse space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-24 bg-muted rounded-md" />
          <div className="h-4 w-40 bg-muted/60 rounded-md" />
        </div>
        <div className="h-8 w-20 bg-muted rounded-md" />
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="border border-border rounded-lg px-4 py-3 flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-36 bg-muted rounded" />
              <div className="h-3 w-28 bg-muted/60 rounded" />
            </div>
            <div className="h-5 w-16 bg-muted/50 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
