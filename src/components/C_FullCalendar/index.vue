<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-19
 * @Description: 全局日历组件 — 薄 UI 壳，逻辑由 useCalendarEvents 驱动
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div
    class="c-full-calendar"
    :style="themeStyle"
  >
    <FullCalendar
      ref="calendarRef"
      :options="calendarOptions"
    />

    <NModal
      v-if="showActionDialog"
      v-model:show="showActionDialog"
      preset="dialog"
      :title="`事件操作 - ${selectedEvent?.title}`"
      :style="{ ...themeStyle, width: 'min(400px, calc(100vw - 24px))' }"
    >
      <div class="ml-10% mt-20px">
        <NButton
          type="primary"
          @click="openEditModal"
          style="margin-right: 12px"
          size="small"
        >
          编辑
        </NButton>
        <NButton
          type="error"
          @click="deleteEvent"
          size="small"
        >
          删除
        </NButton>
      </div>
    </NModal>

    <NModal
      v-model:show="showEditModal"
      preset="dialog"
      :title="isEditing ? '编辑事件' : '添加事件'"
      :style="{ ...themeStyle, width: 'min(480px, calc(100vw - 24px))' }"
      positive-text="保存"
      negative-text="取消"
      @positive-click="saveEvent"
    >
      <div style="padding: 20px">
        <div style="margin-bottom: 16px">
          <label style="display: block; margin-bottom: 8px; font-weight: 500"
            >事件标题</label
          >
          <NInput
            v-model:value="editForm.title"
            placeholder="请输入事件标题"
            :input-props="{ 'aria-label': '事件标题' }"
          />
        </div>

        <div style="margin-bottom: 16px">
          <label style="display: block; margin-bottom: 8px; font-weight: 500"
            >开始日期</label
          >
          <NDatePicker
            v-model:value="editForm.date"
            type="date"
            format="yyyy-MM-dd"
            style="width: 100%"
            aria-label="开始日期"
          />
        </div>

        <div style="margin-bottom: 16px">
          <label style="display: block; margin-bottom: 8px; font-weight: 500"
            >结束日期</label
          >
          <NDatePicker
            v-model:value="editForm.endDate"
            type="date"
            format="yyyy-MM-dd"
            style="width: 100%"
            aria-label="结束日期"
          />
        </div>

        <NCheckbox
          v-model:checked="editForm.allDay"
          style="margin-bottom: 16px"
        >
          全天事件
        </NCheckbox>

        <div
          v-if="!editForm.allDay"
          style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px"
        >
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500"
              >开始时间</label
            >
            <NInput
              v-model:value="editForm.startTime"
              placeholder="09:00"
              :input-props="{ 'aria-label': '开始时间（24 小时制）' }"
            />
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500"
              >结束时间</label
            >
            <NInput
              v-model:value="editForm.endTime"
              placeholder="10:00"
              :input-props="{ 'aria-label': '结束时间（24 小时制）' }"
            />
          </div>
        </div>

        <div style="margin-top: 16px">
          <label style="display: block; margin-bottom: 8px; font-weight: 500"
            >事件颜色</label
          >
          <div style="display: flex; gap: 8px">
            <button
              v-for="color in eventColors"
              :key="color"
              type="button"
              class="event-color-swatch"
              :aria-label="`事件颜色 ${color}`"
              :aria-pressed="editForm.color === color"
              :style="{
                width: '30px',
                height: '30px',
                backgroundColor: color,
                borderRadius: '50%',
                border:
                  editForm.color === color
                    ? '3px solid var(--c-text-1, var(--c-theme-text-1))'
                    : '2px solid var(--c-border, var(--c-theme-border))',
              }"
              @click="editForm.color = color"
            ></button>
          </div>
        </div>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { NModal, NButton, NInput, NDatePicker, NCheckbox } from 'naive-ui'
  import FullCalendar from '@fullcalendar/vue3'
  import { useCalendarEvents } from './composables/useCalendarEvents'
  import type { CalendarProps, CalendarEmits, CalendarExpose } from './types'

  defineOptions({ name: 'C_FullCalendar' })

  const themeStyle = useComponentTheme()

  const props = withDefaults(defineProps<CalendarProps>(), {
    events: () => [],
    initialView: 'dayGridMonth',
    editable: true,
    showAddDialog: true,
    showEditDialog: true,
  })

  const emit = defineEmits<CalendarEmits>()

  const {
    calendarRef,
    calendarOptions,
    showActionDialog,
    showEditModal,
    isEditing,
    selectedEvent,
    editForm,
    eventColors,
    openEditModal,
    saveEvent,
    deleteEvent,
    expose,
  } = useCalendarEvents(props, emit)

  defineExpose<CalendarExpose>(expose)
</script>

<style scoped>
  .c-full-calendar {
    width: 100%;
  }

  /* FullCalendar 的公开主题变量保留事件配色，仅统一控件和画布底色。 */
  .c-full-calendar :deep(.fc) {
    --fc-page-bg-color: var(--c-bg-card, var(--c-theme-bg-card));
    --fc-neutral-bg-color: var(--c-bg-muted, var(--c-theme-bg-muted));
    --fc-neutral-text-color: var(--c-text-2, var(--c-theme-text-2));
    --fc-border-color: var(--c-border, var(--c-theme-border));
    --fc-today-bg-color: var(--c-bg-active, var(--c-theme-bg-active));
    --fc-button-text-color: var(--c-text-1, var(--c-theme-text-1));
    --fc-button-bg-color: var(--c-bg-card, var(--c-theme-bg-card));
    --fc-button-border-color: var(--c-border, var(--c-theme-border));
    --fc-button-hover-bg-color: var(--c-bg-hover, var(--c-theme-bg-hover));
    --fc-button-hover-border-color: var(--c-primary, var(--c-theme-primary));
    --fc-button-active-bg-color: var(--c-bg-active, var(--c-theme-bg-active));
    --fc-button-active-border-color: var(--c-primary, var(--c-theme-primary));
  }
  .c-full-calendar :deep(.fc-header-toolbar) {
    flex-wrap: wrap;
    gap: 12px;
  }
  .c-full-calendar :deep(.fc-button) {
    border-radius: var(--c-radius-sm, var(--c-theme-radius-sm));
  }
  .event-color-swatch {
    cursor: pointer;
  }

  .event-color-swatch:focus-visible {
    outline: 2px solid var(--c-primary, var(--c-theme-primary));
    outline-offset: 2px;
  }
</style>
