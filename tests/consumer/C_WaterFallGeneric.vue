<script setup lang="ts">
  import {
    C_WaterFall,
    useWaterFallLayout,
    type WaterFallProps,
    type WaterFallEmits,
    type WaterFallSlots,
  } from '@robot-admin/naive-ui-components/C_WaterFall'
  import { ref, shallowRef } from 'vue'

  interface ProductCard {
    id: number
    src: string
    width: number
    height: number
    price: number
    productCode: string
  }
  const products = ref<ProductCard[]>([
    {
      id: 1,
      src: '/product.png',
      width: 400,
      height: 300,
      price: 125.5,
      productCode: 'A-01',
    },
  ])
  const config = {
    items: products.value,
    columns: 3,
  } satisfies WaterFallProps<ProductCard>
  const receive = (product: ProductCard) => product.price.toFixed(2)
  const events: WaterFallEmits<ProductCard>['item-click'] = [
    products.value[0],
    0,
  ]
  const layout = useWaterFallLayout(products, ref(3), ref(900), ref(12))
  const readLayout = () => layout.layoutItems.value[0].item.price.toFixed(2)
  // @ts-expect-error Layout retains the actual business field value type.
  layout.layoutItems.value[0].item.price.toUpperCase()
  const refProducts = shallowRef([
    { id: 2, src: '/two.png', width: 400, height: 300, price: ref(12.5) },
  ])
  const refLayout = useWaterFallLayout(refProducts, ref(1), ref(400), ref(0))
  const resolvedPrice: number = refLayout.layoutItems.value[0].item.price
  // @ts-expect-error Existing deep proxies unwrap nested refs, not Ref-valued output.
  void refLayout.layoutItems.value[0].item.price.value
  // @ts-expect-error Rendered business fields retain the existing readonly contract.
  refLayout.layoutItems.value[0].item.price = 100
  const customSlots: WaterFallSlots<ProductCard> = {
    item: ({ item }) => item.price.toFixed(2),
    footer: ({ loadMore }) => {
      loadMore()
      return 'More'
    },
  }
  void config
  void events
  void customSlots
  void readLayout
  void resolvedPrice
</script>

<template>
  <C_WaterFall
    :items="products"
    @item-click="item => receive(item)"
    @image-loaded="item => item.price.toFixed(2)"
  >
    <template #item="{ item, index, width }"
      >{{ item.productCode.toUpperCase() }} {{ item.price.toFixed(2) }}
      {{ index }} {{ width }}</template
    >
    <template #footer="{ loadMore, paused }"
      ><button
        v-if="paused"
        @click="loadMore"
        >More</button
      ></template
    >
  </C_WaterFall>
  <!-- @vue-expect-error Business event fields retain their actual value types. -->
  <C_WaterFall
    :items="products"
    @item-click="item => item.price.toUpperCase()"
  />
  <C_WaterFall :items="products">
    <template #item="{ item }">
      <!-- @vue-expect-error Business slot fields retain their actual value types. -->
      <span :title="item.price.toUpperCase()" />
    </template>
  </C_WaterFall>
  <C_WaterFall
    :items="refProducts"
    @item-click="item => item.price.toFixed(2)"
  >
    <template #item="{ item }">{{ item.price.toFixed(2) }}</template>
  </C_WaterFall>
  <C_WaterFall :items="refProducts">
    <template #item="{ item }">
      <!-- @vue-expect-error Slot refs are unwrapped by the existing deep layout proxy. -->
      <span :title="item.price.value" />
    </template>
  </C_WaterFall>
</template>
