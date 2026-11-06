export type TemporalValueMode = 'timestamp' | 'formatted'

/** 只接管控件的值通道。展示格式和页面的更新规则由调用方决定。 */
export function bindTemporalField<F, N>(
  input: { mode: 'formatted'; value: F } | { mode: 'timestamp'; value: N },
  updateValue: ((value: unknown) => void) | undefined
) {
  return input.mode === 'formatted'
    ? { formattedValue: input.value, 'onUpdate:formattedValue': updateValue }
    : { value: input.value, 'onUpdate:value': updateValue }
}

/** 搜索字段可显式选择模式，旧配置继续按已有值推断。 */
export function resolveSingleTemporalInput(
  value: unknown,
  mode: TemporalValueMode = typeof value === 'string'
    ? 'formatted'
    : 'timestamp'
) {
  return mode === 'formatted'
    ? ({ mode, value: typeof value === 'string' ? value : null } as const)
    : ({
        mode,
        value:
          typeof value === 'number' && Number.isFinite(value) ? value : null,
      } as const)
}
