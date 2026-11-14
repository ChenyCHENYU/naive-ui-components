import { createApp } from 'vue'
import { registerOrganizationIcons } from './organization-icons'
import Organization from './Organization.vue'

registerOrganizationIcons()

createApp(Organization).mount('#app')
