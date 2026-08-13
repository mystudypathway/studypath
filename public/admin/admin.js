(function () {
  const PALETTE = ["#0f5c4e", "#6c5ce7", "#e8a33d", "#d64545", "#14785f", "#9c8ce0", "#f0be6f", "#78828f"];

  let page = 1;
  const pageSize = 20;
  let charts = {};

  async function api(path, opts) {
    const res = await fetch(path, Object.assign({ headers: { "Content-Type": "application/json" } }, opts || {}));
    if (res.status === 401) { window.location.href = "login.html"; throw new Error("unauthorized"); }
    return res.json();
  }

  async function init() {
    const me = await api("/api/admin/me");
    if (!me.ok) return;
    document.getElementById("whoami").textContent = me.username;

    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await api("/api/admin/logout", { method: "POST" });
      window.location.href = "login.html";
    });
    document.getElementById("exportBtn").addEventListener("click", () => {
      window.location.href = "/api/admin/export.csv";
    });
    document.getElementById("filterStatus").addEventListener("change", () => { page = 1; loadResponses(); });
    document.getElementById("filterType").addEventListener("change", () => { page = 1; loadResponses(); });
    document.getElementById("prevPage").addEventListener("click", () => { if (page > 1) { page--; loadResponses(); } });
    document.getElementById("nextPage").addEventListener("click", () => { page++; loadResponses(); });
    document.getElementById("changePwBtn").addEventListener("click", changePassword);

    await loadStats();
    await loadResponses();
  }

  async function loadStats() {
    const s = await api("/api/admin/stats");
    if (!s.ok) return;

    const statGrid = document.getElementById("statGrid");
    statGrid.innerHTML = "";
    const cards = [
      { num: s.total, lbl: "Active responses" },
      { num: s.flagged, lbl: "Flagged (excluded)" },
      { num: (s.byType.find((x) => x.k === "leaver") || {}).c || 0, lbl: "SPM leavers" },
      { num: (s.byType.find((x) => x.k === "form5") || {}).c || 0, lbl: "Form 5 (prospective)" },
    ];
    cards.forEach((c) => {
      const div = document.createElement("div");
      div.className = "stat-card";
      div.innerHTML = `<div class="num">${c.num}</div><div class="lbl">${c.lbl}</div>`;
      statGrid.appendChild(div);
    });

    renderChart("chartPathway", "bar", s.byPathway);
    renderChart("chartType", "doughnut", s.byType);
    renderChart("chartStratum", "bar", s.byStratum);
    renderTimeChart("chartTime", s.byDay);
  }

  function renderChart(canvasId, type, rows) {
    const labels = rows.map((r) => r.k || "unknown");
    const data = rows.map((r) => r.c);
    if (charts[canvasId]) charts[canvasId].destroy();
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type,
      data: {
        labels,
        datasets: [{ data, backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]) }],
      },
      options: {
        plugins: { legend: { display: type === "doughnut", position: "bottom" } },
        scales: type === "bar" ? { y: { beginAtZero: true, ticks: { precision: 0 } } } : {},
      },
    });
  }

  function renderTimeChart(canvasId, rows) {
    if (charts[canvasId]) charts[canvasId].destroy();
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: "line",
      data: {
        labels: rows.map((r) => r.k),
        datasets: [{ label: "Responses", data: rows.map((r) => r.c), borderColor: PALETTE[0], backgroundColor: "rgba(30,58,95,0.1)", fill: true, tension: 0.25 }],
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
    });
  }

  async function loadResponses() {
    const status = document.getElementById("filterStatus").value;
    const type = document.getElementById("filterType").value;
    const data = await api(`/api/admin/responses?page=${page}&pageSize=${pageSize}&status=${status}&respondent_type=${type}`);
    if (!data.ok) return;

    const list = document.getElementById("respList");
    list.innerHTML = "";
    if (data.rows.length === 0) {
      list.innerHTML = `<div class="helper-text" style="text-align:center;padding:20px;">No responses match this filter.</div>`;
    }
    data.rows.forEach((r) => {
      const pathway = r.institution_type || r.intended_pathway || r.pathway_status || "—";
      const initial = (r.respondent_type === "form5" ? "F5" : "L");
      const submitted = (r.submitted_at || "").replace("T", " ").slice(0, 16);
      const row = document.createElement("div");
      row.className = "resp-row";
      row.innerHTML = `
        <div class="resp-avatar">${initial}</div>
        <div class="resp-main">
          <div class="resp-title">${r.follow_up_code || ("#" + r.id)} <span class="tag ${r.status === "flagged" ? "tag-flagged" : "tag-active"}">${r.status}</span></div>
          <div class="resp-sub">${submitted} &middot; ${r.gender || "?"} &middot; ${r.income_classification || "?"} &middot; ${r.school_type || "?"}</div>
        </div>
        <div class="resp-meta">
          <div class="pathway">${pathway}</div>
        </div>
        <div class="resp-actions">
          <button data-action="flag" data-id="${r.id}" data-status="${r.status}">${r.status === "flagged" ? "Unflag" : "Flag"}</button>
          <button class="danger" data-action="delete" data-id="${r.id}">Delete</button>
        </div>`;
      list.appendChild(row);
    });

    document.getElementById("pageInfo").textContent = `Page ${data.page} — ${data.total} total`;

    list.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const action = btn.getAttribute("data-action");
        if (action === "flag") {
          const newStatus = btn.getAttribute("data-status") === "flagged" ? "active" : "flagged";
          await api(`/api/admin/responses/${id}/flag`, { method: "POST", body: JSON.stringify({ status: newStatus }) });
        } else if (action === "delete") {
          if (!confirm("Permanently delete this response? This cannot be undone.")) return;
          await api(`/api/admin/responses/${id}`, { method: "DELETE" });
        }
        await loadStats();
        await loadResponses();
      });
    });
  }

  async function changePassword() {
    const currentPassword = document.getElementById("curPw").value;
    const newPassword = document.getElementById("newPw").value;
    const msg = document.getElementById("pwMsg");
    msg.innerHTML = "";
    const res = await api("/api/admin/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
    if (!res.ok) { msg.innerHTML = `<div class="error-box">${res.error}</div>`; return; }
    msg.innerHTML = `<div class="consent-box">Password changed successfully.</div>`;
    document.getElementById("curPw").value = "";
    document.getElementById("newPw").value = "";
  }

  init();
})();
