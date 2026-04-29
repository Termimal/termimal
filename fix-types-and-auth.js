const fs = require('fs');
const path = require('path');

const root = process.cwd();

function fileExists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function write(rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log(`Updated: ${rel}`);
}

function backup(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return;
  const backupPath = full + '.bak';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(full, backupPath);
    console.log(`Backup: ${rel}.bak`);
  }
}

function patch(rel, fn) {
  if (!fileExists(rel)) {
    console.log(`Skip missing: ${rel}`);
    return;
  }
  backup(rel);
  const before = read(rel);
  const after = fn(before);
  if (after !== before) write(rel, after);
  else console.log(`No change: ${rel}`);
}

function ensureImport(content, importLine) {
  if (content.includes(importLine)) return content;
  const lines = content.split('\n');
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImportIndex = i;
  }
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importLine);
  } else {
    lines.unshift(importLine);
  }
  return lines.join('\n');
}

function fixCallbackRoute() {
  const rel = 'app/api/auth/callback/route.ts';
  patch(rel, (text) => {
    text = text.replace(
      /function\s+getSafeNextPath\s*\(\s*next\s*\)\s*\{/,
      `function getSafeNextPath(next: string | null): string {`
    );

    text = text.replace(
      /export\s+async\s+function\s+GET\s*\(\s*request\s*\)\s*\{/,
      `export async function GET(request: Request) {`
    );

    return text;
  });
}

function fixResetPasswordPage() {
  const rel = 'app/dashboard/reset-password/page.tsx';
  patch(rel, (text) => {
    text = ensureImport(text, "import type { FormEvent } from 'react'");

    text = text.replace(
      /const\s+handleSubmit\s*=\s*async\s*\(\s*e\s*\)\s*=>\s*\{/,
      `const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {`
    );

    text = text.replace(
      /onChange=\{e => setPassword\(e\.target\.value\)\}/g,
      `onChange={(e) => setPassword(e.target.value)}`
    );

    text = text.replace(
      /onChange=\{e => setConfirmPassword\(e\.target\.value\)\}/g,
      `onChange={(e) => setConfirmPassword(e.target.value)}`
    );

    return text;
  });
}

function fixCommonFormHandlers(rel) {
  patch(rel, (text) => {
    text = ensureImport(text, "import type { FormEvent, ChangeEvent } from 'react'");

    text = text.replace(
      /const\s+handleSubmit\s*=\s*async\s*\(\s*e\s*\)\s*=>\s*\{/g,
      `const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {`
    );

    text = text.replace(
      /const\s+onSubmit\s*=\s*async\s*\(\s*e\s*\)\s*=>\s*\{/g,
      `const onSubmit = async (e: FormEvent<HTMLFormElement>) => {`
    );

    text = text.replace(
      /onSubmit=\{\s*async\s*\(\s*e\s*\)\s*=>/g,
      `onSubmit={async (e: FormEvent<HTMLFormElement>) =>`
    );

    return text;
  });
}

function fixSignupPage() {
  const rel = 'app/signup/page.tsx';
  patch(rel, (text) => {
    text = ensureImport(text, "import type { FormEvent } from 'react'");

    text = text.replace(
      /const\s+handleSubmit\s*=\s*async\s*\(\s*e\s*\)\s*=>\s*\{/,
      `const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {`
    );

    text = text.replace(
      /const\s+\{\s*error\s*\}\s*=\s*await\s*supabase\.auth\.signUp\(\{\s*email,\s*password,\s*\}\)/m,
      `const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: \`\${window.location.origin}/api/auth/callback?next=/dashboard\`,
      },
    })`
    );

    if (!text.includes('confirmPassword')) {
      text = text.replace(
        /const\s+\[password,\s*setPassword\]\s*=\s*useState\(''\)/,
        `const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')`
      );
    }

    if (!text.includes('const passwordsMatch')) {
      text = text.replace(
        /const\s+supabase\s*=\s*createClient\(\)/,
        `const supabase = createClient()
  const passwordsMatch = confirmPassword === '' || password === confirmPassword`
      );
    }

    text = text.replace(
      /<button([^>]*type="submit"[^>]*)>/,
      `<button$1 disabled={!passwordsMatch}>`
    );

    return text;
  });
}

function fixLoginPage() {
  const rel = 'app/login/page.tsx';
  patch(rel, (text) => {
    text = ensureImport(text, "import type { FormEvent } from 'react'");

    text = text.replace(
      /const\s+handleSubmit\s*=\s*async\s*\(\s*e\s*\)\s*=>\s*\{/,
      `const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {`
    );

    text = text.replace(/setError\(error\.message\)/g, `setError('Incorrect email or password.')`);
    return text;
  });
}

function fixForgotPasswordPage() {
  const rel = 'app/forgot-password/page.tsx';
  patch(rel, (text) => {
    text = ensureImport(text, "import type { FormEvent } from 'react'");

    text = text.replace(
      /const\s+handleSubmit\s*=\s*async\s*\(\s*e\s*\)\s*=>\s*\{/,
      `const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {`
    );

    text = text.replace(
      /redirectTo:\s*`\$\{window\.location\.origin\}\/api\/auth\/callback\?next=.*?`/,
      `redirectTo: \`\${window.location.origin}/api/auth/callback?next=/dashboard/reset-password\``
    );

    return text;
  });
}

function run() {
  fixCallbackRoute();
  fixResetPasswordPage();
  fixSignupPage();
  fixLoginPage();
  fixForgotPasswordPage();

  [
    'app/login/page.tsx',
    'app/signup/page.tsx',
    'app/forgot-password/page.tsx',
    'app/dashboard/reset-password/page.tsx',
  ].forEach((rel) => {
    if (fileExists(rel)) fixCommonFormHandlers(rel);
  });

  console.log('\nDone.');
  console.log('Now run:');
  console.log('npm run build');
  console.log('\nIf build passes:');
  console.log('git add .');
  console.log('git commit -m "fix(types): add explicit event and route types"');
  console.log('git push origin main');
  console.log('\nIf something looks wrong, restore backups with:');
  console.log('for f in $(find app components -name "*.bak"); do mv "$f" "${f%.bak}"; done');
}

run();