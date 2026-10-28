import { defineComponent, type PropType, type VNodeChild } from 'vue'
import type { SearchFieldContext } from './types'

export type SearchControlContext = Omit<SearchFieldContext, 'model'> & {
  model: object
}

/** 无额外包装的自定义字段出口，模型写入统一经过受控 updateValue。 */
export default defineComponent({
  name: 'SearchCustomField',
  props: {
    render: {
      type: Function as PropType<(context: SearchControlContext) => VNodeChild>,
      required: true,
    },
    context: { type: Object as PropType<SearchControlContext>, required: true },
  },
  setup: props => () => props.render(props.context),
})
