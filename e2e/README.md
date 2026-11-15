# Dist browser contracts

These tests open the production build of `dev/search-workflows`. Components use public package subpaths, resolving to `dist`; the Vite build rejects library `src` runtime modules and emits `consumer-build.json`. The parity helper's shared workflow import resolves through the public `workflows` export in this browser build while its unit tests keep using source. This is a built-package browser contract, not a fresh-registry installation test or SSR/hydration test.

Run in order:

```sh
bun run build
bun run check:search-workflows
bun run type-check:e2e
bun run playwright install chromium firefox webkit
bun run test:browser
bun run test:performance
```

The test commands only preview existing output on dedicated port 4191; they do not rebuild it or reuse another server. Port 4190 is deliberately avoided because Firefox and WebKit restrict it. On macOS Codex with `CODEX_SANDBOX=seatbelt`, the setup refuses browser launch unconditionally. Request `sandbox_permissions=require_escalated` for the concrete command; do not clear the sandbox marker or add a bypass environment variable. Ordinary terminals and CI follow their existing permissions.

The browser suite runs eight cases in Chromium, Firefox and WebKit, without retries:

- Master/detail replacement and clearing, plus independent failure/retry.
- Real consecutive quality inputs, exact strings, immutable generated results and per-sample drafts.
- Hidden nested split tables restored after a viewport resize.
- Material category filtering, draft cancellation, Escape focus return and confirmed identity.
- Same-name organization people distinguished by their configured user code.
- Quick picker Escape, preserved committed value and changed factory scope.
- Remote tree failure/retry and replacing a pending query's scope.

The suite checks page errors and console errors/warnings. Focus assertions cover the observed trigger return and native Tab between quality fields; they do not claim a complete focus-trap audit. Sources are deterministic local async adapters, not verified business backends.

## Fixed-scale performance

Chromium runs serially at 1440 × 1000. Fixtures mount 100 and 500 expanded organization cards, then locate the last node and unmount. The workbench mounts two virtualized tables of 300 rows each and 30 × 8 real inline inputs, switches a master row, edits an input and unmounts.

`durationMs` starts at the fixture action and includes Vue updates plus two animation frames. `inputMs` measures browser elapsed time across Playwright input and its observable model update, so it includes automation overhead. DOM counts are actual descendants of the fixture host. Empty DOM after unmount is a DOM cleanup assertion, not proof of garbage collection or absence of heap leaks.

Initial conservative gates: organization mounting < 2 s / 4 s for 100 / 500 cards, locate and workbench interaction < 800 ms, workbench mounting < 3 s; organization DOM < `18 × nodes + 100`, workbench DOM < 12,000. Each readonly table must render fewer than 80 rows while all 240 editable inputs must exist. These are regression ceilings, not a product performance promise; establish baseline numbers on the CI runner before tightening them, and retain failed measurements when changing a gate.

Reports, per-case JSON measurements, screenshots and failure traces are under `node_modules/.cache/{browser,performance}-*`. The CI browser job uploads both suites' output even on failure. Performance reporting includes the last fixture measurement on failure; it does not force GC or measure memory heaps.

Initial local observation, 2026-11-15: Apple M5 / macOS arm64, Node 24.19.0, Bun 1.4.2, Playwright 1.63.0 Chromium, one serial run against 0.40.2 `dist`:

| Scenario                        |    Mount | Locate / selection | DOM nodes | Input update |
| ------------------------------- | -------: | -----------------: | --------: | -----------: |
| 100 expanded organization cards |  43.9 ms |            30.0 ms |       834 |            — |
| 500 expanded organization cards |  58.4 ms |            29.1 ms |     4,134 |            — |
| 300+300 rows / 240 editors      | 146.4 ms |            27.3 ms |     2,197 |      44.5 ms |

All three hosts contained zero descendants after unmount. These observations establish a local reference only; they are not CI measurements, percentiles or supported maximum sizes. CI ceilings remain conservative until runner measurements are available.
