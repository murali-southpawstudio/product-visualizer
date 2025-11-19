const fs = require('fs');

// Read the variants JSON
const data = JSON.parse(fs.readFileSync('./public/products_with_variants2.json', 'utf8'));

// Collect all unique colors
const allColors = new Set();

data.families.forEach(family => {
  if (family.variantOptions && family.variantOptions.color) {
    family.variantOptions.color.forEach(color => {
      allColors.add(color);
    });
  }
});

// Convert to sorted array
const colorArray = Array.from(allColors).sort();

// Create output structure
const output = {
  _metadata: {
    description: "All unique colors from product family variant options",
    totalColors: colorArray.length,
    generatedAt: new Date().toISOString(),
    sourceFile: "products_with_variants2.json"
  },
  colors: colorArray
};

// Write to file
fs.writeFileSync(
  './public/all-colors.json',
  JSON.stringify(output, null, 2),
  'utf8'
);

console.log('All colors file created!');
console.log(`Total unique colors: ${colorArray.length}`);
console.log('\nFirst 20 colors:');
colorArray.slice(0, 20).forEach((color, idx) => {
  console.log(`  ${idx + 1}. ${color}`);
});
