const fs = require('fs');
const http = require('http');

// Read products.json
const products = JSON.parse(fs.readFileSync('./public/products.json', 'utf8'));

console.log(`Total products to process: ${products.length}`);

// API configuration
const API_BASE = 'http://trsausys.reecenet.org/product-api/products';
const CONCURRENT_REQUESTS = 10; // Number of parallel requests
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

// Results array
const productsWithAttributes = [];
let processedCount = 0;
let errorCount = 0;
const errors = [];

// Helper function to make HTTP request
function fetchAttributes(productCode) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/${productCode}/attributes`;

    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const attributes = JSON.parse(data);
            resolve(attributes);
          } catch (e) {
            reject(new Error(`Failed to parse JSON for product ${productCode}: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode} for product ${productCode}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Request failed for product ${productCode}: ${err.message}`));
    });
  });
}

// Helper function to fetch with retry
async function fetchWithRetry(productCode, attempt = 1) {
  try {
    const attributes = await fetchAttributes(productCode);
    return attributes;
  } catch (error) {
    if (attempt < RETRY_ATTEMPTS) {
      console.log(`  Retry ${attempt}/${RETRY_ATTEMPTS} for ${productCode}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      return fetchWithRetry(productCode, attempt + 1);
    } else {
      throw error;
    }
  }
}

// Process a single product
async function processProduct(product) {
  try {
    const attributes = await fetchWithRetry(product.productCode);
    return {
      ...product,
      attributes: attributes
    };
  } catch (error) {
    errorCount++;
    errors.push({
      productCode: product.productCode,
      error: error.message
    });
    console.error(`✗ Error processing ${product.productCode}: ${error.message}`);
    return {
      ...product,
      attributes: null,
      attributeError: error.message
    };
  }
}

// Process products in batches
async function processBatch(batch) {
  const results = await Promise.all(batch.map(product => processProduct(product)));
  return results;
}

// Main processing function
async function processAllProducts() {
  console.log('Starting to fetch attributes...\n');
  const startTime = Date.now();

  for (let i = 0; i < products.length; i += CONCURRENT_REQUESTS) {
    const batch = products.slice(i, i + CONCURRENT_REQUESTS);
    const results = await processBatch(batch);

    productsWithAttributes.push(...results);
    processedCount += batch.length;

    const progress = ((processedCount / products.length) * 100).toFixed(2);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = (processedCount / elapsed).toFixed(1);
    const eta = (((products.length - processedCount) / rate) / 60).toFixed(1);

    console.log(`Progress: ${processedCount}/${products.length} (${progress}%) | ${rate} products/sec | ETA: ${eta} min | Errors: ${errorCount}`);

    // Save progress every 100 products
    if (processedCount % 100 === 0) {
      fs.writeFileSync(
        './public/products_with_attributes_temp.json',
        JSON.stringify(productsWithAttributes, null, 2),
        'utf8'
      );
    }
  }

  // Write final results
  console.log('\nWriting final results...');
  fs.writeFileSync(
    './public/products_with_attributes.json',
    JSON.stringify(productsWithAttributes, null, 2),
    'utf8'
  );

  // Write error report if there are errors
  if (errors.length > 0) {
    fs.writeFileSync(
      './public/attribute_fetch_errors.json',
      JSON.stringify(errors, null, 2),
      'utf8'
    );
  }

  // Delete temp file
  if (fs.existsSync('./public/products_with_attributes_temp.json')) {
    fs.unlinkSync('./public/products_with_attributes_temp.json');
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  console.log('\n=== Summary ===');
  console.log(`Total products: ${products.length}`);
  console.log(`Successfully processed: ${processedCount - errorCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total time: ${totalTime} minutes`);
  console.log('\nResults saved to: public/products_with_attributes.json');
  if (errors.length > 0) {
    console.log('Error report saved to: public/attribute_fetch_errors.json');
  }
}

// Run the script
processAllProducts().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
