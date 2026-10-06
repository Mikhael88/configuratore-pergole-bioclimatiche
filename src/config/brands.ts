export interface BrandConfig {
  domain: string
  brandName: string
  logoDir: string
  logo: string
  favicon: string
  title: string
  description: string
  primaryColor?: string
  primaryHover?: string
  accentLight?: string
  contrastTextColor?: string
}

export const DEFAULT_BRAND_HOST = 'keoutdoordesign.tredo.it'

/**
 * Mappa di associazione dominio -> percorso del logo
 */
export const APP_LOGO: Record<string, string> = {
  'arquati.tredo.it': '/brands/arquati/logo.svg',
  'arquati.it': '/brands/arquati/logo.svg',
  'keoutdoordesign.tredo.it': '/brand/frontyard-group.png',
  'kedesignoutdoor.tredo.it': '/brand/frontyard-group.png',
  'keoutdoordesign.com': '/brand/frontyard-group.png',
  'pergole.limago.it': '/brands/limago/logo.png',
  'limago.it': '/brands/limago/logo.png',
  'localhost': '/brand/frontyard-group.png',
  'default': '/brand/frontyard-group.png'
}

/**
 * Helper per ottenere il percorso del logo in base al dominio corrente (o specificato),
 * con supporto per override da query string (?brand=...) o hash (#brand=...).
 */
export function getAppLogo(hostname?: string): string {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search)
      const brandParam = params.get('brand')?.toLowerCase().trim()
      if (brandParam) {
        if (APP_LOGO[brandParam]) return APP_LOGO[brandParam]
        if (brandParam.includes('limago')) return APP_LOGO['pergole.limago.it']
        if (brandParam.includes('arquati')) return APP_LOGO['arquati.tredo.it']
        if (
          brandParam.includes('ke') ||
          brandParam.includes('kedesign') ||
          brandParam.includes('keoutdoor')
        ) {
          return APP_LOGO['keoutdoordesign.tredo.it']
        }
      }
      if (window.location.hash) {
        const hash = window.location.hash.toLowerCase()
        if (hash.includes('brand=limago')) return APP_LOGO['pergole.limago.it']
        if (hash.includes('brand=arquati')) return APP_LOGO['arquati.tredo.it']
        if (hash.includes('brand=ke') || hash.includes('brand=keoutdoor')) {
          return APP_LOGO['keoutdoordesign.tredo.it']
        }
      }
    } catch {
      // Ignora errori di parsing parametri URL
    }
  }

  const rawHost = hostname || (typeof window !== 'undefined' ? window.location.hostname : '')
  const cleanHost = rawHost.toLowerCase().split(':')[0].replace(/^www\./, '').trim()

  if (cleanHost && APP_LOGO[cleanHost]) {
    return APP_LOGO[cleanHost]
  }

  if (cleanHost.includes('limago')) {
    return APP_LOGO['pergole.limago.it']
  }
  if (cleanHost.includes('arquati')) {
    return APP_LOGO['arquati.tredo.it']
  }
  if (
    cleanHost.includes('keoutdoordesign') ||
    cleanHost.includes('keoutdoor') ||
    cleanHost.includes('kedesign') ||
    cleanHost.includes('ke-outdoor')
  ) {
    return APP_LOGO['keoutdoordesign.tredo.it']
  }

  return APP_LOGO['default'] || APP_LOGO['keoutdoordesign.tredo.it']
}

const keConfig: BrandConfig = {
  domain: 'keoutdoordesign.tredo.it',
  brandName: 'KE Outdoor Design',
  logoDir: '/brand/',
  logo: APP_LOGO['keoutdoordesign.tredo.it'],
  favicon: '/brands/ke/favicon.ico',
  title: 'KE Outdoor Design — Configuratore Pergole Bioclimatiche 3D',
  description:
    'Configuratore interattivo 3D per pergole bioclimatiche in alluminio KE Outdoor Design. Personalizza dimensioni, finiture, tende zip e vetrate.'
}

const arquatiConfig: BrandConfig = {
  domain: 'arquati.tredo.it',
  brandName: 'Arquati',
  logoDir: '/brands/arquati/',
  logo: APP_LOGO['arquati.tredo.it'],
  favicon: '/brands/arquati/favicon.ico',
  title: 'Arquati — Configuratore Pergole Bioclimatiche 3D',
  description:
    'Configura la tua pergola bioclimatica su misura con Arquati. Esperienza 3D fotorealistica per spazi esterni di prestigio.'
}

const limagoConfig: BrandConfig = {
  domain: 'pergole.limago.it',
  brandName: 'Limago',
  logoDir: '/brands/limago/',
  logo: APP_LOGO['pergole.limago.it'],
  favicon: '/brands/limago/favicon.png',
  title: 'Limago — Configuratore Pergole Bioclimatiche 3D',
  description:
    'Configuratore interattivo 3D per pergole bioclimatiche Limago. Personalizza dimensioni, finiture, chiusure e schermature.',
  primaryColor: '#E2E100',
  primaryHover: '#c8c700',
  accentLight: 'rgba(226, 225, 0, 0.15)',
  contrastTextColor: '#0f172a'
}

export const BRANDS: Record<string, BrandConfig> = {
  'keoutdoordesign.tredo.it': keConfig,
  'kedesignoutdoor.tredo.it': keConfig, // backwards-compatibility alias
  'arquati.tredo.it': arquatiConfig,
  'pergole.limago.it': limagoConfig,
  'limago.it': limagoConfig
}

export const DEFAULT_BRAND: BrandConfig = keConfig
