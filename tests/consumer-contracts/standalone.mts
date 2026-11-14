import {
  createComponentTheme,
  COMPONENT_COLOR_PALETTES,
  type ComponentThemeConfig,
  COMPONENT_LOCALE_KEY,
  COMPONENT_FEEDBACK_KEY,
  type ComponentLocale,
  type ComponentFeedback,
} from '@robot-admin/naive-ui-components/config'
const locale: ComponentLocale = { locale: 'en-US' }
const feedback: ComponentFeedback = { confirm: async () => true }
void [COMPONENT_LOCALE_KEY, COMPONENT_FEEDBACK_KEY, locale, feedback]
import { C_Icon } from '@robot-admin/naive-ui-components/C_Icon'
import { C_Form } from '@robot-admin/naive-ui-components/C_Form'
import { C_Table } from '@robot-admin/naive-ui-components/C_Table'
import { C_Menu } from '@robot-admin/naive-ui-components/C_Menu'
void [C_Icon, C_Form, C_Table, C_Menu]

const componentTheme: ComponentThemeConfig = createComponentTheme({
  mode: 'dark',
  primary: COMPONENT_COLOR_PALETTES.dark.primary,
  radius: 8,
  bgCard: '#fffdf8',
  bgMuted: '#f3eddf',
  border: '#ddcfb9',
  skeletonBg: '#e7ddcd',
})
void componentTheme

// The package owns the vendor extension declaration; consumers add no module augmentation.
const skeletonColor: string | undefined =
  componentTheme.themeOverrides.common?.robotComponentSkeletonColor
void skeletonColor
