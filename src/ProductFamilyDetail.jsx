import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './ProductFamilyDetail.css'

function ProductFamilyDetail() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOptions, setSelectedOptions] = useState({})
  const navigate = useNavigate()
  const { familyId } = useParams()

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}products_with_variants2.json`)
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

  // Set default selected options (first option in each variant)
  useEffect(() => {
    if (data && familyId) {
      const family = data.families?.find(f => f.productFamilyId === familyId)
      if (family && family.variantOptions && Object.keys(selectedOptions).length === 0) {
        const defaultOptions = {}
        Object.entries(family.variantOptions).forEach(([key, values]) => {
          if (values.length > 0) {
            defaultOptions[key] = values[0]
          }
        })
        setSelectedOptions(defaultOptions)
      }
    }
  }, [data, familyId, selectedOptions])

  if (loading) {
    return <div className="loading">Loading product family...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  const family = data?.families?.find(f => f.productFamilyId === familyId)

  if (!family) {
    return (
      <div className="error">
        <p>Product family not found</p>
        <button onClick={() => navigate('/families')}>← Back to Families</button>
      </div>
    )
  }

  // Find matching product based on selected options
  const getMatchingProduct = () => {
    if (Object.keys(selectedOptions).length === 0) {
      return null
    }

    return family.variants.find(variant => {
      return Object.entries(selectedOptions).every(([key, value]) => {
        // Try the exact key first
        let attr = variant.attributes[key]

        // If not found, try plural/singular variations
        if (attr === undefined) {
          // If key is singular, try plural
          if (!key.endsWith('s')) {
            attr = variant.attributes[key + 's']
          }
          // If key is plural, try singular
          else if (key.endsWith('s')) {
            attr = variant.attributes[key.slice(0, -1)]
          }
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here if needed
    })
  }

  return (
    <div className="family-detail-container">
      <header className="detail-header">
        <button
          className="back-button"
          onClick={() => navigate('/families')}
        >
          ← Back to Families
        </button>
        <div className="header-info">
          <span className="brand-badge">{family.brand}</span>
          <h1 className="family-title">{family.productFamilyTitle}</h1>
          <p className="variant-count-text">
            {family.variantCount} variants available
          </p>
        </div>
      </header>

      <div className="detail-content">
        <div className="pdp-card">
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
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
            </>
          ) : (
            <div className="no-match-message">
              <p>No product matches the selected combination. Please try different options.</p>
            </div>
          )}
        </div>
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
                      // Try the exact key first
                      let attr = variant.attributes[key]

                      // If not found, try plural/singular variations
                      if (attr === undefined) {
                        // If key is singular, try plural
                        if (!key.endsWith('s')) {
                          attr = variant.attributes[key + 's']
                        }
                        // If key is plural, try singular
                        else if (key.endsWith('s')) {
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
  )
}

export default ProductFamilyDetail
