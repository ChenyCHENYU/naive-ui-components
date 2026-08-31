import { describe, expect, test } from 'bun:test'
import { createSSRApp, defineComponent, effectScope, h, reactive } from 'vue'
import { renderToString } from '@vue/server-renderer'
import {
  COMPONENT_FEEDBACK_KEY,
  COMPONENT_LOCALE_KEY,
  useComponentFeedback,
  useComponentLocale,
} from '../src/config'
import { useSearchState } from '../src/components/C_FormSearch/composables/useSearchState'
import type {
  SearchFormItem,
  SearchFormParams,
} from '../src/components/C_FormSearch/types'
import { useTimeSelection } from '../src/components/C_Time/composables/useTimeSelection'
import type {
  TimeEmits,
  TimeModelValue,
  TimeProps,
} from '../src/components/C_Time/types'

describe('shared component contracts', () => {
  test('feedback works without Naive providers and injected adapters take precedence', async () => {
    const notifications: string[] = []
    let translated = ''
    const app = createSSRApp(
      defineComponent({
        setup() {
          const feedback = useComponentFeedback()
          const { t } = useComponentLocale()
          feedback.success('ready')
          translated = t('common.save')
          return () => h('div', 'ok')
        },
      })
    )
    app.provide(COMPONENT_FEEDBACK_KEY, {
      success: message => notifications.push(message),
    })
    app.provide(COMPONENT_LOCALE_KEY, { locale: 'en-US' })

    expect(await renderToString(app)).toContain('ok')
    expect(notifications).toEqual(['ready'])
    expect(translated).toBe('Save')
  })

  test('feedback safely degrades when no provider or adapter exists', async () => {
    let confirmed: Promise<boolean> = Promise.resolve(false)
    const app = createSSRApp(
      defineComponent({
        setup() {
          const feedback = useComponentFeedback()
          feedback.error('non-fatal')
          confirmed = feedback.confirm({ title: 'Confirm', content: 'Proceed?' })
          return () => h('div')
        },
      })
    )

    await renderToString(app)
    expect(await confirmed).toBe(false)
  })
})

describe('C_FormSearch state contract', () => {
  test('does not mutate field props, folds visible fields, and tracks async search', async () => {
    const sourceFields: SearchFormItem[] = [
      { type: 'input', prop: 'keyword', defaultValue: 'robot', hisList: [] },
      { type: 'select', prop: 'status' },
      { type: 'input', prop: 'hidden', show: false },
    ]
    const sourceParams: SearchFormParams = {}
    const events: Array<[string, unknown?]> = []
    let resolveSearch: () => void = () => undefined
    let state: ReturnType<typeof useSearchState> | undefined
    const app = createSSRApp(
      defineComponent({
        setup() {
          state = useSearchState(
            ((event: string, payload?: unknown) =>
              events.push([event, payload])) as Parameters<
              typeof useSearchState
            >[0],
            {
              formItemList: sourceFields,
              formParams: sourceParams,
              config: {
                foldThreshold: 1,
                onSearch: () =>
                  new Promise<void>(resolve => {
                    resolveSearch = resolve
                  }),
              },
            }
          )
          return () => h('div')
        },
      })
    )

    await renderToString(app)
    expect(state?.visibleFields.value.map(field => field.prop)).toEqual([
      'keyword',
    ])
    expect(state?.formParams.value).toEqual({ keyword: 'robot', status: null })
    expect(sourceFields[1]?.placeholder).toBeUndefined()
    expect(sourceParams).toEqual({})

    const search = state!.searchFn()
    expect(state?.searching.value).toBe(true)
    resolveSearch()
    expect(await search).toBe(true)
    expect(state?.searching.value).toBe(false)
    expect(events.some(([event]) => event === 'search')).toBe(true)
  })
})

describe('C_Time state contract', () => {
  test('uses null semantics so timestamp zero remains a valid controlled value', () => {
    const props = reactive<TimeProps>({
      mode: 'range',
      modelValue: [0, null],
      useSeconds: false,
      enableTimeRestriction: true,
    })
    const events: Array<[keyof TimeEmits, TimeModelValue]> = []
    const emit = ((event: keyof TimeEmits, value: TimeModelValue) => {
      events.push([event, value])
    }) as Parameters<typeof useTimeSelection>[1]
    const scope = effectScope()
    const state = scope.run(() => useTimeSelection(props, emit))!

    expect(state.startTime.value).toBe(0)
    expect(state.endTimeDisabled.value).toBe(false)
    expect(state.isEndHourDisabled(0)).toBe(false)
    state.handleStartTimeChange(0)
    expect(events.some(([event]) => event === 'update:modelValue')).toBe(true)
    scope.stop()
  })
})
