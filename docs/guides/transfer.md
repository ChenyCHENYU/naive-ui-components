# 穿梭框与大列表

```vue
<C_Transfer v-model="selectedKeys" :data="people" filterable />
```

左右面板分别按搜索后的项数决定渲染方式：少于 100 项使用普通列表，100 项起复用 Naive UI 同样使用的官方 `vueuc/VVirtualList`，只挂载当前视口及相邻行。全选、禁用判断和移动顺序仍以完整列表为准；滚动到视口之外的选中项不会丢失。右侧保持 `modelValue` 的顺序，新增项按左侧数据顺序追加。

`size="small | medium | large"` 对应 28 / 34 / 40px 固定行高。继续通过既有 `--tf-height` 覆盖列表高度，例如 `style="--tf-height: 240px"`；无需为大列表额外设置高度或分页。

若项目自行改变行高、需要打印全部项，或依赖完整列表 DOM，可显式设置 `:virtual-scroll="false"` 保留普通渲染。默认开启自动判断，常规接入无需配置。搜索仍检查全部数据；虚拟列表减少 DOM 与组件挂载量，不把筛选或数据存储变成无限容量服务。
