import { AMAP_CONFIG } from './data'

export interface AMapApi {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => any
  Marker: new (options: Record<string, unknown>) => any
  InfoWindow: new (options: Record<string, unknown>) => any
  Pixel: new (x: number, y: number) => any
}

let loader: Promise<AMapApi> | null = null

/** Load the AMap SDK once for all component instances. */
export function loadAMapApi(key: string): Promise<AMapApi> {
  const host = window as typeof window & { AMap?: AMapApi }
  if (host.AMap) return Promise.resolve(host.AMap)
  if (loader) return loader

  loader = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.dataset.cMapAmap = 'true'
    script.src = `${AMAP_CONFIG.apiUrl}${encodeURIComponent(key)}`
    script.onload = () => {
      if (host.AMap) resolve(host.AMap)
      else reject(new Error('高德地图 API 加载完成但未找到全局对象'))
    }
    script.onerror = () => {
      script.remove()
      loader = null
      reject(new Error('高德地图 API 加载失败'))
    }
    document.head.appendChild(script)
  })

  return loader
}
