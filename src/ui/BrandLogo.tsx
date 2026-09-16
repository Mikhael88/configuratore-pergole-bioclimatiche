import React, { useState } from 'react'
import { BrandConfig, getAppLogo } from '../config/brands'
import { getBrandByHost } from '../config/getBrandByHost'

interface BrandLogoProps {
  brand?: BrandConfig
  logoSrc?: string
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ brand: propBrand, logoSrc }) => {
  const brand = propBrand || getBrandByHost()
  const currentLogo = logoSrc || getAppLogo() || brand.logo
  const [imageError, setImageError] = useState(false)

  return (
    <div className="brand-logo-box" aria-label={brand.brandName}>
      {!imageError ? (
        <img
          src={currentLogo}
          alt={brand.brandName}
          className="brand-logo-img"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="brand-logo-fallback">
          <span className="brand-fallback-name">{brand.brandName}</span>
        </div>
      )}
    </div>
  )
}
