#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");

const IGNORE_BASENAMES = new Set(["FRONTEND_ENDPOINT_STRINGS.json"]);

const SUBSTRING_PATTERNS = [
  "/sender/dashboard",
  "/admin/dashboard",
  "/admin/senders",
  "/apikeys",
];

const REGEX_PATTERNS = [
  { label: "/admin/proofs/{id}/approve", regex: /\/admin\/proofs\/.*\/approve/ },
  { label: "/admin/proofs/{id}/reject", regex: /\/admin\/proofs\/.*\/reject/ },
  { label: "/admin/escrows/{id}/summary", regex: /\/admin\/escrows\/.*\/summary/ },
];

const USERS_PATH_SEGMENT = "/users/";
const USERS_SCOPE_DIRS = [
  path.join(SRC_DIR, "app", "admin"),
  path.join(SRC_DIR, "lib", "queries", "admin"),
];

const findings = [];

function shouldSkipFile(filePath) {
  const basename = path.basename(filePath);
  if (IGNORE_BASENAMES.has(basename)) return true;
  if (basename.endsWith(".md")) return true;
  return false;
}

function isUnderUsersScope(filePath) {
  return USERS_SCOPE_DIRS.some((dir) => filePath.startsWith(dir + path.sep));
}

function scanFile(filePath) {
  if (shouldSkipFile(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  const lines = contents.split(/\r?\n/);

  lines.forEach((line, index) => {
    SUBSTRING_PATTERNS.forEach((pattern) => {
      if (line.includes(pattern)) {
        findings.push({
          filePath,
          lineNumber: index + 1,
          snippet: line.trim(),
          match: pattern,
        });
      }
    });

    REGEX_PATTERNS.forEach(({ label, regex }) => {
      if (regex.test(line)) {
        findings.push({
          filePath,
          lineNumber: index + 1,
          snippet: line.trim(),
          match: label,
        });
      }
    });

    if (line.includes(USERS_PATH_SEGMENT) && isUnderUsersScope(filePath)) {
      findings.push({
        filePath,
        lineNumber: index + 1,
        snippet: line.trim(),
        match: USERS_PATH_SEGMENT,
      });
    }
  });
}

function walkDir(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") return;
      walkDir(entryPath);
      return;
    }
    if (entry.isFile()) {
      scanFile(entryPath);
    }
  });
}

if (!fs.existsSync(SRC_DIR)) {
  console.error(`Source directory not found: ${SRC_DIR}`);
  process.exit(1);
}

walkDir(SRC_DIR);

if (findings.length > 0) {
  console.error("Legacy endpoint references detected:");
  findings.forEach(({ filePath, lineNumber, snippet, match }) => {
    const relativePath = path.relative(ROOT, filePath);
    console.error(`${relativePath}:${lineNumber}: ${match} -> ${snippet}`);
  });
  process.exit(1);
}
