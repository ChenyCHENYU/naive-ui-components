import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** Browser launches from macOS Codex require approval for the concrete shell command. */
export default function setup() {
  if (
    process.platform === 'darwin' &&
    process.env.CODEX_SANDBOX === 'seatbelt'
  ) {
    throw new Error(
      'Codex macOS sandbox cannot launch browsers. Run this exact test command with sandbox_permissions=require_escalated after approval. Do not remove CODEX_SANDBOX or retry in the sandbox.'
    )
  }
  if (
    !existsSync(
      resolve('node_modules/.cache/search-workflows/consumer-build.json')
    )
  ) {
    throw new Error(
      'Missing dist consumer fixtures. Run bun run build, then bun run check:search-workflows before browser tests.'
    )
  }
}
