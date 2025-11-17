import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './App.css'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState(new Set())
  const [infoPanelCollapsed, setInfoPanelCollapsed] = useState(false)
  const [copiedProducts, setCopiedProducts] = useState([])
  const [jsonVersion, setJsonVersion] = useState('v6') // Track which version is loaded

  const navigate = useNavigate()
  const { brandName } = useParams()
  const selectedBrand = brandName || null

  useEffect(() => {
    const version = 'v6' // Change this to switch versions: 'v1', 'v3', 'v4', 'v5', 'v6'
    setJsonVersion(version)
    fetch(`${import.meta.env.BASE_URL}products-grouped-by-variant_${version}.json`)
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

  const brands = Object.keys(data || {}).filter(key => key !== '_algorithmInfo').sort()
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

  // Get algorithm info based on version
  const getAlgorithmInfo = (version) => {
    const algorithmVersions = {
      v1: {
        title: "Grouping Algorithm (v1 - Original)",
        description: "Original grouping from the source data. Basic grouping by product variants.",
        whatGetsIgnored: [
          { label: "Sizes", examples: "600mm, 700mm, 1200x900mm, etc." }
        ],
        howItWorks: [
          "Products are grouped as provided in the original data source",
          "Basic variant detection based on product codes and categories"
        ],
        examples: []
      },
      v3: {
        title: "Grouping Algorithm (v3)",
        description: "Products are intelligently grouped based on similarity, ignoring variations in size, color, and material.",
        whatGetsIgnored: [
          { label: "Sizes", examples: "600mm, 700mm, 1200x900mm, etc." },
          { label: "Materials", examples: "Chrome, Brass, Bronze, Stainless Steel, etc." },
          { label: "Colors", examples: "Black, White, Matte Black, Brushed Nickel, etc." },
          { label: "Glass Types", examples: "Black Glass, Reflective Glass, Frosted Glass, etc." },
          { label: "Wood Types", examples: "Oak, Walnut, Bamboo, Timber, etc." }
        ],
        howItWorks: [
          "Extract and normalize product titles by removing sizes and materials",
          "Group products with identical base descriptions together",
          "Products that differ only in size, color, or material end up in the same group"
        ],
        examples: [
          {
            title: "These products get grouped together:",
            items: [
              "Mizu Drift 600mm Grab Rail Polished Stainless Steel",
              "Mizu Drift 700mm Grab Rail Polished Stainless Steel",
              "Mizu Drift 450mm Grab Rail Polished Stainless Steel"
            ],
            reason: "Same base product, different sizes"
          },
          {
            title: "These also get grouped:",
            items: [
              "Geberit Sigma80 Sensor Plate Black Glass",
              "Geberit Sigma80 Sensor Plate Reflective Glass"
            ],
            reason: "Same base product, different materials"
          }
        ]
      },
      v4: {
        title: "Grouping Algorithm (v4)",
        description: "Products are intelligently grouped based on similarity, ignoring variations in size, color, material, and color combinations.",
        whatGetsIgnored: [
          { label: "Sizes", examples: "600mm, 700mm, 1200x900mm, etc." },
          { label: "Materials", examples: "Chrome, Brass, Bronze, Stainless Steel, etc." },
          { label: "Colors", examples: "Black, White, Matte Black, Brushed Nickel, etc." },
          { label: "Color Combinations", examples: "Grey/Chrome, White/Chrome, Black/Brass, etc." },
          { label: "Glass Types", examples: "Black Glass, Reflective Glass, Frosted Glass, etc." },
          { label: "Wood Types", examples: "Oak, Walnut, Bamboo, Timber, etc." }
        ],
        howItWorks: [
          "Extract and normalize product titles by removing sizes, materials, and color combinations",
          "Group products with identical base descriptions together",
          "Products that differ only in size, color, material, or color combinations end up in the same group"
        ],
        examples: [
          {
            title: "These products get grouped together:",
            items: [
              "Mizu Drift 600mm Grab Rail Polished Stainless Steel",
              "Mizu Drift 700mm Grab Rail Polished Stainless Steel",
              "Mizu Drift 450mm Grab Rail Polished Stainless Steel"
            ],
            reason: "Same base product, different sizes"
          },
          {
            title: "Color combinations are treated as variants:",
            items: [
              "Product Name Grey/Chrome",
              "Product Name White/Chrome",
              "Product Name Black/Brass"
            ],
            reason: "Same base product, different color combinations"
          }
        ]
      },
      v5: {
        title: "Grouping Algorithm (v5 - Enhanced)",
        description: "Products are intelligently grouped based on similarity, ignoring variations in size, color, material, and finish. The algorithm treats materials like Chrome and Black as both colors and materials.",
        whatGetsIgnored: [
          { label: "Sizes", examples: "600mm, 700mm, 1200x900mm, etc." },
          { label: "Materials/Colors", examples: "Chrome, Brass, Bronze, Black, White, Grey, etc." },
          { label: "Finishes", examples: "Matte, Gloss, Polished, Brushed, Satin" },
          { label: "Material Combinations", examples: "Brushed Nickel, Matte Black, Polished Chrome, etc." },
          { label: "Color Combinations", examples: "Grey/Chrome, White/Chrome, Black/Brass, etc." },
          { label: "Glass Types", examples: "Black Glass, Reflective Glass, Frosted Glass, etc." },
          { label: "Wood Types", examples: "Oak, Walnut, Bamboo, Timber, etc." }
        ],
        howItWorks: [
          "Extract and normalize product titles by removing sizes, finishes, materials, colors, and combinations",
          "Treat materials like Chrome, Black, White as both colors AND materials",
          "Group products with identical base descriptions together",
          "Products that differ only in size, finish, color, material, or any combination end up in the same group"
        ],
        examples: [
          {
            title: "These products get grouped together:",
            items: [
              "Mizu Drift 600mm Grab Rail Polished Stainless Steel",
              "Mizu Drift 700mm Grab Rail Polished Stainless Steel",
              "Mizu Drift 450mm Grab Rail Polished Stainless Steel"
            ],
            reason: "Same base product, different sizes"
          },
          {
            title: "Materials as colors (v5 enhancement):",
            items: [
              "Mizu Drift Toilet Brush & Holder Chrome",
              "Mizu Drift Toilet Brush & Holder Matte Black"
            ],
            reason: "Chrome and Matte Black treated as color/material variants"
          },
          {
            title: "Color combinations are treated as variants:",
            items: [
              "Product Name Grey/Chrome",
              "Product Name White/Chrome",
              "Product Name Black/Brass"
            ],
            reason: "Same base product, different color combinations"
          }
        ]
      },
      v6: {
        title: "Grouping Algorithm (v6 - Temperature Variants)",
        description: "Products are intelligently grouped based on similarity, ignoring variations in size, color, material, finish, and temperature. The algorithm treats temperature variations as product variants.",
        whatGetsIgnored: [
          { label: "Sizes", examples: "600mm, 700mm, 1200x900mm, etc." },
          { label: "Materials/Colors", examples: "Chrome, Brass, Bronze, Black, White, Grey, etc." },
          { label: "Finishes", examples: "Matte, Gloss, Polished, Brushed, Satin" },
          { label: "Material Combinations", examples: "Brushed Nickel, Matte Black, Polished Chrome, etc." },
          { label: "Color Combinations", examples: "Grey/Chrome, White/Chrome, Black/Brass, etc." },
          { label: "Temperature Variations", examples: "Cold, Warm, Hot, Cool, Cold Water, Warm Water, etc." },
          { label: "Glass Types", examples: "Black Glass, Reflective Glass, Frosted Glass, etc." },
          { label: "Wood Types", examples: "Oak, Walnut, Bamboo, Timber, etc." }
        ],
        howItWorks: [
          "Extract and normalize product titles by removing sizes, finishes, materials, colors, temperature variations, and combinations",
          "Treat materials like Chrome, Black, White as both colors AND materials",
          "Treat temperature indicators (Cold, Warm, Hot) as variants",
          "Group products with identical base descriptions together",
          "Products that differ only in size, finish, color, material, temperature, or any combination end up in the same group"
        ],
        examples: [
          {
            title: "These products get grouped together:",
            items: [
              "Mizu Drift 600mm Grab Rail Polished Stainless Steel",
              "Mizu Drift 700mm Grab Rail Polished Stainless Steel",
              "Mizu Drift 450mm Grab Rail Polished Stainless Steel"
            ],
            reason: "Same base product, different sizes"
          },
          {
            title: "Temperature variations (v6 enhancement):",
            items: [
              "Wolfen Timed Flow Basin Tap (Cold) 7 Seconds (6 Star)",
              "Wolfen Timed Flow Basin Tap (Warm) 7 Seconds (6 Star)"
            ],
            reason: "Cold and Warm treated as temperature variants"
          },
          {
            title: "Materials as colors:",
            items: [
              "Mizu Drift Toilet Brush & Holder Chrome",
              "Mizu Drift Toilet Brush & Holder Matte Black"
            ],
            reason: "Chrome and Matte Black treated as color/material variants"
          }
        ]
      }
    }

    return algorithmVersions[version] || algorithmVersions.v6
  }

  // Copy product codes from a group
  const copyProductCodes = (group) => {
    const productCodes = group.map(product => product.productCode)
    setCopiedProducts(prev => [...prev, ...productCodes])
  }

  // Copy to clipboard
  const copyToClipboard = () => {
    const arrayString = `[${copiedProducts.map(code => `"${code}"`).join(', ')}]`
    navigator.clipboard.writeText(arrayString).then(() => {
      // Optional: You could add a toast notification here
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
        <h1>Reece Product Visualizer <span className="subtitle">Exploring {brands.length} brands</span></h1>
      </header>

      <div className={`content ${selectedBrand ? 'with-products' : ''}`}>
        <div className="brands-list">
          <div className="brands-sticky-header">
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
            <div className="brands-search-container">
              <input
                type="text"
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="brands-search-input"
              />
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
                  onClick={() => navigate(`/brand/${encodeURIComponent(brand)}`)}
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
                    navigate('/')
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
                .sort((a, b) => {
                  // Sort single-product groups separately at the end
                  if (a.length === 1 && b.length === 1) return 0
                  if (a.length === 1) return 1
                  if (b.length === 1) return -1
                  // For multi-product groups, sort by size (largest first)
                  return b.length - a.length
                })
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
                      <div className="group-label-container">
                        <div className="group-label" onClick={toggleGroup}>
                          <span className="collapse-icon">{isCollapsed ? '▶' : '▼'}</span>
                          <span>Group {groupIndex + 1} ({filteredGroup.length} {filteredGroup.length === 1 ? 'product' : 'products'})</span>
                        </div>
                        <button
                          className="copy-group-btn"
                          onClick={() => copyProductCodes(filteredGroup)}
                          title="Select product numbers"
                        >
                          Select product numbers
                        </button>
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
            <h2>{getAlgorithmInfo(jsonVersion).title}</h2>
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
            {getAlgorithmInfo(jsonVersion).description}
          </p>

          {getAlgorithmInfo(jsonVersion).whatGetsIgnored.length > 0 && (
            <div className="info-section">
              <h3>What Gets Ignored</h3>
              <ul>
                {getAlgorithmInfo(jsonVersion).whatGetsIgnored.map((item, index) => (
                  <li key={index}><strong>{item.label}:</strong> {item.examples}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="info-section">
            <h3>How It Works</h3>
            <ol>
              {getAlgorithmInfo(jsonVersion).howItWorks.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>

          {getAlgorithmInfo(jsonVersion).examples.length > 0 && (
            <div className="info-section">
              <h3>Examples</h3>
              {getAlgorithmInfo(jsonVersion).examples.map((example, index) => (
                <div key={index} className="info-example">
                  <p className="example-title">{example.title}</p>
                  <ul>
                    {example.items.map((item, i) => (
                      <li key={i}>"{item}"</li>
                    ))}
                  </ul>
                  <p className="example-reason">→ {example.reason}</p>
                </div>
              ))}
            </div>
          )}

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

      <div className="copied-products-panel">
        <div className="copied-panel-header">
          <h3>Copied Product Numbers ({copiedProducts.length})</h3>
          <div className="copied-panel-actions">
            <button
              className="copy-clipboard-btn"
              onClick={copyToClipboard}
              disabled={copiedProducts.length === 0}
            >
              Copy to Clipboard
            </button>
            <button
              className="clear-copied-btn"
              onClick={() => setCopiedProducts([])}
            >
              Clear All
            </button>
          </div>
        </div>
        <textarea
          className="copied-products-textarea"
          value={copiedProducts.length > 0 ? `[${copiedProducts.map(code => `"${code}"`).join(', ')}]` : ''}
          readOnly
          rows={10}
        />
      </div>
    </div>
  )
}

export default App
