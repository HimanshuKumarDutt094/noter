import { PGlite } from '@electric-sql/pglite'

// Singleton PGlite instance persisted in IndexedDB
export const pg = new PGlite('idb://todoist')

// Expose an explicit async shutdown helper for app root / tests
export async function shutdownPg(): Promise<void> {
  try {
    await pg.close()
  } catch {
    // ignore: best-effort shutdown
  }
}

// Ensure clean shutdown to flush pending writes before tab closes or hides
let listenersRegistered = false

function registerLifecycleListeners() {
  if (listenersRegistered) return
  if (typeof window === 'undefined') return

  const onBeforeUnload = () => {
    // fire-and-forget; ensure pending work is flushed
    void shutdownPg()
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      void shutdownPg()
    }
  }

  window.addEventListener('beforeunload', onBeforeUnload)
  document.addEventListener('visibilitychange', onVisibilityChange)

  // HMR cleanup to avoid duplicate listeners (typed guard, no any-cast)
  if (typeof import.meta !== 'undefined' && 'hot' in import.meta) {
    const hot = (import.meta as unknown as { hot?: { dispose(cb: () => void): void } }).hot
    hot?.dispose(() => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    })
  }

  listenersRegistered = true
}

registerLifecycleListeners()
