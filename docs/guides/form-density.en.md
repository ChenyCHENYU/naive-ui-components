# Form and search density

`C_Form`, `C_FormSearch`, and `C_Table` share `config.density`. Reuse a reactive value to align fields, action buttons, and spacing throughout a page.

```vue
<C_FormSearch v-model="query" :form-item-list="filters" :config="{ density }" />
<C_Table :columns="columns" :data="rows" :config="{ density }" />
<C_Form v-model="model" :options="fields" :config="{ density }" />
```

```ts
import { ref } from 'vue'
import type { ComponentDensity } from '@robot-admin/naive-ui-components/C_Form'

const density = ref<ComponentDensity>('compact')
```

| Density       | Field and button size | Layout gap | Card padding | Form feedback minimum |
| ------------- | --------------------- | ---------- | ------------ | --------------------- |
| `default`     | `medium`              | 16px       | 24px         | 24px                  |
| `compact`     | `small`               | 8px        | 12px         | 12px                  |
| `comfortable` | `large`               | 20px       | 28px         | 28px                  |

Validation feedback can grow beyond its minimum height. Changing density preserves form values, search drafts, expanded filters, and card collapse state. Each instance owns its density.

Omitting `density` retains existing spacing and the default `medium` size. Explicit `C_Form` `config.size`, `C_FormSearch` `size`, field `attrs.size`, and individual layout gaps take precedence over the preset.

Existing native `size` passthrough on `C_Form` retains its final-override priority and synchronizes fields and buttons. Prefer `config` for new integrations.

```ts
const config = { density: 'compact', grid: { xGap: 12 } } as const
const fields = [
  { type: 'input', prop: 'name' },
  { type: 'select', prop: 'owner', attrs: { size: 'large' }, children: [] },
]
```

All eight form layouts support density: default, inline, grid, card, tabs, steps, dynamic, and custom. Naive UI step indicators support only `small` and `medium`, so comfortable step indicators use `medium` while fields and action buttons use `large`. Custom renderers and business slots own their styling; controls with a different size contract, such as `Rate`, retain that contract.

Density presets are plain data and preserve lazy loading of layouts and fields.

`C_FormModal` applies `config.density` to both its form and footer buttons and inherits application form density. Without density it preserves its historical `small` field default. Table editor modals inherit table density as well.
