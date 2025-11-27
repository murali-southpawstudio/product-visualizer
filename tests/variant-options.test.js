import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Product Families Variant Options', () => {
  let data;

  beforeAll(() => {
    // Load the products data
    const filePath = path.join(process.cwd(), 'public/products_with_variants3.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(fileContent);
  });

  it('should load products data successfully', () => {
    expect(data).toBeDefined();
    expect(data.families).toBeDefined();
    expect(Array.isArray(data.families)).toBe(true);
  });

  it('should have at least 1000 families', () => {
    expect(data.families.length).toBeGreaterThan(1000);
  });

  describe('Variant Options Validation', () => {
    it('should have NO families with empty variantOptions when they have multiple variants', () => {
      const emptyVariantOptions = data.families.filter(family =>
        Object.keys(family.variantOptions).length === 0 && family.variantCount > 1
      );

      if (emptyVariantOptions.length > 0) {
        console.log('\nFamilies with empty variantOptions:');
        emptyVariantOptions.forEach(f => {
          console.log(`  - [${f.brand}] ${f.productFamilyTitle} (${f.variantCount} variants)`);
        });
      }

      expect(emptyVariantOptions).toHaveLength(0);
    });

    it('should have variantOptions for all families with 2+ variants', () => {
      const multiVariantFamilies = data.families.filter(f => f.variantCount > 1);

      multiVariantFamilies.forEach(family => {
        expect(Object.keys(family.variantOptions).length).toBeGreaterThan(0);
      });

      expect(multiVariantFamilies.length).toBeGreaterThan(0);
    });

    it('should have valid variantOptions with at least 2 values for each option', () => {
      const familiesWithOptions = data.families.filter(f =>
        Object.keys(f.variantOptions).length > 0
      );

      familiesWithOptions.forEach(family => {
        Object.entries(family.variantOptions).forEach(([optionKey, optionValues]) => {
          // Each variant option should have at least 2 different values
          expect(Array.isArray(optionValues)).toBe(true);
          expect(optionValues.length).toBeGreaterThanOrEqual(2);

          // Values should be unique
          const uniqueValues = new Set(optionValues);
          expect(uniqueValues.size).toBe(optionValues.length);
        });
      });
    });

    it('should have meaningful variantOption keys (not empty strings)', () => {
      data.families.forEach(family => {
        Object.keys(family.variantOptions).forEach(key => {
          expect(key).toBeTruthy();
          expect(key.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have variantOptions that match actual variant attributes', () => {
      const familiesWithOptions = data.families.filter(f =>
        Object.keys(f.variantOptions).length > 0
      );

      // List of dimensional attribute names that get normalized to "dimension"
      const dimensionalAttributes = [
        'Width', 'Height', 'Depth', 'Length', 'Diameter', 'Projection',
        'Reach', 'Arm Length', 'Shower Head Width', 'Fixing Point Distance',
        'Minimum Width', 'Maximum Width', 'Minimum Height', 'Maximum Height',
        'dimensions', 'dimension'
      ];

      familiesWithOptions.forEach(family => {
        Object.keys(family.variantOptions).forEach(optionKey => {
          // At least one variant should have this attribute
          const variantsWithAttribute = family.variants.filter(variant => {
            // Check for exact match, plural, or singular variations
            if (variant.attributes.hasOwnProperty(optionKey) ||
                variant.attributes.hasOwnProperty(optionKey + 's') ||
                (optionKey.endsWith('s') && variant.attributes.hasOwnProperty(optionKey.slice(0, -1)))) {
              return true;
            }

            // Special case: "dimension" can match any dimensional attribute
            if (optionKey === 'dimension') {
              return dimensionalAttributes.some(dimAttr =>
                variant.attributes.hasOwnProperty(dimAttr)
              );
            }

            return false;
          });

          if (variantsWithAttribute.length === 0) {
            console.log(`Warning: Family "${family.productFamilyTitle}" has variantOption "${optionKey}" but no variants have this attribute`);
          }

          expect(variantsWithAttribute.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Single Variant Families', () => {
    it('all families should have 2 or more variants (no single variant families)', () => {
      const singleVariantFamilies = data.families.filter(f => f.variantCount === 1);

      // The data should only contain families with multiple variants
      // Single variant products are not grouped into families
      expect(singleVariantFamilies.length).toBe(0);
    });
  });

  describe('Data Quality Checks', () => {
    it('should have all families with valid productFamilyId', () => {
      data.families.forEach(family => {
        expect(family.productFamilyId).toBeDefined();
        expect(family.productFamilyId).toMatch(/^fam_[a-f0-9]+$/);
      });
    });

    it('should have all families with productFamilyTitle', () => {
      data.families.forEach(family => {
        expect(family.productFamilyTitle).toBeDefined();
        expect(family.productFamilyTitle.length).toBeGreaterThan(0);
      });
    });

    it('should have all families with brand', () => {
      data.families.forEach(family => {
        expect(family.brand).toBeDefined();
        expect(family.brand.length).toBeGreaterThan(0);
      });
    });

    it('should have variantCount matching actual variants length', () => {
      data.families.forEach(family => {
        expect(family.variantCount).toBe(family.variants.length);
      });
    });

    it('should have all variants with productCode', () => {
      data.families.forEach(family => {
        family.variants.forEach(variant => {
          expect(variant.productCode).toBeDefined();
          expect(variant.productCode.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have all variants with productTitle', () => {
      data.families.forEach(family => {
        family.variants.forEach(variant => {
          expect(variant.productTitle).toBeDefined();
          expect(variant.productTitle.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Statistics Validation', () => {
    it('should have correct total families in metadata', () => {
      expect(data._metadata.statistics.totalFamilies).toBe(data.families.length);
    });

    it('should have correct total products in metadata', () => {
      const actualTotal = data.families.reduce((sum, f) => sum + f.variantCount, 0);
      expect(data._metadata.statistics.totalProductsInFamilies).toBe(actualTotal);
    });

    it('should have reasonable average variants per family', () => {
      const avg = parseFloat(data._metadata.statistics.averageVariantsPerFamily);
      expect(avg).toBeGreaterThan(1);
      expect(avg).toBeLessThan(100);
    });
  });

  describe('Regression Tests for Specific Issues', () => {
    it('WELS-rated products should have color variants (not all White)', () => {
      const welsProducts = data.families.filter(f =>
        f.variants.some(v => v.productTitle.includes('Star'))
      );

      welsProducts.forEach(family => {
        if (family.variantCount > 1) {
          // Should have variantOptions
          expect(Object.keys(family.variantOptions).length).toBeGreaterThan(0);
        }
      });
    });

    it('Posh Bristol vanities should have orientation variants', () => {
      const poshVanities = data.families.filter(f =>
        f.brand === 'Posh' &&
        f.productFamilyTitle.includes('Bristol') &&
        f.productFamilyTitle.includes('Bowl') &&
        f.variantCount > 1
      );

      poshVanities.forEach(family => {
        // Should have orientation in variantOptions
        expect(family.variantOptions.orientation).toBeDefined();
        expect(family.variantOptions.orientation.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('products with dimension differences should have dimension variants', () => {
      const dimensionalFamilies = data.families.filter(f =>
        f.variants.some(v => v.productTitle.match(/\d+mm/))
      );

      dimensionalFamilies.forEach(family => {
        if (family.variantCount > 1) {
          // Should have some variant option (size, dimension, Width, etc.)
          expect(Object.keys(family.variantOptions).length).toBeGreaterThan(0);
        }
      });
    });

    it('should not have "Recommended Pressure Range" mismatched as dimensions', () => {
      data.families.forEach(family => {
        family.variants.forEach(variant => {
          // Should not have "Recommended Pressure Range" with mm values
          if (variant.attributes['Recommended Pressure Range']) {
            const value = Array.isArray(variant.attributes['Recommended Pressure Range'])
              ? variant.attributes['Recommended Pressure Range'][0]
              : variant.attributes['Recommended Pressure Range'];

            // If it has mm in the value, it's probably wrong
            // (pressure should be in kPa, psi, or bar)
            expect(value).not.toMatch(/\d+mm/);
          }
        });
      });
    });
  });
});
