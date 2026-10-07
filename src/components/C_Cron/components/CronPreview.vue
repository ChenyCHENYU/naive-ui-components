<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 执行计划预览，非法和待应用规则不显示过期结果
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <aside
    class="cron-preview"
    aria-label="执行计划预览"
  >
    <header
      ><span class="cron-preview__step">02</span
      ><div><h3>确认执行计划</h3><p>按浏览器本地时区预览</p></div></header
    >
    <div
      class="cron-preview__next"
      role="status"
      aria-live="polite"
    >
      <span class="cron-preview__label">下一次执行</span>
      <template v-if="validation.valid && !pending && nextExecutions.length">
        <strong>{{ formatDate(nextExecutions[0]!) }}</strong
        ><span>{{ formatWeekDay(nextExecutions[0]!) }}</span>
      </template>
      <div
        v-else-if="computing"
        class="cron-preview__waiting"
        ><C_Loading :size="32" /><span>正在计算执行时间</span></div
      >
      <p v-else>{{
        !validation.valid
          ? '修正规则后重新预览'
          : pending
            ? '应用表达式后更新计划'
            : '未来一年内没有匹配的执行时间'
      }}</p>
    </div>
    <div
      v-if="validation.valid && !pending && nextExecutions.length"
      class="cron-preview__list"
    >
      <div class="cron-preview__list-heading"
        >接下来的执行时间
        <span>{{ nextExecutions.length }} / {{ count }}</span></div
      >
      <ol
        ><li
          v-for="(date, index) in nextExecutions"
          :key="date.getTime()"
          ><span class="cron-preview__idx">{{
            String(index + 1).padStart(2, '0')
          }}</span
          ><time :datetime="date.toISOString()">{{ formatDate(date) }}</time
          ><span>{{ formatWeekDay(date) }}</span></li
        ></ol
      >
    </div>
    <footer
      ><span>时区</span><code>{{ timeZone }}</code
      ><p>仅预览时间，不会创建或启动定时任务。</p></footer
    >
  </aside>
</template>
<script setup lang="ts">
  import C_Loading from '../../C_Loading/index.vue'
  import type { CronValidation } from '../types'
  defineOptions({ name: 'CronPreview' })
  defineProps<{
    nextExecutions: Date[]
    computing: boolean
    count: number
    validation: CronValidation
    pending: boolean
    formatDate: (date: Date) => string
    formatWeekDay: (date: Date) => string
  }>()
  const { timeZone } = Intl.DateTimeFormat().resolvedOptions()
</script>
<style lang="scss" scoped>
  @use './CronPreview.scss';
</style>
