const fs = require('fs');
const path = require('path');

const colorTokensPath = path.join(__dirname, '../docs/color-token.json');
const typographyTokensPath = path.join(__dirname, '../design-tokens.tokens.json');
const outputPath = path.join(__dirname, '../tokens.css');

/**
 * Resolves token aliases like {color.palette.primary.100}
 */
function resolveToken(value, allTokens) {
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    const tokenPath = value.slice(1, -1).split('.');
    let current = allTokens;
    for (const key of tokenPath) {
      if (current === undefined || current[key] === undefined) {
        console.warn(`Warning: Could not resolve token ${value}`);
        return value;
      }
      current = current[key];
    }
    // Deep resolution
    return resolveToken(current, allTokens);
  }
  return value;
}

/**
 * Converts camelCase or space separated strings to kebab-case
 */
function toKebabCase(str) {
  return str.trim().replace(/\s+/g, '-').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Processes color tokens into CSS variables
 * Only includes color roles as requested
 */
function processColors(tokens) {
  const cssLines = [];
  const roles = tokens.color.role;

  // Process Light Mode
  cssLines.push('/* Color Roles - Light Mode */');
  cssLines.push(':root {');
  for (const [roleName, value] of Object.entries(roles.light)) {
    const resolved = resolveToken(value, tokens);
    cssLines.push(`  --color-${toKebabCase(roleName)}: ${resolved};`);
  }
  cssLines.push('}');
  cssLines.push('');

  // Process Dark Mode
  cssLines.push('/* Color Roles - Dark Mode */');
  cssLines.push('@media (prefers-color-scheme: dark) {');
  cssLines.push('  :root {');
  for (const [roleName, value] of Object.entries(roles.dark)) {
    const resolved = resolveToken(value, tokens);
    cssLines.push(`    --color-${toKebabCase(roleName)}: ${resolved};`);
  }
  cssLines.push('  }');
  cssLines.push('}');
  
  // Also provide a .dark class override for manual toggling
  cssLines.push('');
  cssLines.push('.dark {');
  for (const [roleName, value] of Object.entries(roles.dark)) {
    const resolved = resolveToken(value, tokens);
    cssLines.push(`  --color-${toKebabCase(roleName)}: ${resolved};`);
  }
  cssLines.push('}');

  return cssLines.join('\n');
}

/**
 * Processes typography tokens into CSS variables
 */
function processTypography(tokens) {
  const cssLines = [];
  cssLines.push('/* Typography Tokens */');
  cssLines.push(':root {');

  function walk(obj, currentPath = []) {
    // If it has a value and type is fontStyle, it's a leaf node for our purposes
    if (obj.value && obj.type === 'custom-fontStyle') {
      const varPrefix = `--font-${currentPath.join('-')}`;
      for (const [prop, val] of Object.entries(obj.value)) {
        const cssProp = toKebabCase(prop);
        let finalVal = val;
        
        // Add px to numeric values except fontWeight
        if (typeof val === 'number' && cssProp !== 'font-weight') {
          finalVal = `${val}px`;
        }
        
        // Wrap font family in quotes if it contains spaces
        if (cssProp === 'font-family' && typeof val === 'string' && val.includes(' ')) {
          finalVal = `'${val}'`;
        }

        cssLines.push(`  ${varPrefix}-${cssProp}: ${finalVal};`);
      }
    } else {
      // Keep digging
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && key !== 'extensions') {
          walk(value, [...currentPath, toKebabCase(key)]);
        }
      }
    }
  }

  if (tokens.font) {
    walk(tokens.font);
  }
  
  cssLines.push('}');
  return cssLines.join('\n');
}

// Main execution
try {
  console.log('Reading token files...');
  
  if (!fs.existsSync(colorTokensPath)) {
    throw new Error(`Color tokens file not found at ${colorTokensPath}`);
  }
  if (!fs.existsSync(typographyTokensPath)) {
    throw new Error(`Typography tokens file not found at ${typographyTokensPath}`);
  }

  const colorData = JSON.parse(fs.readFileSync(colorTokensPath, 'utf8'));
  const typographyData = JSON.parse(fs.readFileSync(typographyTokensPath, 'utf8'));

  const colorCss = processColors(colorData);
  const typographyCss = processTypography(typographyData);

  const finalCss = [
    '/* ========================================================================== */',
    '/* AUTO-GENERATED DESIGN TOKENS - DO NOT EDIT DIRECTLY                        */',
    '/* ========================================================================== */',
    '',
    colorCss,
    '',
    typographyCss,
    ''
  ].join('\n');

  fs.writeFileSync(outputPath, finalCss);
  console.log(`\nSuccessfully generated ${outputPath}`);
  
} catch (error) {
  console.error('\nError converting tokens:');
  console.error(error.message);
  process.exit(1);
}
