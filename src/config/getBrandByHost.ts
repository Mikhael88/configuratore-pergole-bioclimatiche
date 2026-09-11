import { BrandConfig, BRANDS, DEFAULT_BRAND } from './brands'

/**
 * Resolves the active brand configuration based on current hostname or URL overrides.
 *
 * Resolution order:
 * 1. URL search parameter: `?brand=arquati` or `?brand=ke` / `?brand=keoutdoordesign`
 * 2. URL hash parameter: `#brand=arquati` or `#brand=ke` / `#brand=keoutdoordesign`
 * 3. Exact hostname match (cleaned of port and 'www.')
 * 4. Staging / preview substring match (e.g., 'arquati-preview.vercel.app')
 * 5. Default fallback to DEFAULT_BRAND (`keoutdoordesign.tredo.it`)
 */
export function getBrandByHost(hostname?: string): BrandConfig {
  if (typeof window !== 'undefined') {
    // 1. Query parameter override
    try {
      const params = new URLSearchParams(window.location.search)
      const brandParam = params.get('brand')?.toLowerCase().trim()
      if (brandParam) {
        if (BRANDS[brandParam]) return BRANDS[brandParam]
        if (brandParam === 'arquati' || brandParam.includes('arquati')) {
          return BRANDS['arquati.tredo.it']
        }
        if (
          brandParam === 'ke' ||
          brandParam.includes('keoutdoor') ||
          brandParam.includes('keoutdoordesign') ||
          brandParam.includes('kedesign')
        ) {
          return BRANDS['keoutdoordesign.tredo.it']
        }
      }

      // 2. Hash parameter override
      if (window.location.hash) {
        const hash = window.location.hash.toLowerCase()
        if (hash.includes('brand=arquati')) return BRANDS['arquati.tredo.it']
        if (hash.includes('brand=ke') || hash.includes('brand=keoutdoor')) {
          return BRANDS['keoutdoordesign.tredo.it']
        }
      }
    } catch {
      // Ignore URL parsing errors if any
    }
  }

  // 3. Clean hostname
  const rawHost = hostname || (typeof window !== 'undefined' ? window.location.hostname : '')
  const cleanHost = rawHost.toLowerCase().split(':')[0].replace(/^www\./, '').trim()

  // 4. Exact dictionary lookup
  if (cleanHost && BRANDS[cleanHost]) {
    return BRANDS[cleanHost]
  }

  // 5. Keyword match for staging / preview subdomains
  if (cleanHost.includes('arquati')) {
    return BRANDS['arquati.tredo.it']
  }
  if (
    cleanHost.includes('keoutdoordesign') ||
    cleanHost.includes('keoutdoor') ||
    cleanHost.includes('kedesign') ||
    cleanHost.includes('ke-outdoor')
  ) {
    return BRANDS['keoutdoordesign.tredo.it']
  }

  // 6. Default fallback
  return DEFAULT_BRAND
}
