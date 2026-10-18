[← English README](../README_EN.md) · [中文](./components.md)

# Component catalog

> 💡 All components provide **interactive live demos**. Visit the [Component Docs](https://www.tzagileteam.com/robot/components/preface) to try them out in real-time (rendered via iframe from Robot Admin production).

## Basic Components

| Component        | Description               | External Deps                 |
| ---------------- | ------------------------- | ----------------------------- |
| `C_Icon`         | Iconify icon wrapper      | `@iconify/vue`                |
| `C_Loading`      | Theme-aware SVG loading   | -                             |
| `C_PageLoading`  | Theme-aware page loading  | -                             |
| `C_Code`         | Code highlighting         | `highlight.js`                |
| `C_Barcode`      | Barcode generator         | `@chenfengyuan/vue-barcode`   |
| `C_Captcha`      | Puzzle / ALTCHA captcha   | `vue3-puzzle-vcode`, `altcha` |
| `C_Cascade`      | Cascade panel selector    | -                             |
| `C_Guide`        | User guide / tour         | `driver.js`                   |
| `C_Progress`     | Enhanced progress bar     | -                             |
| `C_Steps`        | Step bar                  | -                             |
| `C_ActionBar`    | Action button bar         | -                             |
| `C_Theme`        | Theme switcher            | -                             |
| `C_Language`     | Language switcher         | -                             |
| `C_Date`         | Enhanced date picker      | -                             |
| `C_City`         | Province / city selector  | -                             |
| `C_Breadcrumb`   | Breadcrumb navigation     | -                             |
| `C_Menu`         | Navigation menu           | -                             |
| `C_Tabs`         | Data-driven scenario tabs | -                             |
| `C_TagsView`     | Tab-based navigation      | -                             |
| `C_GlobalSearch` | Global search panel       | -                             |
| `C_AvatarGroup`  | Avatar group display      | -                             |
| `C_OrgChart`     | Organization chart        | -                             |
| `C_Skeleton`     | Skeleton placeholder      | -                             |

## Content & Editor Components

| Component         | Description                  | External Deps             |
| ----------------- | ---------------------------- | ------------------------- |
| `C_Editor`        | Rich text editor             | `@wangeditor-next/editor` |
| `C_Markdown`      | Markdown editor/preview      | `md-editor-v3`            |
| `C_FormulaEditor` | Formula editor (safe parser) | Built in                  |
| `C_Signature`     | Electronic signature         | -                         |
| `C_QRCode`        | QR code generator            | `qrcode`                  |
| `C_ImageCropper`  | Image cropper                | `vue-cropper`             |

## Data Display Components

| Component        | Description                                  | External Deps              |
| ---------------- | -------------------------------------------- | -------------------------- |
| `C_Table`        | Advanced data table (CRUD/inline edit/print) | `print-js`, `html2canvas`  |
| `C_Map`          | Map component (OSM/AMap)                     | `leaflet`                  |
| `C_VtableGantt`  | Gantt chart                                  | `@visactor/vtable-gantt`   |
| `C_AntV`         | Graph editor (ER/BPMN/UML)                   | `@antv/x6`, `html2canvas`  |
| `C_WaterFall`    | Waterfall layout                             | -                          |
| `C_FullCalendar` | Calendar events                              | `@fullcalendar/*`          |
| `C_VideoPlayer`  | Video player (HLS/subtitles/bookmarks)       | `xgplayer`, `xgplayer-hls` |
| `C_AudioPlayer`  | Audio player (waveform/progress/playlist)    | -                          |
| `C_FilePreview`  | File preview (PDF/Word/Excel)                | `xlsx`, `mammoth`          |
| `C_Timeline`     | Timeline (vertical/horizontal/collapsible)   | -                          |

Image/calendar behavior notes: `C_ImageCropper` flips the actual source and resets the current crop position; load/export failures emit `error: Error`. `C_Signature` readonly mode blocks user interaction but keeps exposed methods available for loading saved data. Its SVG export embeds the rendered raster canvas. `C_QRCode` uses the same raster-in-SVG approach when a logo is present so preview and export match. `C_FullCalendar` creates same-day events in local calendar time. `C_WaterFall` relayouts from actual image aspect ratios; give each item a stable unique `id`.

## Form & Layout Components

| Component         | Description                                       | External Deps        |
| ----------------- | ------------------------------------------------- | -------------------- |
| `C_Form`          | Dynamic form engine (Grid/Tabs/Steps/Card layout) | -                    |
| `C_FormModal`     | Data-driven create/edit form modal                | -                    |
| `C_FormSearch`    | Search form                                       | -                    |
| `C_CollapsePanel` | Collapse panel                                    | -                    |
| `C_SplitPane`     | Split pane                                        | -                    |
| `C_Draggable`     | Drag & drop sorting                               | `vue-draggable-plus` |
| `C_Tree`          | Advanced tree control                             | -                    |
| `C_Time`          | Enhanced time picker                              | -                    |
| `C_Cron`          | Cron expression editor                            | -                    |
| `C_Transfer`      | Transfer / shuttle box                            | -                    |

## Interactive & Business Components

| Component       | Description                                   | External Deps |
| --------------- | --------------------------------------------- | ------------- |
| `C_Chat`        | Chat (contacts / message bubbles / input box) | -             |
| `C_ContextMenu` | Context menu (nested / shortcuts / danger)    | -             |
| `C_Login`       | Login panel (5 modes / captcha / remember me) | -             |

## Workflow & Notification Components

| Component              | Description                                  | External Deps                                        |
| ---------------------- | -------------------------------------------- | ---------------------------------------------------- |
| `C_WorkFlow`           | Workflow editor (approval/CC/conditions)     | `@vue-flow/core`                                     |
| `C_NotificationCenter` | Notification center (demo/remote/controller) | [Integration guide](./guides/notification-center.md) |
| `C_Upload`             | Large file upload (chunked/resumable)        | `spark-md5`                                          |

## Dependency Notes

`C_FilePreview` accepts HTTPS URLs and same-origin HTTP URLs for local development. Script/data URLs, credential-bearing URLs, and cross-origin plain HTTP are rejected. `autoPreview` opens a supplied file automatically, and changing the source refreshes an open preview. Repeated previews release the previous PDF object URL and ignore stale loading results. Excel values `0` and `false` remain intact.

`C_AntV` keeps the public BPMN model as `{ nodes, flows }`. It converts that model to X6 cells internally and restores node positions, types, properties, and flow conditions in `data-change` and `getData()`. BPMN and UML load built-in samples only when `data` is absent; an explicit empty model produces an empty canvas.

`C_VtableGantt` merges presets and `options` without dropping untouched nested settings, replaces arrays as a whole, and ignores prototype-related keys. Its fullscreen button reflects the actual fullscreen state of that Gantt container.

`C_AudioPlayer` enters the playing state and emits `play` only after the browser accepts `play()`. A rejected autoplay emits `error`, and an empty playlist cannot emit a false play event. Mute, playlist tracks, and seeking are keyboard operable.

`C_CollapsePanel` and `C_TagsView` validate persisted data before restoring it, so corrupt or outdated JSON cannot break initialization. Persisted tags restore only in-app paths, and special characters in a path are no longer interpolated into CSS selectors.

`C_Table` column settings restore only valid keys, visibility, widths, and fixed directions; corrupt `persistKey` storage falls back to the supplied columns. Settings operate on local column copies rather than mutating caller-owned objects. `C_Upload` copies its initial file list before managing it, applies the same `accept` filter to picker, drop, and paste input, labels image actions for keyboard users, and shows per-file progress during concurrent hashing. Cancelling a chunked upload during resume lookup, an active request, or merging cannot start later requests or emit stale completion; a custom request's `abort()` releases the pending chunk even if it never calls back.

`C_WorkFlow` loads the supplied `modelValue` on first render and returns isolated snapshots from `getCurrentWorkflowData()`, `save`, `change`, and `node-click`, so callers cannot accidentally mutate its internal nodes. Editing conditions cannot change canvas data before Save, and incomplete conditions are not silently dropped. `readonly` blocks dragging, connecting, configuring, adding/removing, and saving while leaving preview, validation, and fit-to-view available. Node and condition IDs remain unique when created in the same tick.

Type verification covers TypeScript source, Vue SFC templates, and consumer examples built against the package. `C_Table` summary rendering expects an object keyed by column (`{ columnKey: { value, colSpan? } }`). `C_FormSearch` preserves existing numeric timestamp ranges and also supports formatted string ranges, binding each to the matching Naive UI value API.

Runtime component dependencies are declared by this package and resolved automatically. Every consumer needs:

```bash
bun add vue naive-ui
```

Install optional peers per feature: `vue-router` for `C_Breadcrumb`/`C_TagsView`, and `sortablejs` for C_Table row/column dragging. Subpath imports do not require unrelated optional peers. The formula editor uses a bounded built-in parser and does not execute dynamic JavaScript.
