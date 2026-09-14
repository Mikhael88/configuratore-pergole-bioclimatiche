import React, { useState } from 'react'
import { BrandConfig } from '../config/brands'
import { getBrandByHost } from '../config/getBrandByHost'

interface BrandLogoProps {
  brand?: BrandConfig
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ brand: propBrand }) => {
  const brand = propBrand || getBrandByHost()
  const [imageError, setImageError] = useState(false)

  return (
    <div className="brand-logo-box" aria-label={brand.brandName}>
      {!imageError ? (
        <img
          src={brand.logo}
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
