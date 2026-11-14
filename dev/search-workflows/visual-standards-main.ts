import { createApp, defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import './visual-standards-icons'
import VisualStandards from './VisualStandards.vue'

const EmptyPage = defineComponent({ render: () => null })
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/overview',
      component: EmptyPage,
      meta: { title: '设计总览', icon: 'mdi:palette-outline' },
    },
    {
      path: '/standards',
      component: EmptyPage,
      meta: { title: '控件规范', icon: 'mdi:tune-variant' },
    },
    {
      path: '/records',
      component: EmptyPage,
      meta: { title: '变更记录', icon: 'mdi:history' },
    },
  ],
})
await router.replace('/overview')
createApp(VisualStandards).use(router).mount('#app')
