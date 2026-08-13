const path = require("path");
const fs = require("fs");
const { createClient } = require("@libsql/client");
const bcrypt = require("bcryptjs");
const { FIELDS } = require("./fields");

// In production, set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (see .env.example)
// and every response is written straight to your free Turso database, which
// persists independently of whatever host runs this app — no risk of losing
// data to an ephemeral disk on redeploy/restart/sleep.
//
// With no TURSO_DATABASE_URL set, this falls back to a local SQLite file
// under data/ — handy for local development, but NOT what you want on a
// free host with an ephemeral filesystem (Render, Railway's free credit,
// etc.) since that file disappears on redeploy or restart.
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const usingTurso = Boolean(process.env.TURSO_DATABASE_URL);
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(DATA_DIR, "spm_pathway.db")}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Build the responses table from the field schema so fields.js stays the
// single source of truth. multiselect fields are stored as JSON text.
function sqlType(f) {
  if (f.type === "number") return "REAL";
  if (f.type === "bool") return "INTEGER";
  return "TEXT"; // string, enum, multiselect(JSON)
}

const fieldColumns = FIELDS.map((f) => `"${f.key}" ${sqlType(f)}`).join(",\n  ");

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follow_up_code TEXT UNIQUE,
  consent_given INTEGER NOT NULL DEFAULT 0,
  ${fieldColumns},
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Resolved once the schema exists and a default admin is guaranteed to be
// present. server.js awaits this before accepting requests.
const ready = (async () => {
  console.log(`[db] Using ${usingTurso ? "Turso (remote, persistent)" : "local SQLite file (data/spm_pathway.db)"}.`);

  await client.executeMultiple(SCHEMA_SQL);

  const countRes = await client.execute("SELECT COUNT(*) AS c FROM admin_users");
  const adminCount = countRes.rows[0].c;

  if (adminCount === 0) {
    const defaultUser = process.env.ADMIN_USERNAME || "admin";
    const defaultPass = process.env.ADMIN_PASSWORD || "ChangeMe123!";
    const hash = bcrypt.hashSync(defaultPass, 10);
    await client.execute({
      sql: "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
      args: [defaultUser, hash],
    });
    console.log(`\n[setup] Created default admin user "${defaultUser}".`);
    console.log(`[setup] Default password is "${defaultPass}" — change it via ADMIN_PASSWORD in .env or after logging in.\n`);
  }
})();

module.exports = { client, ready, usingTurso };
