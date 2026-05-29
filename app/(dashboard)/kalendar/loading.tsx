export default function KalendarLoading() {
  return (
    <div className="p-4 md:p-6 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-muted rounded-md" />
          <div className="h-4 w-52 bg-muted/60 rounded-md" />
        </div>
        <div className="h-8 w-32 bg-muted rounded-md" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-6 w-36 bg-muted rounded-md" />
        <div className="h-8 w-28 bg-muted rounded-md" />
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-border">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="min-h-[68px] md:min-h-[104px] bg-card" />
          ))}
        </div>
      </div>
    </div>
  )
}
