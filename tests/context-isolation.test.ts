import { describe, expect, test } from 'bun:test'
import { createSSRApp, h, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'
import {
  COMPONENT_FEEDBACK_KEY,
  COMPONENT_LOCALE_KEY,
  useComponentFeedback,
  useComponentLocale,
  type ComponentFeedback,
  type ComponentLocale,
} from '../src/config'

describe('application feedback and locale ownership', () => {
  test('applications resolve their own adapters and local changes do not alter peers', async () => {
    const notifications: string[][] = [[], []]
    const locals = [ref<ComponentLocale>({}), ref<ComponentLocale>({})]
    const contexts: Array<{
      t: ReturnType<typeof useComponentLocale>['t']
      feedback: Required<ComponentFeedback>
    }> = []
    const apps = (['en-US', 'zh-CN'] as const).map((locale, index) => {
      const app = createSSRApp({
        setup() {
          const translation = useComponentLocale(locals[index])
          const feedback = useComponentFeedback()
          contexts[index] = { ...translation, feedback }
          return () => h('p', translation.t('common.save'))
        },
      })
      app.provide(COMPONENT_LOCALE_KEY, { locale })
      app.provide(COMPONENT_FEEDBACK_KEY, {
        success: message => notifications[index].push(message),
      })
      return app
    })

    expect(await Promise.all(apps.map(app => renderToString(app)))).toEqual([
      '<p>Save</p>',
      '<p>保存</p>',
    ])
    contexts[0].feedback.success('first')
    contexts[1].feedback.success('second')
    expect(notifications).toEqual([['first'], ['second']])

    locals[0].value = { messages: { 'common.save': 'Apply locally' } }
    expect(contexts[0].t('common.save')).toBe('Apply locally')
    expect(contexts[1].t('common.save')).toBe('保存')
    expect(useComponentLocale().t('common.save')).toBe('保存')
  })
})
