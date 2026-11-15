import { expect, test } from 'bun:test'
import { countExplicitAny } from '../scripts/source-quality-metrics.js'

test('source quality counts type syntax without counting names, strings or comments', () => {
  const source = `
    // as any
    const label = 'as any'
    const any = 1
    const value: any = any
    const convert = (input: unknown) => input as any
  `
  expect(countExplicitAny(source, 'example.ts')).toBe(2)
})

test('source quality includes both SFC scripts and template assertions', () => {
  const source = `
    <script lang="ts">export const value: any = 1</script>
    <script setup lang="ts">const row = {} as any</script>
    <template>
      <!-- as any -->
      <span title="as any">as any</span>
      <button :title="row.title as any" @click="choose($event as any)">
        {{ row.label as any }}
      </button>
    </template>
  `
  expect(countExplicitAny(source, 'example.vue')).toBe(5)
})

test('source quality inspects loop sources without treating dynamic argument names as types', () => {
  const source = `<template>
    <div v-for="row in (rows as any)" :[any]="row.id" />
  </template>`
  expect(countExplicitAny(source, 'example.vue')).toBe(1)
})

test('source quality excludes preformatted and literal template content', () => {
  const source = `<template>
    <div v-pre>{{ row as any }}<span :title="row as any" /></div>
    <div :title="'as any'">{{ 'as any' }}</div>
  </template>`
  expect(countExplicitAny(source, 'example.vue')).toBe(0)
})

test('source quality includes typed and destructured slot parameters', () => {
  const source = `<script setup lang="ts"></script><template>
    <X #default="slot: any">{{ slot.label }}</X>
    <X #default="{ row }: { row: any }">{{ row.label }}</X>
  </template>`
  expect(countExplicitAny(source, 'example.vue')).toBe(2)
})

test('source quality includes generic SFC constraints and defaults', () => {
  const source = `<script setup lang="ts" generic="T extends any = any">
    const value = 1
  </script><template>{{ value }}</template>`
  expect(countExplicitAny(source, 'generic.vue')).toBe(2)
})

test('source quality fails rather than silently skipping a malformed SFC', () => {
  expect(() =>
    countExplicitAny('<template><div></template>', 'bad.vue')
  ).toThrow(SyntaxError)
})
