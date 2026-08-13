const express = require("express");
const bcrypt = require("bcryptjs");
const { client } = require("../db");
const { FIELDS } = require("../fields");

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.status(401).json({ ok: false, error: "Not authenticated" });
}

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  const result = await client.execute({ sql: "SELECT * FROM admin_users WHERE username = ?", args: [username || ""] });
  const user = result.rows[0];
  if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
    return res.status(401).json({ ok: false, error: "Invalid username or password" });
  }
  req.session.adminId = user.id;
  req.session.username = user.username;
  res.json({ ok: true, username: user.username });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/me", (req, res) => {
  if (req.session && req.session.adminId) return res.json({ ok: true, username: req.session.username });
  res.status(401).json({ ok: false });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const result = await client.execute({ sql: "SELECT * FROM admin_users WHERE id = ?", args: [req.session.adminId] });
  const user = result.rows[0];
  if (!bcrypt.compareSync(currentPassword || "", user.password_hash)) {
    return res.status(400).json({ ok: false, error: "Current password is incorrect" });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ ok: false, error: "New password must be at least 8 characters" });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  await client.execute({ sql: "UPDATE admin_users SET password_hash = ? WHERE id = ?", args: [hash, user.id] });
  res.json({ ok: true });
});

// ---- data endpoints ----

router.get("/responses", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 25));
  const status = req.query.status; // active | flagged | all
  const respondentType = req.query.respondent_type; // leaver | form5 | all

  const where = [];
  const params = [];
  if (status && status !== "all") { where.push("status = ?"); params.push(status); }
  if (respondentType && respondentType !== "all") { where.push("respondent_type = ?"); params.push(respondentType); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRes = await client.execute({ sql: `SELECT COUNT(*) AS c FROM responses ${whereSql}`, args: params });
  const total = totalRes.rows[0].c;

  const rowsRes = await client.execute({
    sql: `SELECT * FROM responses ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    args: [...params, pageSize, (page - 1) * pageSize],
  });

  res.json({ ok: true, total, page, pageSize, rows: rowsRes.rows });
});

router.post("/responses/:id/flag", requireAuth, async (req, res) => {
  const { status } = req.body || {};
  if (!["active", "flagged"].includes(status)) return res.status(400).json({ ok: false, error: "Invalid status" });
  await client.execute({ sql: "UPDATE responses SET status = ? WHERE id = ?", args: [status, req.params.id] });
  res.json({ ok: true });
});

router.delete("/responses/:id", requireAuth, async (req, res) => {
  await client.execute({ sql: "DELETE FROM responses WHERE id = ?", args: [req.params.id] });
  res.json({ ok: true });
});

router.get("/stats", requireAuth, async (req, res) => {
  const [totalRes, byType, byGender, byPathway, bySchoolType, byStratum, byDay, flaggedRes] = await Promise.all([
    client.execute("SELECT COUNT(*) AS c FROM responses WHERE status = 'active'"),
    client.execute("SELECT respondent_type AS k, COUNT(*) AS c FROM responses WHERE status='active' GROUP BY respondent_type"),
    client.execute("SELECT gender AS k, COUNT(*) AS c FROM responses WHERE status='active' GROUP BY gender"),
    client.execute("SELECT COALESCE(institution_type, intended_pathway, pathway_status) AS k, COUNT(*) AS c FROM responses WHERE status='active' GROUP BY k"),
    client.execute("SELECT school_type AS k, COUNT(*) AS c FROM responses WHERE status='active' GROUP BY school_type"),
    client.execute("SELECT income_classification AS k, COUNT(*) AS c FROM responses WHERE status='active' GROUP BY income_classification"),
    client.execute("SELECT date(submitted_at) AS k, COUNT(*) AS c FROM responses WHERE status='active' GROUP BY k ORDER BY k"),
    client.execute("SELECT COUNT(*) AS c FROM responses WHERE status = 'flagged'"),
  ]);

  res.json({
    ok: true,
    total: totalRes.rows[0].c,
    flagged: flaggedRes.rows[0].c,
    byType: byType.rows,
    byGender: byGender.rows,
    byPathway: byPathway.rows,
    bySchoolType: bySchoolType.rows,
    byStratum: byStratum.rows,
    byDay: byDay.rows,
  });
});

router.get("/export.csv", requireAuth, async (req, res) => {
  const exportable = FIELDS.filter((f) => !f.excludeFromExport);
  const header = ["id", "follow_up_code", "submitted_at", "status", ...exportable.map((f) => f.column || f.key)];

  const result = await client.execute("SELECT * FROM responses ORDER BY id ASC");
  const rows = result.rows;

  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [header.map(escape).join(",")];
  for (const r of rows) {
    const line = [r.id, r.follow_up_code, r.submitted_at, r.status];
    for (const f of exportable) {
      let v = r[f.key];
      if (f.type === "multiselect" && v) {
        try { v = JSON.parse(v).join("|"); } catch (_) { /* leave as-is */ }
      }
      line.push(v);
    }
    lines.push(line.map(escape).join(","));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="spm_pathway_dataset_${Date.now()}.csv"`);
  res.send(lines.join("\n"));
});

module.exports = router;
