export type FlipAxis = 'horizontal' | 'vertical'

/** Flip the actual source so crop selection, live preview and export agree. */
export function flipImageSource(src: string, axis: FlipAxis): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    if (!src.startsWith('data:') && !src.startsWith('blob:'))
      image.crossOrigin = 'anonymous'

    image.onload = () => {
      try {
        const width = image.naturalWidth
        const height = image.naturalHeight
        if (!width || !height) throw new Error('Image has no dimensions')
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas 2D context unavailable')
        context.translate(
          axis === 'horizontal' ? width : 0,
          axis === 'vertical' ? height : 0
        )
        context.scale(
          axis === 'horizontal' ? -1 : 1,
          axis === 'vertical' ? -1 : 1
        )
        context.drawImage(image, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () =>
      reject(new Error('Image could not be loaded for flipping'))
    image.src = src
  })
}
