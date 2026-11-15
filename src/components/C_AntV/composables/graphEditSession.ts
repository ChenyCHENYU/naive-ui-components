import { cloneData, isDataEqual } from '../../../utils/data'

/** One node's business baseline, independent of SDK cell identity and unrelated edits. */
export function createGraphEditSession(
  readCurrent: (id: string) => unknown,
  readSource: (id: string) => unknown,
  closeEditor: () => void
) {
  let session: { id: string; current: unknown; source: unknown } | undefined

  const close = () => {
    session = undefined
    closeEditor()
  }
  const isCurrent = () => {
    if (!session) return false
    const current = readCurrent(session.id)
    const source = readSource(session.id)
    return (
      current !== undefined &&
      isDataEqual(current, session.current) &&
      (isDataEqual(source, session.source) ||
        // Controlled echoes can materialize optional SDK defaults in the public snapshot.
        isDataEqual(source, session.current))
    )
  }
  return {
    begin(id: string) {
      session = {
        id,
        current: cloneData(readCurrent(id)),
        source: cloneData(readSource(id)),
      }
    },
    validate() {
      if (session && !isCurrent()) close()
    },
    consume(id: string) {
      const valid = session?.id === id && isCurrent()
      // End ownership before SDK mutations or outward callbacks can reenter.
      close()
      return valid
    },
    close,
  }
}
