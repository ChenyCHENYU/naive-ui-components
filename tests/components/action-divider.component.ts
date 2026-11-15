import { mount } from '@vue/test-utils'
import { NDivider } from 'naive-ui'
import { expect, test } from 'vitest'
import C_ActionBar from '../../src/components/C_ActionBar/index.vue'

test.each(['horizontal', 'vertical'] as const)(
  '%s dividers render between visible actions in both groups without trailing lines',
  async dividerType => {
    const wrapper = mount(C_ActionBar, {
      props: {
        actions: [
          { key: 'add' },
          { key: 'save' },
          { key: 'hidden', show: false },
          { key: 'reset', group: 'right' },
          { key: 'close', group: 'right' },
        ],
        config: { showDivider: true, dividerType },
      },
    })
    const dividers = wrapper.findAllComponents(NDivider)
    expect(dividers).toHaveLength(2)
    for (const divider of dividers) {
      expect(divider.props('vertical')).toBe(dividerType === 'vertical')
      expect(divider.classes('action-divider--horizontal')).toBe(
        dividerType === 'horizontal'
      )
    }
    await wrapper.setProps({ config: { showDivider: false, dividerType } })
    expect(wrapper.findAllComponents(NDivider)).toHaveLength(0)
  }
)
