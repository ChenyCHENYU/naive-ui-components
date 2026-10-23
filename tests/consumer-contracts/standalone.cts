import {
  COMPONENT_LOCALE_KEY,
  COMPONENT_FEEDBACK_KEY,
  type ComponentLocale,
  type ComponentFeedback,
} from '@robot-admin/naive-ui-components/config'
const locale: ComponentLocale = { locale: 'en-US' }
const feedback: ComponentFeedback = { confirm: async () => true }
void [COMPONENT_LOCALE_KEY, COMPONENT_FEEDBACK_KEY, locale, feedback]
/* eslint-disable @typescript-eslint/no-require-imports -- Exercise optional-peer-free CommonJS consumption with real require imports. */
import Icon = require('@robot-admin/naive-ui-components/C_Icon')
import Form = require('@robot-admin/naive-ui-components/C_Form')
import Table = require('@robot-admin/naive-ui-components/C_Table')
import Menu = require('@robot-admin/naive-ui-components/C_Menu')
void [Icon.C_Icon, Form.C_Form, Table.C_Table, Menu.C_Menu]
