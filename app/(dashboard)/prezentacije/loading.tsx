export default function PrezentacijeLoading() {
  return (
    <div className="p-6 max-w-3xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-6 w-36 bg-muted rounded-md" />
          <div className="h-4 w-52 bg-muted/60 rounded-md" />
        </div>
        <div className="h-8 w-28 bg-muted rounded-md" />
      </div>
      <div className="flex gap-2 mb-5">
        {[48, 88, 88, 72].map((w, i) => (
          <div key={i} className="h-8 rounded-md bg-muted" style={{ width: w }} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border border-border border-l-4 border-l-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-48 bg-muted rounded" />
              <div className="h-5 w-20 bg-muted/50 rounded-full" />
            </div>
            <div className="h-4 w-56 bg-muted/60 rounded" />
            <div className="h-3 w-36 bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
