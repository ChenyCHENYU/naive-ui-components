import { describe, expect, test } from 'bun:test'
import { RobotNaiveUiResolver, componentNames } from '../src/resolver'

describe('RobotNaiveUiResolver', () => {
  test('uses component subpaths by default', () => {
    expect(RobotNaiveUiResolver().resolve('C_Form')).toEqual({
      name: 'C_Form',
      from: '@robot-admin/naive-ui-components/C_Form',
      sideEffects: undefined,
    })
  })

  test('resolves the data-driven form modal as an on-demand component', () => {
    expect(RobotNaiveUiResolver().resolve('C_FormModal')).toEqual({
      name: 'C_FormModal',
      from: '@robot-admin/naive-ui-components/C_FormModal',
      sideEffects: undefined,
    })
  })

  test('resolves the public data-driven tabs component on demand', () => {
    expect(RobotNaiveUiResolver().resolve('C_Tabs')).toEqual({
      name: 'C_Tabs',
      from: '@robot-admin/naive-ui-components/C_Tabs',
      sideEffects: undefined,
    })
  })

  test('supports the root entry fallback', () => {
    expect(
      RobotNaiveUiResolver({ importOnDemand: false }).resolve('C_Form')?.from
    ).toBe('@robot-admin/naive-ui-components')
  })

  test('keeps true as the compatible full style mode', () => {
    expect(
      RobotNaiveUiResolver({ importStyle: true }).resolve('C_Table')
        ?.sideEffects
    ).toBe('@robot-admin/naive-ui-components/C_Table/style.css')
  })

  test('supports lightweight Form and Table style entries', () => {
    expect(
      RobotNaiveUiResolver({ importStyle: 'base' }).resolve('C_Form')
        ?.sideEffects
    ).toBe('@robot-admin/naive-ui-components/C_Form/base.css')
    expect(
      RobotNaiveUiResolver({ importStyle: 'base' }).resolve('C_Table')
        ?.sideEffects
    ).toBe('@robot-admin/naive-ui-components/C_Table/base.css')
  })

  test('falls back to the compatible style entry for other components', () => {
    expect(
      RobotNaiveUiResolver({ importStyle: 'base' }).resolve('C_Date')
        ?.sideEffects
    ).toBe('@robot-admin/naive-ui-components/C_Date/style.css')
    expect(
      RobotNaiveUiResolver({ importStyle: 'full' }).resolve('C_Table')
        ?.sideEffects
    ).toBe('@robot-admin/naive-ui-components/C_Table/style.css')
  })

  test('keeps component names unique and ignores unknown components', () => {
    expect(new Set(componentNames).size).toBe(componentNames.length)
    expect(RobotNaiveUiResolver().resolve('UnknownComponent')).toBeUndefined()
  })
})
