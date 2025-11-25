import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { algoliasearch } from 'algoliasearch'
import './ProductFamilies.css'

function ProductFamilies() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterNoVap, setFilterNoVap] = useState(false)
  const [filterMixed, setFilterMixed] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState({})
  const [sidebarWidth, setSidebarWidth] = useState(35) // percentage
  const [isResizing, setIsResizing] = useState(false)
  const [collapsedBrands, setCollapsedBrands] = useState(new Set())
  const [useAlgolia, setUseAlgolia] = useState(false)
  const [algoliaResults, setAlgoliaResults] = useState([])
  const [algoliaLoading, setAlgoliaLoading] = useState(false)
  const navigate = useNavigate()
  const { familyId } = useParams()
  const selectedFamily = familyId || null

  // Clear search term when Algolia toggle changes
  useEffect(() => {
    setSearchTerm('')
  }, [useAlgolia])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}products_with_variants3.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load product families data')
        }
        return response.json()
      })
      .then(jsonData => {
        setData(jsonData)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Algolia search effect
  useEffect(() => {
    if (!useAlgolia || !searchTerm) {
      setAlgoliaResults([])
      return
    }

    setAlgoliaLoading(true)

    // Initialize Algolia client (v5 API) - Using environment variables
    const searchClient = algoliasearch(
      import.meta.env.VITE_ALGOLIA_APP_ID,
      import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY
    )

    // Use v5 API - searchClient.search with index name
    searchClient.search({
      requests: [
        {
          indexName: 'Reece BCX',
          query: searchTerm,
          hitsPerPage: 1000
        }
      ]
    })
      .then(({ results }) => {
        const hits = results[0].hits

        // Log first hit to see the structure
        if (hits.length > 0) {
          console.log('First Algolia hit structure:', hits[0])
          console.log('Available keys:', Object.keys(hits[0]))
        }

        // Simply transform Algolia hits into the expected family structure
        // Each hit in Algolia represents a product family with all its data
        const families = hits.map(hit => {
          return {
            productFamilyId: hit.productFamilyId,
            productFamilyTitle: hit['Product Family Title'] || hit.productFamilyTitle || 'Unknown',
            brand: hit.Brand || hit.brand || 'Unknown',
            variants: hit.variants,
            variantCount: hit.variantCount,
            variantOptions: hit.variantOptions || {}
          }
        })

        console.log('Transformed families:', families.slice(0, 2))
        setAlgoliaResults(families)
        setAlgoliaLoading(false)
      })
      .catch(err => {
        console.error('Algolia search error:', err)
        setAlgoliaLoading(false)
      })
  }, [useAlgolia, searchTerm])

  // Handle resize mouse events
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return

      const containerWidth = window.innerWidth
      const newWidth = (e.clientX / containerWidth) * 100

      // Constrain between 20% and 60%
      if (newWidth >= 20 && newWidth <= 60) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Get families and metadata - use Algolia results if toggle is on, otherwise use local data
  const families = useAlgolia ? algoliaResults : (data?.families || [])
  const metadata = data?._metadata || {}

  // Get selected family details
  const family = selectedFamily
    ? families.find(f => f.productFamilyId === selectedFamily)
    : null

  // Set default selected options to show the first variant when family changes
  useEffect(() => {
    if (family && family.variants.length > 0) {
      // Get the first variant's attributes
      const firstVariant = family.variants[0]
      const defaultOptions = {}

      // For each variant option type, select the value from the first variant
      Object.keys(family.variantOptions).forEach(optionType => {
        let attr = firstVariant.attributes[optionType]

        // Handle pluralization mismatch (same logic as getMatchingProduct)
        if (attr === undefined) {
          if (!optionType.endsWith('s')) {
            attr = firstVariant.attributes[optionType + 's']
          } else if (optionType.endsWith('s')) {
            attr = firstVariant.attributes[optionType.slice(0, -1)]
          }
        }

        if (attr) {
          // If it's an array, take the first value; otherwise use the value directly
          defaultOptions[optionType] = Array.isArray(attr) ? attr[0] : attr
        }
      })

      setSelectedOptions(defaultOptions)
    }
  }, [selectedFamily, family])

  // Early returns AFTER all hooks
  if (loading) {
    return <div className="loading">Loading product families...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  // Calculate family VAP statistics
  const familyVapStats = families.map(family => {
    const vapCount = family.variants.filter(v => v.isVap === true).length
    const totalCount = family.variants.length

    return {
      family,
      vapCount,
      totalCount,
      isAllVap: vapCount === totalCount,
      isNoVap: vapCount === 0,
      isMixed: vapCount > 0 && vapCount < totalCount
    }
  })

  // Count families by type
  const noVapFamiliesCount = familyVapStats.filter(f => f.isNoVap).length
  const mixedFamiliesCount = familyVapStats.filter(f => f.isMixed).length

  // Filter families by search term and VAP status
  const filteredFamilies = familyVapStats.filter(({ family, isNoVap, isMixed }) => {
    // Search term filter
    const matchesSearch = !searchTerm ||
      family.productFamilyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      family.brand.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    // VAP filters
    if (filterNoVap && isNoVap) return false
    if (filterMixed && isMixed) return false

    return true
  }).map(stat => stat.family)

  // Group families by brand
  const familiesByBrand = filteredFamilies.reduce((acc, family) => {
    if (!acc[family.brand]) {
      acc[family.brand] = []
    }
    acc[family.brand].push(family)
    return acc
  }, {})

  const brands = Object.keys(familiesByBrand).sort()

  // Find matching product based on selected options
  const getMatchingProduct = () => {
    if (!family || Object.keys(selectedOptions).length === 0) {
      return null
    }

    // List of dimensional attribute names
    const dimensionalAttributes = ['Width', 'Height', 'Depth', 'Length', 'Diameter', 'Projection',
                                    'Reach', 'Arm Length', 'Shower Head Width', 'Fixing Point Distance',
                                    'Minimum Width', 'Maximum Width', 'Minimum Height', 'Maximum Height',
                                    'dimensions', 'dimension']

    return family.variants.find(variant => {
      return Object.entries(selectedOptions).every(([key, value]) => {
        let attr = variant.attributes[key]

        if (attr === undefined) {
          if (!key.endsWith('s')) {
            attr = variant.attributes[key + 's']
          } else if (key.endsWith('s')) {
            attr = variant.attributes[key.slice(0, -1)]
          }
        }

        // Special handling for "dimension" - check all dimensional attributes
        if (attr === undefined && (key === 'dimension' || key === 'dimensions')) {
          // Look for any dimensional attribute that matches the value
          for (const dimAttr of dimensionalAttributes) {
            const dimValue = variant.attributes[dimAttr]
            if (dimValue) {
              if (Array.isArray(dimValue) && dimValue.includes(value)) {
                return true
              } else if (dimValue === value) {
                return true
              }
            }
          }
          return false
        }

        if (Array.isArray(attr)) {
          return attr.includes(value)
        }
        return attr === value
      })
    })
  }

  const matchingProduct = getMatchingProduct()

  const handleOptionSelect = (optionType, value) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionType]: value
    }))
  }

  const clearOption = (optionType) => {
    setSelectedOptions(prev => {
      const newOptions = { ...prev }
      delete newOptions[optionType]
      return newOptions
    })
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here if needed
    })
  }

  const toggleBrandCollapse = (brand) => {
    setCollapsedBrands(prev => {
      const newSet = new Set(prev)
      if (newSet.has(brand)) {
        newSet.delete(brand)
      } else {
        newSet.add(brand)
      }
      return newSet
    })
  }

  console.log(familiesByBrand)

  return (
    <div className="product-families-container split-view">
      <div className="families-sidebar" style={{ width: `${sidebarWidth}%` }}>
        <div className="sidebar-header">
          <div className="header-content">
            <h1>Product Families</h1>
            <button
              className="back-button"
              onClick={() => navigate('/')}
            >
              ← Back to Grouped Products
            </button>
          </div>

          {!useAlgolia && metadata.statistics && (
            <div className="metadata-stats">
              <div className="stat-item">
                <span className="stat-label">Families:</span>
                <span className="stat-value">
                  {filteredFamilies.length}
                  {filteredFamilies.length !== metadata.statistics.totalFamilies && (
                    <span className="stat-total"> / {metadata.statistics.totalFamilies}</span>
                  )}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Products:</span>
                <span className="stat-value">
                  {filteredFamilies.reduce((sum, f) => sum + f.variantCount, 0)}
                  {filteredFamilies.length !== metadata.statistics.totalFamilies && (
                    <span className="stat-total"> / {metadata.statistics.totalProductsInFamilies}</span>
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="search-container">
            <div className="algolia-toggle-container">
              <label className="algolia-toggle-label">
                <span>Algolia</span>
                <input
                  type="checkbox"
                  checked={useAlgolia}
                  onChange={(e) => setUseAlgolia(e.target.checked)}
                  className="algolia-toggle-checkbox"
                />
                <span className="algolia-toggle-switch"></span>
              </label>
            </div>
            <input
              type="text"
              placeholder="Search families..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {!useAlgolia && (
              <div className="vap-filters">
                <label className="vap-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filterNoVap}
                    onChange={(e) => setFilterNoVap(e.target.checked)}
                    className="vap-checkbox"
                  />
                  <span>Filter out families with no VAP products ({noVapFamiliesCount} families)</span>
                </label>
                <label className="vap-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filterMixed}
                    onChange={(e) => setFilterMixed(e.target.checked)}
                    className="vap-checkbox"
                  />
                  <span>Filter out families with mixed VAP/non-VAP products ({mixedFamiliesCount} families)</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="families-list">
          {brands.length === 0 ? (
            <div className="no-results">
              No families found matching "{searchTerm}"
            </div>
          ) : (
            brands.map(brand => {
              const isCollapsed = collapsedBrands.has(brand)
              return (
                <div key={brand} className={`brand-section ${isCollapsed ? 'collapsed' : ''}`}>
                  <div className="brand-header" onClick={() => toggleBrandCollapse(brand)}>
                    <span className="brand-collapse-icon">{isCollapsed ? '▶' : '▼'}</span>
                    <h3 className="brand-name">{brand}</h3>
                    <span className="brand-family-count">
                      {familiesByBrand[brand].length}
                    </span>
                  </div>
                  {!isCollapsed && (
                    <div className="families-list-items">
                      {familiesByBrand[brand].map(fam => (
                        <div
                          key={fam.productFamilyId}
                          className={`family-item ${selectedFamily === fam.productFamilyId ? 'active' : ''}`}
                          onClick={() => navigate(`/families/${fam.productFamilyId}`)}
                        >
                          <div className="family-item-title">{fam.productFamilyTitle}</div>
                          <div className="family-item-meta">
                            <span className="variant-count">{fam.variantCount} variants</span>
                            {Object.keys(fam.variantOptions).length > 0 && (
                              <div className="options-tags-compact">
                                {Object.keys(fam.variantOptions).map(key => (
                                  <span key={key} className="option-tag-compact">
                                    {key}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div
        className="resize-handle"
        onMouseDown={() => setIsResizing(true)}
      />

      {selectedFamily && family ? (
        <div className="family-detail-panel">
          <div className="detail-panel-content">
            <div className="pdp-card">
              {Object.keys(family.variantOptions).length > 0 && (
                <div className="variant-selectors">
                  {Object.entries(family.variantOptions).map(([optionType, values]) => (
                    <div key={optionType} className="variant-group">
                      <label className="variant-label">
                        {optionType.charAt(0).toUpperCase() + optionType.slice(1)}
                      </label>
                      <div className="variant-swatches">
                        {values.map((value) => (
                          <button
                            key={value}
                            className={`swatch ${
                              selectedOptions[optionType] === value ? 'selected' : ''
                            }`}
                            onClick={() => handleOptionSelect(optionType, value)}
                            title={value}
                          >
                            <span className="swatch-label">{value}</span>
                          </button>
                        ))}
                        {selectedOptions[optionType] && (
                          <button
                            className="clear-option-link"
                            onClick={() => clearOption(optionType)}
                            title="Clear selection"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {matchingProduct ? (
                <>
                  <div className="pdp-header">
                    <h2 className="product-title">{matchingProduct.productTitle}</h2>
                    <div className="product-code-section">
                      <span className="product-code-label">Product Code:</span>
                      <div className="product-code-container">
                        <span className="product-code">{matchingProduct.productCode}</span>
                        <button
                          className="copy-button"
                          onClick={() => copyToClipboard(matchingProduct.productCode)}
                          title="Copy product code"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {Object.keys(matchingProduct.attributes).length > 0 && (
                    <div className="product-specs">
                      <h3 className="specs-title">Product Specifications</h3>
                      <dl className="specs-list">
                        {Object.entries(matchingProduct.attributes)
                          .filter(([key]) => key !== 'uniqueDescriptors')
                          .map(([key, value]) => (
                            <div key={key} className="spec-item">
                              <dt>{key}</dt>
                              <dd>
                                {Array.isArray(value) ? value.join(', ') : value}
                              </dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  )}

                  {matchingProduct.sourceAttributes?.groups?.[0]?.attributes && (
                    <div className="product-specs">
                      <h3 className="specs-title">Product Specifications From Source</h3>
                      <dl className="specs-list two-column">
                        <div className="spec-item">
                          <dt>Is VAP</dt>
                          <dd>{matchingProduct.isVap ? 'Yes' : 'No'}</dd>
                        </div>
                        {matchingProduct.sourceAttributes.groups[0].attributes.map((attr) => (
                          <div key={attr.id} className="spec-item">
                            <dt>{attr.name}</dt>
                            <dd>
                              {attr.values.join(', ')}
                              {attr.uom ? ` ${attr.uom}` : ''}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-match-message">
                  <p>No product matches the selected combination. Please try different options.</p>
                </div>
              )}
            </div>

            <div className="all-variants-section">
              <h2>All Variants ({family.variantCount})</h2>
              <div className="variants-table-container">
                <table className="variants-table">
                  <thead>
                    <tr>
                      <th>Product Code</th>
                      <th>Product Title</th>
                      {Object.keys(family.variantOptions).map(key => (
                        <th key={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {family.variants.map(variant => {
                      return (
                        <tr key={variant.productCode}>
                          <td className="code-cell">{variant.productCode}</td>
                          <td className="title-cell">{variant.productTitle}</td>
                          {Object.keys(family.variantOptions).map(key => {
                            let attr = variant.attributes[key]

                            if (attr === undefined) {
                              if (!key.endsWith('s')) {
                                attr = variant.attributes[key + 's']
                              } else if (key.endsWith('s')) {
                                attr = variant.attributes[key.slice(0, -1)]
                              }
                            }

                            return (
                              <td key={key} className="attribute-cell">
                                {attr
                                  ? (Array.isArray(attr)
                                      ? attr.join(', ')
                                      : attr)
                                  : '-'}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="family-detail-panel empty">
          <div className="empty-state">
            <h2>Select a product family</h2>
            <p>Choose a family from the list to view details and variants</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductFamilies
