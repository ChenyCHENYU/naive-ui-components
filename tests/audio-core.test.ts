import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { normalizeTrackIndex } from '../src/components/C_AudioPlayer/types'

describe('C_AudioPlayer playback contracts', () => {
  test('clamps an external index and handles an empty playlist', () => {
    expect(normalizeTrackIndex(4, 0)).toBe(0)
    expect(normalizeTrackIndex(-2, 3)).toBe(0)
    expect(normalizeTrackIndex(8, 3)).toBe(2)
    expect(normalizeTrackIndex(1.9, 3)).toBe(1)
    expect(normalizeTrackIndex(Number.NaN, 3)).toBe(0)
  })

  test('autoplay waits for mount and native controls cover mute and tracks', () => {
    const source = fs.readFileSync(
      path.resolve(
        import.meta.dir,
        '../src/components/C_AudioPlayer/index.vue'
      ),
      'utf8'
    )
    expect(source).toContain('onMounted(() => {')
    expect(source).toContain('await currentAudio.play()')
    expect(source).toContain("emit('error', error)")
    expect(source).toContain('@keydown="seekByKeyboard"')
    expect(source).toMatch(
      /<button\s+type="button"\s+class="c-audio-player__volume-icon"/
    )
    expect(source).toMatch(/<button\s+v-for="\(track, idx\) in tracks"/)
  })
})
