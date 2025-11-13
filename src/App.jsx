import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState(new Set())
  const [infoPanelCollapsed, setInfoPanelCollapsed] = useState(false)

  useEffect(() => {
    fetch('/products-grouped-by-variant_v3.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load data')
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
    return <div className="loading">Loading products...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  const brands = Object.keys(data || {}).sort()
  const filteredBrands = searchTerm
    ? brands.filter(brand =>
        brand.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : brands

  const getTotalProducts = (brandData) => {
    return brandData.reduce((sum, group) => sum + group.length, 0)
  }

  const totalProducts = brands.reduce((sum, brand) => {
    return sum + getTotalProducts(data[brand])
  }, 0)

  // Calculate overall unique and grouped products
  const overallStats = brands.reduce((acc, brand) => {
    const brandGroups = data[brand]
    const uniqueProducts = brandGroups.filter(group => group.length === 1).length
    const totalBrandProducts = getTotalProducts(brandGroups)
    const groupedProducts = totalBrandProducts - uniqueProducts

    return {
      total: acc.total + totalBrandProducts,
      unique: acc.unique + uniqueProducts,
      grouped: acc.grouped + groupedProducts
    }
  }, { total: 0, unique: 0, grouped: 0 })

  // Find common text in a group of product titles
  const findCommonText = (group) => {
    if (group.length <= 1) return []

    const titles = group.map(p => p.productTitle)
    const words = titles.map(title => title.split(/\s+/))

    // Find common consecutive word sequences
    const commonPhrases = []
    const firstWords = words[0]

    for (let i = 0; i < firstWords.length; i++) {
      for (let len = 1; len <= firstWords.length - i; len++) {
        const phrase = firstWords.slice(i, i + len).join(' ')
        const phraseRegex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

        // Check if this phrase appears in all titles
        if (titles.every(title => phraseRegex.test(title))) {
          commonPhrases.push(phrase)
        }
      }
    }

    // Return longest common phrases (filter out substrings of longer phrases)
    return commonPhrases
      .sort((a, b) => b.length - a.length)
      .filter((phrase, idx, arr) => {
        return !arr.some((other, otherIdx) =>
          otherIdx < idx && other.includes(phrase)
        )
      })
  }

  // Highlight common text in a product title
  const highlightCommonText = (title, commonPhrases) => {
    if (!commonPhrases || commonPhrases.length === 0) {
      return <>{title}</>
    }

    let result = title
    const parts = []
    let lastIndex = 0

    // Sort phrases by position in the string
    const phrasesWithPositions = commonPhrases
      .map(phrase => {
        const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        const match = result.match(regex)
        return match ? { phrase, index: match.index } : null
      })
      .filter(Boolean)
      .sort((a, b) => a.index - b.index)

    phrasesWithPositions.forEach(({ phrase, index }) => {
      if (index >= lastIndex) {
        // Add non-highlighted text before this phrase
        if (index > lastIndex) {
          parts.push(result.substring(lastIndex, index))
        }
        // Add highlighted phrase
        parts.push(<span key={index} className="highlight">{result.substring(index, index + phrase.length)}</span>)
        lastIndex = index + phrase.length
      }
    })

    // Add remaining text
    if (lastIndex < result.length) {
      parts.push(result.substring(lastIndex))
    }

    return parts.length > 0 ? <>{parts}</> : <>{title}</>
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Product Visualizer</h1>
        <p className="subtitle">Exploring {brands.length} brands</p>
      </header>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search brands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className={`content ${selectedBrand ? 'with-products' : ''}`}>
        <div className="brands-list">
          <div className="brands-list-header">
            <h2>Brands ({filteredBrands.length})</h2>
            <div className="brands-list-stats">
              <span className="stat-item">{overallStats.total} total</span>
              <span className="stat-separator">•</span>
              <span className="stat-item">{overallStats.unique} unique</span>
              <span className="stat-separator">•</span>
              <span className="stat-item">{overallStats.grouped} grouped</span>
            </div>
          </div>
          <div className="brands-grid">
            {filteredBrands.map(brand => {
              const brandGroups = data[brand]
              const totalProducts = getTotalProducts(brandGroups)
              const uniqueProducts = brandGroups.filter(group => group.length === 1).length
              const groupedProducts = totalProducts - uniqueProducts

              return (
                <div
                  key={brand}
                  className={`brand-card ${selectedBrand === brand ? 'active' : ''}`}
                  onClick={() => setSelectedBrand(brand)}
                >
                  <div className="brand-name">{brand}</div>
                  <div className="brand-count">{totalProducts} products</div>
                  <div className="brand-stats">
                    <span className="brand-stat">{uniqueProducts} unique</span>
                    <span className="brand-stat-separator">•</span>
                    <span className="brand-stat">{groupedProducts} grouped</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {selectedBrand && (
          <div className="products-panel">
            <div className="panel-sticky-header">
              <div className="panel-header">
                <div className="panel-header-content">
                  <h2>{selectedBrand}</h2>
                  <div className="panel-stats">
                    {(() => {
                      const brandGroups = data[selectedBrand]
                      const totalProducts = brandGroups.reduce((sum, group) => sum + group.length, 0)
                      const uniqueProducts = brandGroups.filter(group => group.length === 1).length
                      const groupedProducts = totalProducts - uniqueProducts
                      return (
                        <>
                          <span className="stat-item">{totalProducts} total</span>
                          <span className="stat-separator">•</span>
                          <span className="stat-item">{uniqueProducts} unique</span>
                          <span className="stat-separator">•</span>
                          <span className="stat-item">{groupedProducts} grouped</span>
                        </>
                      )
                    })()}
                  </div>
                </div>
                <button
                  className="close-btn"
                  onClick={() => {
                    setSelectedBrand(null)
                    setProductSearchTerm('')
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="product-search-container">
                <input
                  type="text"
                  placeholder="Search by product code or title..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="product-search-input"
                />
              </div>
            </div>
            <div className="products-list">
              {[...data[selectedBrand]]
                .sort((a, b) => b.length - a.length)
                .map((group, groupIndex) => {
                  // Filter products based on search term
                  const filteredGroup = productSearchTerm
                    ? group.filter(product =>
                        product.productCode.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                        product.productTitle.toLowerCase().includes(productSearchTerm.toLowerCase())
                      )
                    : group

                  // Skip this group if no products match the search
                  if (filteredGroup.length === 0) return null

                  const commonPhrases = findCommonText(filteredGroup)
                  const groupKey = `${selectedBrand}-${groupIndex}`
                  const isCollapsed = collapsedGroups.has(groupKey)

                  const toggleGroup = () => {
                    setCollapsedGroups(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has(groupKey)) {
                        newSet.delete(groupKey)
                      } else {
                        newSet.add(groupKey)
                      }
                      return newSet
                    })
                  }

                  return (
                    <div key={groupIndex} className="product-group">
                      <div className="group-label" onClick={toggleGroup}>
                        <span className="collapse-icon">{isCollapsed ? '▶' : '▼'}</span>
                        <span>Group {groupIndex + 1} ({filteredGroup.length} {filteredGroup.length === 1 ? 'product' : 'products'})</span>
                      </div>
                      {!isCollapsed && filteredGroup.map((product, productIndex) => (
                        <div key={productIndex} className="product-item">
                          <div className="product-code">{product.productCode}</div>
                          <div className="product-title">
                            {highlightCommonText(product.productTitle, commonPhrases)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        <div className={`info-panel ${infoPanelCollapsed ? 'collapsed' : ''}`}>
          <div className="info-panel-header">
            <h2>Grouping Algorithm</h2>
            <button
              className="collapse-toggle-btn"
              onClick={() => setInfoPanelCollapsed(!infoPanelCollapsed)}
              title={infoPanelCollapsed ? 'Expand' : 'Collapse'}
            >
              {infoPanelCollapsed ? '◀' : '▶'}
            </button>
          </div>
          {!infoPanelCollapsed && (
            <>
          <p className="info-description">
            Products are intelligently grouped based on similarity, ignoring variations in size, color, and material.
          </p>

          <div className="info-section">
            <h3>What Gets Ignored</h3>
            <ul>
              <li><strong>Sizes:</strong> 600mm, 700mm, 1200x900mm, etc.</li>
              <li><strong>Materials:</strong> Chrome, Brass, Bronze, Stainless Steel, etc.</li>
              <li><strong>Colors:</strong> Black, White, Matte Black, Brushed Nickel, etc.</li>
              <li><strong>Glass Types:</strong> Black Glass, Reflective Glass, Frosted Glass, etc.</li>
              <li><strong>Wood Types:</strong> Oak, Walnut, Bamboo, Timber, etc.</li>
            </ul>
          </div>

          <div className="info-section">
            <h3>How It Works</h3>
            <ol>
              <li>Extract and normalize product titles by removing sizes and materials</li>
              <li>Group products with identical base descriptions together</li>
              <li>Products that differ only in size, color, or material end up in the same group</li>
            </ol>
          </div>

          <div className="info-section">
            <h3>Example</h3>
            <div className="info-example">
              <p className="example-title">These products get grouped together:</p>
              <ul>
                <li>"Mizu Drift 600mm Grab Rail Polished Stainless Steel"</li>
                <li>"Mizu Drift 700mm Grab Rail Polished Stainless Steel"</li>
                <li>"Mizu Drift 450mm Grab Rail Polished Stainless Steel"</li>
              </ul>
              <p className="example-reason">→ Same base product, different sizes</p>
            </div>

            <div className="info-example">
              <p className="example-title">These also get grouped:</p>
              <ul>
                <li>"Geberit Sigma80 Sensor Plate Black Glass"</li>
                <li>"Geberit Sigma80 Sensor Plate Reflective Glass"</li>
              </ul>
              <p className="example-reason">→ Same base product, different materials</p>
            </div>
          </div>

          <div className="info-section">
            <h3>Statistics</h3>
            <ul>
              <li><strong>Total:</strong> All products in the catalog</li>
              <li><strong>Unique:</strong> Products with no variants (standalone)</li>
              <li><strong>Grouped:</strong> Products with variants (different sizes/colors/materials)</li>
            </ul>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
