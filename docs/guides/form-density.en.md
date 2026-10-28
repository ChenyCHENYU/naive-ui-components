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
| `compact`     | `small`               | 8px        | 12px         | 4px                   |
| `comfortable` | `large`               | 20px       | 28px         | 28px                  |

Validation feedback can grow beyond its minimum height. Changing density preserves form values, search drafts, expanded filters, and card collapse state. Each instance owns its density.

Omitting `density` retains existing field and layout spacing and the default `medium` size; action areas no longer reserve an unused validation row. Explicit `C_Form` `config.size`, `C_FormSearch` `size`, field `attrs.size`, and individual layout gaps take precedence over the preset.

Responsive grids constrain horizontal gaps to the available container width, preventing accumulated gaps across 24 tracks from overflowing narrow modals. Wide screens retain the configured gap, vertical spacing stays independent, and Naive UI continues to calculate offsets. Set `grid.responsive: false` to preserve fixed spacing.

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

`C_FormModal` defaults to `compact` and inherits application form density. Compact modals use `small` fields and `tiny` footer buttons, matching compact action bars. Explicit `config.size` still controls both fields and buttons; explicit `default` / `comfortable` density uses its corresponding size. Table editor modals inherit table density as well.

## Application defaults with on-demand imports

Provide defaults once during application startup. Local `config.density` takes precedence; search inherits only density, not form layout, callbacks or size.

```ts
import { FORM_GLOBAL_CONFIG_KEY } from '@robot-admin/naive-ui-components/config'

app.provide(FORM_GLOBAL_CONFIG_KEY, { density: 'compact' })
```

Compact search fields default to 208px and fill the available width on narrow screens; explicit field `attrs.style.width` takes precedence. Compact numeric fields hide step buttons by default while preserving keyboard Up / Down, step, precision and limits. Set `attrs: { showButton: true }` when buttons are useful. Naive UI still owns number handling and themes; the text input avoids browser-native number spinners. Field `attrs.inputProps` can override accessible names and numeric semantics.

## Arrange fields by container width

Opt into `config.grid.minItemWidth` to budget the entire field, including its label. Default spans adapt to the actual split pane or dialog width. Explicit spans stay intact while they fit, and expand only when necessary, up to a full row. Existing `cols`, `offset`, `suffix`, and Naive UI wrapping remain in charge.

```ts
const config = {
  density: 'compact',
  layout: 'grid',
  grid: { cols: 24, minItemWidth: 300, xGap: 16, yGap: 8 },
} as const
```

Omitting the option preserves existing spans. `responsive: false` disables automatic expansion. A container narrower than the budget uses a full row without forcing an overflowing CSS minimum width. One local `ResizeObserver` follows activation, deactivation, and disposal; no global resize listener is added.

## Reveal an invalid field

`await formRef.revealField(field)` enters the field's tab or step, or expands its card group, then scrolls to and focuses an available control. It returns `true` only after actual focus succeeds. Missing, hidden, disabled, or readonly fields, unloaded layouts, and navigation blocked by existing validation or business guards return `false`. It never clears errors, changes validation rules, or enables an editing mode.

```ts
const focused = await formRef.value?.revealField('customer.name')
```

Lookup stays within this form's item references. Unmounting, KeepAlive deactivation, a layout change, or a newer reveal request cancels older work, so late results cannot steal focus. A custom or virtual control may supply `focusTarget` on its field. Prepare the control and return its actual element; let the form recheck access and apply focus rather than focusing inside the adapter.

```ts
const fields = [
  {
    type: 'custom-customer',
    prop: 'customerId',
    focusTarget: async ({ signal }) => {
      await customerEditor.ensureMounted(signal)
      return signal.aborted ? null : customerEditor.inputElement
    },
  },
]
```

The context also provides `field`, the form item's `element` (possibly null), and the current `model`. An adapter that ignores cancellation still cannot apply an obsolete focus result. Return null when no real target exists; callers can keep the error summary visible or explain a navigation restriction.
