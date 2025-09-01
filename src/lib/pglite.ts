import { PGlite } from '@electric-sql/pglite'

// Singleton PGlite instance persisted in IndexedDB
export const pg = new PGlite('idb://todoist')

// Ensure clean shutdown to flush pending writes before tab closes or hides
if (typeof window !== 'undefined') {
  const closeDb = () => {
    // fire-and-forget; PGlite query methods await readiness implicitly
    void pg.close()
  }
  window.addEventListener('beforeunload', closeDb)
}
