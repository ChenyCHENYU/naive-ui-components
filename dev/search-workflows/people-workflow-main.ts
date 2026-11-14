import { createApp } from 'vue'
import PeopleWorkflow from './PeopleWorkflow.vue'
import { registerOrganizationIcons } from './organization-icons'
import { registerPeopleWorkflowIcons } from './people-workflow-icons'

registerOrganizationIcons()
registerPeopleWorkflowIcons()

createApp(PeopleWorkflow).mount('#app')
