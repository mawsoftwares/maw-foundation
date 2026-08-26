const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

for (const f of files) {
  const filePath = path.join(srcDir, f);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  content = content.replace(/from '\.\/ui-kit'/g, "from './components'");
  content = content.replace(/from '\.\/input-components'/g, "from './components'");
  content = content.replace(/from '\.\/layout-components'/g, "from './components'");
  content = content.replace(/from '\.\/overlay-components'/g, "from './components'");
  content = content.replace(/from '\.\/pattern-components'/g, "from './components'");
  content = content.replace(/from '\.\/components'/g, "from './components'");
  
  // also single quote vs double quote if any
  content = content.replace(/from "\.\/ui-kit"/g, 'from "./components"');
  content = content.replace(/from "\.\/input-components"/g, 'from "./components"');
  content = content.replace(/from "\.\/layout-components"/g, 'from "./components"');
  content = content.replace(/from "\.\/overlay-components"/g, 'from "./components"');
  content = content.replace(/from "\.\/pattern-components"/g, 'from "./components"');
  
  fs.writeFileSync(filePath, content);
}
console.log('Fixed internal imports');
