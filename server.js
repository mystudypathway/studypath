require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const rateLimit = require("express-rate-limit");

const { ready: dbReady, usingTurso } = require("./db");
const surveyRoutes = require("./routes/survey");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(express.json({ limit: "200kb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-session-secret-in-.env",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 },
  })
);

// Flood/bot protection on the public submit endpoint.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests. Please try again later." },
});
app.use("/api/submit", submitLimiter);

app.use("/api", surveyRoutes);
app.use("/api/admin", adminRoutes);

app.use(express.static(path.join(__dirname, "public")));

app.get("/healthz", (req, res) => res.json({ ok: true }));

dbReady
  .then(() => {
    if (!usingTurso && process.env.NODE_ENV === "production") {
      console.warn(
        "\n[warn] No TURSO_DATABASE_URL set while running in production. " +
        "Responses are being written to a local file that most free hosts " +
        "wipe on redeploy/restart — set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN " +
        "before collecting real data.\n"
      );
    }
    app.listen(PORT, () => {
      console.log(`SPM Pathway Data Collector running at http://localhost:${PORT}`);
      console.log(`Admin dashboard at http://localhost:${PORT}/admin/login.html`);
    });
  })
  .catch((err) => {
    console.error("[db] Failed to initialise database:", err);
    process.exit(1);
  });
