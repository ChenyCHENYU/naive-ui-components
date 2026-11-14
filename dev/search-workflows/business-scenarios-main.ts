import { createApp } from 'vue'
import BusinessScenarios from './BusinessScenarios.vue'
import { registerOrganizationIcons } from './organization-icons'

registerOrganizationIcons()

createApp(BusinessScenarios).mount('#app')
