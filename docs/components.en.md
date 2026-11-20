[← English README](../README_EN.md) · [中文](./components.md)

# Component catalog

All 78 public components have a package subpath, such as `@robot-admin/naive-ui-components/C_Table`, and a matching `/style.css` entry. Some focused guides are in Chinese. See [dependencies and styles](#dependencies-and-styles) for installation details.

## Choose by task

| Task                                                        | Entry point                                                                                                                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pick a record from a grid and fill related form fields      | [`C_DataPicker`](./guides/data-picker.md#表单内嵌选择) with `createDataPickerField` and `mapFields`                                                      |
| Share filters across tabs with independent paging           | [`C_Tabs`, `C_FormSearch`, and `C_Table`](./guides/data-workflows.md#多页签共享查询) with `useTabbedQuery` from `/workflows`                             |
| Export the current page, selection, or all matching rows    | [`C_Table` export scopes](./guides/usage.en.md#table-pagination-selection-and-export), with [`C_TaskPanel`](./guides/task-panel.md) for server-side jobs |
| View approval history or open an instance from a message    | [`C_ApprovalViewer`](./guides/approval-viewer.md) for instances and [`C_WorkFlow`](./guides/workflow.md) for definitions                                 |
| Compose import, change review, scheduling, or inbox screens | [Scenario guide](./guides/scene-components.md)                                                                                                           |
| Lay out fixed master/detail panels or a dockable workspace  | [`C_SplitPane`](./guides/split-pane.en.md) and the [docking integration guide](./guides/dockable-workbench.md)                                           |

## Forms, queries, and selection

| Component         | Use                                                                  | Guide                                                                       |
| ----------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `C_Form`          | Configured forms, dynamic fields, sections, and validation           | [Form density and layout](./guides/form-density.en.md)                      |
| `C_FormModal`     | Create/edit dialog, submit locking, and unsaved-change protection    | [Form dialog setup](./guides/usage.en.md#recommended-c_form--c_table-setup) |
| `C_FormSearch`    | Draft filters, submit and reset, and applied query snapshots         | [Search workflows](./guides/search-workflows.md)                            |
| `C_Select`        | Single or multiple values, tags, and remote paging                   | [Remote options](./guides/remote-options.md)                                |
| `C_AutoComplete`  | Free text with local or remote suggestions                           | [Remote options](./guides/remote-options.md)                                |
| `C_DataPicker`    | Multi-column records, paging, batch paste, and related field mapping | [Entity picker](./guides/data-picker.md)                                    |
| `C_UserPicker`    | Organization filters and cross-page user selection                   | [User picker](./guides/user-picker.md)                                      |
| `C_Tree`          | Hierarchical selection, lazy loading, search, and path location      | [Tree](./guides/tree.en.md)                                                 |
| `C_OrgChart`      | Organization chart layout and nodes                                  | [Organization chart](./guides/org-chart.md)                                 |
| `C_Transfer`      | Dual lists with optional columns and hierarchical grouping           | [Transfer](./guides/transfer.md)                                            |
| `C_FilterBuilder` | Nested condition groups, fields, and operators                       | [Filter builder](./guides/filter-builder.md)                                |
| `C_Cascade`       | Cascading panel selector                                             |                                                                             |
| `C_City`          | Province, city, and district selector                                |                                                                             |
| `C_Date`          | Single dates, ranges, and date-time selection                        |                                                                             |
| `C_Time`          | Single times and time intervals                                      |                                                                             |

## Tables, records, and actions

| Component        | Use                                                             | Guide                                                                    |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `C_Table`        | Editing, remote paging, cross-page selection, export, and print | [Table configuration](./guides/table-density.md)                         |
| `C_ActionBar`    | Standard actions, async execution locks, and toolbar overflow   | [Scenario examples](./guides/scene-components.md#记录详情列表和窄工具栏) |
| `C_BatchResult`  | Batch outcomes, status filtering, and explicit retries          | [Batch results](./guides/batch-results.md)                               |
| `C_ChangeReview` | Field differences, review, and selective acceptance             | [Change review](./guides/change-review.md)                               |
| `C_Descriptions` | Typed details, grouping, and copying                            | [Scenario examples](./guides/scene-components.md#记录详情列表和窄工具栏) |
| `C_RecordList`   | Controlled lists or cards with status and per-record actions    | [Scenario examples](./guides/scene-components.md#记录详情列表和窄工具栏) |
| `C_ErrorSummary` | Multi-section validation summary and error navigation           | [Validation workflows](./guides/data-workflows.md#多区域校验和导航)      |
| `C_ContextMenu`  | Context menus, nested items, and shortcuts                      |                                                                          |
| `C_Draggable`    | Sorting within lists and optional cross-list dragging           |                                                                          |
| `C_WaterFall`    | Variable-height cards and windowing for long lists              | [Waterfall](./guides/waterfall.md)                                       |

## Workflows, tasks, and messages

| Component                | Use                                                               | Guide                                                               |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| `C_WorkFlow`             | Workflow definition editor, preview, and structural validation    | [Workflow definitions](./guides/workflow.md)                        |
| `C_ApprovalViewer`       | Read-only view of approval instances, assignees, and history      | [Approval instances](./guides/approval-viewer.md)                   |
| `C_TaskPanel`            | Background progress, item results, downloads, and retry actions   | [Background tasks](./guides/task-panel.md)                          |
| `C_TaskBoard`            | Status columns, swimlanes, and controlled moves                   | [Task board](./guides/task-board.md)                                |
| `C_NotificationCenter`   | Header notification panel, demo source, and shared controller     | [Notifications](./guides/notification-center.md)                    |
| `C_NotificationInbox`    | Configurable task views, row numbers, and host actions            | [Full-page inbox](./guides/notification-center.md#全页待办与收件箱) |
| `C_Chat`                 | Conversations, message input, activities, and source references   | [Conversation setup](./guides/scene-components.md#引导命令和会话)   |
| `C_Guide`                | Guided tours and resumable checklists                             | [Guide setup](./guides/usage.en.md#configure-c_guide)               |
| `C_SectionNav`           | Section navigation, error counts, and keyboard focus              | [Validation workflows](./guides/data-workflows.md#多区域校验和导航) |
| `C_RelationshipExplorer` | Directed relationships, paths, and details for the current record | [Relationship tracing](./guides/scene-components.md#关系追溯)       |
| `C_Timeline`             | Vertical, horizontal, and collapsible timelines                   |                                                                     |

## Files, content, and images

| Component          | Use                                                      | Guide                                                                             |
| ------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `C_Upload`         | File management, chunked uploads, and resume             | [Upload behavior](./guides/usage.en.md#configuration-and-behavior-contracts-021)  |
| `C_Attachments`    | Shared attachment list and lazy previews                 | [Attachments](./guides/attachments.md)                                            |
| `C_FilePreview`    | PDF, Word, and Excel previews                            | [Preview behavior](./guides/usage.en.md#configuration-and-behavior-contracts-021) |
| `C_ImportWizard`   | Field mapping, preflight, confirmation, and item results | [Import wizard](./guides/import-wizard.md)                                        |
| `C_Code`           | Code highlighting                                        |                                                                                   |
| `C_Editor`         | Rich text editing                                        |                                                                                   |
| `C_Markdown`       | Markdown editing and preview                             |                                                                                   |
| `C_AudioPlayer`    | Audio playback, waveform, and playlists                  |                                                                                   |
| `C_VideoPlayer`    | Video, HLS, subtitles, and bookmarks                     | [Video protocols](./guides/usage.en.md#configuration-and-behavior-contracts-021)  |
| `C_ImageAnnotator` | Rectangle annotations and keyboard coordinate editing    | [Image annotation](./guides/image-annotator.md)                                   |
| `C_ImageCropper`   | Crop, flip, and export images                            |                                                                                   |
| `C_Signature`      | Draw, restore, and export signatures                     |                                                                                   |
| `C_Barcode`        | Barcode generation                                       |                                                                                   |
| `C_QRCode`         | QR codes and branded export                              |                                                                                   |
| `C_ScanInput`      | Text, scanner, photo, and camera input                   | [Scan input](./guides/scene-components.md#重复计划和扫码)                         |

## Scheduling, planning, and diagrams

| Component            | Use                                                     | Guide                                                                              |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `C_ResourceSchedule` | Multi-resource bookings, working windows, and conflicts | [Resource scheduling](./guides/resource-schedule.md)                               |
| `C_RecurrenceEditor` | Daily, weekly, monthly, and yearly recurrence           | [Recurrence](./guides/scene-components.md#重复计划和扫码)                          |
| `C_FullCalendar`     | Calendar events, drag-and-drop, and resizing            | [Calendar behavior](./guides/usage.en.md#configuration-and-behavior-contracts-021) |
| `C_VtableGantt`      | Gantt schedules and full-screen view                    |                                                                                    |
| `C_Cron`             | Cron editing, validation, and run-time preview          | [Cron and formulas](./guides/usage.en.md#cron-and-formula-workspaces)              |
| `C_FormulaEditor`    | Restricted expression editor and evaluator              | [Cron and formulas](./guides/usage.en.md#cron-and-formula-workspaces)              |
| `C_AntV`             | ER, BPMN, and UML diagram editing                       |                                                                                    |
| `C_Map`              | Maps, markers, and OSM or AMap tiles                    | [Map setup](./guides/usage.en.md#recommended-c_map-setup)                          |

## Navigation, layout, and base controls

| Component         | Use                                                 | Guide                                                                            |
| ----------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `C_Menu`          | Theme-aware navigation menu                         |                                                                                  |
| `C_Breadcrumb`    | Breadcrumbs and directory navigation                | [Breadcrumbs](./guides/usage.en.md#breadcrumb-directory-navigation)              |
| `C_Tabs`          | Controlled or uncontrolled tabs and lazy mounting   | [Shared tab queries](./guides/data-workflows.md#多页签共享查询)                  |
| `C_TagsView`      | Route tabs and location restoration                 | [Route tab behavior](./guides/component-contracts.md#页签地址身份与访问位置分开) |
| `C_GlobalSearch`  | Menu search, remote results, and commands           | [Global search](./guides/global-search.md)                                       |
| `C_CollapsePanel` | Collapsible panels                                  |                                                                                  |
| `C_SplitPane`     | Nested and keyboard-resizable panes                 | [Split panes](./guides/split-pane.en.md)                                         |
| `C_Density`       | Density defaults for a subtree                      | [Theming](./guides/theme.md)                                                     |
| `C_Theme`         | Theme switcher                                      | [Theming](./guides/theme.md)                                                     |
| `C_Language`      | Language switcher                                   |                                                                                  |
| `C_Login`         | Sign-in form and custom fields                      | [Login extension](./guides/usage.en.md#c_login-form-extension)                   |
| `C_Captcha`       | Puzzle and optional server-verified challenge flows | [Server verification](./guides/usage.en.md#c_captcha-server-verification)        |
| `C_Icon`          | Iconify icons                                       |                                                                                  |
| `C_AvatarGroup`   | Avatar stacks and overflow labels                   |                                                                                  |
| `C_Progress`      | Progress bar                                        |                                                                                  |
| `C_Steps`         | Step indicator                                      |                                                                                  |
| `C_Skeleton`      | Skeleton placeholder                                |                                                                                  |
| `C_Loading`       | Theme-aware loading indicator                       |                                                                                  |
| `C_PageLoading`   | Page navigation feedback                            | [Page loading](./guides/usage.en.md#page-navigation-loading)                     |

## Dependencies and styles

- `vue` and `naive-ui` are required peers. `C_Breadcrumb`, `C_TagsView`, and the full plugin entry use `vue-router`. Install `sortablejs` to enable row or column dragging in `C_Table`.
- Runtime dependencies are resolved with the package. The published builds include SheetJS for Excel preview and export. Word preview loads `mammoth` on demand. Base styles are available at `/C_Form/base.css` and `/C_Table/base.css`. See [import strategies](./guides/usage.en.md#import-strategies) for style selection.
