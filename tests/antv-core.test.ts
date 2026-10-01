import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import {
  fromBpmnCells,
  toBpmnCells,
} from '../src/components/C_AntV/bpmnAdapter'
import type { BPMNDiagramData } from '../src/components/C_AntV/types'

describe('C_AntV domain adapters', () => {
  test('BPMN nodes and flows retain positions, types, and conditions', () => {
    const data: BPMNDiagramData = {
      nodes: [
        {
          id: 'start',
          type: 'start',
          name: '开始',
          position: { x: 100, y: 150 },
          properties: {},
        },
        {
          id: 'task',
          type: 'task',
          name: '审批',
          position: { x: 300, y: 150 },
          properties: { assignee: '审核员' },
        },
      ],
      flows: [
        {
          id: 'flow',
          source: 'start',
          target: 'task',
          name: '通过',
          condition: 'approved',
        },
      ],
    }

    const cells = toBpmnCells(data)
    expect(cells.map(cell => cell.shape)).toEqual([
      'event',
      'activity',
      'bpmn-edge',
    ])
    expect(cells[1]).toMatchObject({ x: 300, y: 150, label: '审批' })
    expect(fromBpmnCells(cells)).toEqual(data)
  })

  test('layout initialization consumes external data before samples', () => {
    const root = path.resolve(import.meta.dir, '..')
    const bpmn = fs.readFileSync(
      path.join(root, 'src/components/C_AntV/layout/BPMN/index.vue'),
      'utf8'
    )
    const uml = fs.readFileSync(
      path.join(root, 'src/components/C_AntV/layout/UML/index.vue'),
      'utf8'
    )
    expect(bpmn).toMatch(
      /loadData\(\s*props\.data === undefined \? sampleData : normalizeData\(props\.data\)\s*\)/
    )
    expect(uml.replace(/\s+/g, ' ')).toContain(
      'if (props.data) loadUmlData(props.data)'
    )
  })
})
