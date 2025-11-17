const fs = require('fs');

// Read the v5 JSON (apply temperature logic on top of v5)
const data = JSON.parse(fs.readFileSync('./public/products-grouped-by-variant_v5.json', 'utf8'));

// Extended list of materials, colors, finishes, and temperatures to remove
const materials = [
  // Complex finishes and materials (multi-word combinations - must come first)
  'brushed platinum gold',
  'brushed pure gold',
  'brushed smoked gunmetal',
  'matte opium black',
  'brushed oyster nickel',
  'polished stainless steel',
  'brushed stainless steel',

  // Standard finishes and materials
  'stainless steel',
  'brushed nickel',
  'brushed brass',
  'brushed bronze',
  'brushed gunmetal',
  'brushed chrome',
  'brushed gold',
  'polished brass',
  'polished chrome',
  'satin chrome',
  'matte black',
  'matte white',
  'gloss white',
  'gloss black',

  // Glass types
  'reflective glass',
  'black glass',
  'white glass',
  'clear glass',
  'frosted glass',
  'smoked glass',
  'mirror glass',
  'tinted glass',
  'glass',

  // Wood types
  'oak',
  'walnut',
  'bamboo',
  'timber',
  'wood',

  // Base materials/colors (can be both)
  'gunmetal',
  'chrome',
  'black',
  'white',
  'brass',
  'bronze',
  'nickel',
  'gold',
  'silver',
  'copper',
  'titanium',
  'grey',
  'gray',

  // Additional finishes
  'matt black',
  'matt white',
  'matte',
  'gloss',
  'satin',
  'polished',
  'brushed',
  'bright',
  'shiny',
  'reflective',
  'textured',
  'smooth',

  // Temperature variations
  'cold',
  'warm',
  'hot',
  'cool',
  'cold water',
  'warm water',
  'hot water',

  // Color names (including descriptive colors)
  'tangerine orange',
  'opium black',
  'platinum gold',
  'pure gold',
  'smoked gunmetal',
  'oyster nickel',
  'tangerine',
  'platinum',
  'orange',
  'green',
  'fume',
  'blue',
  'red',
  'yellow',
  'pink',
  'purple',
  'beige',
  'navy',
  'teal',
  'mint',
  'sage',
  'olive',
  'cream',
  'ivory',
  'pearl',
  'opium',
  'oyster',
  'smoked'
];

// Sort by length (longest first) to match longer phrases first
materials.sort((a, b) => b.length - a.length);

// Normalize title by removing size, material, color combinations, and temperature variations
function normalizeTitle(title) {
  let normalized = title.toLowerCase().trim();

  // Remove size patterns (including m2, m3 for meter squared/cubed)
  normalized = normalized
    .replace(/\d+\s*x\s*\d+(?:\s*x\s*\d+)?\s*(mm|cm|m)?/gi, '')
    .replace(/\d+\s*(mm|cm|m)\d?/gi, '')  // Matches: 10mm, 10m, 10m2, 10m3
    .replace(/\(\d+m\d?\)/gi, '');        // Matches: (10m2), (10m3), (10m)

  // Normalize whitespace BEFORE removing materials (critical fix for multi-word materials with inconsistent spacing)
  // This ensures patterns like "Polished Stainless    Steel" (with extra spaces) are normalized to
  // "polished stainless steel" (single spaces) so they can be properly matched and removed
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Normalize common word variations to ensure consistency
  normalized = normalized.replace(/\bunderfloor\b/gi, 'under floor');
  normalized = normalized.replace(/\bunder\s+floor\b/gi, 'underfloor');  // Normalize to single word

  // Remove color combination patterns like "Grey/Chrome", "White/Chrome", "Black/Brass", etc.
  // This will match patterns like: word/word, word / word
  normalized = normalized.replace(/\b\w+\s*\/\s*\w+\b/gi, '');

  // Remove materials, finishes, and temperature variations (sorted by length, longest first)
  for (const material of materials) {
    const regex = new RegExp(`\\b${material.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }

  // Normalize whitespace again
  return normalized.replace(/\s+/g, ' ').trim();
}

// Re-group products within each brand
const regroupedData = {};

for (const [brand, groups] of Object.entries(data)) {
  // Flatten all products from all groups
  const allProducts = groups.flat();

  // Group products by their base type
  const baseTypeMap = new Map();

  for (const product of allProducts) {
    const baseType = normalizeTitle(product.productTitle);

    if (!baseTypeMap.has(baseType)) {
      baseTypeMap.set(baseType, []);
    }
    baseTypeMap.get(baseType).push(product);
  }

  // Convert each base type group to a single group
  const newGroups = [];

  for (const [baseType, products] of baseTypeMap.entries()) {
    newGroups.push(products);
  }

  regroupedData[brand] = newGroups;
}

// Add algorithm metadata with bug fix documentation
const output = {
  _algorithmInfo: {
    version: 6,
    description: "Groups products by base type, removing size, materials, finishes, color combinations, and temperature variations. Includes whitespace normalization fix for proper multi-word material matching.",
    groupingCriteria: [
      "Same base product name (after normalization)",
      "Different sizes grouped together",
      "Different materials/finishes grouped together (e.g., Matte Black, Polished Stainless Steel)",
      "Different color combinations grouped together (e.g., Grey/Chrome, White/Chrome)",
      "Different temperature variations grouped together (e.g., Cold, Warm, Hot)"
    ],
    normalizedAttributes: [
      "Sizes (e.g., 1200x900mm, 630mm, 10m2, 5m3)",
      "Materials (e.g., stainless steel, brass, bronze, chrome)",
      "Finishes (e.g., brushed, polished, matte, gloss, satin, bright, shiny)",
      "Complex material/finish combinations (e.g., brushed platinum gold, matte opium black, brushed oyster nickel)",
      "Glass types (e.g., black glass, frosted glass, mirror glass)",
      "Wood types (e.g., oak, walnut, bamboo)",
      "Color names (e.g., fume, green, tangerine orange, platinum, oyster, smoked)",
      "Color combinations (e.g., Grey/Chrome, Black/Brass)",
      "Temperature variations (e.g., cold, warm, hot)",
      "Word variations (e.g., underfloor vs under floor)"
    ],
    bugFixes: [
      {
        issue: "Whitespace normalization bug",
        description: "Multi-word materials with inconsistent spacing (e.g., 'Polished Stainless    Steel' with extra spaces) were not being removed properly",
        solution: "Normalize whitespace to single spaces BEFORE attempting to remove materials, ensuring consistent matching",
        affectedProducts: [
          {
            productCodes: ["9509570", "9509568"],
            productTitles: [
              "Mizu Bloc Heated Towel Rail 630 (Each) (Less Transformer) Matte Black",
              "Mizu Bloc Heated Towel Rail 630 (Each) (Less Transformer) Polished Stainless Steel"
            ],
            before: "Not grouped (whitespace prevented material matching)",
            after: "Properly grouped (same base product, different finishes)"
          }
        ]
      },
      {
        issue: "Meter squared (m2) notation not recognized",
        description: "Size patterns like '10M2', '5m2' (meter squared) and '10M3' (meter cubed) were not being removed, preventing products with different area/volume measurements from grouping together",
        solution: "Extended size pattern regex to match m2/m3 notations and parenthetical formats like (10m2)",
        affectedProducts: [
          {
            productCodes: ["1903029", "1903034", "1903314", "1903313", "1903031", "1903030", "1903028", "1903027", "1903026", "1903032"],
            productTitles: [
              "Stiebel Eltron Under Floor Heating Pack (1M2)",
              "Stiebel Eltron Under Floor Heating Pack (2M2)",
              "...up to (10M2)"
            ],
            before: "Not grouped (m2 notation not recognized as size)",
            after: "Properly grouped (same base product, different coverage areas)"
          }
        ]
      },
      {
        issue: "Inconsistent word spacing (underfloor vs under floor)",
        description: "Product names with inconsistent spacing like 'Underfloor' vs 'Under Floor' were treated as different products",
        solution: "Normalize common word variations to a consistent format before comparison",
        affectedProducts: [
          {
            productCodes: ["1903029", "1903034"],
            productTitles: [
              "Stiebel Eltron Underfloor Heating Pack (5M2)",
              "Stiebel Eltron Under Floor Heating Pack (9m2)"
            ],
            before: "Not grouped ('underfloor' vs 'under floor' treated as different)",
            after: "Properly grouped (word variations normalized)"
          }
        ]
      },
      {
        issue: "Color names not recognized",
        description: "Many color names (Fume, Green, Tangerine Orange, etc.) were not in the materials list, preventing color variants from grouping together",
        solution: "Added comprehensive list of color names to materials array, sorted by length to match multi-word colors first",
        affectedProducts: [
          {
            productCodes: ["9504732", "9510157", "9504574"],
            productTitles: [
              "LAUFEN Kartell Rack 750mm x 260mm x 530mm Fume",
              "LAUFEN Kartell Rack 750mm x 260mm x 530mm Green",
              "LAUFEN Kartell Rack 750mm x 260mm x 530mm Tangerine Orange"
            ],
            before: "Not grouped (color names not recognized)",
            after: "Properly grouped (same base product, different colors)"
          }
        ]
      },
      {
        issue: "Missing finish terms (bright, shiny, etc.)",
        description: "Finish terms like 'bright', 'shiny', 'reflective' were not in the materials list, preventing products with these finishes from grouping",
        solution: "Added missing finish terms to materials array",
        affectedProducts: [
          {
            productCodes: ["1850680", "1850681"],
            productTitles: [
              "Raffaello Drop Down Rail 610mm Stainless Steel Black",
              "Raffaello Drop Down Rail 610mm Stainless Steel Bright"
            ],
            before: "Not grouped ('bright' finish not recognized)",
            after: "Properly grouped (same base product, different finishes)"
          }
        ]
      }
    ],
    sourceFile: "products-grouped-by-variant_v5.json",
    lastUpdated: new Date().toISOString()
  },
  ...regroupedData
};

// Write the new grouped data
fs.writeFileSync(
  './public/products-grouped-by-variant_v6.json',
  JSON.stringify(output, null, 2),
  'utf8'
);

console.log('V6 Regrouping complete!');
console.log(`Processed ${Object.keys(regroupedData).length} brands`);

// Show statistics
let totalGroupsV1 = 0;
let totalGroupsV5 = 0;
let totalGroupsV6 = 0;
let totalProducts = 0;

// Load v5 for comparison
const dataV5 = JSON.parse(fs.readFileSync('./public/products-grouped-by-variant_v5.json', 'utf8'));

for (const brand in data) {
  if (brand === '_algorithmInfo') continue;
  totalGroupsV1 += data[brand].length;
  totalProducts += data[brand].reduce((sum, group) => sum + group.length, 0);
}

for (const brand in dataV5) {
  if (brand === '_algorithmInfo') continue;
  totalGroupsV5 += dataV5[brand].length;
}

for (const brand in regroupedData) {
  if (brand === '_algorithmInfo') continue;
  totalGroupsV6 += regroupedData[brand].length;
}

console.log('');
console.log('Statistics:');
console.log(`Total products: ${totalProducts}`);
console.log(`Groups in v1: ${totalGroupsV1}`);
console.log(`Groups in v5: ${totalGroupsV5}`);
console.log(`Groups in v6: ${totalGroupsV6}`);
console.log(`Reduction v1 to v6: ${totalGroupsV1 - totalGroupsV6} groups merged`);
console.log(`Reduction v5 to v6: ${totalGroupsV5 - totalGroupsV6} groups merged`);
console.log(`Percentage reduction (v1 to v6): ${((totalGroupsV1 - totalGroupsV6) / totalGroupsV1 * 100).toFixed(2)}%`);

// Try to find the specific products mentioned
console.log('');
console.log('=== Looking for products 9508241 and 9508242 (temperature variants) ===');
for (const [brand, groups] of Object.entries(regroupedData)) {
  for (const group of groups) {
    const codes = group.map(p => p.productCode);
    if (codes.includes('9508241') || codes.includes('9508242')) {
      console.log(`Brand: ${brand}`);
      console.log(`Group has ${group.length} products:`);
      group.forEach(p => {
        if (p.productCode === '9508241' || p.productCode === '9508242') {
          console.log(`  ✓ ${p.productCode}: ${p.productTitle}`);
        }
      });
      if (codes.includes('9508241') && codes.includes('9508242')) {
        console.log('  → SUCCESS: Both products are now grouped together!');
      }
    }
  }
}

console.log('');
console.log('=== Looking for products 9509570 and 9509568 (material variants with whitespace bug) ===');
for (const [brand, groups] of Object.entries(regroupedData)) {
  for (const group of groups) {
    const codes = group.map(p => p.productCode);
    if (codes.includes('9509570') || codes.includes('9509568')) {
      console.log(`Brand: ${brand}`);
      console.log(`Group has ${group.length} products:`);
      group.forEach(p => {
        if (p.productCode === '9509570' || p.productCode === '9509568') {
          console.log(`  ✓ ${p.productCode}: ${p.productTitle}`);
        }
      });
      if (codes.includes('9509570') && codes.includes('9509568')) {
        console.log('  → SUCCESS: Both products are now grouped together (whitespace fix working)!');
      }
    }
  }
}

console.log('');
console.log('=== Looking for Stiebel Eltron heating packs (m2 notation and word variation fixes) ===');
const stiebelCodes = ['1903029', '1903034', '1903314', '1903313', '1903031', '1903030', '1903028', '1903027', '1903026', '1903032'];
for (const [brand, groups] of Object.entries(regroupedData)) {
  for (const group of groups) {
    const codes = group.map(p => p.productCode);
    const matchingCodes = stiebelCodes.filter(code => codes.includes(code));
    if (matchingCodes.length > 0) {
      console.log(`Brand: ${brand}`);
      console.log(`Group has ${group.length} products, ${matchingCodes.length} are from our test set:`);
      group.forEach(p => {
        if (stiebelCodes.includes(p.productCode)) {
          console.log(`  ✓ ${p.productCode}: ${p.productTitle}`);
        }
      });
      if (matchingCodes.length === 10) {
        console.log('  → SUCCESS: All 10 Stiebel Eltron products are grouped together (m2 fix working)!');
      } else {
        console.log(`  → PARTIAL: ${matchingCodes.length}/10 products grouped here`);
      }
    }
  }
}

console.log('');
console.log('=== Looking for LAUFEN Kartell products (color names fix) ===');
const laufenCodes = ['9504732', '9510157', '9504574'];
for (const [brand, groups] of Object.entries(regroupedData)) {
  for (const group of groups) {
    const codes = group.map(p => p.productCode);
    const matchingCodes = laufenCodes.filter(code => codes.includes(code));
    if (matchingCodes.length > 0) {
      console.log(`Brand: ${brand}`);
      console.log(`Group has ${group.length} products, ${matchingCodes.length} are from our test set:`);
      group.forEach(p => {
        if (laufenCodes.includes(p.productCode)) {
          console.log(`  ✓ ${p.productCode}: ${p.productTitle}`);
        }
      });
      if (matchingCodes.length === 3) {
        console.log('  → SUCCESS: All 3 LAUFEN Kartell products are grouped together (color names fix working)!');
      } else {
        console.log(`  → PARTIAL: ${matchingCodes.length}/3 products grouped here`);
      }
    }
  }
}

console.log('');
console.log('=== Looking for Raffaello products (finish terms fix) ===');
const raffaelloCodes = ['1850680', '1850681'];
for (const [brand, groups] of Object.entries(regroupedData)) {
  for (const group of groups) {
    const codes = group.map(p => p.productCode);
    const matchingCodes = raffaelloCodes.filter(code => codes.includes(code));
    if (matchingCodes.length > 0) {
      console.log(`Brand: ${brand}`);
      console.log(`Group has ${group.length} products, ${matchingCodes.length} are from our test set:`);
      group.forEach(p => {
        if (raffaelloCodes.includes(p.productCode)) {
          console.log(`  ✓ ${p.productCode}: ${p.productTitle}`);
        }
      });
      if (matchingCodes.length === 2) {
        console.log('  → SUCCESS: Both Raffaello products are grouped together (finish terms fix working)!');
      } else {
        console.log(`  → PARTIAL: ${matchingCodes.length}/2 products grouped here`);
      }
    }
  }
}
