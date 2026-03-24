#!/usr/bin/env node
// WanduGo DB helper — run any SQL file against Supabase via Management API (HTTPS)
// No direct DB connection or psql needed.
//
// SETUP (one-time):
//   export SUPABASE_ACCESS_TOKEN=your_personal_access_token
//   (Get token at: https://supabase.com/dashboard/account/tokens)
//
// USAGE:
//   node db-execute.js supabase-schema-only.sql
//   node db-execute.js some-migration.sql

const fs = require("fs");
const path = require("path");

const PROJECT_REF = "mfflvqlbmfsgnztkonon";
const SQL_FILE = process.argv[2];

// Load token from env var or .env.local
let ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  try {
    const envFile = require("fs").readFileSync(
      require("path").resolve(__dirname, ".env.local"),
      "utf8",
    );
    const match = envFile.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m);
    if (match) ACCESS_TOKEN = match[1].trim();
  } catch {}
}

if (!ACCESS_TOKEN) {
  console.error("❌  Missing access token. Run:");
  console.error("    export SUPABASE_ACCESS_TOKEN=your_token");
  console.error(
    "    (Get it at: https://supabase.com/dashboard/account/tokens)",
  );
  process.exit(1);
}

if (!SQL_FILE) {
  console.error("❌  Usage: node db-execute.js <file.sql>");
  process.exit(1);
}

const filePath = path.resolve(SQL_FILE);
if (!fs.existsSync(filePath)) {
  console.error(`❌  File not found: ${filePath}`);
  process.exit(1);
}

const sql = fs.readFileSync(filePath, "utf8");

async function run() {
  console.log(`📄 Running: ${SQL_FILE}`);
  console.log(`📡 Project: ${PROJECT_REF}\n`);

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    console.error(`❌  API error (${res.status}):`);
    console.error(
      typeof data === "object" ? JSON.stringify(data, null, 2) : data,
    );
    process.exit(1);
  }

  console.log("✅  SQL executed successfully!");
  if (Array.isArray(data) && data.length > 0) {
    console.table(data);
  }
}

run().catch((err) => {
  console.error("❌  Unexpected error:", err.message);
  process.exit(1);
});
