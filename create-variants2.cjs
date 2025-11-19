const fs = require('fs');
const crypto = require('crypto');

// Read the v6 JSON
const dataV6 = JSON.parse(fs.readFileSync('./public/products-grouped-by-variant_v6.json', 'utf8'));

// Function to find common text between product titles
function findCommonTitle(titles) {
  if (titles.length === 0) return '';
  if (titles.length === 1) return titles[0];

  // Normalize titles by removing variable parts
  const normalizedTitles = titles.map(title => {
    let normalized = title;

    // Remove sizes with dimensions like "450mm x 800mm x 130mm", "1520 x 715 x 380mm", "3.0 x 1.8m", or with ranges "1500 x 400-500 x 450mm"
    // Match patterns with units on each number or just at the end, and support ranges like "400-500" and decimals like "3.0"
    normalized = normalized.replace(/(?:\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*(?:mm|cm|m)?)\s*x\s*(?:\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*(?:mm|cm|m)?)\s*(?:x\s*(?:\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*(?:mm|cm|m)?))?/gi, '');

    // Remove individual dimensions like "1650mm", "3.0m", "10m2", etc.
    normalized = normalized.replace(/\b\d+(?:\.\d+)?\s*(mm|cm|m)\b/gi, '');
    normalized = normalized.replace(/\(?\d+(?:\.\d+)?\s*m\d?\)?/gi, ''); // m2, m3

    // Clean up any remaining standalone "x" characters
    normalized = normalized.replace(/\s+x\s+/gi, ' ');

    // Remove directional indicators
    normalized = normalized.replace(/\b(left|right)\s+hand\b/gi, '');
    normalized = normalized.replace(/\b(left|right)\b/gi, '');

    // Remove temperature (including parenthetical forms)
    normalized = normalized.replace(/\(?(cold|warm|hot)\)?/gi, '');

    // Remove star ratings
    normalized = normalized.replace(/\(\d+\s+Star\)/gi, '');

    // Clean up empty parentheses
    normalized = normalized.replace(/\(\s*\)/g, '');

    // Remove common color/material/finish terms
    const materialColors = ['chrome', 'brass', 'bronze', 'nickel', 'gold', 'silver', 'copper',
                           'black', 'white', 'grey', 'gray', 'green', 'blue', 'red', 'brown',
                           'matte', 'gloss', 'satin', 'polished', 'brushed', 'bright', 'shiny',
                           'platinum', 'gunmetal', 'oyster', 'smoked', 'smoke', 'pearl',
                           'oak', 'elm', 'walnut', 'bamboo', 'timber', 'wood',
                           'acrylic', 'ceramic', 'porcelain', 'steel', 'stainless'];

    materialColors.forEach(term => {
      normalized = normalized.replace(new RegExp(`\\b${term}\\b`, 'gi'), '');
    });

    // Clean up orphaned conjunctions (& and "and") left after removing colors/materials
    normalized = normalized.replace(/\s+&\s+/g, ' ');  // Remove standalone &
    normalized = normalized.replace(/\s+&\s*$/g, '');  // Remove trailing &
    normalized = normalized.replace(/^\s*&\s+/g, '');  // Remove leading &
    normalized = normalized.replace(/\s+and\s+$/gi, ' ');  // Remove trailing "and"
    normalized = normalized.replace(/^\s*and\s+/gi, ' ');  // Remove leading "and"

    // Clean up orphaned forward slashes left after removing colors/materials
    // This handles cases like "Button / Easy" -> "Button Easy" after colors are removed
    normalized = normalized.replace(/\s*\/\s*/g, ' ');  // Replace any / (with or without surrounding spaces) with single space
    normalized = normalized.replace(/\s+$/g, '');  // Remove any trailing spaces

    // Clean up extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  });

  // Find the longest common substring from normalized titles
  const titleWords = normalizedTitles.map(t => t.toLowerCase().split(/\s+/));
  const firstTitle = titleWords[0];
  let commonWords = [];

  for (let i = 0; i < firstTitle.length; i++) {
    for (let len = firstTitle.length - i; len > 0; len--) {
      const candidate = firstTitle.slice(i, i + len);

      // Check if this sequence appears in all normalized titles
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

// Function to extract variant attributes from product title
function extractVariantAttributes(productTitle, commonTitle) {
  const attributes = {};

  // Extract sizes like "1200 x 900mm", "1200 x 900 x 500mm", "600mm x 500mm x 450mm", "3.0 x 1.8m", or with ranges "1500 x 400-500 x 450mm"
  // Pattern supports:
  // - Units at the end: "1200 x 900 x 500mm"
  // - Units after each dimension: "600mm x 500mm x 450mm"
  // - Ranges: "1500 x 400-500 x 450mm"
  // - Decimals: "3.0 x 1.8m"
  const sizeMatches = productTitle.match(/(?:\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*(?:mm|cm|m)?)\s*x\s*(?:\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*(?:mm|cm|m)?)\s*(?:x\s*(?:\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*(?:mm|cm|m)?))?/gi);
  if (sizeMatches) {
    attributes.sizes = sizeMatches;
  }

  // Only extract individual dimensions if no size pattern was found
  const dimMatches = productTitle.match(/\d+(?:\.\d+)?\s*(mm|cm|m)\d?/gi);
  if (dimMatches && !sizeMatches) {
    attributes.dimensions = dimMatches;
  }

  const m2Matches = productTitle.match(/\(?\d+(?:\.\d+)?\s*m\d?\)?/gi);
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
  const commonWords = commonTitle.toLowerCase().split(/\s+/);
  // Clean up slashes before splitting to ensure proper word matching
  const productWords = productTitle.replace(/\s*\/\s*/g, ' ').split(/\s+/);
  const excludeWords = ['left', 'right', 'hand', 'cold', 'warm', 'hot', 'cool',
                        'grab', 'rail', 'basin', 'tap', 'mixer', 'shower', 'bath',
                        'toilet', 'vanity', 'cabinet', 'mirror', 'set', 'system',
                        'corner', 'wall', 'floor', 'ceiling', 'counter', 'above',
                        'below', 'under', 'over', 'mounted', 'inset', 'flush',
                        'bowl', 'taphole', 'tapholes', 'hole', 'holes', 'no',
                        'with', 'without', 'overflow', 'shelf', 'shelves', 'acrylic',
                        'base', 'button', 'plate', 'dn80', 'and', 'mk2', 'medium',
                        'heating', 'pack', 'underfloor'];

  const uniqueWords = productWords.filter(word => {
    const wordLower = word.toLowerCase();
    // Also exclude parenthetical temperature terms like (Cold), (Warm), (Hot)
    const isParentheticalTemp = /^\((cold|warm|hot)\)$/i.test(word);
    // Exclude dimension ranges like "400-500"
    const isDimensionRange = /^\d+-\d+$/i.test(word);
    // Exclude parenthetical coverage/dimensions like "(10M2)", "(1M2)", etc.
    const isParentheticalDimension = /^\(\d+(?:\.\d+)?\s*m\d?\)$/i.test(word);
    // Exclude decimal numbers like "3.0", "3.6"
    const isDecimalNumber = /^\d+\.\d+$/i.test(word);
    return !commonWords.includes(wordLower) &&
           !/^\d+$/.test(word) &&
           !/^(mm|cm|m|x|\(|\))$/i.test(word) &&
           !/^\d+(?:\.\d+)?(mm|cm|m)\d?$/i.test(word) &&
           !/^\d+(?:\.\d+)?\s*x\s*\d+/i.test(word) &&
           !excludeWords.includes(wordLower) &&
           !isParentheticalTemp &&
           !isDimensionRange &&
           !isParentheticalDimension &&
           !isDecimalNumber;
  });

  let descriptors = uniqueWords.join(' ');
  descriptors = descriptors.replace(/\(\d+\s+Star\)/gi, '').trim();
  // Also remove any remaining parenthetical temperature terms
  descriptors = descriptors.replace(/\(?(cold|warm|hot)\)?/gi, '').trim();
  // Remove any remaining orphaned punctuation (/, &, etc.)
  descriptors = descriptors.replace(/^[\s\/&]+$/g, '').trim();
  // Clean up punctuation-only results
  descriptors = descriptors.replace(/[\/&]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Only set attributes if we have actual meaningful content (not just punctuation)
  if (descriptors.length > 0 && !/^[\s\/&\-,\.]+$/.test(descriptors)) {
    attributes.uniqueDescriptors = descriptors;
    attributes.color = descriptors;
  }

  return attributes;
}

// Function to extract variant options from all variants
function extractVariantOptions(variants) {
  const options = {};

  const sizes = new Set();
  const dimensions = new Set();
  const colors = new Set();
  const orientations = new Set();
  const temperatures = new Set();

  variants.forEach(variant => {
    if (variant.attributes.sizes) {
      variant.attributes.sizes.forEach(s => sizes.add(s));
    }
    if (variant.attributes.dimensions) {
      variant.attributes.dimensions.forEach(d => dimensions.add(d));
    }
    if (variant.attributes.color) {
      colors.add(variant.attributes.color);
    }
    if (variant.attributes.orientation) {
      orientations.add(variant.attributes.orientation);
    }
    if (variant.attributes.temperature) {
      temperatures.add(variant.attributes.temperature);
    }
  });

  if (sizes.size > 1) {
    options.size = Array.from(sizes).sort();
  }
  if (dimensions.size > 1) {
    options.dimension = Array.from(dimensions).sort();
  }
  if (colors.size > 1) {
    options.color = Array.from(colors).sort();
  }
  if (orientations.size > 1) {
    options.orientation = Array.from(orientations).sort();
  }
  if (temperatures.size > 1) {
    options.temperature = Array.from(temperatures).sort();
  }

  return options;
}

// Create product families from v6 data
const productFamilies = [];
let totalFamilies = 0;
let totalVariants = 0;
let totalProducts = 0;

for (const [brand, groups] of Object.entries(dataV6)) {
  if (brand === '_algorithmInfo') continue;

  for (const group of groups) {
    // Only create families with 2+ products
    if (group.length <= 1) continue;

    totalProducts += group.length;

    const titles = group.map(p => p.productTitle);
    const commonTitle = findCommonTitle(titles);
    const familyId = generateFamilyId(brand, commonTitle);

    const variants = group.map(product => ({
      productCode: product.productCode,
      productTitle: product.productTitle.replace(/\s+/g, ' ').trim(),
      attributes: extractVariantAttributes(product.productTitle, commonTitle)
    }));

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
    mergedFamilies[key].variants.push(...family.variants);
    mergedFamilies[key].variantCount += family.variantCount;
    mergedFamilies[key].variantOptions = extractVariantOptions(mergedFamilies[key].variants);
  } else {
    mergedFamilies[key] = family;
  }
}

const finalFamilies = Object.values(mergedFamilies);

// Create output structure
const output = {
  _metadata: {
    version: 2,
    description: "Product families with variants. Enhanced version with improved productFamilyTitle extraction that removes size/color/material variations to find true common text.",
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

fs.writeFileSync(
  './public/products_with_variants2.json',
  JSON.stringify(output, null, 2),
  'utf8'
);

console.log('Products with variants V2 file created!');
console.log('\nStatistics:');
console.log('Total product families (with 2+ variants):', finalFamilies.length);
console.log('Total products in families:', totalProducts);
console.log('Average variants per family:', (totalProducts / finalFamilies.length).toFixed(2));

// Show example
if (finalFamilies.length > 0) {
  const baseFamily = finalFamilies.find(f => f.brand === 'Base' && f.variants.some(v => v.productCode === '1704234'));
  if (baseFamily) {
    console.log('\n=== Example: Base Acrylic Inset Bath ===');
    console.log('Product Family Title:', baseFamily.productFamilyTitle);
    console.log('Variants:', baseFamily.variantCount);
    console.log('Variant Options:', JSON.stringify(baseFamily.variantOptions, null, 2));
  }
}
