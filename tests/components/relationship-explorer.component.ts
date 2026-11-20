import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import C_RelationshipExplorer from '../../src/components/C_RelationshipExplorer/index.vue'
import {
  indexRelationships,
  traceRelationshipPath,
} from '../../src/components/C_RelationshipExplorer/data'
import type { RelationshipEdge } from '../../src/components/C_RelationshipExplorer/types'

const nodes = [
  { key: 1, label: 'Order' },
  { key: 2, label: 'Contract' },
  { key: 3, label: 'Shipment' },
]
const edges = [
  { key: 'order-contract', from: 1, to: 2, type: 'trace' },
  { key: 'contract-shipment', from: 2, to: 3, type: 'trace' },
  { key: 'cycle', from: 2, to: 1, type: 'trace' },
  { key: 'direct', from: 1, to: 3, type: 'link' },
  { key: 'not-loaded', from: 3, to: 4, type: 'trace' },
] satisfies RelationshipEdge[]

test('trace finds a shortest directed path across the filtered graph without looping through cycles', () => {
  const { outgoing } = indexRelationships(nodes, edges)
  expect(traceRelationshipPath(outgoing, 1, 3)?.map(edge => edge.key)).toEqual([
    'direct',
  ])
  const filtered = indexRelationships(nodes, edges, ['trace'])
  expect(
    traceRelationshipPath(filtered.outgoing, 1, 3)?.map(edge => edge.key)
  ).toEqual(['order-contract', 'contract-shipment'])
  expect(traceRelationshipPath(filtered.outgoing, 1, 4)).toBeUndefined()
  expect(traceRelationshipPath(filtered.outgoing, 3, 1)).toBeUndefined()
})

test('neighbors and the trace react to filters and preserve numeric record identities', async () => {
  const wrapper = mount(C_RelationshipExplorer<(typeof nodes)[number]>, {
    props: {
      nodes,
      edges,
      modelValue: 3,
      traceFrom: 1,
      edgeTypes: ['trace'],
      expandable: true,
    },
  })
  const path = () => wrapper.findAll('ol button').map(button => button.text())
  expect(path()).toEqual(['Order', 'Contract', 'Shipment'])
  await wrapper.get('button[data-traced="true"]').trigger('click')
  expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
  await wrapper
    .findAll('button')
    .find(button => button.text() === '加载更多关联')
    ?.trigger('click')
  expect(wrapper.emitted('expand')).toEqual([[nodes[2]]])
  await wrapper.setProps({ edgeTypes: ['link'] })
  expect(path()).toEqual(['Order', 'Shipment'])
})
