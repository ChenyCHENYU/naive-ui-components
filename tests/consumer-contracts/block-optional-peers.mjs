import Module, { register } from 'node:module'
import { createPeerGuard } from './optional-peer-policy.mjs'

const peers = JSON.parse(process.env.ROBOT_CONSUMER_BLOCKED_PEERS)
const assertAllowed = createPeerGuard(peers)
register(new URL('./optional-peer-loader.mjs', import.meta.url), {
  data: { peers },
})

// Node 20.19 has async ESM registration, but no synchronous registerHooks API.
// Guard CommonJS independently so createRequire from symlinked packages cannot escape.
const originalResolve = Module._resolveFilename
Module._resolveFilename = function (specifier, ...options) {
  assertAllowed(specifier)
  const result = Reflect.apply(originalResolve, this, [specifier, ...options])
  assertAllowed(result)
  return result
}
