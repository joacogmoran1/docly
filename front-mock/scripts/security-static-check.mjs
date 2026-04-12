import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extname, join, relative } from "node:path";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const scanDir = join(projectRoot, "src");

const textExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".html"]);

const rules = [
  {
    name: "dangerouslySetInnerHTML",
    pattern: /\bdangerouslySetInnerHTML\b/g,
  },
  {
    name: "innerHTML",
    pattern: /\.(?:innerHTML|outerHTML)\b/g,
  },
  {
    name: "insertAdjacentHTML",
    pattern: /\binsertAdjacentHTML\b/g,
  },
  {
    name: "eval",
    pattern: /\beval\s*\(/g,
  },
  {
    name: "new Function",
    pattern: /\bnew Function\s*\(/g,
  },
];

const storageAllowlist = new Set([
  join(projectRoot, "src", "services", "auth", "session-manager.ts"),
]);

function walk(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath, results);
      continue;
    }

    if (textExtensions.has(extname(fullPath))) {
      results.push(fullPath);
    }
  }

  return results;
}

function findMatches(content, pattern) {
  const matches = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    pattern.lastIndex = 0;
    if (pattern.test(lines[index])) {
      matches.push(index + 1);
    }
  }

  return matches;
}

const files = walk(scanDir);
const findings = [];

for (const filePath of files) {
  const content = readFileSync(filePath, "utf8");

  for (const rule of rules) {
    const lines = findMatches(content, rule.pattern);
    if (lines.length > 0) {
      findings.push({
        file: relative(projectRoot, filePath),
        rule: rule.name,
        lines,
      });
    }
  }

  const storageLines = findMatches(content, /\b(?:localStorage|sessionStorage)\b/g);
  if (storageLines.length > 0 && !storageAllowlist.has(filePath)) {
    findings.push({
      file: relative(projectRoot, filePath),
      rule: "browser-storage",
      lines: storageLines,
    });
  }
}

if (findings.length > 0) {
  console.error("Security static check failed:");

  for (const finding of findings) {
    console.error(
      `- ${finding.rule} in ${finding.file} (lines: ${finding.lines.join(", ")})`,
    );
  }

  process.exitCode = 1;
} else {
  console.log("Security static check passed.");
}
