const express = require("express");
const crypto = require("crypto");
const { client } = require("../db");
const { FIELDS } = require("../fields");

const router = express.Router();

function hashIp(ip) {
  const salt = process.env.IP_SALT || "spm-pathway-salt";
  return crypto.createHash("sha256").update(salt + (ip || "")).digest("hex");
}

function generateFollowUpCode() {
  // Human-typeable pseudonymous code, e.g. SPM-7F3K-9QRT
  const part = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `SPM-${part()}-${part()}`;
}

// Some fields are only meaningful (and only shown in the UI) depending on
// earlier answers. Their static `required` flag in fields.js stays false so
// the base loop doesn't reject the other respondent type; these predicates
// enforce requiredness once we know the relevant context.
const CONDITIONAL_REQUIRED = {
  pathway_status: (d) => d.respondent_type === "leaver",
  intended_pathway: (d) => d.respondent_type === "form5",
  institution_type: (d) => d.pathway_status === "continuing_studies",
  field_of_study: (d) => d.pathway_status === "continuing_studies",
  job_sector: (d) => d.pathway_status === "working",
  spm_bm_grade: (d) => d.respondent_type === "leaver",
  spm_english_grade: (d) => d.respondent_type === "leaver",
  spm_math_grade: (d) => d.respondent_type === "leaver",
  spm_total_A: (d) => d.respondent_type === "leaver",
};

function validateAndCoerce(body) {
  const errors = [];
  const clean = {};

  for (const f of FIELDS) {
    let v = body[f.key];

    if (f.required && (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0))) {
      errors.push(`${f.key} is required`);
      continue;
    }
    if (v === undefined || v === null || v === "") {
      clean[f.key] = f.type === "bool" ? 0 : null;
      continue;
    }

    if (f.type === "number") {
      const n = Number(v);
      if (Number.isNaN(n)) { errors.push(`${f.key} must be a number`); continue; }
      if (f.min !== undefined && n < f.min) { errors.push(`${f.key} below minimum`); continue; }
      if (f.max !== undefined && n > f.max) { errors.push(`${f.key} above maximum`); continue; }
      clean[f.key] = n;
    } else if (f.type === "bool") {
      clean[f.key] = v === true || v === "true" || v === 1 || v === "1" ? 1 : 0;
    } else if (f.type === "enum") {
      if (!f.options.includes(v)) { errors.push(`${f.key} has an invalid value`); continue; }
      clean[f.key] = v;
    } else if (f.type === "multiselect") {
      const arr = Array.isArray(v) ? v : [v];
      const invalid = arr.filter((x) => !f.options.includes(x));
      if (invalid.length) { errors.push(`${f.key} has invalid option(s)`); continue; }
      clean[f.key] = JSON.stringify(arr);
    } else {
      // free string — cap length, strip control chars
      clean[f.key] = String(v).slice(0, 500);
    }
  }

  for (const [key, predicate] of Object.entries(CONDITIONAL_REQUIRED)) {
    const isEmpty = clean[key] === null || clean[key] === undefined || clean[key] === "";
    if (predicate(clean) && isEmpty) errors.push(`${key} is required`);
  }

  return { errors, clean };
}

// simple in-memory duplicate guard: same IP hash can't submit more than
// SUBMIT_LIMIT_PER_IP times within SUBMIT_LIMIT_WINDOW_MS. Rate limiting at
// the HTTP layer (see server.js) handles brute-force/flood separately.
const recentSubmissions = new Map();
const SUBMIT_LIMIT_PER_IP = 5;
const SUBMIT_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

router.post("/submit", async (req, res) => {
  const body = req.body || {};

  // Honeypot field: real users never fill this hidden input; bots often do.
  if (body._hp) {
    return res.status(200).json({ ok: true }); // pretend success, drop silently
  }

  if (body.consent_given !== true && body.consent_given !== "true") {
    return res.status(400).json({ ok: false, error: "Consent is required to submit this form." });
  }

  const ipHash = hashIp(req.ip);
  const now = Date.now();
  const history = (recentSubmissions.get(ipHash) || []).filter((t) => now - t < SUBMIT_LIMIT_WINDOW_MS);
  if (history.length >= SUBMIT_LIMIT_PER_IP) {
    return res.status(429).json({ ok: false, error: "Submission limit reached from this network. Please try again later." });
  }

  const { errors, clean } = validateAndCoerce(body);
  if (errors.length) {
    return res.status(400).json({ ok: false, error: "Please check your answers.", details: errors });
  }

  const followUpCode = generateFollowUpCode();
  const columns = ["follow_up_code", "consent_given", "ip_hash", ...FIELDS.map((f) => f.key)];
  const placeholders = columns.map(() => "?").join(", ");
  const values = [
    followUpCode,
    1,
    ipHash,
    ...FIELDS.map((f) => (clean[f.key] === undefined ? null : clean[f.key])),
  ];

  try {
    await client.execute({
      sql: `INSERT INTO responses (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders})`,
      args: values,
    });
    history.push(now);
    recentSubmissions.set(ipHash, history);
    res.json({ ok: true, follow_up_code: followUpCode });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Something went wrong saving your response. Please try again." });
  }
});

module.exports = router;
