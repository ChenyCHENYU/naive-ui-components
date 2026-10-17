/** Reject the package before resolution and any physical node_modules fallback. */
export function createPeerGuard(peers) {
  return specifier => {
    if (typeof specifier !== 'string') return
    const normalized = specifier.replaceAll('\\', '/')
    const blocked = peers.find(
      peer =>
        normalized === peer ||
        normalized.startsWith(`${peer}/`) ||
        normalized.includes(`/node_modules/${peer}/`) ||
        normalized.endsWith(`/node_modules/${peer}`)
    )
    if (!blocked) return
    const error = new Error(
      `Optional peer blocked by consumer contract: ${blocked}`
    )
    error.code = 'ERR_ROBOT_OPTIONAL_PEER_BLOCKED'
    throw error
  }
}
