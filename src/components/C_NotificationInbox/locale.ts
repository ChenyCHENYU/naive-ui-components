import type { MaybeRefOrGetter } from 'vue'
import type { ComponentLocale } from '../../core/contracts'
import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'

const CHINESE = Object.freeze({ 'inbox.views': '收件箱视图' })
const ENGLISH = Object.freeze({ 'inbox.views': 'Inbox views' })

export const useInboxLocale = (
  local: MaybeRefOrGetter<ComponentLocale | undefined>
) => useScopedComponentLocale(CHINESE, ENGLISH, local)
