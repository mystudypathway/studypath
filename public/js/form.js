(function () {
  const FIELDS = window.SPM_FIELDS;
  const I18N = window.SPM_I18N;

  const GROUP_TO_STEP = {
    intro: "intro", demographic: "demographic", socioeconomic: "socioeconomic",
    parental: "parental", school: "school", academic: "academic",
    academic_spm: "academic", outcome: "outcome", qualitative: "qualitative",
    followup: "followup",
  };
  const STEP_ORDER = ["intro","demographic","socioeconomic","parental","school","academic","outcome","qualitative","followup"];

  const stepFields = {};
  STEP_ORDER.forEach((s) => (stepFields[s] = []));
  FIELDS.forEach((f) => stepFields[GROUP_TO_STEP[f.group]].push(f));

  let lang = "bm";
  let stepIndex = 0;
  let formData = { main_reason_for_choice: [] };
  let followUpCode = null;

  const t = (key) => (I18N.ui[lang] && I18N.ui[lang][key]) || key;
  const fieldLabel = (f) => (I18N.fieldLabels[f.key] ? I18N.fieldLabels[f.key][lang] : f.key);
  const optionLabel = (f, opt) => {
    const map = I18N.optionLabels[f.key];
    if (map && map[opt]) return map[opt][lang];
    return opt;
  };
  const groupTitle = (g) => (I18N.groupTitles[g] ? I18N.groupTitles[g][lang] : g);

  const cardArea = document.getElementById("cardArea");
  const progressFill = document.getElementById("progressFill");
  const progressLabel = document.getElementById("progressLabel");
  const langToggle = document.getElementById("langToggle");

  function isVisible(field) {
    if (field.leaverOnly && formData.respondent_type !== "leaver") return false;
    if (field.form5Only && formData.respondent_type !== "form5") return false;
    if (field.showIf && !field.showIf(formData)) return false;
    return true;
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    (children || []).forEach((c) => c && node.appendChild(c));
    return node;
  }

  function renderSelect(field) {
    const wrap = el("div", { class: "field-row" });
    wrap.appendChild(el("label", { class: "field-label" }, [
      document.createTextNode(fieldLabel(field) + (field.required ? " " : "")),
      field.required ? el("span", { class: "req", text: "*" }) : null,
    ]));
    const select = el("select", {
      onchange: (e) => { formData[field.key] = e.target.value; },
    });
    select.appendChild(el("option", { value: "" }, [document.createTextNode(t("selectPlaceholder"))]));
    field.options.forEach((opt) => {
      const o = el("option", { value: opt }, [document.createTextNode(optionLabel(field, opt))]);
      if (formData[field.key] === opt) o.selected = true;
      select.appendChild(o);
    });
    wrap.appendChild(select);
    return wrap;
  }

  function renderNumber(field) {
    const wrap = el("div", { class: "field-row" });
    wrap.appendChild(el("label", { class: "field-label" }, [
      document.createTextNode(fieldLabel(field) + " "),
      field.required ? el("span", { class: "req", text: "*" }) : null,
    ]));
    const input = el("input", {
      type: "number",
      min: field.min !== undefined ? field.min : "",
      max: field.max !== undefined ? field.max : "",
      value: formData[field.key] !== undefined ? formData[field.key] : "",
      oninput: (e) => { formData[field.key] = e.target.value; },
    });
    wrap.appendChild(input);
    return wrap;
  }

  function renderText(field) {
    const wrap = el("div", { class: "field-row" });
    wrap.appendChild(el("label", { class: "field-label", text: fieldLabel(field) }));
    const input = el("input", {
      type: "text",
      value: formData[field.key] || "",
      oninput: (e) => { formData[field.key] = e.target.value; },
    });
    wrap.appendChild(input);
    return wrap;
  }

  function renderMultiselect(field) {
    const wrap = el("div", { class: "field-row" });
    wrap.appendChild(el("label", { class: "field-label" }, [
      document.createTextNode(fieldLabel(field) + " "),
      field.required ? el("span", { class: "req", text: "*" }) : null,
    ]));
    const grid = el("div", { class: "multiselect-grid" });
    if (!Array.isArray(formData[field.key])) formData[field.key] = [];
    field.options.forEach((opt) => {
      const id = `${field.key}_${opt}`;
      const checked = formData[field.key].includes(opt);
      const row = el("div", { class: "checkbox-row" });
      const cb = el("input", {
        type: "checkbox", id, value: opt,
        onchange: (e) => {
          const arr = formData[field.key];
          if (e.target.checked) { if (!arr.includes(opt)) arr.push(opt); }
          else { formData[field.key] = arr.filter((x) => x !== opt); }
        },
      });
      cb.checked = checked;
      row.appendChild(cb);
      row.appendChild(el("label", { for: id, text: optionLabel(field, opt) }));
      grid.appendChild(row);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function renderBoolRow(field) {
    const id = `field_${field.key}`;
    const row = el("div", { class: "checkbox-row" });
    const cb = el("input", {
      type: "checkbox", id,
      onchange: (e) => { formData[field.key] = e.target.checked; },
    });
    cb.checked = !!formData[field.key];
    row.appendChild(cb);
    row.appendChild(el("label", { for: id, text: fieldLabel(field) }));
    return row;
  }

  function renderField(field) {
    if (field.type === "enum") return renderSelect(field);
    if (field.type === "number") return renderNumber(field);
    if (field.type === "string") return renderText(field);
    if (field.type === "multiselect") return renderMultiselect(field);
    return null; // bool handled separately (grouped)
  }

  function renderIntroStep(container) {
    container.appendChild(el("h2", { text: t("consentTitle") }));
    const box = el("div", { class: "consent-box" });
    box.appendChild(el("p", { text: t("consentBody") }));
    container.appendChild(box);

    const consentRow = el("div", { class: "checkbox-row", style: "margin-bottom:20px;" });
    const consentCb = el("input", {
      type: "checkbox", id: "consentCb",
      onchange: (e) => { formData.consent_given = e.target.checked; },
    });
    consentCb.checked = !!formData.consent_given;
    consentRow.appendChild(consentCb);
    consentRow.appendChild(el("label", { for: "consentCb", text: t("consentCheckbox") }));
    container.appendChild(consentRow);

    // respondent_type as option cards
    const rtField = FIELDS.find((f) => f.key === "respondent_type");
    container.appendChild(el("label", { class: "field-label", text: t("respondentTypeQuestion") }));
    const group = el("div", { class: "option-card-group", style: "margin-bottom:18px;" });
    ["leaver", "form5"].forEach((val) => {
      const id = `rt_${val}`;
      const card = el("label", { for: id, class: "option-card" + (formData.respondent_type === val ? " selected" : "") });
      const radio = el("input", {
        type: "radio", name: "respondent_type", id, value: val,
        onchange: () => { formData.respondent_type = val; render(); },
      });
      radio.checked = formData.respondent_type === val;
      card.appendChild(radio);
      card.appendChild(document.createTextNode(t(`respondentType_${val}`)));
      group.appendChild(card);
    });
    container.appendChild(group);

    const cohortField = FIELDS.find((f) => f.key === "cohort_year");
    container.appendChild(renderNumber(cohortField));
  }

  function renderGenericStep(stepKey, container) {
    container.appendChild(el("h2", { text: groupTitle(stepKey) }));
    const fields = stepFields[stepKey].filter(isVisible);
    const boolFields = fields.filter((f) => f.type === "bool");
    const otherFields = fields.filter((f) => f.type !== "bool");

    otherFields.forEach((f) => container.appendChild(renderField(f)));

    if (boolFields.length) {
      container.appendChild(el("label", { class: "field-label", text: lang === "bm" ? "Isi rumah anda mempunyai:" : "Your household has:" }));
      const grid = el("div", { class: "asset-grid" });
      boolFields.forEach((f) => grid.appendChild(renderBoolRow(f)));
      container.appendChild(grid);
    }
  }

  function validateStep(stepKey) {
    const missing = [];
    if (stepKey === "intro") {
      if (!formData.consent_given) missing.push("consent");
      if (!formData.respondent_type) missing.push("respondent_type");
      if (!formData.cohort_year) missing.push("cohort_year");
      return missing;
    }
    stepFields[stepKey].filter(isVisible).forEach((f) => {
      if (!f.required) return;
      const v = formData[f.key];
      if (f.type === "multiselect") { if (!Array.isArray(v) || v.length === 0) missing.push(f.key); }
      else if (v === undefined || v === null || v === "") missing.push(f.key);
    });
    return missing;
  }

  function renderNav(container, stepKey, isLast) {
    const nav = el("div", { class: "nav-row" });
    if (stepIndex > 0) {
      nav.appendChild(el("button", { class: "btn btn-secondary", type: "button", onclick: () => { stepIndex--; render(); } }, [document.createTextNode(t("back"))]));
    } else {
      nav.appendChild(el("span", {}));
    }
    const label = isLast ? t("submit") : t("next");
    nav.appendChild(el("button", {
      class: "btn btn-primary", type: "button",
      onclick: () => (isLast ? handleSubmit() : handleNext(stepKey)),
    }, [document.createTextNode(label)]));
    container.appendChild(nav);
  }

  function handleNext(stepKey) {
    const missing = validateStep(stepKey);
    if (missing.length) {
      showError(t("errorGeneric"));
      return;
    }
    stepIndex++;
    render();
  }

  function showError(msg) {
    const existing = document.querySelector(".error-box");
    if (existing) existing.remove();
    const box = el("div", { class: "error-box", text: msg });
    cardArea.insertBefore(box, cardArea.firstChild);
  }

  async function handleSubmit() {
    const missing = validateStep("followup");
    if (missing.length) { showError(t("errorGeneric")); return; }

    // Full re-check across all steps before sending.
    for (const s of STEP_ORDER) {
      const m = validateStep(s);
      if (m.length) {
        showError(t("errorGeneric"));
        stepIndex = STEP_ORDER.indexOf(s);
        render();
        return;
      }
    }

    const submitBtn = document.querySelector(".btn-primary");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = t("submitting"); }

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.ok) {
        showError(data.error || t("errorGeneric"));
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = t("submit"); }
        return;
      }
      followUpCode = data.follow_up_code;
      renderThankYou();
    } catch (e) {
      showError(t("errorGeneric"));
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = t("submit"); }
    }
  }

  function renderThankYou() {
    cardArea.innerHTML = "";
    const box = el("div", { class: "thankyou" });
    box.appendChild(el("h2", { text: t("followUpCodeTitle") }));
    box.appendChild(el("p", { text: t("followUpCodeBody") }));
    box.appendChild(el("div", { class: "code", text: followUpCode }));
    box.appendChild(el("p", { class: "note", text: t("followUpCodeNote") }));
    box.appendChild(el("button", {
      class: "btn btn-primary", type: "button",
      onclick: () => { formData = { main_reason_for_choice: [] }; stepIndex = 0; followUpCode = null; render(); },
    }, [document.createTextNode(t("submitAnother"))]));
    cardArea.appendChild(box);
    document.getElementById("progressFill").style.width = "100%";
    document.getElementById("progressLabel").textContent = "";
    // honeypot not needed on thank-you screen
  }

  function render() {
    const stepKey = STEP_ORDER[stepIndex];
    cardArea.innerHTML = "";

    const honeypot = el("input", { type: "text", name: "_hp", class: "hp-field", tabindex: "-1", autocomplete: "off" });
    cardArea.appendChild(honeypot);
    honeypot.addEventListener("input", (e) => { formData._hp = e.target.value; });

    if (stepKey === "intro") renderIntroStep(cardArea);
    else renderGenericStep(stepKey, cardArea);

    renderNav(cardArea, stepKey, stepIndex === STEP_ORDER.length - 1);

    const pct = Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100);
    progressFill.style.width = pct + "%";
    progressLabel.textContent = `${t("step")} ${stepIndex + 1} ${t("of")} ${STEP_ORDER.length} — ${groupTitle(stepKey)}`;
  }

  function updateStaticText() {
    document.getElementById("pageTitle").textContent = t("title");
    document.getElementById("pageSubtitle").textContent = t("subtitle");
    langToggle.textContent = t("langToggle");
  }

  langToggle.addEventListener("click", () => {
    lang = lang === "bm" ? "en" : "bm";
    updateStaticText();
    render();
  });

  updateStaticText();
  render();
})();
