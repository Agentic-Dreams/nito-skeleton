#!/usr/bin/env node
/**
 * create-nito-app — Bootstrap a new project from nito-skeleton
 *
 * Usage:
 *   node bin/create-nito-app.mjs <project-name>
 *
 * Or, once published to npm as 'create-nito-app':
 *   npm create nito-app@latest <project-name>
 *   npx create-nito-app <project-name>
 *
 * What it does:
 *   1. Clones nito-skeleton without git history (via degit or git clone)
 *   2. Renames the project (package.json, class names)
 *   3. Creates a fresh .env from .env.example
 *   4. Initialises a new git repository
 *   5. Installs npm dependencies
 */

import { execSync }          from 'child_process';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join, resolve }     from 'path';
import { createInterface }   from 'readline';
import { randomBytes }       from 'crypto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REPO = 'Agentic-Dreams/nito-skeleton';

function run(cmd, cwd = process.cwd()) {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function hasBin(bin) {
  try { execSync(`which ${bin}`, { stdio: 'ignore' }); return true; }
  catch { return false; }
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function toPascalCase(str) {
  return str
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, c => c.toUpperCase());
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║       create-nito-app  v1.0.0        ║');
  console.log('╚══════════════════════════════════════╝\n');

  // ── 1. Project name ──────────────────────────────────────────────────────
  let projectName = process.argv[2];

  if (!projectName) {
    projectName = await ask(rl, 'Project name (kebab-case): ');
  }

  projectName = toKebabCase(projectName.trim());

  if (!projectName) {
    console.error('❌  Project name is required.');
    process.exit(1);
  }

  const targetDir = resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    console.error(`❌  Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  // ── 2. Extra info ────────────────────────────────────────────────────────
  const description = await ask(rl, `Description (optional): `);
  rl.close();

  const pascalName = toPascalCase(projectName);

  console.log(`\n🚀  Creating project "${projectName}"...\n`);

  // ── 3. Clone skeleton ────────────────────────────────────────────────────
  if (hasBin('degit')) {
    console.log('📦  Cloning with degit...');
    run(`degit ${REPO}#main "${projectName}"`);
  } else {
    console.log('📦  Cloning with git (degit not found, falling back)...');
    run(`git clone --depth 1 --branch feat/code-generator https://github.com/${REPO}.git "${projectName}"`);
    // Remove git history
    run(`rm -rf .git`, targetDir);
  }

  // ── 4. Update package.json ───────────────────────────────────────────────
  console.log('📝  Updating package.json...');
  const pkgPath = join(targetDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.name        = projectName;
  pkg.description = description || `${pascalName} API`;
  pkg.version     = '0.1.0';
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // ── 5. Create .env from .env.example ────────────────────────────────────
  console.log('🔧  Creating .env from .env.example...');
  const envExamplePath = join(targetDir, '.env.example');
  const envPath        = join(targetDir, '.env');

  if (existsSync(envExamplePath)) {
    let envContent = readFileSync(envExamplePath, 'utf-8');

    // Replace the placeholder DB name
    envContent = envContent.replace('nito_dev', projectName.replace(/-/g, '_'));

    // Auto-generate a JWT secret
    const jwtSecret = randomBytes(48).toString('hex');
    envContent = envContent.replace(
      /JWT_SECRET=.*/,
      `JWT_SECRET=${jwtSecret}`,
    );

    writeFileSync(envPath, envContent);
    console.log('   ✔  .env created with a generated JWT_SECRET');
  }

  // ── 6. Remove bin/create-nito-app.mjs from the new project ──────────────
  // (It makes no sense to keep the bootstrap script inside the project itself)
  try {
    run(`rm -rf bin`, targetDir);
  } catch { /* ignore */ }

  // ── 7. Init fresh git repo ───────────────────────────────────────────────
  console.log('🔀  Initialising git repository...');
  run(`git init`, targetDir);
  run(`git add -A`, targetDir);
  run(`git commit -m "chore: initial commit from nito-skeleton"`, targetDir);

  // ── 8. Install dependencies ──────────────────────────────────────────────
  console.log('\n📦  Installing dependencies (this may take a moment)...');
  run(`npm install`, targetDir);

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════╗
║  ✅  Project "${projectName}" is ready!
║
║  Next steps:
║    cd ${projectName}
║    # Edit .env with your DATABASE_URL and other vars
║    npm run db:migrate
║    npm run start:dev
║
║  Generate a new module:
║    npm run generate
║
║  API Docs (dev only):
║    http://localhost:3000/api/docs
╚══════════════════════════════════════════════════════╝
`);
}

main().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
