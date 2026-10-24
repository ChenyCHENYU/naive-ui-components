# 瀑布流与长列表

`C_WaterFall` 同时负责瀑布流排布、图片懒加载、卡片测量和长列表窗口化。使用侧提供稳定的数据与加载状态即可，不需要计算可见范围或维护滚动监听。

## 最小接入

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_WaterFall,
    type WaterFallItem,
  } from '@robot-admin/naive-ui-components/C_WaterFall'
  import '@robot-admin/naive-ui-components/C_WaterFall/style.css'

  const photos = ref<WaterFallItem[]>([
    {
      id: 'photo-1',
      src: '/photos/1.jpg',
      width: 1200,
      height: 800,
      title: '城市风景',
    },
    {
      id: 'photo-2',
      src: '/photos/2.jpg',
      width: 800,
      height: 1200,
      title: '山间小路',
    },
  ])

  function openPhoto(item: WaterFallItem, index: number) {
    console.log(item.id, index)
  }
</script>

<template>
  <C_WaterFall
    :items="photos"
    @item-click="openPhoto"
  />
</template>
```

- `id` 必须唯一、稳定；追加和排序时保留同一业务项的标识。
- `width`、`height` 描述图片的原始比例，用于图片未加载、卡片未挂载时估算布局。提供准确比例能减少图片加载后的位移。
- 默认按容器宽度选择列数；需要固定列数时设置 `:columns="4"`，间距通过 `gap` 调整。
- 列表不足 100 项时保留完整 DOM；达到 100 项后自动只挂载视口附近的卡片，并保留整列占位高度。

## 页面滚动和局部滚动

不需要传入滚动容器。组件自动监听窗口及上层实际裁剪容器，计算它们的交集；嵌套滚动、窗口滚动和容器尺寸变化都会更新可见范围。

```vue
<template>
  <div style="height: 560px; overflow-y: auto">
    <C_WaterFall
      :items="photos"
      :columns="3"
    />
  </div>
</template>
```

暴露方法 `scrollToTop()` 将最近具有实际滚动范围的祖先滚动到本组件顶部；没有局部滚动容器时使用页面窗口。没有滚动范围的 `overflow: auto` 内容壳会被跳过；`overflow: clip/hidden` 参与视口裁剪，但不会被当作这个方法的滚动目标。组件卸载或进入 `KeepAlive` 缓存时会释放滚动监听、观察器和待执行帧，重新激活后按当前尺寸与位置恢复。

## 自定义卡片与键盘

```vue
<C_WaterFall :items="photos">
  <template #item="{ item, index, width, height }">
    <article>
      <img :src="item.src" :alt="item.title" :width="width" :height="height" loading="lazy" />
      <p>{{ index + 1 }}. {{ item.title }}</p>
    </article>
  </template>
</C_WaterFall>
```

卡片实际高度由 `ResizeObserver` 测量，标题换行、自定义内容变高会触发布局更新。同一帧内的图片和卡片测量会合并处理。容器宽度或图片地址变化后，组件不会继续沿用不适配的旧卡片高度。

插槽的 `index` 与 `item-click` 的序号始终对应完整 `items` 数组，滚动裁剪不会将它重置为当前可见列表的序号。

卡片支持 Enter/空格激活、方向键按数据顺序移动、Home/End 到首末项。窗口化时 Tab 会衔接尚未挂载的下一项，卡片内部按钮和输入框保留原生焦点顺序；正在聚焦的卡片不会因滚出视口而被卸载。

窗口外的其他卡片会卸载。编辑草稿、勾选值等业务状态应放在父级数据中，以稳定 `id` 管理。确实依赖每张卡片长期保留内部 DOM 状态、浏览器全文查找或打印时，可以显式关闭窗口化：

```vue
<C_WaterFall :items="photos" :virtual-scroll="false" />
```

## 分页加载

```vue
<C_WaterFall
  :items="photos"
  infinite
  :loading="loading"
  :no-more="noMore"
  @load-more="loadNextPage"
/>
```

`loadNextPage` 开始时将 `loading` 设为 `true`，成功后追加数据，最后恢复为 `false`。服务端确认没有后续数据时设置 `noMore`。组件不会替使用侧发请求或推断接口总数。

首屏内容不足以填满视口时，组件可以连续补页；每次连续补页最多 5 次。达到上限仍未填满时会显示“继续加载”，避免空响应或错误分页持续请求；用户也可以滚出、重新进入加载区域继续触发。自定义 footer 插槽可使用 `status`、`paused` 和 `loadMore` 保留同一交互。

## 性能边界

滚动时使用按列索引和二分查找，不逐项扫描完整列表；DOM 数量随可见范围、预渲染缓冲与聚焦项变化，不随总数据量持续增长。布局、数据更新和测量后的重新排布仍需处理数据集，窗口化不会替代服务端分页，也不会降低业务数据本身的内存占用。

回归用固定规模数据校验了 10,000 项下的 DOM 范围，以及 100,000 项下单次范围查询少于 150 次几何字段读取；这些是确定性的复杂度与 DOM 断言，并非对不同设备帧率的承诺。
