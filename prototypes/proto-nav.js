// Shared interactive navigation & frame switcher for Current vs Draft HTML prototypes.
(function () {
  const path = window.location.pathname.replace(/\\/g, "/");
  const file = path.split("/").pop() || "today.html";
  const isDraft = path.includes("/draft/");
  const isCurrent = path.includes("/current/");
  if (!isDraft && !isCurrent) return;

  const screens = [
    { file: "today.html", label: "Today" },
    { file: "log.html", label: "Log" },
    { file: "entry-edit.html", label: "Entry Edit" },
    { file: "pantry.html", label: "Pantry" },
    { file: "supplements.html", label: "Supplements" },
    { file: "products.html", label: "Products & Scan" },
    { file: "search.html", label: "Add Food" },
    { file: "text-log.html", label: "Edit Meal List & AI" },
    { file: "recipes.html", label: "Recipes (Current) ★" },
    { file: "cooking.html", label: "Cooking (Draft) ★" },
    { file: "meal-prep.html", label: "Meal Prep (Draft) ★" },
    { file: "progress.html", label: "Progress" },
    { file: "measure.html", label: "Measurements" },
    { file: "workouts.html", label: "Workouts" },
    { file: "settings.html", label: "More & Settings" },
    { file: "onboarding.html", label: "Setup" },
  ];

  // Inject interactive styles using theme.css variables only
  const style = document.createElement("style");
  style.textContent = `
    .proto-bar {
      width: 100%;
      max-width: 1320px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: var(--space-3) var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      box-shadow: var(--shadow);
    }
    .proto-bar-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      flex-wrap: wrap;
    }
    .proto-brand {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--text);
    }
    .proto-pill {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-pill, 999px);
      font-size: var(--text-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .proto-pill.current {
      background: var(--ok-soft, rgba(76, 195, 138, 0.14));
      color: var(--ok);
    }
    .proto-pill.draft {
      background: var(--estimate-soft);
      color: var(--estimate);
    }
    .proto-controls {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
    .proto-btn {
      height: 34px;
      padding: 0 var(--space-3);
      border-radius: var(--radius-pill, 999px);
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--text);
      font-size: var(--text-xs);
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      text-decoration: none;
      cursor: pointer;
    }
    .proto-btn:hover {
      border-color: var(--accent);
      color: var(--accent-text);
    }
    .proto-btn.active {
      background: var(--accent);
      color: var(--accent-ink);
      border-color: var(--accent);
    }
    .proto-links {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      flex-wrap: wrap;
      padding-top: var(--space-2);
      border-top: 1px solid var(--border);
    }
    .proto-link {
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
      color: var(--muted);
      text-decoration: none;
      font-weight: 500;
    }
    .proto-link:hover {
      color: var(--text);
      background: var(--surface-2);
    }
    .proto-link.on {
      color: var(--accent-text);
      background: var(--accent-soft);
      font-weight: 700;
    }
    .frame-step-nav {
      display: none;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
    body.single-frame-mode .frame-step-nav {
      display: flex;
    }
    body.single-frame-mode .frames > div {
      display: none;
    }
    body.single-frame-mode .frames > div.active-frame {
      display: block;
    }
    .phone [data-go],
    .phone a[href],
    .phone button,
    .phone .row,
    .phone .prod,
    .phone .chip,
    .phone .fab {
      transition: transform 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease;
    }
    .phone [data-go]:hover,
    .phone a[href]:hover,
    .phone button:hover,
    .phone .row:hover,
    .phone .prod:hover,
    .phone .fab:hover {
      opacity: 0.92;
    }
    .phone [data-go]:active,
    .phone button:active {
      transform: scale(0.98);
    }
    @keyframes framePulse {
      0% { box-shadow: 0 0 0 0 var(--accent); }
      40% { box-shadow: 0 0 0 4px var(--accent); }
      100% { box-shadow: var(--shadow); }
    }
    .phone.pulse-target {
      animation: framePulse 0.9s ease;
    }
  `;
  document.head.appendChild(style);

  // Build top navigation bar
  const existingToolbar = document.querySelector(".toolbar");
  const bar = document.createElement("header");
  bar.className = "proto-bar";

  const otherFolder = isCurrent ? "../draft/" : "../current/";
  const otherLabel = isCurrent ? "Switch to Draft" : "Switch to Current App";
  const sideBySideHref = `../index.html?screen=${encodeURIComponent(file)}`;

  bar.innerHTML = `
    <div class="proto-bar-top">
      <div class="proto-brand">
        <a href="../index.html" class="proto-btn" title="Open Side-by-Side Comparison Hub">⇄ Compare Hub</a>
        <span class="proto-pill ${isCurrent ? "current" : "draft"}">
          ${isCurrent ? "● Current Mobile App" : "○ Draft Prototype"}
        </span>
      </div>
      <div class="proto-controls">
        <a href="${sideBySideHref}" class="proto-btn">Split View (Current vs Draft)</a>
        <a href="${otherFolder}${file}" class="proto-btn">${otherLabel}</a>
        <button type="button" class="proto-btn" id="proto-mode-btn">Interactive 1-Phone Mode</button>
        <button type="button" class="proto-btn" id="proto-theme-btn">Light / Dark</button>
      </div>
    </div>
    <nav class="proto-links" aria-label="Prototype screens">
      ${screens
        .map(
          (s) =>
            `<a href="${s.file}" class="proto-link ${s.file === file ? "on" : ""}">${s.label}</a>`,
        )
        .join("")}
    </nav>
    <div class="frame-step-nav" id="proto-frame-tabs"></div>
  `;

  if (existingToolbar) {
    existingToolbar.replaceWith(bar);
  } else {
    document.body.prepend(bar);
  }

  // Assign IDs to each phone frame wrapper (.frames > div)
  const frameDivs = Array.from(document.querySelectorAll(".frames > div"));
  const frameTabs = document.getElementById("proto-frame-tabs");

  function selectFrame(index, scrollIntoView) {
    if (index < 0 || index >= frameDivs.length) return;
    frameDivs.forEach((div, i) => {
      div.classList.toggle("active-frame", i === index);
    });
    if (frameTabs) {
      Array.from(frameTabs.children).forEach((btn, i) => {
        btn.classList.toggle("active", i === index);
      });
    }
    const targetDiv = frameDivs[index];
    if (targetDiv && scrollIntoView) {
      targetDiv.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      const phone = targetDiv.querySelector(".phone");
      if (phone) {
        phone.classList.remove("pulse-target");
        void phone.offsetWidth;
        phone.classList.add("pulse-target");
      }
    }
  }

  frameDivs.forEach((div, idx) => {
    const num = idx + 1;
    if (!div.id) div.id = `frame-${num}`;
    const labelEl = div.querySelector(".frame-label");
    const labelText = labelEl ? labelEl.textContent.trim() : `Screen ${num}`;
    if (frameTabs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "proto-btn" + (idx === 0 ? " active" : "");
      btn.textContent = labelText;
      btn.onclick = () => selectFrame(idx, true);
      frameTabs.appendChild(btn);
    }
  });

  if (frameDivs.length > 0) {
    frameDivs[0].classList.add("active-frame");
  }

  // Check URL hash on load (e.g. #frame-2)
  function applyHash() {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const idx = frameDivs.findIndex((d) => d.id === hash);
    if (idx >= 0) {
      selectFrame(idx, true);
    }
  }
  window.addEventListener("hashchange", applyHash);
  setTimeout(applyHash, 60);

  // Mode toggle (All Frames vs Single Interactive Phone)
  const modeBtn = document.getElementById("proto-mode-btn");
  if (modeBtn) {
    const savedMode = sessionStorage.getItem("proto-single-mode") === "1";
    if (savedMode) {
      document.body.classList.add("single-frame-mode");
      modeBtn.classList.add("active");
      modeBtn.textContent = "Show All Frames";
    }
    modeBtn.onclick = () => {
      const single = document.body.classList.toggle("single-frame-mode");
      sessionStorage.setItem("proto-single-mode", single ? "1" : "0");
      modeBtn.classList.toggle("active", single);
      modeBtn.textContent = single ? "Show All Frames" : "Interactive 1-Phone Mode";
    };
  }

  // Theme toggle
  const themeBtn = document.getElementById("proto-theme-btn");
  const savedTheme = sessionStorage.getItem("proto-theme");
  if (savedTheme) {
    document.documentElement.dataset.theme = savedTheme;
  }
  if (themeBtn) {
    themeBtn.onclick = () => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      sessionStorage.setItem("proto-theme", next);
    };
  }

  // Navigate helper for [data-go] and auto-wired buttons
  function navigateTo(target) {
    if (!target) return;
    if (target.startsWith("#")) {
      const id = target.slice(1);
      const idx = frameDivs.findIndex((d) => d.id === id);
      if (idx >= 0) {
        history.replaceState(null, "", target);
        selectFrame(idx, true);
        return;
      }
    }
    window.location.href = target;
  }

  // Delegate clicks inside .phone frames
  document.addEventListener("click", (e) => {
    const goEl = e.target.closest("[data-go]");
    if (goEl) {
      e.preventDefault();
      navigateTo(goEl.getAttribute("data-go"));
      return;
    }

    // Interactive chip selection inside a .chips or .seg container
    const chipEl = e.target.closest(".phone .chip, .phone .seg span");
    if (chipEl && !chipEl.closest("a")) {
      const parent = chipEl.parentElement;
      if (parent) {
        Array.from(parent.children).forEach((sib) => sib.classList.remove("on"));
        chipEl.classList.add("on");
      }
    }

    // Fallback smart routing for buttons/rows inside draft phones that don't have explicit data-go
    const phoneEl = e.target.closest(".phone");
    if (!phoneEl) return;
    const anchor = e.target.closest("a[href]");
    if (anchor) return; // let normal links work

    const actionable = e.target.closest("button, .btn, .fab, .back, .row, .prod, .meal-add");
    if (!actionable) return;

    const frameWrapper = phoneEl.closest(".frames > div");
    const currentIdx = frameDivs.indexOf(frameWrapper);
    const label = (actionable.textContent || "").trim().toLowerCase();

    if (label.includes("back") || label.includes("cancel") || label.includes("‹")) {
      if (currentIdx > 0) {
        selectFrame(currentIdx - 1, true);
      } else {
        window.history.back();
      }
      return;
    }
    if (label.includes("scan")) {
      navigateTo("products.html#frame-2");
      return;
    }
    if (label.includes("supplement")) {
      navigateTo("supplements.html#frame-1");
      return;
    }
    if (label.includes("paste") || label.includes("type or paste")) {
      navigateTo("text-log.html#frame-1");
      return;
    }
    if (label.includes("search")) {
      navigateTo("search.html#frame-1");
      return;
    }
    if (label.includes("workout") || label.includes("routine")) {
      navigateTo("workouts.html#frame-1");
      return;
    }
    if (label.includes("recipe") || label.includes("cook")) {
      navigateTo("recipes.html#frame-1");
      return;
    }
    if (label.includes("measure")) {
      navigateTo("measure.html#frame-1");
      return;
    }
    // Default: advance to the next frame in the flow if one exists
    if (currentIdx >= 0 && currentIdx + 1 < frameDivs.length) {
      selectFrame(currentIdx + 1, true);
    } else if (currentIdx > 0) {
      selectFrame(0, true);
    }
  });
})();
