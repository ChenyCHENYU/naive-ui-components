# Security Policy

## Supported versions

Security fixes are applied to the latest published minor release. Consumers should keep Vue, Naive UI, and this package on supported versions and install from the lockfile used by their application.

## Reporting a vulnerability

Please use GitHub's private security-advisory flow for the repository. Include the affected component and version, a minimal reproduction, expected impact, and any suggested mitigation. Do not open a public issue before a fix or mitigation is available.

## Trust boundaries

- `C_Captcha` local mode is a UI interaction check, not authentication. Its client token and timestamp are untrusted telemetry. Sensitive flows must configure `verifier` with `requireServerVerification`, validate an independent server/provider-issued challenge, and return a short-lived, single-use token bound to the session or operation. Fail-closed mode rejects successful responses that omit this token.
- `C_Captcha` ALTCHA mode is self-hosted and forces server verification. The application server must sign fresh challenges, validate payloads with a server-only secret, enforce expiration and single use, bind the returned token to the session or operation, and apply rate limits. The browser must never receive the HMAC secret.
- Rich HTML is sanitized by the library, but applications must still apply server-side validation, output encoding, CSP, and authorization. Client-side sanitization is not an authorization boundary.
- Formula evaluation uses a bounded parser and does not execute arbitrary JavaScript. Do not replace it with `eval` or `Function` for untrusted input.
- Upload type, size, hashing, and chunk checks improve UX and integrity but do not replace server-side content validation, malware scanning, quotas, or access control.
- Spreadsheet, document, image, audio, video, and map sources remain untrusted external content. Apply suitable origin, CSP, download, and privacy policies in the host application.
- `C_Map` loads AMap only when explicitly selected. AMap consumers must allow `https://webapi.amap.com` in `script-src`, configure domain allowlists and quotas at the provider, and treat the browser API key as public metadata rather than a server secret. OSM tile URLs and custom tile sources should be restricted by the host application's `img-src` and privacy policy.
- AMap keys issued after 2021-12-02 require a security credential. Production deployments should use `amapSecurityConfig.serviceHost` with a same-origin `/_AMapService` proxy so the credential remains server-side; plaintext `securityJsCode` is intended for local development only.

## Dependency and release controls

The release pipeline audits direct and transitive dependencies and verifies dependency boundaries, public exports, ESM/CJS consumption, SSR behavior, declaration portability, and package-size budgets. Optional peers are feature-scoped: `vue-router` is used by route-aware navigation components, and `sortablejs` is used by C_Table dragging.

Run `bun install --frozen-lockfile` and `bun run verify` before publishing. Review changes to `bun.lock`, remote tarball URLs, package exports, and `sideEffects` as release-sensitive files.

### Development toolchain: one verified local mitigation

As of 2026-10-23, the upstream [braces depth advisory GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects `braces <=3.0.3` and has no published fixed version. In this repository it is a development dependency through micromatch and build/release tools. It is absent from the production dependency graph.

`patchedDependencies` applies `patches/braces@3.0.3.patch` to version `3.0.3`. The patch bounds nested braces/parentheses and direct AST traversal to depth 100 in parse, compile, expand, and stringify. It does not claim to solve every possible glob or regular-expression complexity issue. Its reviewed SHA-256 is `6c59dad67310b2f93ed0fead159b0207845d70a6d30a5ae49384c2930df48303`.

- `bun run check:audit:raw` preserves the original audit JSON and exit status. The 2026-10-23 audit reported this high-severity advisory; later advisory-service results may differ.
- `bun run check:audit` executes the raw audit and accepts only that exact advisory after checking the patch declaration, bytes, installed version, resolution used by micromatch, depth rejection (including independently constructed ASTs), and ordinary glob behavior. Network errors, malformed responses, unknown advisories, missing patches, or failed behavior checks fail the gate.
- When the service reports this exact advisory, a successful gate reports **locally mitigated** and retains the raw finding count. A clean service response reports zero raw findings separately; patch behavior is still verified. Replace the local patch with an upstream fixed release and remove this exception after verifying the replacement; do not broaden the exception to other advisories.

The checked repository production lock currently has no audit findings. This result does not carry over automatically to an application's dependency graph.

### Published consumers: application lockfile and overrides

Package-root overrides and development patches do not propagate into applications installing this library. Consumers must audit their own lockfile. A fresh production install on 2026-10-23, without application overrides, resolved five advisories through current Visactor releases:

| Dependency path                                                                  | Installed dependency    | Audit scope and inspected runtime path                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@visactor/vtable@1.26.8` (also used by `@visactor/vtable-gantt`)                | Pinned `lodash@4.17.21` | Three advisories: [unset/omit](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg), [template imports](https://github.com/advisories/GHSA-r5fr-rjxr-66jc), [array-path unset/omit bypass](https://github.com/advisories/GHSA-f23m-r3pf-42rh). The inspected VTable ESM/CJS sources import only `lodash/get` in `CachedDataSource`; these affected functions were not on that observed path. |
| `@visactor/vdataset@1.0.28` → `geojson-dissolve@3.1.0` → `geojson-flatten@0.2.4` | Pinned `minimist@1.2.0` | [Critical](https://github.com/advisories/GHSA-xvch-5gv4-984h) and [moderate](https://github.com/advisories/GHSA-vh95-rmgr-6w4m) prototype-pollution advisories. The inspected `geojson-flatten` package uses minimist in its command-line executable, not its library entry.                                                                                                               |

These observations distinguish installation findings from the inspected browser path; they are not a guarantee that no application can reach the affected code. The latest compatible Visactor releases still contain these fixed old versions, so upgrading the SDK does not yet remove the findings.

For Bun/npm applications, add these explicit application-level overrides, reinstall, commit the updated lockfile, and audit it:

```json
{
  "overrides": {
    "lodash": "4.18.1",
    "minimist": "1.2.8",
    "markdown-it": "14.3.3"
  }
}
```

The Markdown override also protects existing consumer lockfiles: `md-editor-v3@6.5.6` declares `markdown-it ^14.0.0`, which permits older vulnerable 14.x resolutions to remain installed. The latest 6.x editor has no security lower bound for Markdown; this library retains its compatible editor API. Equivalent pnpm/Yarn applications should use their package manager's application-level override/resolution mechanism.

A separate fresh production install with those three overrides passed `bun audit --production --json` with `{}`. This verifies that configuration at the stated date; rerun the audit as advisories and application dependencies change. DOMPurify is declared with the direct safe lower bound `^3.4.17`.
