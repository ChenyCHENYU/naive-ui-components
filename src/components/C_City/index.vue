<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-05-30
 * @Description: 城市选择器组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <NPopover
    v-model:show="visible"
    placement="bottom-start"
    :width="430"
    trigger="click"
    :show-arrow="false"
  >
    <template #trigger>
      <slot
        name="trigger"
        :value="modelValue"
        :visible="visible"
      >
        <button
          type="button"
          class="city-selector-trigger"
          :aria-expanded="visible"
          aria-label="选择城市"
        >
          <span class="city-selector-trigger__text">{{
            modelValue || placeholder
          }}</span>
        </button>
      </slot>
    </template>

    <div
      ref="contentRef"
      class="city-selector-content"
    >
      <div class="city-selector-header">
        <NRadioGroup
          v-model:value="radioValue"
          size="small"
        >
          <NRadioButton value="city">按城市</NRadioButton>
          <NRadioButton value="province">按省份</NRadioButton>
        </NRadioGroup>
        <NSelect
          v-model:value="searchValue"
          class="city-selector-search"
          :options="searchOptions"
          filterable
          clearable
          placeholder="搜索城市"
          @update:value="handleSearchSelect"
        />
      </div>

      <div
        v-if="showLetters"
        class="city-selector-letters"
      >
        <button
          v-for="letter in letters"
          :key="letter"
          type="button"
          class="city-selector-letter"
          @click="scrollToLetter(letter)"
        >
          {{ letter }}
        </button>
      </div>

      <NScrollbar class="city-selector-body">
        <div
          v-if="radioValue === 'city' && !cityData"
          role="status"
          class="city-selector-status"
        >
          {{
            cityLoadError ? '城市数据加载失败，请重新打开重试' : '正在加载城市…'
          }}
        </div>
        <div
          v-else-if="radioValue === 'city'"
          class="city-list"
        >
          <div
            v-for="(cities, letter) in cityDataByLetter"
            :key="letter"
            :data-letter="letter"
            class="city-group"
          >
            <div class="city-group__letter">{{ letter }}:</div>
            <div class="city-group__cities">
              <button
                v-for="(city, index) in cities"
                :key="`${letter}-${index}`"
                type="button"
                class="city-item"
                :class="{ 'is-active': modelValue === city.name }"
                @click="handleCitySelect(city.name)"
              >
                {{ city.name }}
              </button>
            </div>
          </div>
        </div>

        <div
          v-else
          class="province-list"
        >
          <div
            v-for="province in allProvinces"
            :key="province.id"
            :data-letter="province.id"
            class="province-group"
          >
            <div class="province-group__name">{{ province.name }}:</div>
            <div class="province-group__cities">
              <button
                v-for="(city, index) in province.data"
                :key="`${province.id}-${index}`"
                type="button"
                class="city-item"
                :class="{ 'is-active': modelValue === city }"
                @click="handleCitySelect(city)"
              >
                {{ city }}
              </button>
            </div>
          </div>
        </div>
      </NScrollbar>
    </div>
  </NPopover>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import {
    NPopover,
    NRadioGroup,
    NRadioButton,
    NSelect,
    NScrollbar,
    type SelectOption,
  } from 'naive-ui'
  import provinceData from './province.json'

  defineOptions({ name: 'C_City' })

  interface CityItem {
    id: number
    spell: string
    name: string
  }

  // 仅首次打开时加载；未使用的选择器不下载城市数据。
  const cityData = ref<{ cities: Record<string, CityItem[]> } | null>(null)
  const cityLoadError = ref(false)
  let cityLoadPromise: Promise<void> | null = null

  interface ProvinceItem {
    id?: string
    name: string
    data: string[]
  }

  interface Props {
    modelValue?: string
    placeholder?: string
    showLetters?: boolean
  }

  interface Emits {
    (e: 'update:modelValue', value: string): void
    (e: 'change', value: string): void
  }

  withDefaults(defineProps<Props>(), {
    placeholder: '请选择城市',
    showLetters: true,
  })

  const emit = defineEmits<Emits>()

  const visible = ref(false)
  const contentRef = ref<HTMLElement | null>(null)
  const radioValue = ref<'city' | 'province'>('city')
  const searchValue = ref('')

  watch(visible, open => {
    if (!open || cityData.value || cityLoadPromise) return
    cityLoadError.value = false
    cityLoadPromise = import('./city.json')
      .then(mod => {
        cityData.value = mod.default ?? mod
      })
      .catch(() => {
        cityLoadError.value = true
      })
      .finally(() => {
        cityLoadPromise = null
      })
  })

  const allProvinces = computed(() => {
    const provinces: ProvinceItem[] = []
    Object.values(provinceData).forEach(group => {
      provinces.push(...(group as ProvinceItem[]))
    })
    return provinces
  })

  const cityDataByLetter = computed(() => {
    return cityData.value?.cities ?? {}
  })

  const letters = computed(() => {
    if (radioValue.value === 'city') {
      return Object.keys(cityDataByLetter.value).sort()
    } else {
      const provinceLetters = new Set<string>()
      Object.keys(provinceData).forEach(key => {
        if (key !== '直辖市' && key !== '港澳') {
          provinceLetters.add(key)
        }
      })
      const result = Array.from(provinceLetters).sort()
      result.push('直辖市', '港澳')
      return result
    }
  })

  const searchOptions = computed((): SelectOption[] => {
    if (radioValue.value === 'city') {
      const options: SelectOption[] = []
      Object.values(cityDataByLetter.value).forEach(cities => {
        ;(cities as CityItem[]).forEach(city => {
          options.push({
            label: city.name,
            value: city.name,
          })
        })
      })
      return options
    } else {
      return allProvinces.value.flatMap(province =>
        province.data.map(city => ({
          label: `${city} (${province.name})`,
          value: city,
        }))
      )
    }
  })

  const handleCitySelect = (cityName: string): void => {
    emit('update:modelValue', cityName)
    emit('change', cityName)
    visible.value = false
  }

  const handleSearchSelect = (value: string): void => {
    if (value) {
      handleCitySelect(value)
      searchValue.value = ''
    }
  }

  const scrollToLetter = (letter: string): void => {
    const element = Array.from(
      contentRef.value?.querySelectorAll<HTMLElement>('[data-letter]') ?? []
    ).find(item => item.dataset.letter === letter)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
