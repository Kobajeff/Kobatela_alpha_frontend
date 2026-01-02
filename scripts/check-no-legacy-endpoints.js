const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.git',
]);

const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const FORBIDDEN_SUBSTRINGS = [
  '/admin/dashboard',
  '/admin/senders',
  '/apikeys',
];

const violations = [];

function shouldSkipDir(dirent) {
  return dirent.isDirectory() && SKIP_DIRS.has(dirent.name);
}

function shouldScanFile(filePath) {
  const ext = path.extname(filePath);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return false;
  }
  if (filePath.endsWith('.md') || filePath.endsWith('.json')) {
    return false;
  }
  return true;
}

function isAdminScope(filePath) {
  const adminAppPath = path.join('src', 'app', 'admin') + path.sep;
  const adminQueriesPath = path.join('src', 'lib', 'queries', 'admin');
  return filePath.includes(adminAppPath) || filePath.includes(adminQueriesPath);
}

function addViolation(filePath, lineNumber, matchedRule, lineText) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  violations.push(
    `[LEGACY_ENDPOINT] ${relativePath}:${lineNumber} ${matchedRule} :: ${lineText.trim()}`
  );
}

function scanFile(filePath) {
  const contents = fs.readFileSync(filePath, 'utf8');
  const lines = contents.split(/\r?\n/);
  const adminScope = isAdminScope(filePath);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    FORBIDDEN_SUBSTRINGS.forEach((substring) => {
      if (line.includes(substring)) {
        addViolation(filePath, lineNumber, substring, line);
      }
    });

    if (line.includes('/admin/proofs/') && line.includes('/approve')) {
      addViolation(filePath, lineNumber, '/admin/proofs/.../approve', line);
    }

    if (line.includes('/admin/proofs/') && line.includes('/reject')) {
      addViolation(filePath, lineNumber, '/admin/proofs/.../reject', line);
    }

    if (line.includes('/admin/escrows/') && line.includes('/summary')) {
      addViolation(filePath, lineNumber, '/admin/escrows/.../summary', line);
    }

    if (adminScope && line.includes('/users/')) {
      addViolation(filePath, lineNumber, '/users/ (admin scope)', line);
    }
  });
}

function walkDir(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (shouldSkipDir(entry)) {
      return;
    }
    if (entry.isDirectory()) {
      walkDir(entryPath);
      return;
    }
    if (entry.isFile() && shouldScanFile(entryPath)) {
      scanFile(entryPath);
    }
  });
}

if (!fs.existsSync(SRC_DIR)) {
  console.error('[LEGACY_ENDPOINT] src/ directory not found.');
  process.exit(1);
}

walkDir(SRC_DIR);

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exit(1);
}

process.exit(0);
