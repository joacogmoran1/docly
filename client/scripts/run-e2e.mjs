import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const playwrightCliPath = fileURLToPath(new URL("../node_modules/playwright/cli.js", import.meta.url));
const localSpecs = ["auth.local.spec.ts", "guards.local.spec.ts", "clinical.local.spec.ts"];
const stagingSpecs = ["auth.staging.spec.ts", "clinical.staging.spec.ts", "permissions.staging.spec.ts"];
const stagingEnvNames = [
  "DOCLY_E2E_BASE_URL",
  "DOCLY_E2E_PATIENT_EMAIL",
  "DOCLY_E2E_PATIENT_PASSWORD",
  "DOCLY_E2E_PROFESSIONAL_EMAIL",
  "DOCLY_E2E_PROFESSIONAL_PASSWORD",
  "DOCLY_E2E_RESET_PASSWORD_NEW_PASSWORD",
];
const stagingEnvGroups = [
  ["DOCLY_E2E_GMAIL_USER", "SMTP_USER"],
  ["DOCLY_E2E_GMAIL_APP_PASSWORD", "SMTP_PASS"],
];

function loadEnvFile(path) {
  if (!fs.existsSync(path)) {
    return;
  }

  const content = fs.readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) {
      continue;
    }

    const [, name, rawValue] = match;
    if (process.env[name] !== undefined) {
      continue;
    }

    process.env[name] = rawValue
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");
  }
}

loadEnvFile(fileURLToPath(new URL("../../.env", import.meta.url)));
loadEnvFile(fileURLToPath(new URL("../../api/.env", import.meta.url)));
loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));

function runPlaywright(specs, label) {
  console.log(`\nRunning ${label}: ${specs.join(", ")}`);

  const result = spawnSync(process.execPath, [playwrightCliPath, "test", ...specs], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function getMissingStagingEnv() {
  const missing = stagingEnvNames.filter((name) => !process.env[name]?.trim());
  for (const group of stagingEnvGroups) {
    if (!group.some((name) => process.env[name]?.trim())) {
      missing.push(group.join(" or "));
    }
  }

  return missing;
}

const missingStagingEnv = getMissingStagingEnv();

if (process.env.CI === "true" && missingStagingEnv.length > 0) {
  console.error(
    `\nMissing staging E2E environment variables: ${missingStagingEnv.join(", ")}`,
  );
  process.exit(1);
}

runPlaywright(localSpecs, "local E2E smoke suite");

if (!process.env.DOCLY_E2E_BASE_URL?.trim()) {
  console.log("\nSkipping staging E2E suite because DOCLY_E2E_BASE_URL is not set outside CI.");
  process.exit(0);
}

if (missingStagingEnv.length > 0) {
  console.error(
    `\nMissing staging E2E environment variables: ${missingStagingEnv.join(", ")}`,
  );
  process.exit(1);
}

runPlaywright(stagingSpecs, "staging E2E smoke suite");
