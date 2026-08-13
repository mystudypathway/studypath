(function () {
  const PALETTE = ["#1e3a5f", "#c0392b", "#2c8a6b", "#e0a72e", "#7b5ea7", "#3d8fc7", "#9c6644", "#5b6470"];

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

    const tbody = document.getElementById("respBody");
    tbody.innerHTML = "";
    data.rows.forEach((r) => {
      const tr = document.createElement("tr");
      const pathway = r.institution_type || r.intended_pathway || r.pathway_status || "-";
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.follow_up_code || ""}</td>
        <td>${(r.submitted_at || "").replace("T", " ").slice(0, 16)}</td>
        <td><span class="tag ${r.status === "flagged" ? "tag-flagged" : "tag-active"}">${r.status}</span></td>
        <td>${r.respondent_type || ""}</td>
        <td>${r.gender || ""}</td>
        <td>${r.income_classification || ""}</td>
        <td>${r.school_type || ""}</td>
        <td>${pathway}</td>
        <td class="row-actions">
          <button data-action="flag" data-id="${r.id}" data-status="${r.status}">${r.status === "flagged" ? "Unflag" : "Flag"}</button>
          <button data-action="delete" data-id="${r.id}">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });

    document.getElementById("pageInfo").textContent = `Page ${data.page} — ${data.total} total`;

    tbody.querySelectorAll("button[data-action]").forEach((btn) => {
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
