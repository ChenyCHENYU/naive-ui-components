import { describe, expect, test } from 'bun:test'
import { nextTick, ref } from 'vue'
import { useWaterFallLayout } from '../src/components/C_WaterFall/composables/useWaterFallLayout'

describe('C_WaterFall image layout', () => {
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
})
