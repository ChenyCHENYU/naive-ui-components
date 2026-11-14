// 甘特图相关类型定义和预设配置

import type { GanttOptions, GanttPreset } from './types'
export type { GanttTask, GanttOptions, GanttPreset } from './types'

// ==================== 通用主题配置 ====================
// 只保留排版和边框尺寸，中性色由当前 Provider 在运行时补齐。
export const commonTheme: NonNullable<GanttOptions['taskListTable']>['theme'] =
  {
    headerStyle: {
      borderLineWidth: 1,
      fontSize: 14,
      fontWeight: 'bold',
    },
    bodyStyle: {
      borderLineWidth: [1, 0, 1, 0],
      fontSize: 13,
    },
  }

// ==================== 预设配置 ====================
export const presetConfigs = {
  basic: {
    overscrollBehavior: 'none',
    headerRowHeight: 40,
    rowHeight: 40,
    taskListTable: {
      columns: [
        { field: 'title', title: '任务名称', width: 220, tree: true },
        { field: 'start', title: '开始时间', width: 120 },
        { field: 'end', title: '结束时间', width: 120 },
        { field: 'progress', title: '进度', width: 80 },
      ],
      tableWidth: 420,
      minTableWidth: 300,
      theme: commonTheme,
    },
    frame: {
      outerFrameStyle: {
        borderLineWidth: 1,
        cornerRadius: 6,
      },
      verticalSplitLineMoveable: true,
      verticalSplitLine: { lineWidth: 2 },
    },
    grid: {
      // 背景与网格线使用运行时主题默认值。
      verticalLine: { lineWidth: 1 },
      horizontalLine: { lineWidth: 1 },
    },
    taskBar: {
      startDateField: 'start',
      endDateField: 'end',
      progressField: 'progress',
      moveable: true,
      resizable: true,
      labelText: '{title}',
      labelTextStyle: { fontSize: 12, textAlign: 'left' },
      barStyle: {
        width: 18,
        barColor: '#1890ff',
        completedBarColor: '#52c41a',
        cornerRadius: 4,
        borderLineWidth: 0,
      },
      milestoneStyle: {
        borderColor: '#fa8c16',
        borderLineWidth: 1,
        fillColor: '#ffd666',
        width: 12,
      },
    },
    timelineHeader: {
      // 表头背景与网格线使用运行时主题默认值。
      colWidth: 60,
      horizontalLine: { lineWidth: 1 },
      verticalLine: { lineWidth: 1 },
      scales: [
        {
          unit: 'week',
          step: 1,
          format: date => `第${date.dateIndex}周`,
          style: { fontSize: 12, fontWeight: 'bold' },
        },
        {
          unit: 'day',
          step: 1,
          format: date => `${date.dateIndex}`,
          style: { fontSize: 11 },
        },
      ],
    },
    scrollStyle: {
      visible: 'scrolling',
      width: 6,
      scrollSliderCornerRadius: 2,
    },
  },

  project: {
    overscrollBehavior: 'none',
    headerRowHeight: 40,
    rowHeight: 40,
    taskListTable: {
      columns: [
        {
          field: 'title',
          title: '任务名称',
          width: 200,
          tree: true,
          editor: 'input',
        },
        {
          field: 'start',
          title: '开始时间',
          width: 120,
          editor: 'date-input',
        },
        { field: 'end', title: '结束时间', width: 120, editor: 'date-input' },
        { field: 'priority', title: '优先级', width: 80, editor: 'input' },
        { field: 'progress', title: '进度%', width: 80, editor: 'input' },
      ],
      tableWidth: 480,
      minTableWidth: 350,
      maxTableWidth: 800,
      theme: commonTheme,
      hierarchyExpandLevel: 2,
    },
    frame: {
      outerFrameStyle: {
        borderLineWidth: 2,
        cornerRadius: 8,
      },
      verticalSplitLineMoveable: true,
      verticalSplitLine: { lineWidth: 3 },
    },
    grid: {
      verticalLine: { lineWidth: 1 },
      horizontalLine: { lineWidth: 1 },
    },
    taskBar: {
      startDateField: 'start',
      endDateField: 'end',
      progressField: 'progress',
      moveable: true,
      resizable: true,
      hoverBarStyle: { barOverlayColor: 'rgba(24, 144, 255, 0.3)' },
      labelText: '{title} {progress}%',
      labelTextStyle: {
        fontSize: 12,
        textAlign: 'left',
        textOverflow: 'ellipsis',
      },
      barStyle: {
        width: 20,
        barColor: '#1890ff',
        completedBarColor: '#52c41a',
        cornerRadius: 6,
        borderLineWidth: 0,
      },
    },
    timelineHeader: {
      colWidth: 60,
      horizontalLine: { lineWidth: 1 },
      verticalLine: { lineWidth: 1 },
      scales: [
        {
          unit: 'week',
          step: 1,
          startOfWeek: 'monday',
          format: date => `第${date.dateIndex}周`,
          style: { fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
        },
        {
          unit: 'day',
          step: 1,
          format: date => `${date.dateIndex}`,
          style: { fontSize: 11, textAlign: 'center' },
        },
      ],
    },
    rowSeriesNumber: {
      title: '序号',
      dragOrder: true,
    },
    scrollStyle: {
      visible: 'scrolling',
      width: 6,
      scrollSliderCornerRadius: 2,
    },
  },

  timeline: {
    overscrollBehavior: 'none',
    headerRowHeight: 45,
    rowHeight: 40,
    taskListTable: {
      columns: [
        { field: 'title', title: '事件名称', width: 250, tree: true },
        { field: 'start', title: '时间', width: 150 },
      ],
      tableWidth: 400,
      minTableWidth: 300,
      theme: {
        headerStyle: { ...commonTheme.headerStyle },
        bodyStyle: commonTheme.bodyStyle,
      },
    },
    frame: {
      outerFrameStyle: {
        borderLineWidth: 1,
        cornerRadius: 4,
      },
      verticalSplitLineMoveable: true,
    },
    grid: {
      verticalLine: { lineWidth: 1 },
      horizontalLine: { lineWidth: 1 },
    },
    taskBar: {
      startDateField: 'start',
      endDateField: 'end',
      progressField: 'progress',
      moveable: true,
      resizable: true,
      labelText: '{title}',
      labelTextStyle: { fontSize: 12, textAlign: 'left' },
      barStyle: {
        width: 22,
        barColor: '#722ed1',
        completedBarColor: '#b37feb',
        cornerRadius: 8,
        borderLineWidth: 0,
      },
    },
    timelineHeader: {
      colWidth: 60,
      scales: [
        {
          unit: 'month',
          step: 1,
          format: date => `${date.dateIndex}月`,
          style: { fontSize: 13, fontWeight: 'bold' },
        },
        {
          unit: 'day',
          step: 1,
          format: date => `${date.dateIndex}`,
          style: { fontSize: 11 },
        },
      ],
    },
    scrollStyle: {
      visible: 'scrolling',
      width: 6,
      scrollSliderCornerRadius: 2,
    },
  },

  milestone: {
    overscrollBehavior: 'none',
    headerRowHeight: 40,
    rowHeight: 38,
    taskListTable: {
      columns: [
        { field: 'title', title: '里程碑', width: 200, tree: true },
        { field: 'start', title: '目标日期', width: 120 },
        { field: 'priority', title: '重要性', width: 100 },
      ],
      tableWidth: 400,
      minTableWidth: 300,
      theme: {
        headerStyle: {
          ...commonTheme.headerStyle,
          borderColor: '#ffa940',
        },
        bodyStyle: { ...commonTheme.bodyStyle, borderColor: '#ffa940' },
      },
    },
    frame: {
      outerFrameStyle: {
        borderLineWidth: 2,
        borderColor: '#ffa940',
        cornerRadius: 6,
      },
      verticalSplitLineMoveable: true,
    },
    grid: {
      verticalLine: { lineWidth: 1, lineColor: 'rgba(255, 168, 64, 0.3)' },
      horizontalLine: { lineWidth: 1, lineColor: 'rgba(255, 168, 64, 0.3)' },
    },
    taskBar: {
      startDateField: 'start',
      endDateField: 'start',
      labelText: '{title}',
      labelTextStyle: { fontSize: 12 },
      barStyle: { width: 0, barColor: 'transparent' },
      milestoneStyle: {
        borderColor: '#fa8c16',
        borderLineWidth: 2,
        fillColor: '#ffd666',
        width: 16,
      },
    },
    timelineHeader: {
      colWidth: 80,
      scales: [
        {
          unit: 'month',
          step: 1,
          format: date => `${date.dateIndex}月`,
          style: { fontSize: 13, fontWeight: 'bold' },
        },
        {
          unit: 'week',
          step: 1,
          format: date => `第${date.dateIndex}周`,
          style: { fontSize: 11 },
        },
      ],
    },
    scrollStyle: {
      visible: 'scrolling',
      width: 6,
      scrollSliderCornerRadius: 2,
    },
  },

  official: {
    overscrollBehavior: 'none',
    headerRowHeight: 40,
    rowHeight: 40,
    taskListTable: {
      columns: [
        {
          field: 'title',
          title: 'title',
          width: 180,
          sort: true,
          tree: true,
          editor: 'input',
        },
        {
          field: 'start',
          title: 'start',
          width: 120,
          sort: true,
          editor: 'date-input',
        },
        {
          field: 'end',
          title: 'end',
          width: 120,
          sort: true,
          editor: 'date-input',
        },
        {
          field: 'priority',
          title: 'priority',
          width: 80,
          sort: true,
          editor: 'input',
        },
        {
          field: 'progress',
          title: 'progress',
          width: 80,
          sort: true,
          editor: 'input',
        },
      ],
      tableWidth: 460,
      minTableWidth: 350,
      maxTableWidth: 800,
      theme: {
        headerStyle: {
          ...commonTheme.headerStyle,
          fontSize: 18,
          color: 'red',
        },
        bodyStyle: {
          ...commonTheme.bodyStyle,
          fontSize: 16,
          color: '#4D4D4D',
        },
      },
      hierarchyExpandLevel: 2,
    },
    frame: {
      outerFrameStyle: {
        borderLineWidth: 2,
        cornerRadius: 8,
      },
      verticalSplitLineMoveable: true,
      verticalSplitLine: { lineWidth: 3 },
      horizontalSplitLine: { lineWidth: 3 },
    },
    grid: {
      verticalLine: { lineWidth: 1 },
      horizontalLine: { lineWidth: 1 },
    },
    taskBar: {
      startDateField: 'start',
      endDateField: 'end',
      progressField: 'progress',
      moveable: true,
      resizable: true,
      hoverBarStyle: { barOverlayColor: 'rgba(99, 144, 0, 0.4)' },
      labelText: '{title} {progress}%',
      labelTextStyle: {
        fontSize: 16,
        textAlign: 'left',
        textOverflow: 'ellipsis',
      },
      barStyle: {
        width: 20,
        barColor: '#ee8800',
        completedBarColor: '#91e8e0',
        cornerRadius: 8,
        borderLineWidth: 1,
        borderColor: 'black',
      },
      milestoneStyle: {
        borderColor: 'red',
        borderLineWidth: 1,
        fillColor: 'green',
        width: 15,
      },
    },
    timelineHeader: {
      colWidth: 60,
      horizontalLine: { lineWidth: 1 },
      verticalLine: { lineWidth: 1 },
      scales: [
        {
          unit: 'week',
          step: 1,
          startOfWeek: 'sunday',
          format: date => `Week ${date.dateIndex}`,
          style: {
            fontSize: 20,
            fontWeight: 'bold',
            color: 'white',
            strokeColor: 'black',
            textAlign: 'right',
            textBaseline: 'bottom',
            textStick: true,
          },
        },
        {
          unit: 'day',
          step: 1,
          format: date => date.dateIndex.toString(),
          style: {
            fontSize: 20,
            fontWeight: 'bold',
            color: 'white',
            strokeColor: 'black',
            textAlign: 'right',
            textBaseline: 'bottom',
          },
        },
      ],
    },
    markLine: [
      {
        date: '2024-07-28',
        style: { lineWidth: 1, lineColor: 'blue', lineDash: [8, 4] },
      },
      {
        date: '2024-08-17',
        style: { lineWidth: 2, lineColor: 'red', lineDash: [8, 4] },
      },
    ],
    rowSeriesNumber: {
      title: '行号',
      dragOrder: true,
    },
    scrollStyle: {
      visible: 'scrolling',
      width: 6,
      scrollSliderCornerRadius: 2,
    },
  },
} satisfies Record<GanttPreset, GanttOptions>
