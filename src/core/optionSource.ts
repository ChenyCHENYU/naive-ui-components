/** Transport-neutral request shared by selects, suggestions and data pickers. */
export interface OptionRequest<F extends object = Record<string, unknown>> {
  search: string
  page: number
  pageSize: number
  signal: AbortSignal
  filters?: Readonly<F>
}

export interface OptionPage<T> {
  rows: T[]
  total: number
}

export type OptionValue = string | number | boolean

/** The application owns endpoints, authorization and entity mapping. */
export interface OptionSource<
  T extends object,
  V extends OptionValue = OptionValue,
  F extends object = Record<string, unknown>,
> {
  request(query: OptionRequest<F>): Promise<OptionPage<T>>
  value(row: T): V
  label(row: T): string
  resolve?(values: readonly V[], signal: AbortSignal): Promise<readonly T[]>
  /** Search debounce in milliseconds; defaults to 250. */
  debounce?: number
  /** Minimum trimmed search length; defaults to 0. */
  minChars?: number
  /** Page size; defaults to 20. */
  pageSize?: number
  filters?: Readonly<F>
}
