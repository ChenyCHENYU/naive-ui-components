<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 页面加载按需入口及公开配置的消费类型验证
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <C_PageLoading
    :show="visible"
    label="正在打开页面"
    description="字典管理"
  />
</template>
<script setup lang="ts">
  import {
    C_PageLoading,
    createPageLoading,
    type PageLoadingOptions,
  } from '@robot-admin/naive-ui-components/C_PageLoading'

  const options: PageLoadingOptions = { delay: 160 }
  const loading = createPageLoading(options)
  const { visible } = loading
  const navigation = loading.start()
  loading.finish(navigation)
  loading.reset()
</script>
