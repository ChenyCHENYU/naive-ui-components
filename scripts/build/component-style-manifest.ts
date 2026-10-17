/** Use source block identity instead of CSS contents to deduplicate output formats. */
export function createComponentStyleCollector() {
  const components = new Map<string, Map<string, string>>()

  function add(id: string, css: string): void {
    const normalized = id.replaceAll('\\', '/')
    const owner = /\/src\/components\/(C_[^/]+)\//.exec(normalized)?.[1]
    if (!owner) return
    // This plugin control marker is not stylesheet content or a license notice.
    const content = css.replaceAll('/* unplugin-vue-components disabled */', '')
    const [filename, query = ''] = normalized.split('?')
    const attributes = new URLSearchParams(query)
    // Scope hashes and virtual-module flags do not change source block identity.
    const key = `${filename}?style=${attributes.get('index') ?? '0'}`
    const styles = components.get(owner) ?? new Map<string, string>()
    const previous = styles.get(key)
    if (previous !== undefined && previous !== content) {
      throw new Error(
        `[component-styles] Inconsistent compiled CSS for ${key}. ` +
          'Rebuild with stable source files and deterministic transforms.'
      )
    }
    styles.set(key, content)
    components.set(owner, styles)
  }

  function manifest(): Record<string, string> {
    return Object.fromEntries(
      [...components]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([owner, styles]) => [
          owner,
          [...styles]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([, css]) => css)
            .join('\n'),
        ])
    )
  }

  return { add, manifest }
}
