/**
 * Dashboard Health Check Script
 * Quick verification that dashboard is running and accessible
 */

import http from "http";

const DASHBOARD_URL = "http://localhost:5173";
const TIMEOUT = 5000;

function checkDashboard() {
  return new Promise((resolve, reject) => {
    const req = http.get(DASHBOARD_URL, { timeout: TIMEOUT }, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        const checks = {
          statusCode: res.statusCode,
          contentType: res.headers["content-type"],
          hasHtml: data.includes("<!DOCTYPE html>") || data.includes("<html"),
          hasVite: data.includes("vite") || data.includes("__VITE__"),
          hasReact: data.includes("react") || data.includes("data-reactroot"),
        };

        resolve({
          success: res.statusCode === 200,
          checks,
          htmlSnippet: data.substring(0, 500),
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

async function main() {
  console.log("=== Dashboard Health Check ===\n");
  console.log(`Checking: ${DASHBOARD_URL}\n`);

  try {
    const result = await checkDashboard();

    if (result.success) {
      console.log("✅ Dashboard is RUNNING");
      console.log("\n--- Checks ---");
      console.log(`Status Code: ${result.checks.statusCode}`);
      console.log(`Content-Type: ${result.checks.contentType}`);
      console.log(`Has HTML: ${result.checks.hasHtml ? "✅" : "❌"}`);
      console.log(`Has Vite markers: ${result.checks.hasVite ? "✅" : "❌"}`);
      console.log(`Has React markers: ${result.checks.hasReact ? "✅" : "❌"}`);
      console.log("\n--- HTML Snippet ---");
      console.log(result.htmlSnippet + "...");
      console.log("\n✅ Dashboard is accessible and serving content!");
      process.exit(0);
    } else {
      console.log("❌ Dashboard returned non-200 status");
      console.log(`Status: ${result.checks.statusCode}`);
      process.exit(1);
    }
  } catch (error) {
    console.log("❌ Dashboard check FAILED");
    console.log(`Error: ${error.message}`);
    console.log("\nPossible causes:");
    console.log("- Dashboard dev server not running (npm run dev)");
    console.log("- Port 5173 is blocked or in use");
    console.log("- Firewall blocking connection");
    process.exit(1);
  }
}

main();
