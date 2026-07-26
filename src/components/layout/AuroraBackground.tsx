/**
 * Glass needs something behind it. With a flat background, backdrop-filter
 * has nothing to refract and every panel just looks like a grey box — so
 * these three blurred blobs are load-bearing, not decoration.
 *
 * Hidden entirely under `.no-glass` (see index.css).
 */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[var(--bg-base)]" />

      <div
        className="mesh-layer absolute -left-[10%] -top-[15%] size-[55vmax] rounded-full opacity-70 blur-[110px]"
        style={{
          background: 'var(--mesh-1)',
          animation: 'mesh-drift 22s ease-in-out infinite',
        }}
      />
      <div
        className="mesh-layer absolute -right-[12%] top-[5%] size-[45vmax] rounded-full opacity-60 blur-[110px]"
        style={{
          background: 'var(--mesh-2)',
          animation: 'mesh-drift 28s ease-in-out infinite reverse',
        }}
      />
      <div
        className="mesh-layer absolute -bottom-[20%] left-[20%] size-[50vmax] rounded-full opacity-55 blur-[120px]"
        style={{
          background: 'var(--mesh-3)',
          animation: 'mesh-drift 25s ease-in-out infinite',
          animationDelay: '-8s',
        }}
      />

      {/* Faint grid, keeps large empty areas from reading as unfinished. */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
        }}
      />
    </div>
  )
}
