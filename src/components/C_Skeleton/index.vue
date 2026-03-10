<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-03-06
 * @Description: C_Skeleton 业务级骨架屏组件
 * 提供 8 种预设模式：text / avatar / card / table / form / list / detail / image
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <div
    v-if="props.loading"
    class="c-skeleton"
    :class="[`c-skeleton--${animationType}`]"
  >
    <!-- text 预设 -->
    <template v-if="preset === 'text'">
      <div
        v-for="i in repeat"
        :key="i"
        class="c-skeleton__text"
      >
        <div
          class="c-skeleton__line c-skeleton__item"
          :style="{ width: i === repeat ? '60%' : '100%' }"
        />
      </div>
    </template>

    <!-- avatar 预设 -->
    <template v-else-if="preset === 'avatar'">
      <div class="c-skeleton__avatar-group">
        <div class="c-skeleton__circle c-skeleton__item" />
        <div class="c-skeleton__avatar-text">
          <div
            class="c-skeleton__line c-skeleton__item"
            style="width: 40%"
          />
          <div
            class="c-skeleton__line c-skeleton__item c-skeleton__line--sm"
            style="width: 60%"
          />
        </div>
      </div>
    </template>

    <!-- image 预设 -->
    <template v-else-if="preset === 'image'">
      <div
        v-for="i in repeat"
        :key="i"
        class="c-skeleton__image c-skeleton__item"
      >
        <div class="c-skeleton__image-icon">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            width="32"
            height="32"
          >
            <path
              d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
            />
          </svg>
        </div>
      </div>
    </template>

    <!-- card 预设 -->
    <template v-else-if="preset === 'card'">
      <div
        v-for="i in repeat"
        :key="i"
        class="c-skeleton__card"
      >
        <div
          v-if="cardConfig.showCover"
          class="c-skeleton__card-cover c-skeleton__item"
        />
        <div class="c-skeleton__card-body">
          <div
            v-for="t in cardConfig.titleLines"
            :key="`t-${t}`"
            class="c-skeleton__line c-skeleton__item"
            :style="{ width: t === cardConfig.titleLines ? '50%' : '80%' }"
          />
          <div class="c-skeleton__card-desc">
            <div
              v-for="d in cardConfig.descLines"
              :key="`d-${d}`"
              class="c-skeleton__line c-skeleton__item c-skeleton__line--sm"
              :style="{
                width: d === cardConfig.descLines ? '70%' : '100%',
              }"
            />
          </div>
        </div>
        <div
          v-if="cardConfig.showFooter"
          class="c-skeleton__card-footer"
        >
          <div
            class="c-skeleton__line c-skeleton__item c-skeleton__line--btn"
            style="width: 80px"
          />
          <div
            class="c-skeleton__line c-skeleton__item c-skeleton__line--btn"
            style="width: 80px"
          />
        </div>
      </div>
    </template>

    <!-- table 预设 -->
    <template v-else-if="preset === 'table'">
      <div class="c-skeleton__table">
        <div
          v-if="tableConfig.showHeader"
          class="c-skeleton__table-header"
        >
          <div
            v-for="c in tableConfig.cols"
            :key="`h-${c}`"
            class="c-skeleton__table-cell"
          >
            <div
              class="c-skeleton__line c-skeleton__item c-skeleton__line--sm"
            />
          </div>
          <div
            v-if="tableConfig.showActions"
            class="c-skeleton__table-cell c-skeleton__table-cell--action"
          >
            <div
              class="c-skeleton__line c-skeleton__item c-skeleton__line--sm"
              style="width: 60%"
            />
          </div>
        </div>
        <div
          v-for="r in tableConfig.rows"
          :key="`r-${r}`"
          class="c-skeleton__table-row"
        >
          <div
            v-for="c in tableConfig.cols"
            :key="`c-${c}`"
            class="c-skeleton__table-cell"
          >
            <div
              class="c-skeleton__line c-skeleton__item c-skeleton__line--sm"
              :style="{
                width: `${Math.floor(50 + ((r * c * 17) % 50))}%`,
              }"
            />
          </div>
          <div
            v-if="tableConfig.showActions"
            class="c-skeleton__table-cell c-skeleton__table-cell--action"
          >
            <div class="c-skeleton__action-btns">
              <div
                class="c-skeleton__line c-skeleton__item c-skeleton__line--mini"
                style="width: 40px"
              />
              <div
                class="c-skeleton__line c-skeleton__item c-skeleton__line--mini"
                style="width: 40px"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- form 预设 -->
    <template v-else-if="preset === 'form'">
      <div
        class="c-skeleton__form"
        :style="{ '--form-cols': formConfig.cols }"
      >
        <div
          v-for="f in formConfig.fields"
          :key="f"
          class="c-skeleton__form-field"
        >
          <div
            v-if="formConfig.showLabel"
            class="c-skeleton__line c-skeleton__item c-skeleton__line--label"
            :style="{ width: `${60 + ((f * 13) % 30)}px` }"
          />
          <div
            class="c-skeleton__line c-skeleton__item c-skeleton__line--input"
          />
        </div>
        <div
          v-if="formConfig.showActions"
          class="c-skeleton__form-actions"
        >
          <div
            class="c-skeleton__line c-skeleton__item c-skeleton__line--btn"
            style="width: 100px"
          />
          <div
            class="c-skeleton__line c-skeleton__item c-skeleton__line--btn"
            style="width: 80px"
          />
        </div>
      </div>
    </template>

    <!-- list 预设 -->
    <template v-else-if="preset === 'list'">
      <div
        v-for="i in listConfig.items"
        :key="i"
        class="c-skeleton__list-item"
      >
        <div
          v-if="listConfig.showAvatar"
          class="c-skeleton__circle c-skeleton__circle--sm c-skeleton__item"
        />
        <div class="c-skeleton__list-content">
          <div
            class="c-skeleton__line c-skeleton__item"
            style="width: 30%"
          />
          <div
            v-for="d in listConfig.descLines"
            :key="`d-${d}`"
            class="c-skeleton__line c-skeleton__item c-skeleton__line--sm"
            :style="{
              width: d === listConfig.descLines ? '50%' : '90%',
            }"
          />
        </div>
      </div>
    </template>

    <!-- detail 预设 -->
    <template v-else-if="preset === 'detail'">
      <div class="c-skeleton__detail">
        <div
          v-if="detailConfig.showAvatar"
          class="c-skeleton__detail-header"
        >
          <div
            class="c-skeleton__circle c-skeleton__circle--lg c-skeleton__item"
          />
          <div class="c-skeleton__detail-title">
            <div
              class="c-skeleton__line c-skeleton__item"
              style="width: 120px"
            />
            <div
              class="c-skeleton__line c-skeleton__item c-skeleton__line--sm"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="c-skeleton__detail-body">
          <div
            v-for="f in detailConfig.fields"
            :key="f"
            class="c-skeleton__detail-field"
          >
            <div
              class="c-skeleton__line c-skeleton__item c-skeleton__line--label"
              :style="{ width: `${50 + ((f * 17) % 40)}px` }"
            />
            <div class="c-skeleton__detail-value">
              <div
                v-for="v in detailConfig.valueLines"
                :key="`v-${v}`"
                class="c-skeleton__line c-skeleton__item c-skeleton__line--sm"
                :style="{
                  width: v === detailConfig.valueLines ? '60%' : '100%',
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- 加载完成后显示插槽内容 -->
  <slot v-else />
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type {
    SkeletonProps,
    SkeletonTableConfig,
    SkeletonFormConfig,
    SkeletonListConfig,
    SkeletonCardConfig,
    SkeletonDetailConfig,
  } from './types'

  defineOptions({ name: 'C_Skeleton' })

  const props = withDefaults(defineProps<SkeletonProps>(), {
    preset: 'text',
    loading: true,
    animation: 'wave',
    repeat: 3,
    borderRadius: '4px',
  })

  const animationType = computed(() =>
    props.animation === false ? 'none' : props.animation
  )

  const tableConfig = computed<Required<SkeletonTableConfig>>(() => ({
    rows: props.table?.rows ?? 5,
    cols: props.table?.cols ?? 4,
    showHeader: props.table?.showHeader ?? true,
    showActions: props.table?.showActions ?? true,
  }))

  const formConfig = computed<Required<SkeletonFormConfig>>(() => ({
    fields: props.form?.fields ?? 6,
    cols: props.form?.cols ?? 2,
    showLabel: props.form?.showLabel ?? true,
    showActions: props.form?.showActions ?? true,
  }))

  const listConfig = computed<Required<SkeletonListConfig>>(() => ({
    items: props.list?.items ?? 5,
    showAvatar: props.list?.showAvatar ?? true,
    descLines: props.list?.descLines ?? 2,
  }))

  const cardConfig = computed<Required<SkeletonCardConfig>>(() => ({
    showCover: props.card?.showCover ?? true,
    titleLines: props.card?.titleLines ?? 1,
    descLines: props.card?.descLines ?? 2,
    showFooter: props.card?.showFooter ?? true,
  }))

  const detailConfig = computed<Required<SkeletonDetailConfig>>(() => ({
    fields: props.detail?.fields ?? 6,
    valueLines: props.detail?.valueLines ?? 1,
    showAvatar: props.detail?.showAvatar ?? true,
  }))
</script>

<style lang="scss">
  @use './index.scss';
</style>
