import { createApp } from 'vue'
import Performance from './Performance.vue'
import { registerOrganizationIcons } from './organization-icons'

registerOrganizationIcons()
createApp(Performance).mount('#app')
