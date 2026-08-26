const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(srcDir, 'components');
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

const filesToExtract = [
  'ui-kit.tsx',
  'input-components.tsx',
  'layout-components.tsx',
  'overlay-components.tsx',
  'pattern-components.tsx'
];

let allExtracted = [];

for (const fileName of filesToExtract) {
  const filePath = path.join(srcDir, fileName);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf-8');

  // Match the first separator
  const separatorRegex = /\/\/ \-{10,}\n/;
  const separatorMatch = content.match(separatorRegex);
  
  if (!separatorMatch) {
    console.log(`Skipping ${fileName} - no separators found`);
    continue;
  }

  const commonHeader = content.substring(0, separatorMatch.index).trim();
  const rest = content.substring(separatorMatch.index);

  // We can match components using regex:
  // // ----------
  // // Name (and other stuff)
  // // ----------
  // (everything until the next // --------- or end of file)
  
  const componentRegex = /\/\/ \-{10,}\n\/\/ ([^\n]+)\n\/\/ \-{10,}\n([\s\S]*?)(?=\/\/ \-{10,}\n|$)/g;
  
  let match;
  while ((match = componentRegex.exec(rest)) !== null) {
    // Only take the first word as the component name
    let compNameRaw = match[1].trim().split(/[\s(/&]/)[0];
    let compName = compNameRaw.replace(/[^a-zA-Z0-9_-]/g, '');
    let compCode = match[2].trim();
    
    if (compName === 'Dropdown') compName = 'DropdownMenu';

    if (compName && compCode.includes('export ')) {
      const outPath = path.join(componentsDir, `${compName}.tsx`);
      const fileContent = `${commonHeader}\n\n// ---------------------------------------------------------------------------\n// ${compName}\n// ---------------------------------------------------------------------------\n\n${compCode}\n`;
      fs.writeFileSync(outPath, fileContent);
      allExtracted.push(compName);
      console.log(`Extracted: ${compName} from ${fileName}`);
    }
  }
}

// Extract from components.tsx
const componentsContent = fs.readFileSync(path.join(srcDir, 'components.tsx'), 'utf-8');
const importsMatch = componentsContent.match(/^(import[\s\S]*?;)\n\n/m);
const imports = importsMatch ? importsMatch[1] : '';
const baseMatch = componentsContent.match(/(const base: CSSProperties = [\s\S]*?;)/);
const base = baseMatch ? baseMatch[1] : '';
const compCommonHeader = `${imports}\n\n${base}`;

const compRegex = /export function ([A-Z][a-zA-Z0-9_]*)\s*\([\s\S]*?\)\s*(?::\s*ReactNode)?\s*{[\s\S]*?(?=\nexport function |$)/g;
let compMatch;
while ((compMatch = compRegex.exec(componentsContent)) !== null) {
  const compName = compMatch[1];
  const compCode = compMatch[0].trim();
  
  const outPath = path.join(componentsDir, `${compName}.tsx`);
  const fileContent = `${compCommonHeader}\n\n// ---------------------------------------------------------------------------\n// ${compName}\n// ---------------------------------------------------------------------------\n\n${compCode}\n`;
  fs.writeFileSync(outPath, fileContent);
  allExtracted.push(compName);
  console.log(`Extracted: ${compName} from components.tsx`);
}

const indexContent = allExtracted.map(comp => `export * from './${comp}';`).join('\n') + '\n';
fs.writeFileSync(path.join(componentsDir, 'index.ts'), indexContent);

console.log('Done string extraction!');
