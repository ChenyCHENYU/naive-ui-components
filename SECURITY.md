# Security Policy

## Supported versions

Security fixes are applied to the latest published minor release. Consumers should keep Vue, Naive UI, and this package on supported versions and install from the lockfile used by their application.

## Reporting a vulnerability

Please use GitHub's private security-advisory flow for the repository. Include the affected component and version, a minimal reproduction, expected impact, and any suggested mitigation. Do not open a public issue before a fix or mitigation is available.

## Trust boundaries

- `C_Captcha` local mode is a UI interaction check, not authentication. Its client token and timestamp are untrusted telemetry. Sensitive flows must configure `verifier` with `requireServerVerification`, validate an independent server/provider-issued challenge, and return a short-lived, single-use token bound to the session or operation. Fail-closed mode rejects successful responses that omit this token.
- Rich HTML is sanitized by the library, but applications must still apply server-side validation, output encoding, CSP, and authorization. Client-side sanitization is not an authorization boundary.
- Formula evaluation uses a bounded parser and does not execute arbitrary JavaScript. Do not replace it with `eval` or `Function` for untrusted input.
- Upload type, size, hashing, and chunk checks improve UX and integrity but do not replace server-side content validation, malware scanning, quotas, or access control.
- Spreadsheet, document, image, audio, video, and map sources remain untrusted external content. Apply suitable origin, CSP, download, and privacy policies in the host application.
- `C_Map` loads AMap only when explicitly selected. AMap consumers must allow `https://webapi.amap.com` in `script-src`, configure domain allowlists and quotas at the provider, and treat the browser API key as public metadata rather than a server secret. OSM tile URLs and custom tile sources should be restricted by the host application's `img-src` and privacy policy.

## Dependency and release controls

The release pipeline audits direct and transitive dependencies and verifies dependency boundaries, public exports, ESM/CJS consumption, SSR behavior, declaration portability, and package-size budgets. Optional peers are feature-scoped: `vue-router` is used by route-aware navigation components, and `sortablejs` is used by C_Table dragging.

Run `bun install --frozen-lockfile` and `bun run verify` before publishing. Review changes to `bun.lock`, remote tarball URLs, package exports, and `sideEffects` as release-sensitive files.
