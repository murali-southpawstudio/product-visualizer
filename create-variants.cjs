const fs = require('fs');
const crypto = require('crypto');

// Read the v6 JSON
const dataV6 = JSON.parse(fs.readFileSync('./public/products-grouped-by-variant_v6.json', 'utf8'));

// Function to find common text between product titles
function findCommonTitle(titles) {
  if (titles.length === 0) return '';
  if (titles.length === 1) return titles[0];

  // Split titles into words
  const titleWords = titles.map(t => t.trim().toLowerCase().split(/\s+/));

  // Find common consecutive words
  const firstTitle = titleWords[0];
  let commonWords = [];

  for (let i = 0; i < firstTitle.length; i++) {
    for (let len = firstTitle.length - i; len > 0; len--) {
      const candidate = firstTitle.slice(i, i + len);

      // Check if this sequence appears in all titles
      const appearsInAll = titleWords.every(words => {
        return words.some((word, idx) => {
          if (idx + candidate.length > words.length) return false;
          return candidate.every((cw, ci) => words[idx + ci] === cw);
        });
      });

      if (appearsInAll && candidate.length > commonWords.length) {
        commonWords = candidate;
      }
    }
  }

  if (commonWords.length === 0) {
    // Fallback: find common prefix words
    let prefixLength = 0;
    for (let i = 0; i < firstTitle.length; i++) {
      if (titleWords.every(words => words[i] === firstTitle[i])) {
        prefixLength = i + 1;
      } else {
        break;
      }
    }
    commonWords = firstTitle.slice(0, Math.max(prefixLength, 1));
  }

  // Capitalize first letter of each word
  return commonWords
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Function to generate a unique ID based on brand and common title
function generateFamilyId(brand, commonTitle) {
  const input = `${brand}-${commonTitle}`.toLowerCase();
  const hash = crypto.createHash('md5').update(input).digest('hex');
  return `fam_${hash.substring(0, 12)}`;
}

// Function to extract variant attributes from a product
function extractVariantAttributes(productTitle, commonTitle) {
  const attributes = {};
  const titleLower = productTitle.toLowerCase();

  // Extract size patterns
  const sizeMatches = productTitle.match(/\d+\s*x\s*\d+(?:\s*x\s*\d+)?\s*(mm|cm|m)?/gi);
  if (sizeMatches) {
    attributes.sizes = sizeMatches;
  }

  const dimMatches = productTitle.match(/\d+\s*(mm|cm|m)\d?/gi);
  if (dimMatches && !sizeMatches) {
    attributes.dimensions = dimMatches;
  }

  const m2Matches = productTitle.match(/\(?\d+\s*m\d?\)?/gi);
  if (m2Matches) {
    attributes.coverage = m2Matches;
  }

  // Extract directional info
  if (/\bleft\s+hand\b/i.test(productTitle)) {
    attributes.orientation = 'Left Hand';
  } else if (/\bright\s+hand\b/i.test(productTitle)) {
    attributes.orientation = 'Right Hand';
  } else if (/\bleft\b/i.test(productTitle)) {
    attributes.orientation = 'Left';
  } else if (/\bright\b/i.test(productTitle)) {
    attributes.orientation = 'Right';
  }

  // Extract temperature
  if (/\bcold\b/i.test(productTitle)) {
    attributes.temperature = 'Cold';
  } else if (/\bwarm\b/i.test(productTitle)) {
    attributes.temperature = 'Warm';
  } else if (/\bhot\b/i.test(productTitle)) {
    attributes.temperature = 'Hot';
  }

  // Extract material/color/finish by finding words not in common title
  // Exclude directional, temperature terms, dimension patterns, star ratings, and common product types
  const commonWords = commonTitle.toLowerCase().split(/\s+/);
  const productWords = productTitle.split(/\s+/);
  const excludeWords = ['left', 'right', 'hand', 'cold', 'warm', 'hot', 'cool',
                        'grab', 'rail', 'basin', 'tap', 'mixer', 'shower', 'bath',
                        'toilet', 'vanity', 'cabinet', 'mirror', 'set', 'system',
                        'corner', 'wall', 'floor', 'ceiling', 'counter', 'above',
                        'below', 'under', 'over', 'mounted', 'inset', 'flush',
                        'bowl', 'taphole', 'tapholes', 'hole', 'holes', 'no',
                        'with', 'without', 'overflow', 'shelf', 'shelves', 'acrylic',
                        'base'];

  const uniqueWords = productWords.filter(word => {
    const wordLower = word.toLowerCase();
    return !commonWords.includes(wordLower) &&
           !/^\d+$/.test(word) &&
           !/^(mm|cm|m|x|\(|\))$/i.test(word) &&
           !/^\d+(mm|cm|m)\d?$/i.test(word) &&  // Exclude dimension patterns like 400mm, 10m2
           !/^\d+\s*x\s*\d+/i.test(word) &&      // Exclude size patterns like 1200x900
           !excludeWords.includes(wordLower);
  });

  let descriptors = uniqueWords.join(' ');

  // Remove star ratings like (5 Star), (6 Star), (4 Star) from descriptors
  descriptors = descriptors.replace(/\(\d+\s+Star\)/gi, '').trim();

  if (descriptors.length > 0) {
    attributes.uniqueDescriptors = descriptors;
    // Also set color attribute if there are unique descriptors (after removing ratings)
    attributes.color = descriptors;
  }

  return attributes;
}

// Function to extract variant options from all variants in a family
function extractVariantOptions(variants) {
  const options = {};

  // Collect all unique values for each attribute type
  const sizes = new Set();
  const dimensions = new Set();
  const orientations = new Set();
  const temperatures = new Set();
  const colors = new Set();

  variants.forEach(variant => {
    const attrs = variant.attributes;

    // Collect sizes
    if (attrs.sizes) {
      attrs.sizes.forEach(s => sizes.add(s));
    }

    // Collect dimensions
    if (attrs.dimensions) {
      attrs.dimensions.forEach(d => dimensions.add(d));
    }

    // Collect orientations
    if (attrs.orientation) {
      orientations.add(attrs.orientation);
    }

    // Collect temperatures
    if (attrs.temperature) {
      temperatures.add(attrs.temperature);
    }

    // Collect colors/materials from unique descriptors
    if (attrs.uniqueDescriptors) {
      colors.add(attrs.uniqueDescriptors);
    }
  });

  // Only include option types that have multiple DIFFERENT values
  if (sizes.size > 1) {
    options.size = Array.from(sizes).sort();
  }

  if (dimensions.size > 1) {
    options.dimension = Array.from(dimensions).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      return numA - numB;
    });
  }

  if (orientations.size > 1) {
    options.orientation = Array.from(orientations).sort();
  }

  if (temperatures.size > 1) {
    options.temperature = Array.from(temperatures).sort();
  }

  if (colors.size > 1) {
    options.color = Array.from(colors).sort();
  }

  return options;
}

// Process all brands and create product families
const productFamilies = [];
let totalFamilies = 0;
let totalProducts = 0;
let totalVariants = 0;

for (const [brand, groups] of Object.entries(dataV6)) {
  if (brand === '_algorithmInfo') continue;

  for (const group of groups) {
    // Skip groups with only one product
    if (group.length <= 1) continue;

    totalProducts += group.length;

    const titles = group.map(p => p.productTitle);
    const commonTitle = findCommonTitle(titles);
    const familyId = generateFamilyId(brand, commonTitle);

    const variants = group.map(product => ({
      productCode: product.productCode,
      productTitle: product.productTitle.replace(/\s+/g, ' ').trim(),  // Clean up extra spaces
      attributes: extractVariantAttributes(product.productTitle, commonTitle)
    }));

    // Extract variant options from all variants
    const variantOptions = extractVariantOptions(variants);

    const family = {
      productFamilyId: familyId,
      productFamilyTitle: commonTitle,
      brand: brand,
      variantCount: group.length,
      variantOptions: variantOptions,
      variants: variants
    };

    productFamilies.push(family);
    totalFamilies++;
    totalVariants += group.length;
  }
}

// Merge families with the same productFamilyTitle
const mergedFamilies = {};
for (const family of productFamilies) {
  const key = `${family.brand}:${family.productFamilyTitle}`;

  if (mergedFamilies[key]) {
    // Merge variants
    mergedFamilies[key].variants.push(...family.variants);
    mergedFamilies[key].variantCount += family.variantCount;

    // Re-extract variant options from all merged variants
    mergedFamilies[key].variantOptions = extractVariantOptions(mergedFamilies[key].variants);
  } else {
    mergedFamilies[key] = family;
  }
}

// Convert back to array
const finalFamilies = Object.values(mergedFamilies);

// Create output structure
const output = {
  _metadata: {
    version: 1,
    description: "Product families with variants. Each family represents a base product with multiple variations in size, color, material, finish, or orientation. Only includes families with 2 or more products.",
    sourceFile: "products-grouped-by-variant_v6.json",
    generatedAt: new Date().toISOString(),
    statistics: {
      totalFamilies: finalFamilies.length,
      totalProductsInFamilies: totalProducts,
      averageVariantsPerFamily: (totalProducts / finalFamilies.length).toFixed(2)
    },
    variantTypes: [
      "Size variations (e.g., 1200x900mm, 630mm)",
      "Material/finish variations (e.g., Matte Black, Polished Chrome)",
      "Color variations (e.g., White, Grey, Black)",
      "Directional variations (e.g., Left Hand, Right Hand)",
      "Temperature variations (e.g., Cold, Warm, Hot)"
    ]
  },
  families: finalFamilies
};

// Write the output file
fs.writeFileSync(
  './public/products_with_variants.json',
  JSON.stringify(output, null, 2),
  'utf8'
);

console.log('Products with variants file created!');
console.log('');
console.log('Statistics:');
console.log(`Total product families (with 2+ variants): ${totalFamilies}`);
console.log(`Total products in families: ${totalProducts}`);
console.log(`Average variants per family: ${(totalProducts / totalFamilies).toFixed(2)}`);
console.log('');
console.log('Note: Only families with 2 or more products are included.');
console.log('');

// Show some examples
console.log('=== Examples of product families ===');
const examplesWithVariants = productFamilies.slice(0, 5);
examplesWithVariants.forEach((family, idx) => {
  console.log(`\nExample ${idx + 1}:`);
  console.log(`Product Family ID: ${family.productFamilyId}`);
  console.log(`Product Family Title: ${family.productFamilyTitle}`);
  console.log(`Brand: ${family.brand}`);
  console.log(`Variants (${family.variantCount}):`);
  family.variants.forEach(v => {
    console.log(`  - ${v.productCode}: ${v.productTitle}`);
    if (Object.keys(v.attributes).length > 0) {
      console.log(`    Attributes:`, JSON.stringify(v.attributes, null, 2).split('\n').join('\n    '));
    }
  });
});
