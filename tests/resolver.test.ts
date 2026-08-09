/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-08-09
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-08-09
 * @FilePath: \naive-ui-components\tests\resolver.test.ts
 * @Description: 组件库按需导入解析器测试
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import { describe, expect, test } from 'bun:test'
import { RobotNaiveUiResolver, componentNames } from '../src/resolver'

describe('RobotNaiveUiResolver', () => {
  test('默认使用组件子路径按需导入', () => {
    const resolver = RobotNaiveUiResolver()

    expect(resolver.resolve('C_Form')).toEqual({
      name: 'C_Form',
      from: '@robot-admin/naive-ui-components/C_Form',
      sideEffects: undefined,
    })
  })

  test('支持显式回退到组件库总入口', () => {
    const resolver = RobotNaiveUiResolver({ importOnDemand: false })

    expect(resolver.resolve('C_Form')?.from).toBe(
      '@robot-admin/naive-ui-components'
    )
  })

  test('按需样式与组件子路径保持一致', () => {
    const resolver = RobotNaiveUiResolver({ importStyle: true })

    expect(resolver.resolve('C_Table')?.sideEffects).toBe(
      '@robot-admin/naive-ui-components/C_Table/style.css'
    )
  })

  test('组件名称唯一且忽略未知组件', () => {
    expect(new Set(componentNames).size).toBe(componentNames.length)
    expect(RobotNaiveUiResolver().resolve('UnknownComponent')).toBeUndefined()
  })
})
