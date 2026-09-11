export interface BrandConfig {
  domain: string
  brandName: string
  logoDir: string
  logo: string
  favicon: string
  title: string
  description: string
}

export const DEFAULT_BRAND_HOST = 'keoutdoordesign.tredo.it'

const keConfig: BrandConfig = {
  domain: 'keoutdoordesign.tredo.it',
  brandName: 'KE Outdoor Design',
  logoDir: '/brands/ke/',
  logo: '/brands/ke/logo.svg',
  favicon: '/brands/ke/favicon.ico',
  title: 'KE Outdoor Design — Configuratore Pergole Bioclimatiche 3D',
  description:
    'Configuratore interattivo 3D per pergole bioclimatiche in alluminio KE Outdoor Design. Personalizza dimensioni, finiture, tende zip e vetrate.'
}

const arquatiConfig: BrandConfig = {
  domain: 'arquati.tredo.it',
  brandName: 'Arquati',
  logoDir: '/brands/arquati/',
  logo: '/brands/arquati/logo.svg',
  favicon: '/brands/arquati/favicon.ico',
  title: 'Arquati — Configuratore Pergole Bioclimatiche 3D',
  description:
    'Configura la tua pergola bioclimatica su misura con Arquati. Esperienza 3D fotorealistica per spazi esterni di prestigio.'
}

export const BRANDS: Record<string, BrandConfig> = {
  'keoutdoordesign.tredo.it': keConfig,
  'kedesignoutdoor.tredo.it': keConfig, // backwards-compatibility alias
  'arquati.tredo.it': arquatiConfig
}

export const DEFAULT_BRAND: BrandConfig = keConfig
