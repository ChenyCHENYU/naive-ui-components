# 图片标注

`C_ImageAnnotator` 用于质检照片、工单凭证等矩形标注。可在原图上拖绘，也可通过「添加标注」输入百分比坐标。标注说明和位置在点击保存后一起更新。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_ImageAnnotator,
    type ImageAnnotation,
  } from '@robot-admin/naive-ui-components/C_ImageAnnotator'
  import '@robot-admin/naive-ui-components/C_ImageAnnotator/style.css'

  defineProps<{ photo: string | File; photoName: string }>()
  const annotations = ref<readonly ImageAnnotation[]>([])
</script>

<template>
  <C_ImageAnnotator
    v-model="annotations"
    :src="photo"
    :alt="photoName"
  />
</template>
```

每条标注包含稳定的 `id`、说明 `note` 和 `box`。矩形从原图左上角开始计算，`x`、`y`、`width`、`height` 按原图宽高归一化到 0–1，和预览容器尺寸无关。页面负责按图片记录保存这组值，查看历史时可传入 `readonly`。接受安全的远程 URL 或本地 `File`。
