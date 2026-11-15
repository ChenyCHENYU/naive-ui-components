/** 组件输入的单一类型来源，可直接用于共享配置。 */
export interface BarcodeProps {
  value: string
  format?:
    | 'CODE128'
    | 'CODE39'
    | 'EAN13'
    | 'EAN8'
    | 'UPC'
    | 'ITF14'
    | 'MSI'
    | 'pharmacode'
  width?: number
  height?: number
  showText?: boolean
  fontSize?: number
  textPosition?: 'bottom' | 'top'
  lineColor?: string
  background?: string
  showBorder?: boolean
  label?: string
  showLabel?: boolean
}
