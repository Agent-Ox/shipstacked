'use client'

import { useEffect, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'

interface Country {
  code: string
  name: string
  count: number
  lng: number
  lat: number
}

interface GeoData {
  countries: Country[]
  totalBuilders: number
  unspecified: number
  countryCount: number
}

// World TopoJSON from Natural Earth, hosted on GitHub (unpkg CDN reliable fallback)
const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Mercator projection fitted to 1000x500 viewBox, slight vertical crop to de-emphasise polar distortion
function useProjection() {
  return geoMercator()
    .scale(115)
    .center([10, 15])
    .translate([500, 240])
}

export default function BuilderMap() {
  const [data, setData] = useState<GeoData | null>(null)
  const [geoFeatures, setGeoFeatures] = useState<any[]>([])
  const [hovered, setHovered] = useState<Country | null>(null)

  useEffect(() => {
    fetch('/api/builders/geo')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then(r => r.json())
      .then(topo => {
        const geo: any = feature(topo, topo.objects.countries)
        setGeoFeatures(geo.features || [])
      })
      .catch(() => {})
  }, [])

  if (!data || data.countries.length === 0) return null

  const projection = useProjection()
  const pathGen = geoPath(projection)
  const maxCount = Math.max(...data.countries.map(c => c.count))

  return (
    <section style={{ background: '#0a0a0f', padding: '5rem 1.5rem', color: '#f0f0f5' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#0071e3', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Global
        </p>
        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '2.5rem', lineHeight: 1.15 }}>
          Where the world&apos;s AI-native builders ship from.
        </h2>

        <div style={{ position: 'relative', width: '100%', aspectRatio: '2 / 1', maxWidth: 1000, margin: '0 auto' }}>
          <svg viewBox="0 0 1000 500" style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0071e3" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0071e3" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Real country shapes from topojson */}
            <g>
              {geoFeatures.map((f, i) => {
                const d = pathGen(f)
                if (!d) return null
                return (
                  <path
                    key={i}
                    d={d}
                    fill="#1a1a22"
                    stroke="#2a2a36"
                    strokeWidth={0.5}
                  />
                )
              })}
            </g>

            {/* Builder dots */}
            {data.countries.map(country => {
              const projected = projection([country.lng, country.lat])
              if (!projected) return null
              const [x, y] = projected
              const ratio = country.count / maxCount
              const radius = 4 + ratio * 8
              const pulses = country.count >= 3
              return (
                <g key={country.code}>
                  <circle cx={x} cy={y} r={radius * 3} fill="url(#dotGlow)" style={{ pointerEvents: 'none' }} />
                  {pulses && (
                    <circle cx={x} cy={y} r={radius} fill="none" stroke="#0071e3" strokeWidth="1.5" opacity="0.6">
                      <animate attributeName="r" from={radius} to={radius * 2.5} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill="#0071e3"
                    stroke="#ffffff"
                    strokeWidth="1"
                    style={{ cursor: 'pointer', filter: 'drop-shadow(0 0 4px rgba(0,113,227,0.8))' }}
                    onMouseEnter={() => setHovered(country)}
                    onMouseLeave={() => setHovered(null)}
                  />
                </g>
              )
            })}
          </svg>

          {hovered && (
            <div style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#ffffff',
              color: '#0a0a0f',
              padding: '0.6rem 1rem',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}>
              {hovered.name} · {hovered.count} {hovered.count === 1 ? 'builder' : 'builders'}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
