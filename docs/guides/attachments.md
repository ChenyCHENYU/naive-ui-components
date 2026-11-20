# 附件资料面板

`C_Attachments` 用一份清单展示资料分类、上传状态和预览。图片、音视频按浏览器支持的格式播放。PDF、DOCX、XLS、XLSX 在选中时加载文档预览。

```vue
<script setup lang="ts">
  import {
    C_Attachments,
    type AttachmentItem,
    type AttachmentKey,
  } from '@robot-admin/naive-ui-components/C_Attachments'
  import '@robot-admin/naive-ui-components/C_Attachments/style.css'

  defineProps<{ items: AttachmentItem[] }>()
  const selected = defineModel<AttachmentKey | null>('selected', {
    default: null,
  })
  const emit = defineEmits<{
    download: [item: AttachmentItem]
    remove: [item: AttachmentItem]
  }>()
</script>

<template>
  <C_Attachments
    v-model:selected-key="selected"
    :items="items"
    downloadable
    removable
    @download="emit('download', $event)"
    @remove="emit('remove', $event)"
  />
</template>
```

- 每项使用当前清单内唯一且稳定的 `id`。关闭筛选后原选中项仍可恢复。上传状态可直接使用 `C_Upload` 的状态值，`percent` 的范围为 0–100。
- `url` 接收 HTTPS 或当前开发站点的同源 HTTP 地址。对于本地选择的资料传 `file`。可用 `#preview="{ item, kind }"` 接入项目自己的预览服务。
- 给 `uploadable` 配合 `@upload` 可使用项目的上传入口。也可在 `#upload` 放 `C_Upload`，将 `uid` 映射到 `id`、`raw` 映射到 `file`，把 `@change` 的清单作为 `items`。
- 下载和移除事件携带当前整项数据。由页面核验权限、处理失败并更新清单。页面可以用 `disabled` 暂停这些操作。
