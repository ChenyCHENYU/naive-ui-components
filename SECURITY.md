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

### Bundled SheetJS runtime

Starting with 0.22.0, SheetJS Community Edition 0.20.3 is built from the unchanged official archive in `vendor/`. `bun run check:vendor` checks the reviewed SHA-512, actual build inputs and the license shipped with the package. See [third-party notices](./THIRD_PARTY_NOTICES.md) and [source maintenance](https://github.com/ChenyCHENYU/naive-ui-components/blob/main/vendor/README.md).

Consumers no longer install a separate SheetJS dependency for this library. Consequently, an application package-manager audit cannot inventory this bundled runtime as a standalone package, and application-level `xlsx` overrides do not replace it. Maintainers must monitor SheetJS advisories and release an updated component package when changing the bundled version. Archive integrity and passing spreadsheet regressions verify source identity and behavior; they do not establish that bundled code has no vulnerabilities.

### 2026-10-24 development dependency update

The final audit detected newly updated advisories for Happy DOM and fast-uri. The development environment now pins `happy-dom 21.0.4`, the patched version for [GHSA-834v-8h66-3h79](https://github.com/advisories/GHSA-834v-8h66-3h79), and overrides `fast-uri` to the compatible `3.1.9` patch for [scheme decoding](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), [relative paths](https://github.com/advisories/GHSA-xhq7-xmqj-769h), [host canonicalization](https://github.com/advisories/GHSA-wjr9-j795-jxcr), and [suffix references](https://github.com/advisories/GHSA-333x-w4r6-6crp). These updates do not expand the advisory exception below. Audit output is time-sensitive; rerun the gate against the actual lockfile.

### 2026-10-31 glob/minimatch review

The development graph now uses `glob 14.0.2` for the prior `13.0.6` path and `minimatch 11.0.1` for the prior `10.2.6` path, addressing the published [glob cancellation issue](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) and [minimatch preprocessing amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249). Overrides are version-specific because replacing the minimatch used by legacy glob 7 with 11 breaks its RegExp metadata contract. The callback and promise glob APIs, matching behavior and the actual formatter consumer are regression-tested.

Repository maintenance and all CI jobs are pinned to Bun 1.4.2. Testing the former 1.3.14 baseline showed it rejects the current v3 lockfile; regenerating a v1 lock with that version recorded conditional override declarations without updating the affected resolutions. A successful frozen install alone was therefore insufficient. The current pinned tool passes frozen installation and the gate checks the actual resolved versions. Consumer engine requirements are unchanged.

The advisory database currently labels every minimatch version below 11.0.1, but the [maintainer's original advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) identifies 10.2.6 and its `firstPhasePreProcess`/`optimizationLevel >= 2` path. Installed legacy `glob 7.2.3 → minimatch 3.1.5` does not contain that preprocessing mechanism. `scripts/legacy-minimatch-review.js` pins the exact legacy version and source SHA-256, rejects any unreviewed minimatch resolution, and checks the upstream amplification pattern through 1,024 repetitions: one alternative, linearly increasing path parts. Modern versions are independently checked. This is a conclusion about this specific advisory and path, not a general security guarantee for old versions.

`check:audit:raw` remains unchanged and may still report that legacy version. The gate reports it separately as `notAffected` after verifying the evidence, never as zero raw findings or as a local patch. Changed advisory identity, scope, severity, source, resolution or behavior fails the gate. The review does not apply to another advisory or an application's different dependency tree.

### Development toolchain: verified braces mitigation

As of 2026-10-23, the upstream [braces depth advisory GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects `braces <=3.0.3` and has no published fixed version. In this repository it is a development dependency through micromatch and build/release tools. It is absent from the production dependency graph.

`patchedDependencies` applies `patches/braces@3.0.3.patch` to version `3.0.3`. The patch bounds nested braces/parentheses and direct AST traversal to depth 100 in parse, compile, expand, and stringify. It does not claim to solve every possible glob or regular-expression complexity issue. Its reviewed SHA-256 is `6c59dad67310b2f93ed0fead159b0207845d70a6d30a5ae49384c2930df48303`.

- `bun run check:audit:raw` preserves the original audit JSON and exit status. The 2026-10-23 audit reported this high-severity advisory; later advisory-service results may differ.
- `bun run check:audit` executes the raw audit and classifies this exact advisory as locally mitigated only after checking the patch declaration, bytes, installed version, resolution used by micromatch, depth rejection (including independently constructed ASTs), and ordinary glob behavior. The separate legacy minimatch review above has its own evidence checks and classification. Network errors, malformed responses, unknown advisories, missing patches, or failed behavior checks fail the gate.
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
