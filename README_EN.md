<div align="center">

# @agile-team/naive-ui-components

**Enterprise-grade Vue 3 component library built on Naive UI**

51 production-ready business components extracted from Robot Admin, supporting global registration, on-demand imports (Tree-Shaking), and subpath imports.

[![NPM Version](https://img.shields.io/npm/v/@agile-team/naive-ui-components)](https://www.npmjs.com/package/@agile-team/naive-ui-components)
[![License](https://img.shields.io/npm/l/@agile-team/naive-ui-components)](./LICENSE)

[Live Demo](https://www.tzagileteam.com/robot/components/preface) · [GitHub](https://github.com/ChenyCHENYU/naive-ui-components) · [NPM](https://www.npmjs.com/package/@agile-team/naive-ui-components)

[中文](./README.md)

</div>

---

## 📦 Installation

```bash
bun add @agile-team/naive-ui-components
```

Required peer dependencies:

```bash
bun add vue@^3.5.0 naive-ui@^2.35.0
```

### 🚀 Quick Start

#### Global Registration

```typescript
import { createApp } from 'vue'
import NaiveUIComponents from '@agile-team/naive-ui-components'
import '@agile-team/naive-ui-components/style.css'

const app = createApp(App)
app.use(NaiveUIComponents)
app.mount('#app')
```

#### On-demand Import (Tree-Shaking)

```vue
<script setup lang="ts">
  import { C_Icon, C_Table, C_Form } from '@agile-team/naive-ui-components'
  import '@agile-team/naive-ui-components/style.css'
</script>
```

#### Subpath Import (Recommended, Smallest Bundle)

Each component provides an independent subpath entry that loads only the target component's code and types:

```vue
<script setup lang="ts">
  import { C_Form } from '@agile-team/naive-ui-components/C_Form'
  import { C_Table } from '@agile-team/naive-ui-components/C_Table'
  import { C_Icon } from '@agile-team/naive-ui-components/C_Icon'
  import '@agile-team/naive-ui-components/style.css'
</script>
```

> Subpath imports provide full TypeScript support (`.d.ts`) with IDE auto-completion for props / emits / slots.

#### Standalone Composables

```typescript
import {
  useTableManager,
  useFormState,
  usePlayerCore,
} from '@agile-team/naive-ui-components'
```

### 📋 Component List (51 Components)

> 💡 All components provide **interactive live demos**. Visit the [Component Docs](https://www.tzagileteam.com/robot/components/preface) to try them out in real-time (rendered via iframe from Robot Admin production).

#### Basic Components

| Component        | Description              | External Deps               |
| ---------------- | ------------------------ | --------------------------- |
| `C_Icon`         | Iconify icon wrapper     | `@iconify/vue`              |
| `C_Code`         | Code highlighting        | `highlight.js`              |
| `C_Barcode`      | Barcode generator        | `@chenfengyuan/vue-barcode` |
| `C_Captcha`      | Puzzle captcha           | `vue3-puzzle-vcode`         |
| `C_Cascade`      | Cascade panel selector   | -                           |
| `C_Guide`        | User guide / tour        | `driver.js`                 |
| `C_Progress`     | Enhanced progress bar    | -                           |
| `C_Steps`        | Step bar                 | -                           |
| `C_ActionBar`    | Action button bar        | -                           |
| `C_Theme`        | Theme switcher           | -                           |
| `C_Language`     | Language switcher        | -                           |
| `C_Date`         | Enhanced date picker     | -                           |
| `C_City`         | Province / city selector | -                           |
| `C_Breadcrumb`   | Breadcrumb navigation    | -                           |
| `C_Menu`         | Navigation menu          | -                           |
| `C_TagsView`     | Tab-based navigation     | -                           |
| `C_GlobalSearch` | Global search panel      | -                           |
| `C_AvatarGroup`  | Avatar group display     | -                           |
| `C_OrgChart`     | Organization chart       | -                           |
| `C_Skeleton`     | Skeleton placeholder     | -                           |

#### Content & Editor Components

| Component         | Description             | External Deps        |
| ----------------- | ----------------------- | -------------------- |
| `C_Editor`        | Rich text editor        | `@wangeditor/editor` |
| `C_Markdown`      | Markdown editor/preview | `@kangc/v-md-editor` |
| `C_FormulaEditor` | Formula editor          | `expr-eval`          |
| `C_Signature`     | Electronic signature    | -                    |
| `C_QRCode`        | QR code generator       | `qrcode`             |
| `C_ImageCropper`  | Image cropper           | `vue-cropper`        |

#### Data Display Components

| Component        | Description                                  | External Deps                        |
| ---------------- | -------------------------------------------- | ------------------------------------ |
| `C_Table`        | Advanced data table (CRUD/inline edit/print) | `print-js`, `html2canvas`            |
| `C_Map`          | Map component (OSM/AMap)                     | `leaflet`                            |
| `C_VtableGantt`  | Gantt chart                                  | `@visactor/vtable-gantt`             |
| `C_AntV`         | Graph editor (ER/BPMN/UML)                   | `@antv/x6`, `html2canvas`            |
| `C_WaterFall`    | Waterfall layout                             | -                                    |
| `C_FullCalendar` | Calendar events                              | `@fullcalendar/*`                    |
| `C_VideoPlayer`  | Video player (HLS/subtitles/bookmarks)       | `xgplayer`, `xgplayer-hls`           |
| `C_AudioPlayer`  | Audio player (waveform/progress/playlist)    | -                                    |
| `C_FilePreview`  | File preview (PDF/Word/Excel)                | `xlsx`, `mammoth`, `@tato30/vue-pdf` |
| `C_Timeline`     | Timeline (vertical/horizontal/collapsible)   | -                                    |

#### Form & Layout Components

| Component         | Description                                       | External Deps                |
| ----------------- | ------------------------------------------------- | ---------------------------- |
| `C_Form`          | Dynamic form engine (Grid/Tabs/Steps/Card layout) | `@robot-admin/form-validate` |
| `C_FormSearch`    | Search form                                       | -                            |
| `C_CollapsePanel` | Collapse panel                                    | -                            |
| `C_SplitPane`     | Split pane                                        | -                            |
| `C_Draggable`     | Drag & drop sorting                               | `vue-draggable-plus`         |
| `C_Tree`          | Advanced tree control                             | -                            |
| `C_Time`          | Enhanced time picker                              | -                            |
| `C_Cron`          | Cron expression editor                            | -                            |
| `C_Transfer`      | Transfer / shuttle box                            | -                            |

#### Interactive & Business Components

| Component       | Description                                   | External Deps |
| --------------- | --------------------------------------------- | ------------- |
| `C_Chat`        | Chat (contacts / message bubbles / input box) | -             |
| `C_ContextMenu` | Context menu (nested / shortcuts / danger)    | -             |
| `C_Login`       | Login panel (5 modes / captcha / remember me) | -             |

#### Workflow & Notification Components

| Component              | Description                              | External Deps    |
| ---------------------- | ---------------------------------------- | ---------------- |
| `C_WorkFlow`           | Workflow editor (approval/CC/conditions) | `@vue-flow/core` |
| `C_NotificationCenter` | Notification center (WebSocket/polling)  | -                |
| `C_Upload`             | Large file upload (chunked/resumable)    | `spark-md5`      |

### 🔌 Optional Dependencies

Components with external dependencies are declared as `optionalDependencies`. **Install as needed**:

```bash
# Video player
bun add xgplayer xgplayer-hls

# Graph editor
bun add @antv/x6

# Workflow
bun add @vue-flow/core

# File preview
bun add xlsx mammoth @tato30/vue-pdf

# Table printing
bun add print-js html2canvas

# Formula editor
bun add expr-eval
```

### 🏗️ Build Architecture

#### Four-stage Build Pipeline

```
bun run build
  ├── 1. tsdown          → Multi-entry bundling (51 components ESM/CJS/DTS)
  ├── 2. sass CLI        → Compile global.scss → global-scss.css
  ├── 3. merge-css.js    → Merge SFC CSS + global SCSS → style.css
  └── 4. gen-exports.js  → Auto-generate package.json exports map
```

#### Key Technical Details

- **Build engine**: [tsdown](https://github.com/rolldown/tsdown) (Rolldown-based), 51 independent entries compiled in parallel
- **SCSS processing**: Custom `scssTransformPlugin` compiles SFC SCSS within the Rolldown pipeline; standalone Sass CLI for global styles
- **CSS merging**: Post-build merges per-chunk CSS with `global-scss.css` into a single `style.css`
- **Type exports**: Unified `export *` barrel pattern with auto-generated `.d.ts`
- **Subpath exports**: `gen-exports.js` auto-scans `dist/` and writes the `exports` field in `package.json`
- **Export conflict detection**: `check-export-conflicts.js` ensures no naming collisions between components

#### Build Output

```
dist/
├── index.js / index.cjs / index.d.ts     # Main entry
├── C_Form.js / C_Form.cjs / C_Form.d.ts  # Subpath entries (49 components)
├── style.css                              # Merged full styles
└── [chunk].js                             # Shared code chunks
```

### 🔧 Development

```bash
bun install              # Install dependencies
bun run dev              # Dev mode (SCSS watch + tsdown watch)
bun run build            # Full build
bun run build:scss       # Compile global SCSS only
bun run build:css        # Merge CSS only
bun run build:exports    # Generate exports map only
bun run check:exports    # Check export naming conflicts
bun run type-check       # TypeScript type checking
```

#### Project Structure

```
naive-ui-components/
├── src/
│   ├── index.ts                     # Library entry (global registration + export * barrel)
│   ├── styles/
│   │   ├── variables.scss           # CSS variables (--c-*)
│   │   └── global.scss              # Auto-generated global style aggregation (@forward barrel)
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
│   ├── gen-global-scss.js           # Generate global.scss (@forward barrel)
│   ├── watch-global-scss.js         # Dev mode SCSS watcher
│   ├── merge-css.js                 # Merge CSS artifacts
│   ├── gen-exports.js               # Auto-generate package.json exports
│   └── check-export-conflicts.js    # Export naming conflict detection
├── types/
│   └── env.d.ts                     # .vue / .scss module declarations
├── tsdown.config.ts                 # Build config (multi-entry + SCSS plugin + Vue plugin)
└── tsconfig.json
```

#### Adding a New Component

1. Create `src/components/C_NewComponent/` directory
2. Write `index.vue`, `index.ts` (barrel), `types.ts`
3. Add `export * from './components/C_NewComponent'` in `src/index.ts`
4. Run `bun run build` — build scripts will auto-generate subpath entries and exports mapping

#### Publishing

```bash
bun run release:patch   # 0.3.0 → 0.3.1
bun run release:minor   # 0.3.0 → 0.4.0
bun run release:major   # 0.3.0 → 1.0.0
```

## 📄 License

MIT License

---

## 🔗 Links

- [Component Docs with Interactive Demos](https://www.tzagileteam.com/robot/components/preface)
- [Robot Admin Main Project](https://github.com/ChenyCHENYU/robot_admin)
- [Robot Admin Live Demo](https://www.robotadmin.cn)
- [GitHub](https://github.com/ChenyCHENYU/naive-ui-components)
- [NPM](https://www.npmjs.com/package/@agile-team/naive-ui-components)
