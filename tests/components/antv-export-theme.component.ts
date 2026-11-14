import { expect, test, vi } from 'vitest'
import { exportSVG } from '../../src/components/C_AntV/utils/exportUtils'

test('standalone SVG export captures local theme variables without mutating the live canvas', async () => {
  const container = document.createElement('div')
  container.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" style="--c-primary:#e11d48;--c-theme-bg-card:#121314"><rect fill="var(--c-primary,#2080f0)" stroke="var(--c-theme-bg-card,#fff)" /></svg>'
  document.body.append(container)
  const original = container.innerHTML
  const blobs: Blob[] = []
  const create = vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
    blobs.push(blob as Blob)
    return 'blob:theme-export'
  })
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {})
  try {
    exportSVG({ container })
    const exported = new DOMParser().parseFromString(
      await blobs[0].text(),
      'image/svg+xml'
    )
    const { style } = exported.querySelector<SVGSVGElement>('svg')!
    expect(style.getPropertyValue('--c-primary')).toBe('#e11d48')
    expect(style.getPropertyValue('--c-theme-bg-card')).toBe('#121314')
    expect(container.innerHTML).toBe(original)
  } finally {
    create.mockRestore()
    revoke.mockRestore()
    click.mockRestore()
    container.remove()
  }
})
