import { expect, test } from 'bun:test'
import { useTagsView } from '../src/components/C_TagsView/useTagsView'

const initialTags = () => [
  { path: '/home', title: 'Home' },
  { path: '/fixed-left', title: 'Fixed left', meta: { affix: true } },
  { path: '/current', title: 'Current' },
  { path: '/fixed-right', title: 'Fixed right', meta: { affix: true } },
  { path: '/last', title: 'Last' },
]

test('bulk tag closing preserves every affixed tag, selected order, and the legacy first tag', () => {
  const cases = [
    [
      'removeOtherTags',
      2,
      ['/home', '/fixed-left', '/current', '/fixed-right'],
    ],
    ['removeLeftTags', 3, ['/home', '/fixed-left', '/fixed-right', '/last']],
    ['removeRightTags', 1, ['/home', '/fixed-left', '/fixed-right']],
    ['removeLeftTags', 0, initialTags().map(tag => tag.path)],
  ] as const
  for (const [operation, index, expected] of cases) {
    const tags = useTagsView({ persistKey: '' })
    tags.initTags(initialTags())
    tags[operation](index)
    expect(tags.tagsViewList.value.map(tag => tag.path)).toEqual([...expected])
  }
})
