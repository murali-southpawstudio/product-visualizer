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

  const resetSelection = () => {
    setSelectedOptions({})
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
        <div className="options-panel">
          <h2>Select Options</h2>

          {Object.keys(family.variantOptions).length === 0 ? (
            <p className="no-options">No variant options available</p>
          ) : (
            <div className="options-groups">
              {Object.entries(family.variantOptions).map(([optionType, values]) => (
                <div key={optionType} className="option-group">
                  <h3 className="option-type-title">
                    {optionType.charAt(0).toUpperCase() + optionType.slice(1)}
                  </h3>
                  <div className="option-buttons">
                    {values.map((value) => (
                      <button
                        key={value}
                        className={`option-btn ${
                          selectedOptions[optionType] === value ? 'selected' : ''
                        }`}
                        onClick={() => handleOptionSelect(optionType, value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {Object.keys(selectedOptions).length > 0 && (
            <button className="reset-button" onClick={resetSelection}>
              Reset Selection
            </button>
          )}
        </div>

        <div className="product-display-panel">
          <h2>Selected Product</h2>

          {matchingProduct ? (
            <div className="selected-product">
              <div className="product-info-card">
                <div className="product-header">
                  <span className="product-code-label">Product Code</span>
                  <span className="product-code">{matchingProduct.productCode}</span>
                </div>

                <div className="product-title-section">
                  <h3>Product Title</h3>
                  <p className="product-title">{matchingProduct.productTitle}</p>
                </div>

                {Object.keys(matchingProduct.attributes).length > 0 && (
                  <div className="product-attributes">
                    <h4>Attributes</h4>
                    <dl className="attributes-list">
                      {Object.entries(matchingProduct.attributes)
                        .filter(([key]) => key !== 'uniqueDescriptors')
                        .map(([key, value]) => (
                          <div key={key} className="attribute-item">
                            <dt>{key}</dt>
                            <dd>
                              {Array.isArray(value) ? value.join(', ') : value}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="no-selection">
              {Object.keys(selectedOptions).length === 0 ? (
                <p>Please select options to view a specific product</p>
              ) : (
                <p>No product matches the selected combination. Try different options.</p>
              )}
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
