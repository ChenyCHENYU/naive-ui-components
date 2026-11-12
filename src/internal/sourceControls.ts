import { defineAsyncComponent } from 'vue'

/** 配置字段与类型化助手共用懒加载边界，基础表单不提前引入来源控件。 */
export const C_Select = defineAsyncComponent(
  () => import('../components/C_Select/index.vue')
)
export const C_AutoComplete = defineAsyncComponent(
  () => import('../components/C_AutoComplete/index.vue')
)
