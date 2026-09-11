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
    <aside
      className="brand-logo-container"
      aria-label={`Logo e brand ${brand.brandName}`}
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 1000,
        pointerEvents: 'auto'
      }}
    >
      <div className="brand-logo-badge">
        {!imageError ? (
          <img
            src={brand.logo}
            alt={`Logo ${brand.brandName}`}
            className="brand-logo-img"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="brand-logo-fallback">
            <span className="brand-fallback-name">{brand.brandName}</span>
          </div>
        )}
      </div>
    </aside>
  )
}
