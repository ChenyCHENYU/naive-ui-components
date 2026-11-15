import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'

const CHINESE = Object.freeze({
  'avatarGroup.more': '显示另外 {count} 个头像',
})
const ENGLISH = Object.freeze({
  'avatarGroup.more': 'Show {count} more avatars',
})

export const useAvatarGroupLocale = () =>
  useScopedComponentLocale(CHINESE, ENGLISH)
