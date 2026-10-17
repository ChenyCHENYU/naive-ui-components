[← English README](../README_EN.md) · [中文](./engineering.md)

# Development and build

## Build Architecture

### Six-stage Build Pipeline

```
bun run build
  ├── 1. tsdown          → Multi-entry bundling (55 components ESM/CJS/DTS)
  ├── 2. sass CLI        → Compile the shared-variable entry → global-scss.css
  ├── 3. merge-css.js    → Merge Vue-compiled SFC CSS + global variables → style.css
  ├── 4. gen-exports.js  → Auto-generate package.json exports map
  ├── 5. check:dist      → Validate root, subpath, SSR, and DTS public exports
  └── 6. check:size      → Enforce full/base CSS and package-size budgets
```

### Key Technical Details

- **Build engine**: [tsdown](https://github.com/rolldown/tsdown) (Rolldown-based), 55 component entries plus the root entry and resolver
- **SCSS processing**: Custom `scssTransformPlugin` compiles SFC SCSS within the Rolldown pipeline; standalone Sass CLI only compiles the shared-variable entry
- **CSS merging**: Post-build merges Vue scoped-compiled per-chunk CSS with shared variables into a single `style.css`, avoiding duplicate styles and leaked raw `:deep()` selectors
- **Type exports**: Unified `export *` barrel pattern with auto-generated `.d.ts`
- **Subpath exports**: `gen-exports.js` auto-scans `dist/` and writes the `exports` field in `package.json`
- **Export conflict detection**: `check-export-conflicts.js` ensures no naming collisions between components
- **Artifact entry validation**: `check-dist-entries.js` prevents internal chunks from replacing root declarations and verifies component utility subpath types
- **Package contract validation**: blocks Naive UI internal type paths, hidden optional installs, and plugin console side effects
- **Size budgets**: `check-size-budget.js` prevents accidental growth of global, C_Form/C_Table, and total dist output

### Build Output

```
dist/
├── index.js / index.cjs / index.d.ts     # Main entry
├── C_Form.js / C_Form.cjs / C_Form.d.ts  # Subpath entries (55 components)
├── C_Form.base.css / C_Form.css         # Base/full style tiers
├── C_Table.base.css / C_Table.css       # Base/full style tiers
├── style.css                             # Merged full styles
└── [chunk].js                            # Shared code chunks
```

## Development

The environment baseline is Node.js 20.19.0+ and Bun 1.3.14. `.node-version`, `packageManager`, `engines`, and the frozen lockfile keep local and CI installs aligned.

```bash
bun install --frozen-lockfile # Install exactly from the lockfile
bun run dev              # Dev mode (SCSS watch + tsdown watch)
bun run build            # Full build
bun run build:scss       # Compile global SCSS only
bun run build:css        # Merge fresh tsdown CSS chunks; safely skips a finalized dist
bun run build:exports    # Generate exports map only
bun run check:exports    # Check export naming conflicts
bun run check:dist       # Validate built JS / DTS public entries
bun run check:consumer-contracts # Tarball consumer types and optional peer boundaries
bun run check:package    # Validate dependencies, exports, and public source boundaries
bun run check:quality    # Prevent any, console, and type-suppression debt regressions
bun run check:audit      # Audit direct and transitive dependency vulnerabilities
bun run check:size       # Enforce publish artifact size budgets
bun run type-check       # TypeScript type checking
bun run test             # Run Bun unit tests
bun run lint:check       # Oxlint + ESLint (check only)
bun run lint:eslint      # Audit the existing ESLint rule backlog
bun run verify           # Type, test, export, and build verification
```

### Project Structure

```
naive-ui-components/
├── src/
│   ├── index.ts                     # Library entry (global registration + export * barrel)
│   ├── styles/
│   │   ├── variables.scss           # CSS variables (--c-*)
│   │   └── global.scss              # Auto-generated shared-variable entry
│   ├── components/
│   │   └── C_[Name]/
│   │       ├── index.vue            # Main component file
│   │       ├── index.ts             # Barrel export
│   │       ├── index.scss           # Component styles
│   │       ├── types.ts             # Type definitions
│   │       ├── constants.ts         # Constants
│   │       ├── data.ts              # Static data
│   │       ├── composables/         # Composable functions
│   │       ├── components/          # Sub-components
│   │       └── layouts/             # Layout variants (C_Form/C_AntV)
│   ├── plugins/                     # highlight.js and other plugins
│   └── utils/                       # Utility functions
├── scripts/
│   ├── gen-global-scss.js           # Generate global.scss (shared variables only)
│   ├── watch-global-scss.js         # Dev mode SCSS watcher
│   ├── merge-css.js                 # Merge CSS artifacts
│   ├── gen-exports.js               # Auto-generate package.json exports
│   └── check-export-conflicts.js    # Export naming conflict detection
├── types/
│   └── env.d.ts                     # .vue / .scss module declarations
├── tsdown.config.ts                 # Build config (multi-entry + SCSS plugin + Vue plugin)
└── tsconfig.json
```

### Adding a New Component

1. Create `src/components/C_NewComponent/` directory
2. Write `index.vue`, `index.ts` (barrel), `types.ts`
3. Add `export * from './components/C_NewComponent'` in `src/index.ts`
4. Add the component import and registration to the `components` array in `src/index.ts`
5. Add the name to `componentNames` in `src/resolver.ts`
6. Run `bun run verify` — build scripts will auto-generate subpath entries and exports mapping

### Publishing

```bash
bun run changeset       # Record changes and release level
bun run version         # Update package version and CHANGELOG
bun run verify          # Run all pre-publish checks
bun run release         # Publish pending Changesets releases
```

The GitHub changelog generator requires `GITHUB_TOKEN` for `bun run version`; never commit the token. On Windows, if `bun run release` stalls while npm repeats `prepublishOnly`, first confirm `bun run verify` succeeds, then publish from PowerShell with `$env:npm_config_ignore_scripts='true'; bun run release`. This skips only the repeated lifecycle check, not the prerequisite verification.

## Documentation assets

Brand sources and exported PNGs are in [`assets/`](./assets/). See the [asset guide](./assets/README.md) for colors, logo usage and export instructions.

## Architecture boundaries

See [architecture and isolation](./architecture.en.md) for dependency direction, app-level ownership and future Element Plus adaptation.
