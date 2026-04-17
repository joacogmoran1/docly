import { defineConfig } from "@playwright/test";

const headed = process.env.DOCLY_E2E_HEADLESS === "false";
const browserChannel = process.env.DOCLY_E2E_BROWSER_CHANNEL;

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: false,
	workers: 1,
	timeout: 90_000,
	expect: {
		timeout: 10_000,
	},
	reporter: [
		["list"],
		["html", { open: "never" }],
	],
	use: {
		headless: !headed,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		viewport: { width: 1440, height: 900 },
		ignoreHTTPSErrors: process.env.DOCLY_E2E_IGNORE_HTTPS_ERRORS === "true",
		...(browserChannel ? { channel: browserChannel } : {}),
	},
});
