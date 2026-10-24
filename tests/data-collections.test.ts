import { describe, expect, test } from 'bun:test'
import { reactive } from 'vue'
import { cloneData, isDataEqual } from '../src/utils/data'
import { useFormDirty } from '../src/components/C_Form/composables/useFormDirty'

describe('集合快照的结构比较', () => {
  test('Map 对象键和 Set 对象成员深克隆后相等，修改保持隔离', () => {
    const key = { id: 1 }
    const member = { name: 'Ada' }
    const source = { map: new Map([[key, { member }]]), set: new Set([member]) }
    const snapshot = cloneData(source)
    expect(isDataEqual(source, snapshot)).toBe(true)
    expect(isDataEqual(snapshot, source)).toBe(true)
    const clonedKey = [...snapshot.map.keys()][0]
    const clonedMember = [...snapshot.set][0]
    expect(clonedKey).not.toBe(key)
    expect(clonedMember).not.toBe(member)
    member.name = 'Grace'
    key.id = 2
    expect(clonedKey.id).toBe(1)
    expect(clonedMember.name).toBe('Ada')
    expect(isDataEqual(source, snapshot)).toBe(false)
  })

  test('真实表单保存集合快照后干净，深层修改和恢复正确反映', () => {
    const model = reactive({
      map: new Map([[{ id: 1 }, { label: 'Ada' }]]),
      set: new Set([{ enabled: true }]),
    })
    const dirty = useFormDirty(model)
    dirty.markAsClean()
    expect(dirty.isDirty.value).toBe(false)
    expect(dirty.getChangedFields()).toEqual([])
    const key = [...model.map.keys()][0]
    const member = [...model.set][0]
    key.id = 2
    member.enabled = false
    expect(dirty.getChangedFields()).toEqual(['map', 'set'])
    expect(dirty.isDirty.value).toBe(true)
    key.id = 1
    member.enabled = true
    expect(dirty.getChangedFields()).toEqual([])
    dirty.markAsClean()
    expect(dirty.isDirty.value).toBe(false)
  })

  test('集合无序，但 Map 必须同时匹配结构键及对应值', () => {
    const left = new Map([
      [{ id: 1 }, 'one'],
      [{ id: 2 }, 'two'],
    ])
    const reversed = new Map([
      [{ id: 2 }, 'two'],
      [{ id: 1 }, 'one'],
    ])
    const mismatched = new Map([
      [{ id: 1 }, 'two'],
      [{ id: 2 }, 'one'],
    ])
    expect(isDataEqual(left, reversed)).toBe(true)
    expect(isDataEqual(left, mismatched)).toBe(false)
    expect(
      isDataEqual(
        new Set([{ id: 1 }, { id: 2 }]),
        new Set([{ id: 2 }, { id: 1 }])
      )
    ).toBe(true)
  })

  test('重复结构对象键按值寻找未使用候选，不能复用同一个条目', () => {
    const left = new Map([
      [{ id: 1 }, { role: 'a' }],
      [{ id: 1 }, { role: 'b' }],
    ])
    const swapped = new Map([
      [{ id: 1 }, { role: 'b' }],
      [{ id: 1 }, { role: 'a' }],
    ])
    const duplicate = new Map([
      [{ id: 1 }, { role: 'a' }],
      [{ id: 1 }, { role: 'a' }],
    ])
    expect(isDataEqual(left, swapped)).toBe(true)
    expect(isDataEqual(swapped, left)).toBe(true)
    expect(isDataEqual(left, duplicate)).toBe(false)
    expect(isDataEqual(duplicate, left)).toBe(false)
  })

  test('Set 重复结构成员保留数量，不按结构去重后比较', () => {
    expect(
      isDataEqual(
        new Set([{ id: 1 }, { id: 1 }]),
        new Set([{ id: 1 }, { id: 1 }])
      )
    ).toBe(true)
    expect(
      isDataEqual(
        new Set([{ id: 1 }, { id: 1 }]),
        new Set([{ id: 1 }, { id: 2 }])
      )
    ).toBe(false)
    expect(
      isDataEqual(new Set([{ id: 1 }, { id: 1 }]), new Set([{ id: 1 }]))
    ).toBe(false)
  })

  test('Map 同身份键对应值不匹配时仍可按结构交换匹配', () => {
    const a = { id: 1 }
    const b = { id: 1 }
    expect(
      isDataEqual(
        new Map([
          [a, 'a'],
          [b, 'b'],
        ]),
        new Map([
          [a, 'b'],
          [b, 'a'],
        ])
      )
    ).toBe(true)
  })

  test('失败的 Set 候选不能将不等共享子节点写入后续命中缓存', () => {
    const leftShared = { value: 1 }
    const rightShared = { value: 2 }
    const left = new Set([
      { node: leftShared, tag: 'a' },
      { node: { value: 2 }, tag: 'b' },
    ])
    const right = new Set([
      { node: rightShared, tag: 'b' },
      { node: rightShared, tag: 'a' },
    ])
    expect(isDataEqual(left, right)).toBe(false)
    expect(isDataEqual(right, left)).toBe(false)
  })

  test('失败的 Map 键和值比较均回滚候选缓存', () => {
    const leftShared = { value: 1 }
    const rightShared = { value: 2 }
    const leftKeys = new Map([
      [{ node: leftShared, tag: 'a' }, 1],
      [{ node: { value: 2 }, tag: 'b' }, 2],
    ])
    const rightKeys = new Map([
      [{ node: rightShared, tag: 'b' }, 2],
      [{ node: rightShared, tag: 'a' }, 1],
    ])
    const leftValues = new Map([
      [{ id: 1 }, { node: leftShared, tag: 'a' }],
      [{ id: 1 }, { node: { value: 2 }, tag: 'b' }],
    ])
    const rightValues = new Map([
      [{ id: 1 }, { node: rightShared, tag: 'b' }],
      [{ id: 1 }, { node: rightShared, tag: 'a' }],
    ])
    expect(isDataEqual(leftKeys, rightKeys)).toBe(false)
    expect(isDataEqual(leftValues, rightValues)).toBe(false)
  })

  test('混合基础值、对象、日期和嵌套集合保留类型边界', () => {
    const token = Symbol('key')
    const source = new Map<unknown, unknown>([
      [NaN, new Set([null, undefined, token])],
      ['1', new Map([[{ id: 1 }, new Set([new Date(0), { name: 'Ada' }])]])],
      [1, 'number'],
    ])
    // Symbol 使 structuredClone 回退，仍要求集合内对象隔离和结构相等。
    const copy = cloneData(source)
    expect(isDataEqual(source, copy)).toBe(true)
    copy.set(1, 'changed')
    expect(isDataEqual(source, copy)).toBe(false)
    expect(isDataEqual(new Set([1]), new Set(['1']))).toBe(false)
    expect(isDataEqual(new Set([new Date(0)]), new Set([new Date(1)]))).toBe(
      false
    )
    expect(isDataEqual(new Map(), new Set())).toBe(false)
  })

  test('集合自身及集合与对象互相引用可以克隆、比较和检测变化', () => {
    const map = new Map<unknown, unknown>()
    const set = new Set<unknown>()
    const node = { map, set, label: 'same' }
    map.set(map, set)
    map.set(node, node)
    set.add(set)
    set.add(node)
    const copy = cloneData(node)
    expect(isDataEqual(node, copy)).toBe(true)
    expect(isDataEqual(copy, node)).toBe(true)
    copy.label = 'changed'
    expect(isDataEqual(node, copy)).toBe(false)
  })

  test('不同长度的循环不反复覆盖访问标记导致栈溢出', () => {
    interface Node {
      value: number
      next?: Node
    }
    const left: Node = { value: 1 }
    left.next = left
    const right: Node = { value: 1 }
    const middle: Node = { value: 1, next: right }
    right.next = middle
    expect(isDataEqual(left, right)).toBe(true)
    middle.value = 2
    expect(isDataEqual(left, right)).toBe(false)
  })

  test('无序候选失败回滚后，循环对象仍能匹配后续正确候选', () => {
    interface Node {
      value: string
      self?: Node
    }
    const make = (value: string): Node => {
      const node: Node = { value }
      node.self = node
      return node
    }
    const left = new Set([make('a'), make('b')])
    const right = new Set([make('b'), make('a')])
    expect(isDataEqual(left, right)).toBe(true)
    expect(isDataEqual(left, new Set([make('b'), make('b')]))).toBe(false)
  })

  test('大规模基础键集合保持线性原生查询，不枚举候选做平方级匹配', () => {
    const count = 5_000
    const entries = Array.from(
      { length: count },
      (_, index) => [index, { value: index }] as const
    )
    const leftMap = new Map(entries)
    const rightMap = new Map(
      entries.toReversed().map(([key, value]) => [key, { ...value }])
    )
    const leftSet = new Set(entries.map(([key]) => key))
    const rightSet = new Set([...leftSet].reverse())
    let mapLookups = 0
    let setLookups = 0
    let candidateVisits = 0
    const mapHas = rightMap.has.bind(rightMap)
    const setHas = rightSet.has.bind(rightSet)
    rightMap.has = key => {
      mapLookups++
      return mapHas(key)
    }
    rightSet.has = key => {
      setLookups++
      return setHas(key)
    }
    rightMap[Symbol.iterator] = function* () {
      for (const entry of Map.prototype.entries.call(this)) {
        candidateVisits++
        yield entry
      }
    }
    rightSet[Symbol.iterator] = function* () {
      for (const entry of Set.prototype.values.call(this)) {
        candidateVisits++
        yield entry
      }
    }
    expect(isDataEqual(leftMap, rightMap)).toBe(true)
    expect(isDataEqual(leftSet, rightSet)).toBe(true)
    expect(mapLookups).toBe(count)
    expect(setLookups).toBe(count)
    expect(candidateVisits).toBeLessThanOrEqual(count * 2)
  })
})
