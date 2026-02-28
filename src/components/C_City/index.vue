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
      <slot name="trigger" :value="modelValue" :visible="visible">
        <div class="city-selector-trigger">
          <span class="city-selector-trigger__text">{{
            modelValue || placeholder
          }}</span>
        </div>
      </slot>
    </template>

    <div class="city-selector-content">
      <div class="city-selector-header">
        <NRadioGroup v-model:value="radioValue" size="small">
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

      <div v-if="showLetters" class="city-selector-letters">
        <span
          v-for="letter in letters"
          :key="letter"
          class="city-selector-letter"
          @click="scrollToLetter(letter)"
        >
          {{ letter }}
        </span>
      </div>

      <NScrollbar class="city-selector-body">
        <div v-if="radioValue === 'city'" class="city-list">
          <div
            v-for="(cities, letter) in cityDataByLetter"
            :key="letter"
            :id="`letter-${letter}`"
            class="city-group"
          >
            <div class="city-group__letter">{{ letter }}:</div>
            <div class="city-group__cities">
              <span
                v-for="(city, index) in cities"
                :key="`${letter}-${index}`"
                class="city-item"
                :class="{ 'is-active': modelValue === city.name }"
                @click="handleCitySelect(city.name)"
              >
                {{ city.name }}
              </span>
            </div>
          </div>
        </div>

        <div v-else class="province-list">
          <div
            v-for="province in allProvinces"
            :key="province.id"
            :id="`letter-${province.id}`"
            class="province-group"
          >
            <div class="province-group__name">{{ province.name }}:</div>
            <div class="province-group__cities">
              <span
                v-for="(city, index) in province.data"
                :key="`${province.id}-${index}`"
                class="city-item"
                :class="{ 'is-active': modelValue === city }"
                @click="handleCitySelect(city)"
              >
                {{ city }}
              </span>
            </div>
          </div>
        </div>
      </NScrollbar>
    </div>
  </NPopover>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  NPopover,
  NRadioGroup,
  NRadioButton,
  NSelect,
  NScrollbar,
} from "naive-ui";
import type { SelectOption } from "naive-ui";
import provinceData from "./province.json";

defineOptions({ name: "C_City" });

interface CityItem {
  id: number;
  spell: string;
  name: string;
}

// 城市数据懒加载（83KB JSON 仅在组件挂载时加载）
const cityData = ref<{ cities: Record<string, CityItem[]> } | null>(null);

onMounted(async () => {
  const mod = await import("./city.json");
  cityData.value = mod.default ?? mod;
});

interface ProvinceItem {
  id?: string;
  name: string;
  data: string[];
}

interface Props {
  modelValue?: string;
  placeholder?: string;
  showLetters?: boolean;
}

interface Emits {
  (e: "update:modelValue", value: string): void;
  (e: "change", value: string): void;
}

withDefaults(defineProps<Props>(), {
  placeholder: "请选择城市",
  showLetters: true,
});

const emit = defineEmits<Emits>();

const visible = ref(false);
const radioValue = ref<"city" | "province">("city");
const searchValue = ref("");

const allProvinces = computed(() => {
  const provinces: ProvinceItem[] = [];
  Object.values(provinceData).forEach((group) => {
    provinces.push(...(group as ProvinceItem[]));
  });
  return provinces;
});

const cityDataByLetter = computed(() => {
  if (cityData.value?.cities) {
    return cityData.value.cities;
  }
  // 数据未加载时，从省份数据生成城市索引作为 fallback
  const cities: Record<string, CityItem[]> = {};
  let cityId = 1;
  const citySet = new Set<string>();
  allProvinces.value.forEach((province) => {
    province.data.forEach((cityName) => {
      citySet.add(cityName);
    });
  });
  Array.from(citySet).forEach((cityName) => {
    const letter = cityName[0].toUpperCase();
    if (!cities[letter]) cities[letter] = [];
    cities[letter].push({ id: cityId++, name: cityName, spell: "" });
  });
  const sortedCities: Record<string, CityItem[]> = {};
  Object.keys(cities)
    .sort()
    .forEach((letter) => {
      sortedCities[letter] = cities[letter].sort((a, b) =>
        a.name.localeCompare(b.name, "zh-CN"),
      );
    });
  return sortedCities;
});

const letters = computed(() => {
  if (radioValue.value === "city") {
    return Object.keys(cityDataByLetter.value).sort();
  } else {
    const provinceLetters = new Set<string>();
    Object.keys(provinceData).forEach((key) => {
      if (key !== "直辖市" && key !== "港澳") {
        provinceLetters.add(key);
      }
    });
    const result = Array.from(provinceLetters).sort();
    result.push("直辖市", "港澳");
    return result;
  }
});

const searchOptions = computed((): SelectOption[] => {
  if (radioValue.value === "city") {
    const options: SelectOption[] = [];
    Object.values(cityDataByLetter.value).forEach((cities) => {
      (cities as CityItem[]).forEach((city) => {
        options.push({
          label: city.name,
          value: city.name,
        });
      });
    });
    return options;
  } else {
    return allProvinces.value.flatMap((province) =>
      province.data.map((city) => ({
        label: `${city} (${province.name})`,
        value: city,
      })),
    );
  }
});

const handleCitySelect = (cityName: string): void => {
  emit("update:modelValue", cityName);
  emit("change", cityName);
  visible.value = false;
};

const handleSearchSelect = (value: string): void => {
  if (value) {
    handleCitySelect(value);
    searchValue.value = "";
  }
};

const scrollToLetter = (letter: string): void => {
  const element = document.getElementById(`letter-${letter}`);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};
</script>

<style lang="scss" scoped>
@use "./index.scss";
</style>
