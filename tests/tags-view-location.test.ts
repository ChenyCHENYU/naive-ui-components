import { expect, test } from 'bun:test'
import {
  getTagLocation,
  parseStoredTags,
  useTagsView,
} from '../src/components/C_TagsView/useTagsView'

test('tag identity stays at path while its last query/hash address is updated', () => {
  const tags = useTagsView({ persistKey: '' })
  tags.addTag({
    path: '/order',
    fullPath: '/order?id=1#detail',
    title: 'Order',
  })
  tags.addTag({ path: '/order', fullPath: '/order?id=2#items', title: 'Order' })
  expect(tags.tagsViewList.value).toHaveLength(1)
  expect(getTagLocation(tags.tagsViewList.value[0])).toBe('/order?id=2#items')
  tags.addTag({ path: '/home', title: 'Home' })
  expect(getTagLocation(tags.tagsViewList.value[1])).toBe('/home')
})

test('persisted complete addresses are validated without discarding legacy tags', () => {
  const tags = parseStoredTags(
    JSON.stringify([
      { path: '/order', fullPath: '/order?id=1#detail', title: 'Order' },
      { path: '/old', title: 'Legacy' },
      { path: '/wrong', fullPath: '/another?secret=1', title: 'Wrong path' },
      { path: '/safe', fullPath: '//evil.example/path', title: 'External' },
      { path: '/\\evil.example', title: 'Invalid' },
    ])
  )
  expect(tags).toHaveLength(4)
  expect(tags.map(getTagLocation)).toEqual([
    '/order?id=1#detail',
    '/old',
    '/wrong',
    '/safe',
  ])
  expect(tags[1].fullPath).toBeUndefined()
  expect(tags[2].fullPath).toBeUndefined()
})
