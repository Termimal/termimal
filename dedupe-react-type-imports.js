const fs = require('fs');
const path = require('path');

const files = [
  'app/dashboard/reset-password/page.tsx',
  'app/login/page.tsx',
  'app/signup/page.tsx',
  'app/forgot-password/page.tsx',
];

function fixFile(rel) {
  const full = path.join(process.cwd(), rel);
  if (!fs.existsSync(full)) return;

  let text = fs.readFileSync(full, 'utf8');

  const lines = text.split('\n');
  const filtered = [];
  let sawStandaloneFormEventImport = false;

  for (const line of lines) {
    if (line.trim() === "import type { FormEvent } from 'react'") {
      if (sawStandaloneFormEventImport) continue;
      sawStandaloneFormEventImport = true;
    }
    filtered.push(line);
  }

  text = filtered.join('\n');

  const hasUseStateImport = /import\s+\{\s*useState[^}]*\}\s+from\s+'react'/.test(text);
  const hasFormEventImport = /import\s+type\s+\{\s*FormEvent\s*\}\s+from\s+'react'/.test(text);
  const mergedReactImport = /import\s+\{[^}]*type\s+FormEvent[^}]*\}\s+from\s+'react'/.test(text);

  if (!hasFormEventImport && !mergedReactImport) {
    if (hasUseStateImport) {
      text = text.replace(
        /import\s+\{\s*([^}]*)\s*\}\s+from\s+'react'/,
        (m, inner) => `import { ${inner.trim()}, type FormEvent } from 'react'`
      );
    } else {
      text = `import type { FormEvent } from 'react'\n` + text;
    }
  }

  fs.writeFileSync(full, text, 'utf8');
  console.log(`Checked: ${rel}`);
}

files.forEach(fixFile);
console.log('Done. Run npm run build');