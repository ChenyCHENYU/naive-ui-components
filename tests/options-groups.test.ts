import { expect, test } from 'bun:test'
import {
  createOptionValueBinder,
  needsOptionValueBinding,
} from '../src/core/options'

test('group leaves participate in boolean binding and token collision avoidance', () => {
  const literal = '__c_option_boolean_false__'
  const list = [
    {
      type: 'group',
      label: 'Settings',
      children: [
        { value: false, label: 'No' },
        { value: literal, label: 'Literal' },
        { value: 0, label: 'Zero' },
      ],
    },
  ]
  expect(needsOptionValueBinding(list, null)).toBe(true)
  const bind = createOptionValueBinder(list)
  const bound = bind([false, literal, 0])
  const children = bound.options![0].children as Array<{
    value: string | number
  }>
  expect(children[0].value).not.toBe(literal)
  expect(bound.decode(bound.value, children)).toEqual([false, literal, 0])
  expect(bound.decode(literal, { value: literal })).toBe(literal)
  expect(list[0].children[0].value).toBe(false)
  expect(bind([0]).options).toBe(bound.options)
})

test('non-group business children are not treated as additional selectable leaves', () => {
  const list = [
    {
      label: 'Parent',
      value: 0,
      children: [{ label: 'Metadata', value: false }],
    },
  ]
  expect(needsOptionValueBinding(list, null)).toBe(false)
  const binding = createOptionValueBinder(list)(0)
  expect(binding.options![0].children).toBe(list[0].children)
  expect(binding.value).toBe(0)
})
