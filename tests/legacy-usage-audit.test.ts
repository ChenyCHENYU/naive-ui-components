import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  auditLegacyDirectory,
  auditLegacySource,
} from '../scripts/check-legacy-usage.js'

const pkg = '@robot-admin/naive-ui-components'
const audit = (
  source: string,
  filename = 'consumer.vue',
  globalComponents = false
) => auditLegacySource(source, filename, { globalComponents })

describe('兼容 API 静态迁移检查', () => {
  test('识别根入口别名和子入口命名导入，保留准确行号', () => {
    const result = audit(`<script setup lang="ts">
import { C_Date as Day } from '${pkg}'
import { C_FormSearch as Search } from '${pkg}/C_FormSearch'
</script>
<template>
  <Day v-model:date-range="range" mode="daterange" />
  <Search :form-params="params" />
</template>`)
    expect(result.errors).toEqual([])
    expect(
      result.findings.map(item => [
        item.component,
        item.legacy,
        item.line,
        item.column,
      ])
    ).toEqual([
      ['C_Date', 'date-range', 6, 8],
      ['C_FormSearch', 'form-params', 7, 11],
    ])
  })

  test('识别全部日期别名和 namespace 菜单旧更新事件', () => {
    const aliases = [
      'singleDate',
      'singleDateTime',
      'dateRange',
      'dateTimeRange',
      'smartRange',
    ]
    const result = audit(`<script setup>import * as UI from '${pkg}'</script>
<template>${aliases.map(name => `<UI.C_Date v-model:${name}="value" />`).join('')}
<UI.C_Menu :value="key" @update:value="onChange" /></template>`)
    expect(result.findings.map(item => item.legacy)).toEqual([
      ...aliases,
      'value',
      'update:value',
    ])
    expect(result.findings[4].replacement).toContain('mode="smart-range"')
  })

  test('自动导入组件必须显式启用，并支持 kebab-case', () => {
    const source =
      '<template><c-date :single-date="value" /><C_FormSearch :form-params="params" /></template>'
    expect(audit(source).findings).toEqual([])
    expect(audit(source, 'consumer.vue', true).findings).toHaveLength(2)
  })

  test('不把其他组件、业务字段、注释和字符串当旧 API', () => {
    const result = audit(
      `<script setup>
import { C_Date } from './business-date'
import { registerRenderer } from './business-registry'
const data = { formParams: {}, singleDate: '2026-10-24' }
const example = "<C_FormSearch :form-params='value' />"
registerRenderer(data)
</script><template>
<!-- <C_Date :single-date="value" /> -->
<C_Date :single-date="value" /><NInput v-model:value="value" />
</template>`,
      'consumer.vue',
      true
    )
    expect(result.findings).toEqual([])
  })

  test('模板本地同名声明优先于全局组件', () => {
    const result = audit(
      '<script setup>const C_Date = businessComponent</script><template><C_Date :single-date="value" /></template>',
      'consumer.vue',
      true
    )
    expect(result.findings).toEqual([])
  })

  test('v-for 和 slot 局部绑定不会冒充导入组件', () => {
    const result =
      audit(`<script setup>import { C_Date as Day } from '${pkg}'</script><template>
<template v-for="Day in items"><Day :single-date="value" /></template>
<Card v-slot="{ component: Day }"><Day :single-date="value" /></Card>
<Day @single-date="notify" />
</template>`)
    expect(result.findings).toEqual([])
    expect(result.unverified).toHaveLength(2)
  })

  test('动态 import 和 require 明示覆盖限制', () => {
    const result = audit(
      `const UI = await import('${pkg}'); const Form = require('${pkg}/C_Form')`,
      'consumer.ts'
    )
    expect(result.findings).toEqual([])
    expect(result.unverified).toHaveLength(2)
  })

  test('检查 renderer 导入别名、命名空间和转导出', () => {
    const result = audit(
      `import { registerRenderer as register } from '${pkg}/C_Form'
import * as UI from '${pkg}'
register('input', render)
UI.unregisterRenderer('input')
UI['registerRenderer']('input', render)
export { unregisterRenderer as remove } from '${pkg}'`,
      'consumer.ts'
    )
    expect(result.findings.map(item => item.legacy)).toEqual([
      'registerRenderer',
      'unregisterRenderer',
      'registerRenderer',
      'unregisterRenderer',
    ])
  })

  test('普通 namespace 属性不会命中迁移表原型', () => {
    const result = audit(
      `import * as UI from '${pkg}'; UI.toString; UI.constructor`,
      'consumer.ts'
    )
    expect(result.findings).toEqual([])
  })

  test('不误报遮蔽的 namespace 和无关 h 函数', () => {
    const result = audit(
      `import * as UI from '${pkg}'
import { C_Date as Day } from '${pkg}/C_Date'
function local(UI) { UI.registerRenderer('input', render); UI.C_Date }
function h(component, props) { return props }
h(Day, { singleDate: value })`,
      'consumer.ts'
    )
    expect(result.findings).toEqual([])
  })

  test('检查 h、createVNode 与 JSX 对象属性且不追踪业务对象', () => {
    const result = audit(
      `import { h as render, createVNode } from 'vue'
import { C_Date as Day, C_FormSearch as Search, C_Menu } from '${pkg}'
render(Day, { dateRange: range, 'onUpdate:dateRange': update })
createVNode(Search, { formParams: params })
const unrelated = { formParams: params }
const vnode = <C_Menu value={key} />
const spread = <Day {...{ smartRange: range }} />`,
      'consumer.tsx'
    )
    expect(result.findings.map(item => item.legacy)).toEqual([
      'dateRange',
      'onUpdate:dateRange',
      'formParams',
      'value',
      'smartRange',
    ])
    expect(result.errors).toEqual([])
  })

  test('支持 Vue namespace h 及 namespace JSX 标签', () => {
    const result = audit(
      `import * as Vue from 'vue'
import * as UI from '${pkg}'
Vue.h(UI.C_Date, { singleDate: value })
const view = <UI.C_FormSearch formParams={params} />`,
      'consumer.tsx'
    )
    expect(result.findings).toHaveLength(2)
  })

  test('全局 h 尊重局部参数遮蔽', () => {
    const result = audit(
      `h(C_Date, { singleDate: value })
function local(h, C_Date) { h(C_Date, { singleDate: value }) }`,
      'consumer.ts',
      true
    )
    expect(result.findings).toHaveLength(1)
  })

  test('旧表格类型导入和 namespace 类型可得到主配置建议', () => {
    const result = audit(
      `import type { TableEditProps as OldEdit } from '${pkg}/C_Table'
import type * as Table from '${pkg}/C_Table'
type Expand = Table.TableExpandProps<Row>
type Selection = Table.TableSelectionProps<Row>`,
      'consumer.ts'
    )
    expect(result.findings.map(item => item.legacy)).toEqual([
      'TableEditProps',
      'TableExpandProps',
      'TableSelectionProps',
    ])
  })

  test('静态 v-bind 对象能检查，动态和展开项单独报告', () => {
    const result =
      audit(`<script setup>import { C_Date as Day } from '${pkg}'</script><template>
<Day v-bind="{ singleDate: value, ...attrs }" />
<Day v-bind="props" :[field]="value" v-on="listeners" />
<component :is="current" />
</template>`)
    expect(result.findings.map(item => item.legacy)).toEqual(['singleDate'])
    expect(result.unverified).toHaveLength(5)
  })

  test('不将实例公开 formParams 或当前主 API 误标弃用', () => {
    const result = audit(`<script setup lang="ts">
import { C_Date, C_FormSearch, C_Menu, createFormRendererRegistry, defineTableConfig } from '${pkg}'
const registry = createFormRendererRegistry()
registry.register('input', render)
const current = searchRef.value?.formParams
const config = defineTableConfig<Row>({ edit: { mode: 'cell' } })
</script><template>
<C_Date v-model="value" mode="date" />
<C_FormSearch v-model="params" :form-item-list="fields" />
<C_Menu v-model="key" />
</template>`)
    expect(result.findings).toEqual([])
    expect(result.unverified).toEqual([])
    expect(result.errors).toEqual([])
  })

  test('解析错误不能作为零违规通过', () => {
    expect(
      audit('const data = {', 'consumer.ts').errors.length
    ).toBeGreaterThan(0)
    expect(
      audit('<template><C_Date></template>').errors.length
    ).toBeGreaterThan(0)
  })

  test('目录扫描忽略产物、声明和软链，并拒绝空目标', () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'robot-legacy-usage-')
    )
    try {
      const source = '<template><C_Date :single-date="value" /></template>'
      fs.writeFileSync(path.join(directory, 'consumer.vue'), source)
      fs.writeFileSync(
        path.join(directory, 'generated.d.ts'),
        'const invalid = {'
      )
      fs.mkdirSync(path.join(directory, 'dist'))
      fs.writeFileSync(path.join(directory, 'dist', 'built.vue'), source)
      fs.symlinkSync(
        path.join(directory, 'consumer.vue'),
        path.join(directory, 'linked.vue')
      )
      const result = auditLegacyDirectory(directory, { globalComponents: true })
      expect(result.files).toBe(1)
      expect(result.findings).toHaveLength(1)
      expect(
        fs.readFileSync(path.join(directory, 'consumer.vue'), 'utf8')
      ).toBe(source)
      fs.mkdirSync(path.join(directory, 'empty'))
      expect(() => auditLegacyDirectory(path.join(directory, 'empty'))).toThrow(
        '没有找到'
      )
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })

  test('真实 CLI 默认报告、strict 阻断、解析失败退出且可输出 JSON', () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'robot-legacy-cli-')
    )
    const script = path.resolve(
      import.meta.dir,
      '../scripts/check-legacy-usage.js'
    )
    const file = path.join(directory, 'consumer.vue')
    const run = (...flags: string[]) =>
      spawnSync(
        process.execPath,
        [script, file, '--global-components', '--json', ...flags],
        { encoding: 'utf8' }
      )
    try {
      fs.writeFileSync(
        file,
        '<template><C_Date :single-date="value" /></template>'
      )
      const report = run()
      expect(report.status).toBe(0)
      expect(JSON.parse(report.stdout).findings).toHaveLength(1)
      expect(run('--strict').status).toBe(1)
      fs.writeFileSync(file, '<template><C_Date v-model="value" /></template>')
      expect(run('--strict').status).toBe(0)
      fs.writeFileSync(file, '<template><C_Date></template>')
      expect(run().status).toBe(2)
      expect(run('--unsupported').status).toBe(2)
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })
})
