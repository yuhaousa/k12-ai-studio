const state = {
  user: JSON.parse(localStorage.getItem("ai-school-user") || "null"),
  data: null,
  page: "dashboard",
  tool: "writing",
  storyMessage: "",
  storyPageIndex: 0,
  currentStoryPages: [],
  storyTitle: "",
  storyPrompt: ""
};

const $ = selector => document.querySelector(selector);

function html(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function currentStudentStoryPages() {
  return state.currentStoryPages.length
    ? state.currentStoryPages
    : state.data.bookPages.filter(page => page.studentId === state.user.id).slice(0, 4);
}

function currentStoryIsSaved() {
  const pageIds = currentStudentStoryPages().map(page => page.id);
  return Boolean(pageIds.length && state.data.storyBooks?.some(book => book.studentId === state.user.id && pageIds.every(pageId => book.pageIds.includes(pageId))));
}

function imageErrorMessage(error) {
  const message = String(error || "");
  if (/QUOTA_EXHAUSTED|额度已用完|quota/i.test(message)) {
    return "Image quota is used up. Please update the AI key or add image quota, then retry.";
  }
  if (/API_KEY_DISABLED|disabled/i.test(message)) {
    return "Image API key is disabled. Please save an active Sub2API key in Admin AI settings.";
  }
  if (/401|unauthorized|api key/i.test(message)) {
    return "Image API key is invalid or unauthorized. Please check Admin AI settings.";
  }
  if (/abort|timeout/i.test(message)) {
    return "Image generation timed out. Please retry this page.";
  }
  return message || "Image generation failed.";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": state.user?.id || "",
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

async function load() {
  if (!state.user) return renderLogin();
  state.data = await api("/api/bootstrap");
  renderApp();
}

function roleLabel(role) {
  return { student: "Student", teacher: "Teacher", admin: "Admin" }[role] || role;
}

function statusChip(status) {
  const style = status === "reviewed" ? "ok" : status === "blocked" ? "danger" : "warn";
  return `<span class="chip ${style}">${status || "draft"}</span>`;
}

function storyTitleFromText(text) {
  const clean = String(text || "").replace(/[，。,、；;：:\n\r]+/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return "AI 繪本";
  return clean.length > 18 ? `${clean.slice(0, 18)}...` : clean;
}

function readStoryText(text) {
  if (!("speechSynthesis" in window)) {
    alert("This browser does not support text reading.");
    return;
  }
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(String(text || ""));
  utterance.lang = "zh-HK";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function refreshStoryOutputs() {
  const pages = currentStudentStoryPages();
  if ($("#storyResult")) {
    $("#storyResult").innerHTML = renderStoryPager(pages);
    bindStoryPager();
  }
  if ($("#storyPlainResult")) $("#storyPlainResult").innerHTML = renderStoryText(pages);
}

function exportStoryPdf() {
  const pages = currentStudentStoryPages();
  if (!pages.length) {
    alert("Please generate a storybook first.");
    return;
  }
  const title = html(state.storyTitle || storyTitleFromText(pages[0]?.text || "AI Storybook"));
  const pageHtml = pages.map((page, index) => `
    <section class="pdf-page">
      <h2>Page ${index + 1}</h2>
      ${page.imageUrl ? `<img src="${html(page.imageUrl)}" alt="Storybook page ${index + 1}">` : `<div class="pdf-placeholder">Image is still generating</div>`}
      <p>${html(page.text)}</p>
    </section>`).join("");
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to export the PDF.");
    return;
  }
  printWindow.document.write(`<!doctype html>
    <html lang="zh-Hant">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body{font-family:Arial,"Noto Sans TC",sans-serif;margin:0;padding:28px;color:#171829;background:#fff;}
          h1{font-size:28px;margin:0 0 18px;text-align:center;}
          h2{font-size:16px;margin:0 0 10px;color:#5b4fe8;}
          .pdf-page{break-after:page;page-break-after:always;min-height:92vh;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;}
          .pdf-page:last-child{break-after:auto;page-break-after:auto;}
          img,.pdf-placeholder{width:min(520px,92vw);aspect-ratio:1;object-fit:cover;border-radius:12px;border:1px solid #dde2ee;}
          .pdf-placeholder{display:grid;place-items:center;background:#f6f7fb;color:#6b7280;}
          p{font-size:24px;line-height:1.55;margin:0;max-width:680px;font-weight:700;}
        </style>
      </head>
      <body><h1>${title}</h1>${pageHtml}</body>
    </html>`);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 300);
}

function renderLogin() {
  $("#app").innerHTML = `
    <main class="login">
      <section class="login-panel">
        <div class="login-visual">
          <div>
            <div class="mark">AI</div>
            <h2>AI Learning Studio for Writing, Storybooks and History</h2>
            <p>Built from the tender brief: writing support, picture-book generation, animated publishing workflow, teacher monitoring, school records, content filtering and role-based access.</p>
          </div>
          <p>Demo passwords: student / teacher / admin</p>
        </div>
        <form class="login-form" id="loginForm">
          <div>
            <h2>Sign in</h2>
            <p class="muted">Choose a school role to open the matching workspace.</p>
          </div>
          <label class="field"><span>Role</span><select name="role"><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select></label>
          <label class="field"><span>Password</span><input name="password" type="password" value="student"></label>
          <button class="primary" type="submit">Enter platform</button>
          <div class="error" id="loginError"></div>
        </form>
      </section>
    </main>`;

  $("#loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const { user } = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ role: form.get("role"), password: form.get("password") })
      });
      state.user = user;
      state.page = "dashboard";
      localStorage.setItem("ai-school-user", JSON.stringify(user));
      await load();
    } catch (error) {
      $("#loginError").textContent = error.message;
    }
  });
}

function navGroups() {
  if (state.user.role === "student") {
    return [
      { title: "學習", items: [{ id: "dashboard", icon: "🏠", label: "學習主頁" }] },
      {
        title: "AI 創作工具",
        items: [
          { id: "studio", tool: "writing", icon: "✍️", label: "寫作助手" },
          { id: "studio", tool: "storybook", icon: "📖", label: "AI 繪本" },
          { id: "studio", tool: "history", icon: "🏛️", label: "歷史探究" }
        ]
      },
      { title: "我的空間", items: [{ id: "portfolio", icon: "📚", label: "我的作品" }] }
    ];
  }
  if (state.user.role === "teacher") {
    return [
      { title: "概覽", items: [{ id: "dashboard", icon: "🏠", label: "教師主頁" }] },
      { title: "教學管理", items: [{ id: "review", icon: "📝", label: "批改審閱" }, { id: "class", icon: "👥", label: "班級進度" }] }
    ];
  }
  return [
    { title: "概覽", items: [{ id: "dashboard", icon: "🏠", label: "管理主頁" }] },
    { title: "系統管理", items: [{ id: "users", icon: "👤", label: "帳戶權限" }, { id: "ai", icon: "🤖", label: "AI 設定" }, { id: "compliance", icon: "🛡️", label: "合規紀錄" }] }
  ];
}

function isNavActive(item) {
  if (item.id !== state.page) return false;
  if (item.tool) return state.tool === item.tool;
  return true;
}

function renderNav() {
  return navGroups().map(group => `
    <div class="nav-section">${group.title}</div>
    ${group.items.map(item => `
      <button class="${isNavActive(item) ? "active" : ""}" data-nav="${item.id}" ${item.tool ? `data-tool-nav="${item.tool}"` : ""}>
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </button>`).join("")}
  `).join("");
}

function renderApp() {
  const nav = renderNav();
  const roleSub = state.user.role === "student" ? `${state.user.className || "P5A"} · ${state.user.level || "P5"}` : state.user.role === "teacher" ? `${state.user.className || "P5A"} 教師` : "學校管理員";
  $("#app").innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="mark">🤖</div>
          <div><h1>AI學習平台</h1><p>${roleLabel(state.user.role)} workspace</p></div>
        </div>
        <div class="sidebar-user">
          <div class="avatar">${state.user.name.slice(0, 1)}</div>
          <div class="user-info">
            <div class="user-name">${state.user.name}</div>
            <div class="user-class">${roleSub}</div>
          </div>
        </div>
        <nav class="nav">
          ${nav}
        </nav>
        <div class="sidebar-bottom">
          <div class="token-bar-label"><span>AI 用量</span><strong>62%</strong></div>
          <div class="token-bar"><div class="token-bar-fill"></div></div>
        </div>
        <button class="ghost" id="logout">登出</button>
      </aside>
      <main class="main">
        <div class="topbar">
          <div class="page-title"><h2>${pageTitle()}</h2><p>${pageSubtitle()}</p></div>
          <div class="user-pill"><span>${state.user.name}</span><div class="avatar">${state.user.name.slice(0, 1)}</div></div>
        </div>
        <div id="view">${renderView()}</div>
      </main>
    </div>`;

  document.querySelectorAll("[data-nav]").forEach(button => {
    button.addEventListener("click", () => {
      state.page = button.dataset.nav;
      if (button.dataset.toolNav) state.tool = button.dataset.toolNav;
      renderApp();
    });
  });
  $("#logout").addEventListener("click", () => {
    localStorage.removeItem("ai-school-user");
    state.user = null;
    state.data = null;
    renderLogin();
  });
  bindView();
}

function pageTitle() {
  return {
    dashboard: "Dashboard",
    studio: "AI Learning Studio",
    portfolio: "Portfolio",
    review: "Teacher Review",
    class: "Class Progress",
    users: "Users & Roles",
    ai: "AI Settings",
    compliance: "Compliance & Records"
  }[state.page];
}

function pageSubtitle() {
  return {
    dashboard: "Live overview of learning activity and school platform health.",
    studio: "Create writing, picture books, animated scripts and historical inquiry.",
    portfolio: "Collected writing, story pages and teacher feedback.",
    review: "Monitor progress, review submissions and approve filtered work.",
    class: "Class-level learning evidence and AI usage records.",
    users: "Manage student, teacher and administrator accounts.",
    ai: "Configure Sub2API or another OpenAI-compatible provider securely on the backend.",
    compliance: "Safety filters, audit trail, data handling and export readiness."
  }[state.page];
}

function renderView() {
  if (state.page === "dashboard") return renderDashboard();
  if (state.page === "studio") return renderStudio();
  if (state.page === "portfolio") return renderPortfolio();
  if (state.page === "review") return renderReview();
  if (state.page === "class") return renderClass();
  if (state.page === "users") return renderUsers();
  if (state.page === "ai") return renderAiSettings();
  if (state.page === "compliance") return renderCompliance();
  return "";
}

function renderDashboard() {
  const summary = state.data.summary;
  return `
    <section class="banner">
      <h2>${state.user.name}，歡迎回來</h2>
      <p>今天可以繼續寫作、生成四頁繪本、與歷史人物對話，或查看班級學習進度。</p>
      <div class="chips"><span class="chip">Sub2API ${state.data.aiSettings?.enabled ? "已啟用" : "備用模式"}</span><span class="chip">P3-P6</span><span class="chip">繁中 / 粵語 / English</span></div>
    </section>
    <section class="grid stats">
      ${stat("Students", summary.studentCount)}
      ${stat("Works", summary.workCount)}
      ${stat("Pending review", summary.pendingReview)}
      ${stat("Avg score", `${summary.averageScore}%`)}
      ${stat("AI interactions", summary.aiInteractions)}
    </section>
    <section class="grid two" style="margin-top:16px">
      <div class="card">
        <div class="section-head"><h3>Active Assignments</h3><span class="chip ok">P3-P6 ready</span></div>
        <div class="list">${state.data.assignments.map(renderAssignment).join("")}</div>
      </div>
      <div class="card">
        <h3>Requirement Coverage</h3>
        <div class="list" style="margin-top:14px">
          ${["Writing correction and scaffolding", "Text-to-image storybook workflow", "Historical persona dialogue", "Teacher monitoring and e-book export", "Moderation and audit records"].map((item, index) => `<div class="item"><h4>${index + 1}. ${item}</h4><div class="progress"><span style="width:${88 - index * 5}%"></span></div></div>`).join("")}
        </div>
      </div>
    </section>`;
}

function stat(label, value) {
  return `<div class="card stat"><strong>${value}</strong><span>${label}</span></div>`;
}

function renderAssignment(item) {
  return `<article class="item"><h4>${item.title}</h4><p>${item.subject} · ${item.level} · Due ${item.dueDate}</p><p>${item.prompt}</p><div class="chips">${item.supports.map(support => `<span class="chip">${support}</span>`).join("")}</div></article>`;
}

function renderStudio() {
  return `
    <div class="tabs">
      ${["writing", "storybook", "history"].map(id => `<button class="${state.tool === id ? "active" : ""}" data-tool="${id}">${{ writing: "Writing", storybook: "Storybook", history: "History" }[id]}</button>`).join("")}
    </div>
    ${state.tool === "writing" ? renderWritingTool() : state.tool === "storybook" ? renderStoryTool() : renderHistoryTool()}`;
}

function renderWritingTool() {
  return `
    <section class="grid two">
      <form class="card grid" id="writingForm">
        <h3>A1 Writing Course</h3>
        <label class="field"><span>Title</span><input name="title" value="我的校園故事"></label>
        <label class="field"><span>Assignment</span><select name="assignmentId">${state.data.assignments.map(item => `<option value="${item.id}">${item.title}</option>`).join("")}</select></label>
        <label class="field"><span>Draft</span><textarea name="content">今天小息時，我在操場看見同學互相幫忙，覺得校園很溫暖。</textarea></label>
        <button class="primary">Get AI feedback</button>
      </form>
      <div class="card">
        <h3>Feedback</h3>
        <div class="result" id="writingResult">Grammar, vocabulary upgrade and content comments will appear here.</div>
      </div>
    </section>`;
}

function renderStoryTool() {
  const latestPages = state.currentStoryPages.length ? state.currentStoryPages : state.data.bookPages.filter(page => page.studentId === state.user.id).slice(0, 4);
  const storyTitle = state.storyTitle || storyTitleFromText(latestPages[0]?.text || "");
  const styles = [
    { value: "fantasy", emoji: "🔮", label: "奇幻" },
    { value: "cyberpunk", emoji: "🌆", label: "賽博朋克" },
    { value: "watercolor", emoji: "🖼️", label: "水彩畫" },
    { value: "realistic", emoji: "🏙️", label: "寫實" },
    { value: "cartoon", emoji: "🎈", label: "動漫" },
    { value: "oil painting", emoji: "🖌️", label: "油畫" },
    { value: "geometric", emoji: "📐", label: "幾何" },
    { value: "nature", emoji: "🌿", label: "自然" }
  ];
  return `
    <section class="grid two">
      <form class="card story-prompt-card" id="storyForm">
        <label class="story-prompt-label" for="storySeed">✏️ 輸入你的描述 (Prompt)</label>
        <textarea id="storySeed" name="seed" class="story-prompt-box">一座充滿魔法的森林，樹木發出藍色螢光，小精靈在林間飛舞，夜晚，奇幻風格，超高清畫質</textarea>
        <p class="story-hint">💡 描述越詳細，圖像越精準！試試加入「風格」、「顏色」、「氣氛」等描述。</p>
        <div class="story-row-head">🎭 選擇風格</div>
        <input type="hidden" name="style" value="fantasy">
        <div class="style-card-grid">
          ${styles.map((style, index) => `
            <button class="style-card ${index === 0 ? "selected" : ""}" type="button" data-style-choice="${style.value}">
              <span class="style-emoji">${style.emoji}</span>
              <span>${style.label}</span>
            </button>`).join("")}
        </div>
        <label class="field compact-language"><span>Language</span><select name="language"><option>繁體中文</option><option>粵語口語</option><option>English</option></select></label>
        <button class="primary story-generate-btn" id="storyGenerateButton" type="button" data-generate-story>🪄 生成繪本</button>
        <div class="story-actions">
          <button class="secondary" type="button" data-save-story ${latestPages.length && currentStoryIsSaved() ? "disabled" : ""}>${latestPages.length && currentStoryIsSaved() ? "Saved to portfolio" : "Save to portfolio"}</button>
          <button class="secondary" type="button" data-export-pdf>Export PDF</button>
          <div class="error" id="storyStatus">${state.storyMessage}</div>
        </div>
      </form>
      <div class="card">
        <div class="section-head">
          <h3 id="storyPreviewTitle">${storyTitle}</h3>
          <span class="chip ${latestPages.length ? "ok" : "warn"}">${latestPages.length ? "Latest storybook" : "Waiting"}</span>
        </div>
        <div id="storyResult">${renderStoryPager(latestPages)}</div>
      </div>
    </section>
    <section class="card story-output">
      <div class="section-head">
        <h3>Latest Storybook Content</h3>
        <span class="chip ${latestPages.length ? "ok" : "warn"}">${latestPages.length ? `${latestPages.length} pages` : "No pages yet"}</span>
      </div>
      <div class="story-list" id="storyPlainResult">${renderStoryText(latestPages)}</div>
    </section>`;
}

function renderHistoryTool() {
  return `
    <section class="grid two">
      <form class="card grid" id="historyForm">
        <h3>B1-B3 History Inquiry</h3>
        <label class="field"><span>Persona</span><select name="persona"><option>玄奘</option><option>秦始皇</option><option>鄭和</option><option>孫中山</option></select></label>
        <label class="field"><span>Question</span><textarea name="question">你當時為甚麼要出發？我們可以用甚麼證據證明？</textarea></label>
        <button class="primary" id="historyAskButton">Ask historical persona</button>
        <div class="error" id="historyStatus"></div>
      </form>
      <div class="card">
        <h3>Conversation</h3>
        <div class="chat-log" id="chatResult">${state.data.conversations.slice(0, 6).map(renderChat).join("") || `<div class="empty">No conversations yet.</div>`}</div>
      </div>
    </section>`;
}

function renderBookPages(pages) {
  if (!pages.length) return `<div class="empty">Generate a storybook to create consistent pages and image prompts.</div>`;
  return pages.map(page => `
    <article class="book-page">
      ${page.imageUrl ? `<img class="story-image" data-page-image="${page.id}" src="${html(page.imageUrl)}" alt="Page ${page.page} generated illustration">` : `<div class="story-image placeholder ${page.imageError ? "failed" : ""}" data-page-image="${page.id}">${page.imageError ? html(imageErrorMessage(page.imageError)) : "Generating image..."}</div>`}
      ${page.imageError ? `<button class="secondary story-retry" type="button" data-retry-image="${page.id}">Retry image</button>` : ""}
      <details class="prompt-details">
        <summary title="${page.imageError ? "Show image error" : "Show image prompt"}">i</summary>
        <div class="art-box"><strong>${page.imageError ? "Image error" : "AI image prompt"}</strong><br>${html(page.imageError ? imageErrorMessage(page.imageError) : page.imagePrompt)}</div>
      </details>
      <div><p>${html(page.text)}</p></div>
    </article>`).join("");
}

function renderStoryPager(pages) {
  if (!pages.length) return `<div class="empty">Generate a storybook to create consistent pages and image prompts.</div>`;
  const index = Math.min(Math.max(state.storyPageIndex, 0), pages.length - 1);
  const page = pages[index];
  return `
    <div class="story-pager">
      <div class="story-pager-head">
        <button class="ghost" type="button" data-story-prev ${index === 0 ? "disabled" : ""}>‹ Previous</button>
        <span class="chip">Page ${index + 1} / ${pages.length}</span>
        <button class="ghost" type="button" data-story-next ${index === pages.length - 1 ? "disabled" : ""}>Next ›</button>
      </div>
      <div class="story-read-row">
        <button class="secondary" type="button" data-read-story>Read text</button>
      </div>
      ${renderBookPages([page])}
    </div>`;
}

function renderStoryText(pages) {
  if (!pages.length) return `<div class="empty">Generated page text will appear here.</div>`;
  return pages.map(page => `
    <article class="item">
      <h4>Page ${page.page}</h4>
      ${page.imageUrl ? `<img class="story-list-image" src="${html(page.imageUrl)}" alt="Page ${page.page} generated illustration">` : ""}
      <details class="prompt-details compact">
        <summary title="Show image prompt">i</summary>
        <div class="art-box"><strong>Image prompt</strong><br>${html(page.imagePrompt)}</div>
      </details>
      <p>${html(page.text)}</p>
    </article>`).join("");
}

function renderChat(chat) {
  return `<div class="message"><strong>${chat.persona}</strong><p>${chat.reply}</p><p class="muted">${chat.sourceTip}</p></div>`;
}

function renderSavedStoryBook(book) {
  const pages = book.pageIds.map(pageId => state.data.bookPages.find(page => page.id === pageId)).filter(Boolean);
  const cover = pages.find(page => page.imageUrl) || pages[0];
  return `
    <article class="saved-book">
      ${cover?.imageUrl ? `<img class="saved-book-cover" src="${html(cover.imageUrl)}" alt="${html(book.title)} cover">` : `<div class="saved-book-cover placeholder">No image yet</div>`}
      <div class="saved-book-body">
        <h4>${html(book.title)}</h4>
        <p>${pages.length} pages · ${new Date(book.updatedAt || book.createdAt).toLocaleDateString()}</p>
        ${book.prompt ? `<p><strong>Prompt:</strong> ${html(book.prompt)}</p>` : ""}
        <p>${html(pages[0]?.text || "")}</p>
      </div>
    </article>`;
}

function renderPortfolio() {
  const works = state.data.works.filter(work => work.studentId === state.user.id);
  const storyBooks = (state.data.storyBooks || []).filter(book => book.studentId === state.user.id);
  return `<section class="grid two"><div class="card"><h3>Submitted Work</h3><div class="list" style="margin-top:14px">${works.map(renderWork).join("") || `<div class="empty">No writing submitted yet.</div>`}</div></div><div class="card"><h3>Saved Storybooks</h3><div class="saved-book-list" style="margin-top:14px">${storyBooks.map(renderSavedStoryBook).join("") || `<div class="empty">No storybooks saved yet.</div>`}</div></div></section>`;
}

function renderWork(work) {
  return `<article class="item"><div class="section-head"><h4>${work.title}</h4>${statusChip(work.status)}</div><p>${work.content}</p><div class="chips"><span class="chip">Score ${work.score || "-"}</span><span class="chip">${new Date(work.updatedAt).toLocaleDateString()}</span></div><p style="margin-top:8px">${work.teacherComment || work.feedback || ""}</p></article>`;
}

function renderReview() {
  return `<section class="card"><div class="section-head"><h3>Student Submissions</h3><span class="chip warn">${state.data.summary.pendingReview} pending</span></div><div class="list">${state.data.works.map(work => `<article class="item"><div class="section-head"><h4>${work.title}</h4>${statusChip(work.status)}</div><p>${work.content}</p><p>${work.feedback || ""}</p><div class="toolbar" style="margin-top:10px"><input data-score="${work.id}" type="number" min="0" max="100" value="${work.score || 75}" style="max-width:120px"><input data-comment="${work.id}" value="${work.teacherComment || "Good progress. Add more evidence and details."}"><button class="primary" data-review="${work.id}">Approve</button></div></article>`).join("")}</div></section>`;
}

function renderClass() {
  const students = state.data.users.filter(user => user.role === "student");
  return `<section class="grid three">${students.map(student => {
    const works = state.data.works.filter(work => work.studentId === student.id);
    const avg = works.length ? Math.round(works.reduce((sum, work) => sum + (work.score || 0), 0) / works.length) : 0;
    return `<div class="card"><h3>${student.name}</h3><p class="muted">${student.className} · ${student.level}</p><strong style="font-size:30px">${avg}%</strong><p>Average reviewed performance</p><div class="progress"><span style="width:${avg}%"></span></div></div>`;
  }).join("")}</section>`;
}

function renderUsers() {
  return `<section class="grid two"><form class="card grid" id="userForm"><h3>Create Account</h3><label class="field"><span>Name</span><input name="name" required></label><label class="field"><span>Role</span><select name="role"><option>student</option><option>teacher</option><option>admin</option></select></label><label class="field"><span>Class</span><input name="className" value="P5A"></label><label class="field"><span>Level</span><select name="level"><option>P3</option><option>P4</option><option selected>P5</option><option>P6</option></select></label><button class="primary">Create user</button></form><div class="card"><h3>Accounts</h3><div class="list" style="margin-top:14px">${state.data.users.map(user => `<div class="item"><h4>${user.name}</h4><p>${roleLabel(user.role)} · ${user.className || ""} ${user.level || ""}</p></div>`).join("")}</div></div></section>`;
}

function renderAiSettings() {
  const settings = state.data.aiSettings || {};
  return `
    <section class="grid two">
      <form class="card grid" id="aiSettingsForm">
        <div class="section-head">
          <h3>Sub2API Provider</h3>
          <span class="chip ${settings.enabled ? "ok" : "warn"}">${settings.enabled ? "Enabled" : "Local fallback"}</span>
        </div>
        <label class="field"><span>Provider</span><select name="provider"><option value="sub2api" ${settings.provider === "sub2api" ? "selected" : ""}>Sub2API</option><option value="openai-compatible" ${settings.provider === "openai-compatible" ? "selected" : ""}>OpenAI-compatible</option></select></label>
        <label class="field"><span>Base URL</span><input name="baseUrl" value="${settings.baseUrl || "http://localhost:8080/v1"}" placeholder="http://localhost:8080/v1"></label>
        <label class="field"><span>Chat model</span><input name="chatModel" value="${settings.chatModel || settings.model || "gpt-5.4-mini"}" placeholder="gpt-5.4-mini"></label>
        <label class="field"><span>Image model</span><input name="imageModel" value="${settings.imageModel || "gpt-image-1"}" placeholder="gpt-image-1"></label>
        <label class="field"><span>API key</span><input name="apiKey" type="password" placeholder="${settings.hasKey ? "Saved. Leave blank to keep existing key." : "Paste your Sub2API key"}"></label>
        <label class="field"><span>Use AI provider</span><select name="enabled"><option value="true" ${settings.enabled ? "selected" : ""}>Enabled</option><option value="false" ${!settings.enabled ? "selected" : ""}>Disabled, use local fallback</option></select></label>
        <div class="toolbar">
          <button class="primary" type="submit">Save settings</button>
          <button class="secondary" type="button" id="testAiSettings">Test connection</button>
          <button class="secondary" type="button" id="testImageSettings">Test image</button>
        </div>
        <div class="error" id="aiSettingsStatus"></div>
      </form>
      <div class="card">
        <h3>How It Is Used</h3>
        <div class="list" style="margin-top:14px">
          <div class="item"><h4>Writing</h4><p>Uses the configured model for grammar correction, vocabulary upgrade and writing suggestions.</p></div>
          <div class="item"><h4>Storybook</h4><p>Uses the model to generate four story pages plus English image prompts.</p></div>
          <div class="item"><h4>History</h4><p>Uses the model for persona dialogue and source inquiry guidance.</p></div>
          <div class="item"><h4>Secret handling</h4><p>The key is stored on the backend only and is never returned to the browser.</p></div>
        </div>
      </div>
    </section>`;
}

function renderCompliance() {
  return `<section class="grid two"><div class="card"><div class="section-head"><h3>Moderation Queue</h3><span class="chip ${state.data.moderationQueue.length ? "danger" : "ok"}">${state.data.moderationQueue.length} items</span></div><div class="list">${state.data.moderationQueue.map(item => `<div class="item"><h4>${item.reason}</h4><p>${new Date(item.createdAt).toLocaleString()}</p></div>`).join("") || `<div class="empty">No blocked content.</div>`}</div></div><div class="card"><h3>Data & Security Controls</h3><div class="list" style="margin-top:14px">${["Role-based access for teacher, student and admin", "Server-side Sub2API key storage", "School resource library and generated-content storage", "Audit records for AI use and review actions", "Safety filter for sensitive, violent or inappropriate content", "E-book HTML export ready for PDF printing"].map(item => `<div class="item"><p>${item}</p></div>`).join("")}</div></div></section>`;
}

function bindStoryPager() {
  $("[data-story-prev]")?.addEventListener("click", () => {
    state.storyPageIndex = Math.max(0, state.storyPageIndex - 1);
    refreshStoryOutputs();
  });

  $("[data-story-next]")?.addEventListener("click", () => {
    const pages = currentStudentStoryPages();
    state.storyPageIndex = Math.min(pages.length - 1, state.storyPageIndex + 1);
    refreshStoryOutputs();
  });

  $("[data-read-story]")?.addEventListener("click", () => {
    const pages = currentStudentStoryPages();
    const page = pages[Math.min(Math.max(state.storyPageIndex, 0), pages.length - 1)];
    readStoryText(page?.text || "");
  });

  $("[data-retry-image]")?.addEventListener("click", event => {
    const pageId = event.currentTarget.dataset.retryImage;
    const pages = currentStudentStoryPages().filter(page => page.id === pageId);
    generateStoryImages(pages);
  });
}

function bindView() {
  document.querySelectorAll("[data-tool]").forEach(button => {
    button.addEventListener("click", () => {
      state.tool = button.dataset.tool;
      renderApp();
    });
  });

  document.querySelectorAll("[data-style-choice]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-style-choice]").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
      $("#storyForm input[name='style']").value = button.dataset.styleChoice;
    });
  });

  bindStoryPager();

  $("[data-export-pdf]")?.addEventListener("click", exportStoryPdf);

  $("[data-save-story]")?.addEventListener("click", async event => {
    const pages = currentStudentStoryPages();
    const status = $("#storyStatus");
    if (!pages.length) {
      status.textContent = "Please generate a storybook first.";
      return;
    }
    event.currentTarget.disabled = true;
    status.textContent = "Saving to portfolio...";
    try {
      const result = await api("/api/storybook/save", {
        method: "POST",
        body: JSON.stringify({
          studentId: state.user.id,
          title: state.storyTitle || storyTitleFromText(pages[0]?.text || "AI Storybook"),
          prompt: state.storyPrompt || $("#storySeed")?.value || "",
          pageIds: pages.map(page => page.id)
        })
      });
      await refresh();
      state.storyMessage = `<span class="chip ok">Saved to portfolio</span>`;
      status.innerHTML = state.storyMessage;
      event.currentTarget.textContent = "Saved to portfolio";
    } catch (error) {
      event.currentTarget.disabled = false;
      status.textContent = error.message;
    }
  });

  $("#writingForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await api("/api/writing/feedback", {
      method: "POST",
      body: JSON.stringify({
        studentId: state.user.id,
        assignmentId: form.get("assignmentId"),
        title: form.get("title"),
        content: form.get("content"),
        level: state.user.level
      })
    });
    await refresh();
    $("#writingResult").innerHTML = `<strong>Score ${result.feedback.score}</strong><p>${result.feedback.summary}</p><ul>${result.feedback.suggestions.map(item => `<li>${item}</li>`).join("")}</ul><span class="chip ${result.moderation.safe ? "ok" : "danger"}">${result.moderation.note}</span>`;
  });

  $("[data-generate-story]")?.addEventListener("click", async event => {
    event.preventDefault();
    const form = new FormData($("#storyForm"));
    const button = $("#storyGenerateButton");
    const status = $("#storyStatus");
    button.disabled = true;
    button.textContent = "Generating story...";
    status.textContent = "";
    state.storyTitle = storyTitleFromText(form.get("seed"));
    state.storyPrompt = String(form.get("seed") || "");
    $("#storyPreviewTitle").textContent = state.storyTitle;
    $("#storyResult").innerHTML = `<div class="empty">Creating story pages...</div>`;
    $("#storyPlainResult").innerHTML = `<div class="empty">Creating story pages...</div>`;
    try {
      const result = await api("/api/storybook/generate", {
        method: "POST",
        body: JSON.stringify({
          studentId: state.user.id,
          seed: form.get("seed"),
          style: form.get("style"),
          language: form.get("language")
        })
      });
      state.storyPageIndex = 0;
      state.currentStoryPages = result.pages;
      state.data.bookPages = [...result.pages, ...state.data.bookPages];
      $("#storyResult").innerHTML = renderStoryPager(result.pages);
      $("#storyPlainResult").innerHTML = renderStoryText(result.pages);
      state.storyMessage = `<span class="chip ok">${result.pages.length} pages generated · ${result.source || "local"}</span>`;
      status.innerHTML = state.storyMessage;
      generateStoryImages(result.pages);
      await refresh();
    } catch (error) {
      $("#storyResult").innerHTML = `<div class="empty">Storybook generation did not complete.</div>`;
      $("#storyPlainResult").innerHTML = `<div class="empty">Storybook generation did not complete.</div>`;
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "🪄 生成繪本";
    }
  });

async function generateStoryImages(pages) {
  for (const page of pages) {
    const latestPage = state.currentStoryPages.find(item => item.id === page.id) || page;
    if (latestPage.imageUrl || latestPage.imageStatus === "ready") continue;
    const target = document.querySelector(`[data-page-image="${page.id}"]`);
    if (target) target.textContent = "Generating image...";
    state.currentStoryPages = state.currentStoryPages.map(item => item.id === page.id ? { ...item, imageError: "", imageStatus: "pending" } : item);
    state.data.bookPages = state.data.bookPages.map(item => item.id === page.id ? { ...item, imageError: "", imageStatus: "pending" } : item);
    try {
      const result = await api("/api/storybook/image", {
        method: "POST",
        body: JSON.stringify({ pageId: page.id })
      });
      state.currentStoryPages = state.currentStoryPages.map(item => item.id === result.page.id ? result.page : item);
      state.data.bookPages = state.data.bookPages.map(item => item.id === result.page.id ? result.page : item);
      refreshStoryOutputs();
    } catch (error) {
      state.currentStoryPages = state.currentStoryPages.map(item => item.id === page.id ? { ...item, imageError: error.message, imageStatus: "failed" } : item);
      state.data.bookPages = state.data.bookPages.map(item => item.id === page.id ? { ...item, imageError: error.message, imageStatus: "failed" } : item);
      refreshStoryOutputs();
    }
  }
}

  $("#historyForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const button = $("#historyAskButton");
    const status = $("#historyStatus");
    button.disabled = true;
    button.textContent = "Asking...";
    status.textContent = "";
    try {
      const result = await api("/api/history/chat", {
        method: "POST",
        body: JSON.stringify({
          studentId: state.user.id,
          persona: form.get("persona"),
          question: form.get("question")
        })
      });
      await refresh();
      $("#chatResult").innerHTML = renderChat(result.conversation) + $("#chatResult").innerHTML;
      status.innerHTML = `<span class="chip ok">Answered · ${result.conversation.source || "local"}</span>`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Ask historical persona";
    }
  });

  document.querySelectorAll("[data-review]").forEach(button => {
    button.addEventListener("click", async () => {
      const workId = button.dataset.review;
      await api("/api/teacher/review", {
        method: "POST",
        body: JSON.stringify({
          workId,
          status: "reviewed",
          score: document.querySelector(`[data-score="${workId}"]`).value,
          teacherComment: document.querySelector(`[data-comment="${workId}"]`).value
        })
      });
      await refresh();
      renderApp();
    });
  });

  $("#userForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/api/admin/user", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form.entries()))
    });
    await refresh();
    renderApp();
  });

  $("#aiSettingsForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const apiKey = form.get("apiKey");
    const status = $("#aiSettingsStatus");
    status.textContent = "Saving...";
    try {
      await api("/api/admin/ai-settings", {
        method: "POST",
        body: JSON.stringify({
          provider: form.get("provider"),
          baseUrl: form.get("baseUrl"),
          chatModel: form.get("chatModel"),
          imageModel: form.get("imageModel"),
          apiKey: apiKey ? apiKey : "__keep__",
          enabled: form.get("enabled") === "true"
        })
      });
      await refresh();
      status.innerHTML = `<span class="chip ok">Settings saved</span>`;
    } catch (error) {
      status.textContent = error.message;
    }
  });

  $("#testAiSettings")?.addEventListener("click", async () => {
    const form = new FormData($("#aiSettingsForm"));
    const apiKey = form.get("apiKey");
    const status = $("#aiSettingsStatus");
    status.textContent = "Testing connection...";
    try {
      const result = await api("/api/admin/ai-settings/test", {
        method: "POST",
        body: JSON.stringify({
          provider: form.get("provider"),
          baseUrl: form.get("baseUrl"),
          chatModel: form.get("chatModel"),
          imageModel: form.get("imageModel"),
          apiKey: apiKey ? apiKey : "__keep__"
        })
      });
      status.innerHTML = `<span class="chip ok">Connected</span> ${result.reply?.message || ""}`;
    } catch (error) {
      status.textContent = error.message;
    }
  });

  $("#testImageSettings")?.addEventListener("click", async () => {
    const form = new FormData($("#aiSettingsForm"));
    const apiKey = form.get("apiKey");
    const status = $("#aiSettingsStatus");
    status.textContent = "Testing image generation...";
    try {
      const result = await api("/api/admin/ai-settings/test-image", {
        method: "POST",
        body: JSON.stringify({
          provider: form.get("provider"),
          baseUrl: form.get("baseUrl"),
          chatModel: form.get("chatModel"),
          imageModel: form.get("imageModel"),
          apiKey: apiKey ? apiKey : "__keep__"
        })
      });
      status.innerHTML = `<span class="chip ok">Image model connected</span> ${result.source || ""}`;
    } catch (error) {
      status.textContent = imageErrorMessage(error.message);
    }
  });
}

async function refresh() {
  state.data = await api("/api/bootstrap");
}

load().catch(error => {
  const localHint = location.protocol === "file:"
    ? `<p class="muted">Open <strong>http://localhost:3000</strong> instead of opening the HTML file directly. The app needs the backend API server.</p>`
    : "";
  $("#app").innerHTML = `<main class="login"><div class="card"><h2>Unable to start app</h2><p>${error.message}</p>${localHint}</div></main>`;
});
