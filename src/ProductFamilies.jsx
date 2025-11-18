import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './ProductFamilies.css'

function ProductFamilies() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}products_with_variants.json`)
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

  if (loading) {
    return <div className="loading">Loading product families...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  const families = data?.families || []
  const metadata = data?._metadata || {}

  const filteredFamilies = searchTerm
    ? families.filter(family =>
        family.productFamilyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        family.brand.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : families

  // Group families by brand
  const familiesByBrand = filteredFamilies.reduce((acc, family) => {
    if (!acc[family.brand]) {
      acc[family.brand] = []
    }
    acc[family.brand].push(family)
    return acc
  }, {})

  const brands = Object.keys(familiesByBrand).sort()

  return (
    <div className="product-families-container">
      <header className="families-header">
        <div className="header-content">
          <h1>Product Families</h1>
          <button
            className="back-button"
            onClick={() => navigate('/')}
          >
            ← Back to Grouped Products
          </button>
        </div>

        {metadata.statistics && (
          <div className="metadata-stats">
            <div className="stat-item">
              <span className="stat-label">Total Families:</span>
              <span className="stat-value">{metadata.statistics.totalFamilies}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Products:</span>
              <span className="stat-value">{metadata.statistics.totalProductsInFamilies}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Avg Variants:</span>
              <span className="stat-value">{metadata.statistics.averageVariantsPerFamily}</span>
            </div>
          </div>
        )}

        <div className="search-container">
          <input
            type="text"
            placeholder="Search families by name or brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </header>

      <div className="families-list">
        {brands.length === 0 ? (
          <div className="no-results">
            No families found matching "{searchTerm}"
          </div>
        ) : (
          brands.map(brand => (
            <div key={brand} className="brand-section">
              <div className="brand-header">
                <h2 className="brand-name">{brand}</h2>
                <span className="brand-family-count">
                  {familiesByBrand[brand].length} {familiesByBrand[brand].length === 1 ? 'family' : 'families'}
                </span>
              </div>
              <div className="families-table">
                <table>
                  <thead>
                    <tr>
                      <th className="title-col">Product Family</th>
                      <th className="variants-col">Variants</th>
                      <th className="options-col">Variant Options</th>
                      <th className="action-col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {familiesByBrand[brand].map(family => (
                      <tr
                        key={family.productFamilyId}
                        className="family-row"
                        onClick={() => navigate(`/families/${family.productFamilyId}`)}
                      >
                        <td className="title-cell">
                          <span className="family-title">{family.productFamilyTitle}</span>
                        </td>
                        <td className="variants-cell">
                          <span className="variant-badge">{family.variantCount}</span>
                        </td>
                        <td className="options-cell">
                          {Object.keys(family.variantOptions).length > 0 ? (
                            <div className="options-tags">
                              {Object.entries(family.variantOptions).map(([key, values]) => (
                                <span key={key} className="option-tag">
                                  {key}: {values.length}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="no-options-text">-</span>
                          )}
                        </td>
                        <td className="action-cell">
                          <button className="view-btn">View →</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ProductFamilies
