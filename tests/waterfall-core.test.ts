import { describe, expect, test } from 'bun:test'
import { nextTick, ref } from 'vue'
import { useWaterFallLayout } from '../src/components/C_WaterFall/composables/useWaterFallLayout'

describe('C_WaterFall image layout', () => {
  test('wrapped captions reserve their actual height after loading more', async () => {
    const items = ref([{ id: 'one', src: '/one.svg', width: 1, height: 1 }])
    const layout = useWaterFallLayout(items, ref(1), ref(100), ref(20))
    layout.cacheItemExtraHeight('one', 62)
    items.value.push({ id: 'two', src: '/two.svg', width: 1, height: 1 })
    await nextTick()
    expect(layout.layoutItems.value[1].y).toBe(182)
    expect(layout.containerHeight.value).toBe(282)
    layout.cacheItemExtraHeight('one', 42)
    expect(layout.layoutItems.value[1].y).toBe(162)
  })
  test('loaded image ratio reflows immediately and scales across column widths', async () => {
    const items = ref([
      { id: 'photo', src: '/photo.png', width: 100, height: 100 },
    ])
    const columns = ref(2)
    const width = ref(200)
    const gap = ref(0)
    const layout = useWaterFallLayout(items, columns, width, gap)
    expect(layout.layoutItems.value[0].height).toBe(100)

    layout.cacheImageHeight('photo', 200, 100)
    expect(layout.layoutItems.value[0].height).toBe(200)
    expect(layout.containerHeight.value).toBe(200)

    width.value = 400
    await nextTick()
    expect(layout.layoutItems.value[0].width).toBe(200)
    expect(layout.layoutItems.value[0].height).toBe(400)
  })

  test('append-only demo data still triggers relayout', async () => {
    const items = ref([{ id: 'one', src: '/one.png', width: 1, height: 1 }])
    const layout = useWaterFallLayout(items, ref(1), ref(100), ref(0))
    items.value.push({ id: 'two', src: '/two.png', width: 1, height: 1 })
    await nextTick()
    expect(layout.layoutItems.value).toHaveLength(2)
    expect(layout.containerHeight.value).toBe(200)
  })
  test('same-length source changes and removed IDs at zero width discard stale measurements', async () => {
    const items = ref([{ id: 'one', src: '/one.png', width: 1, height: 1 }])
    const width = ref(100)
    const layout = useWaterFallLayout(items, ref(1), width, ref(0))
    layout.cacheImageHeight('one', 200, 100, '/one.png')
    layout.cacheItemExtraHeight('one', 40, 100, '/one.png')
    expect(layout.containerHeight.value).toBe(240)
    items.value[0].src = '/new.png'
    await nextTick()
    expect(layout.containerHeight.value).toBe(100)
    layout.cacheImageHeight('one', 300, 100, '/new.png')
    layout.cacheItemExtraHeight('one', 50, 100, '/new.png')
    width.value = 0
    items.value = [{ id: 'two', src: '/two.png', width: 1, height: 1 }]
    await nextTick()
    items.value = [{ id: 'one', src: '/new.png', width: 1, height: 1 }]
    width.value = 100
    await nextTick()
    expect(layout.containerHeight.value).toBe(100)
  })
})
