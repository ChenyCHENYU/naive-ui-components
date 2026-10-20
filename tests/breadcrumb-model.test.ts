/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-20
 * @Description: 面包屑菜单授权边界、路由层级及当前页恢复回归。
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { describe, expect, test } from 'bun:test'
import {
  countBreadcrumbPages,
  resolveBreadcrumbItems,
} from '../src/components/C_Breadcrumb/model'
import type { BreadcrumbMenuItem } from '../src/components/C_Breadcrumb/types'
import type { BreadcrumbItem } from '../src/components/_shared/public'

const flattenKeys = (items: readonly BreadcrumbItem[]): string[] =>
  items.flatMap(item => [item.key, ...flattenKeys(item.children ?? [])])

describe('C_Breadcrumb data model', () => {
  test('preserves manual items and their already formatted labels', () => {
    const items = [{ key: '/manual', label: '已翻译', disabled: true }]
    const before = JSON.stringify(items)
    let calls = 0
    const result = resolveBreadcrumbItems({
      items,
      path: '/other',
      matched: [],
      formatLabel: () => {
        calls++
        return '重复翻译'
      },
    })
    expect(result).toEqual(items)
    expect(result).not.toBe(items)
    expect(calls).toBe(0)
    expect(JSON.stringify(items)).toBe(before)
    expect(
      resolveBreadcrumbItems({ items: [], path: '/', matched: [] })
    ).toEqual([])
  })

  test('copies frozen manual descendants without changing caller data', () => {
    const child = Object.freeze({ key: '/manual/child', label: '子项' })
    const items = Object.freeze([
      Object.freeze({
        key: '/manual',
        label: '手动目录',
        children: Object.freeze([child]),
      }),
    ])
    const result = resolveBreadcrumbItems({
      items,
      path: '/manual/child',
      matched: [],
    })
    expect(result).toEqual(items)
    expect(result[0].children?.[0]).not.toBe(child)
    result[0].label = '新目录'
    expect(items[0].label).toBe('手动目录')
  })

  test('inherits disabled manual directories through frozen descendants', () => {
    const current = Object.freeze({
      key: '/manual/current',
      label: '当前页',
      disabled: false,
    })
    const sibling = Object.freeze({ key: '/manual/sibling', label: '兄弟页面' })
    const nestedPage = Object.freeze({
      key: '/manual/nested/page',
      label: '深层页面',
      disabled: false,
    })
    const items = Object.freeze([
      Object.freeze({
        key: '/manual',
        label: '禁用目录',
        disabled: true,
        children: Object.freeze([
          current,
          sibling,
          Object.freeze({
            key: '/manual/nested',
            label: '深层目录',
            disabled: false,
            children: Object.freeze([nestedPage]),
          }),
        ]),
      }),
      Object.freeze({ key: '/enabled', label: '未禁用', disabled: false }),
      Object.freeze({ key: '/unspecified', label: '未指定' }),
    ])
    const before = JSON.stringify(items)
    const result = resolveBreadcrumbItems({
      items,
      path: current.key,
      matched: [],
    })
    const descendants = result[0].children
    expect(descendants?.map(item => item.disabled)).toEqual([true, true, true])
    expect(descendants?.[2].children?.[0].disabled).toBe(true)
    expect(countBreadcrumbPages([result[0]])).toBe(0)
    expect(result[1].disabled).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(result[2], 'disabled')).toBe(
      false
    )
    expect(JSON.stringify(items)).toBe(before)
    expect(current.disabled).toBe(false)
    expect(nestedPage.disabled).toBe(false)
  })

  test('counts only enabled leaf pages, excluding disabled directory subtrees', () => {
    expect(
      countBreadcrumbPages([
        { key: '/one', label: '单页' },
        { key: '/disabled', label: '禁用单页', disabled: true },
        {
          key: '/group',
          label: '目录',
          children: [
            { key: '/group/one', label: '页一' },
            { key: '/group/two', label: '页二', disabled: true },
            {
              key: '/group/nested',
              label: '深层目录',
              children: [{ key: '/group/nested/one', label: '页三' }],
            },
          ],
        },
        {
          key: '/disabled-group',
          label: '禁用目录',
          disabled: true,
          children: [{ key: '/disabled-group/page', label: '不可用后代' }],
        },
      ])
    ).toBe(3)
    expect(countBreadcrumbPages([])).toBe(0)
  })

  test('recovers all menu ancestors even when matched only contains a leaf', () => {
    const menus = [
      {
        path: '/settings',
        label: '设置',
        children: [
          {
            key: 'access',
            label: '权限',
            children: [
              {
                path: 'roles',
                label: '角色',
                children: [{ path: 'list', label: '列表' }],
              },
            ],
          },
        ],
      },
    ]
    const result = resolveBreadcrumbItems({
      menus,
      matched: [
        { path: '/settings/access/roles/list', meta: { title: '列表' } },
      ],
      path: '/settings/access/roles/list',
      formatLabel: label => `t:${label}`,
    })
    expect(result.map(item => [item.key, item.label])).toEqual([
      ['/settings', 't:设置'],
      ['/settings/access', 't:权限'],
      ['/settings/access/roles', 't:角色'],
      ['/settings/access/roles/list', 't:列表'],
    ])
  })

  test('uses authorized menus as the sole dropdown source', () => {
    const matched = [
      {
        path: '/system',
        meta: { title: '系统' },
        children: [
          { path: 'allowed', meta: { title: '允许' } },
          { path: 'forbidden', meta: { title: '无权访问' } },
        ],
      },
      { path: '/system/allowed', meta: { title: '允许' } },
    ]
    const result = resolveBreadcrumbItems({
      menus: [
        {
          path: '/system',
          label: '系统',
          children: [{ key: 'allowed', label: '允许' }],
        },
      ],
      matched,
      path: '/system/allowed',
    })
    expect(flattenKeys(result)).not.toContain('/system/forbidden')
    expect(result[0].children?.map(item => item.key)).toEqual([
      '/system/allowed',
    ])
    const emptyMenus = resolveBreadcrumbItems({
      menus: [],
      matched,
      path: '/system/allowed',
    })
    expect(emptyMenus.map(item => item.key)).toEqual([
      '/system',
      '/system/allowed',
    ])
    expect(emptyMenus.every(item => !item.children?.length)).toBe(true)
  })

  test('preserves hidden current details with their actual parameterized address', () => {
    const result = resolveBreadcrumbItems({
      menus: [
        {
          path: '/users',
          label: '用户',
          children: [{ path: 'list', label: '列表' }],
        },
      ],
      matched: [
        { path: '/users/:id', meta: { title: '用户详情', hidden: true } },
      ],
      path: '/users/42',
    })
    expect(result.map(item => [item.key, item.label])).toEqual([
      ['/users', '用户'],
      ['/users/42', '用户详情'],
    ])
    expect(flattenKeys(result)).not.toContain('/users/:id')
  })

  test('falls back to matched when the current page has no menu mapping', () => {
    const result = resolveBreadcrumbItems({
      menus: [{ path: '/unrelated', label: '其他菜单' }],
      matched: [
        { path: '/audit', meta: { title: '审计' } },
        {
          path: '/audit/event/:id',
          meta: { title: '事件详情', hidden: true },
        },
      ],
      path: '/audit/event/7',
    })
    expect(result.map(item => item.key)).toEqual(['/audit', '/audit/event/7'])
  })

  test('filters hidden menu subtrees and expands group/untitled breadcrumb wrappers', () => {
    const menus: readonly BreadcrumbMenuItem[] = Object.freeze([
      {
        path: '/root',
        label: '根目录',
        children: Object.freeze([
          {
            type: 'group',
            key: 'not-a-route',
            label: '分组',
            children: [{ path: 'visible', label: '可见页' }],
          },
          { type: 'divider', path: 'divider', label: '分割线' },
          {
            path: 'hidden',
            label: '隐藏目录',
            meta: { hidden: true },
            children: [{ path: 'child', label: '隐藏后代' }],
          },
          {
            path: 'wrapper',
            meta: { breadcrumb: false },
            children: [{ path: 'page', label: '有效后代' }],
          },
          { path: 'untitled', label: '   ' },
        ]),
      },
    ])
    const before = JSON.stringify(menus)
    const result = resolveBreadcrumbItems({
      menus,
      path: '/root/visible',
      matched: [{ path: '/root/visible', meta: { title: '可见页' } }],
    })
    expect(result[0].children?.map(item => item.key)).toEqual([
      '/root/visible',
      '/root/wrapper/page',
    ])
    expect(JSON.stringify(menus)).toBe(before)
  })

  test('recursively supports route children beyond two levels and resolves relative paths', () => {
    const result = resolveBreadcrumbItems({
      path: '/section/current',
      matched: [
        {
          path: '/section',
          meta: { title: '栏目' },
          children: [
            {
              path: 'one',
              meta: { title: '一级' },
              children: [
                {
                  path: 'two',
                  meta: { title: '二级' },
                  children: [
                    {
                      path: 'three',
                      meta: { title: '三级' },
                      children: [
                        { path: '../sibling', meta: { title: '兄弟页面' } },
                        { path: '/absolute', meta: { title: '绝对地址' } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        { path: '/section/current', meta: { title: '当前页' } },
      ],
    })
    expect(flattenKeys(result[0].children ?? [])).toEqual([
      '/section/one',
      '/section/one/two',
      '/section/one/two/three',
      '/section/one/two/sibling',
      '/absolute',
    ])
  })

  test('filters hidden and dynamic leaf routes from automatic dropdowns', () => {
    const result = resolveBreadcrumbItems({
      path: '/people/21',
      matched: [
        {
          path: '/people',
          meta: { title: '成员' },
          children: [
            { path: 'list', meta: { title: '列表' } },
            { path: ':id', meta: { title: '详情' } },
            { path: ':pathMatch(.*)*', meta: { title: '通配页' } },
            { path: 'hidden', meta: { title: '隐藏', hidden: true } },
            { path: 'excluded', meta: { title: '排除', breadcrumb: false } },
            { path: 'untitled' },
          ],
        },
        { path: '/people/:id', meta: { title: '详情', hidden: true } },
      ],
    })
    expect(result[0].children?.map(item => item.key)).toEqual(['/people/list'])
    expect(result[1].key).toBe('/people/21')
    expect(result[1].disabled).toBe(false)
  })

  test('never emits dynamic ancestor addresses as enabled links', () => {
    const result = resolveBreadcrumbItems({
      path: '/workspace/21/reports',
      matched: [
        { path: '/workspace/:id', meta: { title: '工作区' } },
        {
          path: '/workspace/:id/reports',
          meta: { title: '报告' },
        },
      ],
    })
    expect(result[0].disabled).toBe(true)
    expect(result[1].key).toBe('/workspace/21/reports')
  })

  test('replaces a mapped dynamic current key with the actual address', () => {
    const result = resolveBreadcrumbItems({
      menus: [
        {
          path: '/items',
          label: '物品',
          children: [{ path: ':id', label: '物品详情' }],
        },
      ],
      path: '/items/8',
      matched: [{ path: '/items/:id', meta: { title: '物品详情' } }],
    })
    expect(result.map(item => item.key)).toEqual(['/items', '/items/8'])
    expect(result[1].disabled).toBe(false)
    expect(flattenKeys(result)).not.toContain('/items/:id')
  })

  test('carries disabled state through nested menu options', () => {
    const result = resolveBreadcrumbItems({
      menus: [
        {
          path: '/tools',
          label: '工具',
          disabled: true,
          children: [{ path: 'job', label: '作业' }],
        },
      ],
      path: '/tools/job',
      matched: [{ path: '/tools/job', meta: { title: '作业' } }],
    })
    expect(result[0].disabled).toBe(true)
    expect(result[0].children?.[0].disabled).toBe(true)
    expect(result[1].disabled).toBe(true)
  })

  test('ignores render-function icons and accepts a string meta icon', () => {
    const result = resolveBreadcrumbItems({
      menus: [
        {
          path: '/dashboard',
          label: '工作台',
          icon: () => null,
          meta: { icon: 'mdi:home' },
        },
      ],
      path: '/dashboard',
      matched: [{ path: '/dashboard' }],
    })
    expect(result[0].icon).toBe('mdi:home')
  })

  test('falls back to the current route name or a readable actual path', () => {
    expect(
      resolveBreadcrumbItems({
        path: '/unknown/21',
        matched: [{ path: '/unknown/:id', name: '用户详情' }],
      })[0]
    ).toMatchObject({ key: '/unknown/21', label: '用户详情' })
    expect(
      resolveBreadcrumbItems({ path: '/unknown/new-page', matched: [] })[0]
    ).toMatchObject({ key: '/unknown/new-page', label: 'new page' })
    expect(
      resolveBreadcrumbItems({ path: '/%E4%B8%AD%E6%96%87', matched: [] })[0]
        .label
    ).toBe('中文')
    expect(
      resolveBreadcrumbItems({ path: '/%broken', matched: [] })[0].label
    ).toBe('%broken')
  })

  test('respects explicit breadcrumb false for the current route', () => {
    const matched = [
      { path: '/area', meta: { title: '区域' } },
      {
        path: '/area/detail',
        meta: { title: '详情', breadcrumb: false },
      },
    ]
    const menus = [
      {
        path: '/area',
        label: '区域',
        children: [{ path: 'detail', label: '详情' }],
      },
    ]
    expect(
      resolveBreadcrumbItems({ menus, matched, path: '/area/detail' }).map(
        item => item.key
      )
    ).toEqual(['/area'])
    expect(
      resolveBreadcrumbItems({ matched, path: '/area/detail' }).map(
        item => item.key
      )
    ).toEqual(['/area'])
  })

  test('recomputes from replacement menus without retaining previous permissions', () => {
    const base = {
      path: '/admin/users',
      matched: [{ path: '/admin/users', meta: { title: '用户' } }],
    }
    const first = resolveBreadcrumbItems({
      ...base,
      menus: [
        {
          path: '/admin',
          label: '管理',
          children: [
            { path: 'users', label: '用户' },
            { path: 'roles', label: '角色' },
          ],
        },
      ],
    })
    const next = resolveBreadcrumbItems({ ...base, menus: [] })
    expect(flattenKeys(first)).toContain('/admin/roles')
    expect(flattenKeys(next)).not.toContain('/admin/roles')
    expect(next[0].key).toBe('/admin/users')
  })
})
