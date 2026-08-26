const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(srcDir, 'components');
const content = fs.readFileSync(path.join(srcDir, 'components.tsx'), 'utf-8');

const importsMatch = content.match(/^(import[\s\S]*?;)\n\n/m);
const imports = importsMatch ? importsMatch[1] : '';

const baseMatch = content.match(/(const base: CSSProperties = [\s\S]*?;)/);
const base = baseMatch ? baseMatch[1] : '';

const commonHeader = `${imports}\n\n${base}`;

const compRegex = /export function ([A-Z][a-zA-Z0-9_]*)\s*\([\s\S]*?\)\s*(?::\s*ReactNode)?\s*{[\s\S]*?(?=\nexport function |$)/g;

let match;
while ((match = compRegex.exec(content)) !== null) {
  const compName = match[1];
  const compCode = match[0].trim();
  
  const outPath = path.join(componentsDir, `${compName}.tsx`);
  const fileContent = `${commonHeader}\n\n// ---------------------------------------------------------------------------\n// ${compName}\n// ---------------------------------------------------------------------------\n\n${compCode}\n`;
  fs.writeFileSync(outPath, fileContent);
  console.log(`Extracted: ${compName} from components.tsx`);
}

// Replace Dropdown in index.ts with DropdownMenu
let indexContent = fs.readFileSync(path.join(componentsDir, 'index.ts'), 'utf-8');
indexContent = indexContent.replace("export * from './Dropdown';", "export * from './DropdownMenu';");
fs.writeFileSync(path.join(componentsDir, 'index.ts'), indexContent);
