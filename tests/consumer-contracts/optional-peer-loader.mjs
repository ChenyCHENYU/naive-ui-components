import { createPeerGuard } from './optional-peer-policy.mjs'

let assertAllowed

/** Receive the optional peers denied in this isolated child process. */
export function initialize({ peers }) {
  assertAllowed = createPeerGuard(peers)
}

/** Block bare imports and resolved files even when dependencies escape via symlinks. */
export async function resolve(specifier, context, nextResolve) {
  assertAllowed(specifier)
  const result = await nextResolve(specifier, context)
  assertAllowed(result.url)
  return result
}
