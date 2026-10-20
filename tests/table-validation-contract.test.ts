import { expect, test } from 'bun:test'
import { generateFormOptions } from '../src/components/C_Table/data'
import {
  resolveTableColumnRules,
  validateTableRule,
} from '../src/components/C_Table/composables/tableValidation'
import type { FormItemRule } from 'naive-ui'
import type { TableColumn } from '../src/components/C_Table/types'

const validate = async (rule: FormItemRule, value: unknown) => {
  const column: TableColumn = {
    key: 'value',
    title: 'Value',
    editProps: { rules: [rule] },
  }
  const [normalized] = resolveTableColumnRules(column)
  return validateTableRule(normalized, value, 'Value', { sibling: 'kept' })
}

test.each([
  [{ type: 'email' }, 'bad', false],
  [{ type: 'email' }, 'valid@example.com', true],
  [{ type: 'url' }, 'https://example.com', true],
  [{ type: 'integer' }, 1.2, false],
  [{ type: 'number', min: 2 }, 1, false],
  [{ type: 'array', min: 1 }, [], false],
  [{ type: 'string', whitespace: true }, '  ', false],
  [{ type: 'enum', enum: [false, 0] }, false, true],
  [
    { type: 'object', fields: { name: { type: 'string', required: true } } },
    {},
    false,
  ],
] as Array<[FormItemRule, unknown, boolean]>)(
  'native rule %j checks value %j',
  async (rule, value, valid) => {
    expect(
      (await validate({ ...rule, message: 'invalid' }, value)) === null
    ).toBe(valid)
  }
)

test('custom validators preserve callback errors, Promise rejection, source and synchronous success', async () => {
  expect(
    await validate(
      {
        validator: (_rule, _value, callback) =>
          callback(new Error('callback failed')),
      },
      'x'
    )
  ).toBe('callback failed')
  expect(await validate({ validator: () => undefined }, 'x')).toBeNull()
  expect(await validate({ validator: () => false }, 'x')).not.toBeNull()
  expect(
    await validate(
      {
        validator: () => {
          throw new Error('thrown')
        },
      },
      'x'
    )
  ).toBe('thrown')
  expect(
    await validate(
      {
        validator: async () => {
          throw new Error('rejected')
        },
      },
      'x'
    )
  ).toBe('rejected')
  expect(
    await validate(
      {
        validator: (_rule, _value, _callback, source) =>
          source.sibling === 'kept',
      },
      'x'
    )
  ).toBeNull()
  expect(
    await validate(
      {
        asyncValidator: (_rule, _value, callback) => {
          setTimeout(() => callback(new Error('async callback failed')), 0)
        },
      },
      'x'
    )
  ).toBe('async callback failed')
})

test('required shorthand preserves zero and false and never mutates column rules', async () => {
  await Promise.all(
    [0, false, '', null, undefined, []].map(async value => {
      const original: FormItemRule[] = []
      const column: TableColumn = {
        key: 'value',
        title: 'Value',
        required: true,
        editProps: { rules: original },
      }
      const [rule] = resolveTableColumnRules(column)
      expect((await validateTableRule(rule, value, 'Value', {})) === null).toBe(
        value === 0 || value === false
      )
      expect(original).toEqual([])
    })
  )
})

test('modal fields exclude utility and readonly columns, reuse rules and retain numeric keys', () => {
  const columns: TableColumn[] = [
    { type: 'selection' },
    { type: 'index' },
    { type: 'expand' },
    { key: '_actions', title: 'Actions' },
    { key: 'readonly', title: 'Readonly', editable: false },
    {
      key: 0,
      title: 'Zero',
      required: true,
      editType: 'number',
      editProps: { min: 0, rules: [{ type: 'number', min: 0 }] },
    },
  ]
  const fields = generateFormOptions(columns)
  expect(fields).toHaveLength(1)
  expect(fields[0]).toMatchObject({
    prop: '0',
    type: 'inputNumber',
    attrs: { min: 0 },
  })
  expect(fields[0].rules).toHaveLength(2)
  expect(fields[0].attrs).not.toHaveProperty('rules')
  expect(columns.at(-1)?.editProps?.rules).toHaveLength(1)
})

test('warning-level rules do not block saves, transforms and messages preserve native behavior', async () => {
  expect(
    await validate(
      { level: 'warning', type: 'email', message: 'warning' },
      'bad'
    )
  ).toBeNull()
  expect(
    await validate(
      {
        type: 'string',
        min: 3,
        transform: value => String(value).trim(),
        message: () => 'trimmed',
      },
      ' a '
    )
  ).toBe('trimmed')
})
