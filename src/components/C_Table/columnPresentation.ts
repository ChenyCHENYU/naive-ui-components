/** 状态配置仅用于展示，原始值和导出契约保持独立。 */
export type ColumnStatus =
  | boolean
  | Readonly<Record<string, string | { label?: string; color?: string }>>

const variants: ReadonlyArray<readonly [RegExp, string]> = [
  [
    /^(success|ok|done|complete|completed|normal|active|enabled|启用|正常|完成|已完成|运行|运行中|在线|生效|已发运)$/i,
    'success',
  ],
  [
    /^(warning|warn|hold|pending|standby|待机|待审核|暂停|预警|部分完成|待下达|待复核|待发运)$/i,
    'warning',
  ],
  [
    /^(error|fail|failed|danger|fault|offline|disabled|故障|失败|错误|异常|停用|离线|断开)$/i,
    'error',
  ],
  [
    /^(info|processing|new|draft|进行中|新建|草稿|审批中|同步中|执行中|已下达|装车中)$/i,
    'info',
  ],
]

/** 显式颜色优先，未知业务代码保持中性，字典文字可参与默认语义匹配。 */
export function resolveColumnStatus(
  value: unknown,
  label: string,
  status: ColumnStatus
) {
  const entry =
    typeof status === 'object' &&
    Object.prototype.hasOwnProperty.call(status, String(value))
      ? status[String(value)]
      : undefined
  const text = typeof entry === 'object' ? (entry.label ?? label) : label
  const color = typeof entry === 'string' ? entry : entry?.color
  const inferred =
    variants.find(
      ([pattern]) => pattern.test(String(value)) || pattern.test(text)
    )?.[1] ?? 'default'
  return { label: text, color: color ?? inferred }
}

/** 每组件惰性创建 canvas；SSR 和无 canvas 环境使用保守文本估算。 */
export function createColumnMeasurer() {
  let context: CanvasRenderingContext2D | null | undefined
  return (value: string, font: string): number => {
    if (context === undefined)
      context =
        typeof document === 'undefined'
          ? null
          : document.createElement('canvas').getContext('2d')
    const text = value
    if (context) {
      context.font = font
      return context.measureText(text).width
    }
    return Array.from(text).reduce(
      (width, char) => width + (char.charCodeAt(0) > 255 ? 13 : 7),
      0
    )
  }
}
