const i18n = {
  en: {
    signin: "Sign in", chooserole: "Choose a school role to open the matching workspace.", password: "Password", enterplatform: "Enter platform",
    dashboard: "Dashboard", studio: "AI Learning Studio", portfolio: "Portfolio", review: "Teacher Review", class: "Class Progress", users: "Users & Roles", ai: "AI Settings", compliance: "Compliance & Records",
    learning: "Learning", aitools: "AI Creation Tools", myspace: "My Space", overview: "Overview", teaching: "Teaching Management",
    writingassistant: "Writing Assistant", storybook: "AI Storybook", history: "History Inquiry", dashboard_label: "Learning Dashboard",
    teacherdashboard: "Teacher Dashboard", studentreviews: "Review Submissions", classProgress: "Class Progress", admindashboard: "Admin Dashboard", usemanagement: "User & Roles", aisettings: "AI Settings", compliance_label: "Compliance & Records",
    logout: "Logout", closed: "Close", previous: "‹ Previous", next: "Next ›", readaloud: "Read aloud", save: "Save", submit: "Submit", approve: "Approve", read: "Read",
    submittedwork: "Submitted Work", nowriting: "No writing submitted yet.", savedbooks: "Saved Storybooks", nobooks: "No storybooks saved yet.",
    writing_sample: "My campus story", writing_draft: "During lunch today, I saw classmates helping each other on the playground, and felt warm in my heart.", story_seed: "Enter your description (Prompt)", style: "Select Style", language: "Language", generate: "🪄 Generate Storybook", exportpdf: "Export PDF", saveto: "Save to portfolio", submitted: "Submitted",
    close: "Close", page: "Page", pending: "pending", score: "Score",
    aiusage: "AI Usage", workspace: "workspace", role: "Role", student: "Student", teacher: "Teacher", admin: "Admin",
    readtext: "Read text", lateststorybook: "Latest storybook", waiting: "Waiting", no_pages_yet: "No pages yet", pages: "pages",
    prompt: "Prompt", image_not_ready: "Image not ready", writing: "Writing",
    question: "Question", answer: "Answer", time: "Time", mandarin: "Mandarin (普通话)", cantonese: "Cantonese (廣東話)", voice: "Voice", voicepick: "Voice option"
  },
  zh: {
    signin: "登入", chooserole: "選擇一個校園角色來開啟對應的工作區。", password: "密碼", enterplatform: "進入平台",
    dashboard: "儀表板", studio: "AI 學習工作室", portfolio: "作品集", review: "教師批改", class: "班級進度", users: "用戶和角色", ai: "AI 設定", compliance: "合規記錄",
    learning: "學習", aitools: "AI 創作工具", myspace: "我的空間", overview: "概覽", teaching: "教學管理",
    writingassistant: "寫作助手", storybook: "AI 繪本", history: "歷史探究", dashboard_label: "學習儀表板",
    teacherdashboard: "教師儀表板", studentreviews: "批改審閱", classProgress: "班級進度", admindashboard: "管理儀表板", usemanagement: "帳戶權限", aisettings: "AI 設定", compliance_label: "合規紀錄",
    logout: "登出", closed: "關閉", previous: "‹ 上一頁", next: "下一頁 ›", readaloud: "朗讀", save: "保存", submit: "提交", approve: "批准", read: "閱讀",
    submittedwork: "已提交作業", nowriting: "還未提交寫作。", savedbooks: "已保存的繪本", nobooks: "還未保存繪本。",
    writing_sample: "我的校園故事", writing_draft: "今天小息時，我在操場看見同學互相幫忙，覺得校園很溫暖。", story_seed: "輸入你的描述 (Prompt)", style: "選擇風格", language: "語言", generate: "🪄 生成繪本", exportpdf: "匯出 PDF", saveto: "保存到作品集", submitted: "已提交",
    close: "關閉", page: "頁", pending: "待審", score: "分數",
    aiusage: "AI 用量", workspace: "工作區", role: "角色", student: "學生", teacher: "教師", admin: "管理員",
    readtext: "朗讀內容", lateststorybook: "最新繪本", waiting: "等待中", no_pages_yet: "尚無頁面", pages: "頁",
    prompt: "提示詞", image_not_ready: "圖片未就緒", writing: "作文",
    question: "問題", answer: "回答", time: "時間", mandarin: "普通話", cantonese: "廣東話", voice: "語音", voicepick: "聲線"
  }
};

const state = {
  user: JSON.parse(localStorage.getItem("ai-school-user") || "null"),
  data: null,
  page: "dashboard",
  tool: "writing",
  language: localStorage.getItem("ai-school-language") || "zh",
  voiceLanguage: localStorage.getItem("ai-school-voice-language") || "cantonese",
  selectedVoiceURI: localStorage.getItem("ai-school-voice-uri") || "",
  storyMessage: "",
  storyPageIndex: 0,
  currentStoryPages: [],
  storyTitle: "",
  storyPrompt: "",
  portfolioBookId: "",
  portfolioPageIndex: 0,
  workReaderId: "",
  workReaderPageIndex: 0,
  historyPersona: "玄奘",
  readingText: "",
  activeSentenceIndex: -1,
  readingSessionId: 0
};

function t(key) {
  return i18n[state.language]?.[key] || i18n.zh[key] || key;
}

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

function savedBookPages(book) {
  return (book?.pageIds || []).map(pageId => state.data.bookPages.find(page => page.id === pageId)).filter(Boolean);
}

function workReaderPages(work) {
  if (work?.storyBookId) {
    const storyBook = state.data.storyBooks.find(book => book.id === work.storyBookId && book.studentId === work.studentId);
    const pages = savedBookPages(storyBook);
    if (pages.length) {
      return pages.map((page, index) => ({
        id: `${work.id}-page-${index + 1}`,
        page: index + 1,
        text: page.text,
        imageUrl: page.imageUrl,
        imagePrompt: page.imagePrompt,
        imageError: page.imageError,
        imageStatus: page.imageStatus
      }));
    }
  }

  const text = String(work?.content || "").trim();
  if (!text) return [];
  const sentences = text.match(/[^。！？!?；;\n]+[。！？!?；;]?/g) || [text];
  const pages = [];
  let buffer = "";

  sentences.forEach(sentence => {
    const next = `${buffer}${sentence}`.trim();
    if (!buffer || next.length <= 90) {
      buffer = next;
      return;
    }
    pages.push(buffer.trim());
    buffer = sentence.trim();
  });

  if (buffer.trim()) pages.push(buffer.trim());
  return pages.map((page, index) => ({
    id: `${work.id}-page-${index + 1}`,
    page: index + 1,
    text: page
  }));
}

function imageErrorMessage(error) {
  const message = String(error || "");
  if (/INSUFFICIENT_BALANCE|balance|余额|餘額/i.test(message)) {
    return "Image account balance is insufficient. Please top up the Sub2API account, then retry.";
  }
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
  if ("speechSynthesis" in window && !window.__aiVoiceHooked) {
    window.__aiVoiceHooked = true;
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      if (!state.user) return;
      renderApp();
    });
  }
  renderApp();
}

function roleLabel(role) {
  return { student: t("student"), teacher: t("teacher"), admin: t("admin") }[role] || role;
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

function splitSentences(text) {
  const source = String(text || "").trim();
  if (!source) return [];
  return source.match(/[^。！？!?；;\n]+[。！？!?；;]?/g)?.map(item => item.trim()).filter(Boolean) || [source];
}

function renderReadableText(text) {
  const sentences = splitSentences(text);
  if (!sentences.length) return `<p></p>`;
  return `<p class="reader-sentences">${sentences.map((sentence, index) => {
    const active = state.readingText === String(text || "") && state.activeSentenceIndex === index ? " active" : "";
    return `<span class="reader-sentence${active}" data-sentence-index="${index}">${html(sentence)}</span>`;
  }).join("")}</p>`;
}

function clearReadingHighlight() {
  state.readingText = "";
  state.activeSentenceIndex = -1;
}

function getChineseVoiceOptions() {
  if (!("speechSynthesis" in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  const normalize = value => String(value || "").toLowerCase();
  return voices
    .filter(voice => {
      const lang = normalize(voice.lang);
      return lang.startsWith("zh") || lang.startsWith("yue") || lang.startsWith("cmn");
    })
    .sort((a, b) => {
      const aLang = String(a.lang || "").toLowerCase();
      const bLang = String(b.lang || "").toLowerCase();
      const priority = lang => {
        if (state.voiceLanguage === "mandarin") {
          if (lang.includes("zh-tw") || lang.includes("cmn-hant")) return 0;
          if (lang.includes("zh-cn") || lang.includes("cmn-hans")) return 1;
          if (lang.includes("zh")) return 2;
          return 3;
        }
        if (lang.includes("zh-hk") || lang.includes("yue")) return 0;
        if (lang.includes("zh")) return 1;
        return 2;
      };
      const diff = priority(aLang) - priority(bLang);
      return diff !== 0 ? diff : String(a.name || "").localeCompare(String(b.name || ""));
    });
}

function speechPreferences() {
  if (state.voiceLanguage === "mandarin") {
    return {
      langs: ["zh-TW", "cmn-Hant-TW", "zh-CN", "cmn-Hans-CN"],
      names: ["Ting-Ting", "Mei-Jia", "Sinji", "Sin-ji", "Yating", "HanHan", "Mandarin"]
    };
  }
  return {
    langs: ["zh-HK", "yue-HK", "zh-yue"],
    names: ["Sinji", "Sin-ji", "Mei-Jia", "Cantonese", "HiuGaai"]
  };
}

function pickSpeechVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  if (state.selectedVoiceURI) {
    const selected = voices.find(voice => voice.voiceURI === state.selectedVoiceURI);
    if (selected) return selected;
  }

  const preferences = speechPreferences();
  const normalize = value => String(value || "").toLowerCase();
  const preferredByName = voices.find(voice => preferences.names.some(name => normalize(voice.name).includes(normalize(name))));
  if (preferredByName) return preferredByName;

  const preferredByLang = voices.find(voice => preferences.langs.includes(voice.lang));
  if (preferredByLang) return preferredByLang;

  const genericChinese = voices.find(voice => normalize(voice.lang).startsWith("zh") || normalize(voice.lang).startsWith("yue"));
  return genericChinese || null;
}

function readStoryText(text) {
  if (!("speechSynthesis" in window)) {
    alert("This browser does not support text reading.");
    return;
  }
  if (window.speechSynthesis.speaking) {
    stopStoryText();
    return;
  }
  const sentences = splitSentences(text);
  if (!sentences.length) return;
  const readingText = String(text || "");
  const sessionId = state.readingSessionId + 1;
  state.readingSessionId = sessionId;
  state.readingText = readingText;
  state.activeSentenceIndex = 0;
  window.speechSynthesis.cancel();
  const speakSentence = index => {
    if (state.readingSessionId !== sessionId) return;
    if (index >= sentences.length) {
      clearReadingHighlight();
      renderApp();
      return;
    }
    state.readingText = readingText;
    state.activeSentenceIndex = index;
    renderApp();
    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    const voice = pickSpeechVoice();
    utterance.voice = voice;
    utterance.lang = voice?.lang || (state.voiceLanguage === "mandarin" ? "zh-TW" : "zh-HK");
    utterance.rate = state.voiceLanguage === "mandarin" ? 0.92 : 0.9;
    utterance.pitch = 1;
    utterance.onend = () => {
      if (state.readingSessionId !== sessionId) return;
      speakSentence(index + 1);
    };
    utterance.onerror = () => {
      if (state.readingSessionId !== sessionId) return;
      clearReadingHighlight();
      renderApp();
    };
    window.speechSynthesis.speak(utterance);
  };
  renderApp();
  speakSentence(0);
}

function stopStoryText() {
  state.readingSessionId += 1;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  clearReadingHighlight();
  renderApp();
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
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <h2 style="margin:0">${t("signin")}</h2>
            <div style="display:flex;gap:4px;font-size:12px">
              <button class="ghost" id="loginLangEn" style="min-height:28px;padding:0 8px;${state.language === "en" ? "background:rgba(91,79,232,0.2);" : ""}" type="button">EN</button>
              <button class="ghost" id="loginLangZh" style="min-height:28px;padding:0 8px;${state.language === "zh" ? "background:rgba(91,79,232,0.2);" : ""}" type="button">中</button>
            </div>
          </div>
          <p class="muted">${t("chooserole")}</p>
          <label class="field"><span>Role</span><select name="role"><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select></label>
          <label class="field"><span>${t("password")}</span><input name="password" type="password" value="student"></label>
          <button class="primary" type="submit">${t("enterplatform")}</button>
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
  
  $("#loginLangEn")?.addEventListener("click", () => {
    state.language = "en";
    localStorage.setItem("ai-school-language", "en");
    renderLogin();
  });
  $("#loginLangZh")?.addEventListener("click", () => {
    state.language = "zh";
    localStorage.setItem("ai-school-language", "zh");
    renderLogin();
  });
}

function navGroups() {
  if (state.user.role === "student") {
    return [
      { title: t("learning"), items: [{ id: "dashboard", icon: "🏠", label: t("dashboard") }] },
      {
        title: t("aitools"),
        items: [
          { id: "studio", tool: "writing", icon: "✍️", label: t("writingassistant") },
          { id: "studio", tool: "storybook", icon: "📖", label: t("storybook") },
          { id: "studio", tool: "history", icon: "🏛️", label: t("history") }
        ]
      },
      { title: t("myspace"), items: [{ id: "portfolio", icon: "📚", label: t("portfolio") }] }
    ];
  }
  if (state.user.role === "teacher") {
    return [
      { title: t("overview"), items: [{ id: "dashboard", icon: "🏠", label: t("teacherdashboard") }] },
      { title: t("teaching"), items: [{ id: "review", icon: "📝", label: t("studentreviews") }, { id: "class", icon: "👥", label: t("classProgress") }] }
    ];
  }
  return [
    { title: t("overview"), items: [{ id: "dashboard", icon: "🏠", label: t("admindashboard") }] },
    { title: t("aitools"), items: [{ id: "users", icon: "👤", label: t("usemanagement") }, { id: "ai", icon: "🤖", label: t("aisettings") }, { id: "compliance", icon: "🛡️", label: t("compliance_label") }] }
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
  const voiceOptions = getChineseVoiceOptions();
  const roleSub = state.user.role === "student" ? `${state.user.className || "P5A"} · ${state.user.level || "P5"}` : state.user.role === "teacher" ? `${state.user.className || "P5A"} ${t("teacher")}` : t("admin");
  $("#app").innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="mark">🤖</div>
          <div><h1>AI學習平台</h1><p>${roleLabel(state.user.role)} ${t("workspace")}</p></div>
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
          <div class="token-bar-label"><span>${t("aiusage")}</span><strong>62%</strong></div>
          <div class="token-bar"><div class="token-bar-fill"></div></div>
          <div style="margin-top:16px;display:flex;gap:6px;font-size:11px">
            <button class="ghost" id="langEn" style="flex:1;min-height:28px;padding:0;${state.language === "en" ? "background:rgba(91,79,232,0.2);" : ""}" title="English">EN</button>
            <button class="ghost" id="langZh" style="flex:1;min-height:28px;padding:0;${state.language === "zh" ? "background:rgba(91,79,232,0.2);" : ""}" title="中文">中</button>
          </div>
        </div>
        <button class="ghost" id="logout">${t("logout")}</button>
      </aside>
      <main class="main">
        <div class="topbar">
          <div class="page-title"><h2>${pageTitle()}</h2><p>${pageSubtitle()}</p></div>
          <div class="topbar-controls">
            <div class="voice-selector-topbar">
              <span class="voice-label">${t("voice")}:</span>
              <button class="mini ${state.voiceLanguage === "cantonese" ? "active" : ""}" type="button" data-voice-lang="cantonese">${t("cantonese")}</button>
              <button class="mini ${state.voiceLanguage === "mandarin" ? "active" : ""}" type="button" data-voice-lang="mandarin">${t("mandarin")}</button>
              <select class="voice-picker" data-voice-picker title="${t("voicepick")}">
                <option value="">${t("voicepick")}</option>
                ${voiceOptions.map(voice => `<option value="${html(voice.voiceURI)}" ${state.selectedVoiceURI === voice.voiceURI ? "selected" : ""}>${html(`${voice.name} (${voice.lang})`)}</option>`).join("")}
              </select>
            </div>
            <div class="user-pill"><span>${state.user.name}</span><div class="avatar">${state.user.name.slice(0, 1)}</div></div>
          </div>
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
  $("#langEn")?.addEventListener("click", () => {
    state.language = "en";
    localStorage.setItem("ai-school-language", "en");
    renderApp();
  });
  $("#langZh")?.addEventListener("click", () => {
    state.language = "zh";
    localStorage.setItem("ai-school-language", "zh");
    renderApp();
  });

  document.querySelectorAll("[data-voice-lang]").forEach(button => {
    button.addEventListener("click", () => {
      state.voiceLanguage = button.dataset.voiceLang;
      localStorage.setItem("ai-school-voice-language", state.voiceLanguage);
      renderApp();
    });
  });

  document.querySelectorAll("[data-voice-picker]").forEach(select => {
    select.addEventListener("change", event => {
      state.selectedVoiceURI = event.target.value || "";
      localStorage.setItem("ai-school-voice-uri", state.selectedVoiceURI);
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
  const titles = {
    dashboard: state.user?.role === "teacher" ? t("teacherdashboard") : state.user?.role === "admin" ? t("admindashboard") : t("dashboard"),
    studio: t("studio"),
    portfolio: t("portfolio"),
    review: t("review"),
    class: t("class"),
    users: t("users"),
    ai: t("ai"),
    compliance: t("compliance")
  };
  return titles[state.page] || "";
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
      ${["writing", "storybook", "history"].map(id => `<button class="${state.tool === id ? "active" : ""}" data-tool="${id}">${{ writing: t("writingassistant"), storybook: t("storybook"), history: t("history") }[id]}</button>`).join("")}
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
        ${renderHistoryPersonaTabs()}
        <div class="chat-log" id="chatResult">${renderHistoryConversations()}</div>
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
  const voiceOptions = getChineseVoiceOptions();
  return `
    <div class="story-pager">
      <div class="story-pager-head">
        <button class="ghost" type="button" data-story-prev ${index === 0 ? "disabled" : ""}>${t("previous")}</button>
        <span class="chip">${t("page")} ${index + 1} / ${pages.length}</span>
        <button class="ghost" type="button" data-story-next ${index === pages.length - 1 ? "disabled" : ""}>${t("next")}</button>
      </div>
      <div class="story-read-row">
        <button class="secondary" type="button" data-read-story>${t("readtext")}</button>
        <div class="voice-selector">
          <button class="mini ${state.voiceLanguage === "cantonese" ? "active" : ""}" type="button" data-voice-lang="cantonese">${t("cantonese")}</button>
          <button class="mini ${state.voiceLanguage === "mandarin" ? "active" : ""}" type="button" data-voice-lang="mandarin">${t("mandarin")}</button>
        </div>
        <select class="voice-picker" data-voice-picker title="${t("voicepick")}">
          <option value="">${t("voicepick")}</option>
          ${voiceOptions.map(voice => `<option value="${html(voice.voiceURI)}" ${state.selectedVoiceURI === voice.voiceURI ? "selected" : ""}>${html(`${voice.name} (${voice.lang})`)}</option>`).join("")}
        </select>
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

function formatConversationTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  const locale = state.language === "en" ? "en-US" : "zh-HK";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderChat(chat) {
  return `<div class="message"><strong>${chat.persona}</strong><p><strong>${t("question")}:</strong> ${html(chat.question || "")}</p><p><strong>${t("answer")}:</strong> ${html(chat.reply || "")}</p><p class="muted">${chat.sourceTip ? html(chat.sourceTip) : ""}</p><p class="muted chat-time">${t("time")}: ${formatConversationTime(chat.createdAt)}</p></div>`;
}

function getHistoryPersonas() {
  const conversations = state.data.conversations || [];
  const personas = new Set();
  conversations.forEach(chat => {
    if (chat.persona) personas.add(chat.persona);
  });
  return Array.from(personas).sort();
}

function renderHistoryPersonaTabs() {
  const personas = getHistoryPersonas();
  if (!personas.length) return "";
  return `
    <div class="history-tabs">
      ${personas.map(persona => `
        <button class="history-tab ${state.historyPersona === persona ? "active" : ""}" data-history-persona="${html(persona)}">
          ${persona}
        </button>
      `).join("")}
    </div>
  `;
}

function renderHistoryConversations() {
  const conversations = state.data.conversations || [];
  const selectedPersona = state.historyPersona;
  
  // Filter conversations for selected persona
  const personaConversations = conversations.filter(chat => chat.persona === selectedPersona).slice(0, 30);
  
  if (!personaConversations.length) {
    return `<div class="empty">No conversations with ${selectedPersona} yet.</div>`;
  }

  // Render chat bubbles for selected persona
  return `
    <div class="history-chat-bubbles">
      ${personaConversations.map((chat, index) => `
        <div class="chat-bubble user-message">
          <div class="chat-bubble-content">
            <p>${html(chat.question || "")}</p>
            <span class="chat-bubble-time">${formatConversationTime(chat.createdAt)}</span>
          </div>
        </div>
        <div class="chat-bubble ai-message">
          <div class="chat-bubble-content">
            <p>${html(chat.reply || "")}</p>
            ${chat.sourceTip ? `<p class="chat-source-tip">${html(chat.sourceTip)}</p>` : ""}
            <span class="chat-bubble-time">${formatConversationTime(chat.createdAt)}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSavedStoryBook(book) {
  const pages = savedBookPages(book);
  const cover = pages.find(page => page.imageUrl) || pages[0];
  const submitted = book.status === "submitted" || Boolean(book.submittedWorkId);
  return `
    <article class="saved-book-card">
      <div class="saved-book-cover-section">
        ${cover?.imageUrl ? `<img class="saved-book-cover-large" src="${html(cover.imageUrl)}" alt="${html(book.title)} cover">` : `<div class="saved-book-cover-large placeholder"><div>📖</div><p>No image yet</p></div>`}
      </div>
      <div class="saved-book-info">
        <div class="saved-book-header">
          <div>
            <h4>${html(book.title)}</h4>
            <p class="book-meta">${pages.length} ${t("pages")} · ${new Date(book.updatedAt || book.createdAt).toLocaleDateString()}</p>
          </div>
          ${submitted ? `<span class="chip ok">Submitted</span>` : ""}
        </div>
        ${book.prompt ? `<div class="saved-book-prompt"><strong>${t("prompt")}:</strong> ${html(book.prompt)}</div>` : ""}
        <p class="first-page-excerpt">${html(pages[0]?.text || "")}</p>
        <div class="saved-book-actions">
          <button class="secondary" type="button" data-read-saved-book="${book.id}">${t("read")}</button>
          <button class="primary" type="button" data-submit-saved-book="${book.id}" ${submitted ? "disabled" : ""}>${submitted ? "Submitted" : "Submit"}</button>
        </div>
      </div>
    </article>`;
}

function renderSavedBookReader() {
  const book = (state.data.storyBooks || []).find(item => item.id === state.portfolioBookId);
  if (!book) return "";
  const pages = savedBookPages(book);
  if (!pages.length) return "";
  const index = Math.min(Math.max(state.portfolioPageIndex, 0), pages.length - 1);
  const page = pages[index];
  const voiceOptions = getChineseVoiceOptions();
  return `
    <div class="reader-overlay" data-saved-reader-overlay>
      <section class="card saved-reader reader-dialog">
        <div class="section-head">
          <div>
            <h3>${html(book.title)}</h3>
            <p class="muted">${t("page")} ${index + 1} / ${pages.length}</p>
          </div>
          <button class="ghost" type="button" data-close-saved-reader>${t("close")}</button>
        </div>
        <article class="saved-reader-page">
          ${page.imageUrl ? `<img class="saved-reader-image" src="${html(page.imageUrl)}" alt="${html(book.title)} ${t("page")} ${index + 1}">` : `<div class="saved-reader-image placeholder">${t("image_not_ready")}</div>`}
          <div class="saved-reader-text">
            ${renderReadableText(page.text)}
            <div class="saved-reader-actions">
              <button class="ghost" type="button" data-saved-prev ${index === 0 ? "disabled" : ""}>${t("previous")}</button>
              <div class="reader-voice-controls">
                <button class="secondary" type="button" data-read-saved-page>${t("readaloud")}</button>
                <div class="voice-selector">
                  <button class="mini ${state.voiceLanguage === "cantonese" ? "active" : ""}" type="button" data-voice-lang="cantonese">${t("cantonese")}</button>
                  <button class="mini ${state.voiceLanguage === "mandarin" ? "active" : ""}" type="button" data-voice-lang="mandarin">${t("mandarin")}</button>
                </div>
                <select class="voice-picker" data-voice-picker title="${t("voicepick")}">
                  <option value="">${t("voicepick")}</option>
                  ${voiceOptions.map(voice => `<option value="${html(voice.voiceURI)}" ${state.selectedVoiceURI === voice.voiceURI ? "selected" : ""}>${html(`${voice.name} (${voice.lang})`)}</option>`).join("")}
                </select>
              </div>
              <button class="ghost" type="button" data-saved-next ${index === pages.length - 1 ? "disabled" : ""}>${t("next")}</button>
            </div>
          </div>
        </article>
      </section>
    </div>`;
}

function renderWorkReader() {
  const work = state.data.works.find(item => item.id === state.workReaderId);
  if (!work) return "";
  const pages = workReaderPages(work);
  if (!pages.length) return "";
  const index = Math.min(Math.max(state.workReaderPageIndex, 0), pages.length - 1);
  const page = pages[index];
  const voiceOptions = getChineseVoiceOptions();
  return `
    <div class="reader-overlay" data-work-reader-overlay>
      <section class="card saved-reader reader-dialog">
        <div class="section-head">
          <div>
            <h3>${html(work.title)}</h3>
            <p class="muted">${t("page")} ${index + 1} / ${pages.length}</p>
          </div>
          <button class="ghost" type="button" data-close-work-reader>${t("close")}</button>
        </div>
        <article class="saved-reader-page">
          ${page.imageUrl ? `<img class="saved-reader-image" src="${html(page.imageUrl)}" alt="${html(work.title)} ${t("page")} ${index + 1}">` : `<div class="saved-reader-image placeholder">${t("writing")}</div>`}
          <div class="saved-reader-text">
            ${renderReadableText(page.text)}
            <div class="saved-reader-actions">
              <button class="ghost" type="button" data-work-prev ${index === 0 ? "disabled" : ""}>${t("previous")}</button>
              <div class="reader-voice-controls">
                <button class="secondary" type="button" data-read-work-page>${t("readaloud")}</button>
                <div class="voice-selector">
                  <button class="mini ${state.voiceLanguage === "cantonese" ? "active" : ""}" type="button" data-voice-lang="cantonese">${t("cantonese")}</button>
                  <button class="mini ${state.voiceLanguage === "mandarin" ? "active" : ""}" type="button" data-voice-lang="mandarin">${t("mandarin")}</button>
                </div>
                <select class="voice-picker" data-voice-picker title="${t("voicepick")}">
                  <option value="">${t("voicepick")}</option>
                  ${voiceOptions.map(voice => `<option value="${html(voice.voiceURI)}" ${state.selectedVoiceURI === voice.voiceURI ? "selected" : ""}>${html(`${voice.name} (${voice.lang})`)}</option>`).join("")}
                </select>
              </div>
              <button class="ghost" type="button" data-work-next ${index === pages.length - 1 ? "disabled" : ""}>${t("next")}</button>
            </div>
          </div>
        </article>
      </section>
    </div>`;
}

function renderPortfolio() {
  const works = state.data.works.filter(work => work.studentId === state.user.id);
  const storyBooks = (state.data.storyBooks || []).filter(book => book.studentId === state.user.id);
  return `${renderWorkReader()}${renderSavedBookReader()}<section class="grid two"><div class="card"><h3>${t("submittedwork")}</h3><div class="list" style="margin-top:14px">${works.map(renderWork).join("") || `<div class="empty">${t("nowriting")}</div>`}</div></div><div class="card"><h3>${t("savedbooks")}</h3><div class="saved-book-list" style="margin-top:14px">${storyBooks.map(renderSavedStoryBook).join("") || `<div class="empty">${t("nobooks")}</div>`}</div></div></section>`;
}

function renderWork(work) {
  const score = work.score || 0;
  const scoreColor = score >= 80 ? "ok" : score >= 60 ? "warn" : "danger";
  const date = new Date(work.updatedAt);
  const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  
  // Get image for storybook submissions
  let imageHtml = "";
  if (work.type === "storybook" && work.storyBookId) {
    const storyBook = state.data.storyBooks?.find(book => book.id === work.storyBookId);
    const firstPage = storyBook?.pageIds?.[0] ? state.data.bookPages.find(p => p.id === storyBook.pageIds[0]) : null;
    if (firstPage?.imageUrl) {
      imageHtml = `<div class="work-image-section"><img class="work-thumbnail" src="${html(firstPage.imageUrl)}" alt="${html(work.title)}"></div>`;
    } else if (firstPage) {
      imageHtml = `<div class="work-image-section"><div class="work-thumbnail placeholder">📖</div></div>`;
    }
  }
  
  const hasImage = imageHtml ? "has-image" : "";
  return `<article class="work-item ${hasImage}">${imageHtml}<div class="work-content-section"><div class="work-header"><div class="work-title-section"><h4>${work.title}</h4></div><div class="work-meta"><div class="work-score score-${scoreColor}">${score}</div><div class="work-date">${formattedDate}</div></div></div><p class="work-content">${work.content}</p><div class="work-footer"><button class="secondary" type="button" data-read-work="${work.id}">${t("read")}</button>${work.teacherComment || work.feedback ? `<div class="work-feedback">${work.teacherComment || work.feedback}</div>` : ""}</div></div></article>`;
}

function renderReview() {
  return `<section class="card"><div class="section-head"><h3>Student Submissions</h3><span class="chip warn">${state.data.summary.pendingReview} ${t("pending")}</span></div><div class="list">${state.data.works.map(work => `<article class="item"><div class="section-head"><h4>${work.title}</h4>${statusChip(work.status)}</div><p>${work.content}</p><p>${work.feedback || ""}</p><div class="toolbar" style="margin-top:10px"><button class="secondary" type="button" data-read-work="${work.id}">${t("read")}</button><input data-score="${work.id}" type="number" min="0" max="100" value="${work.score || 75}" style="max-width:120px"><input data-comment="${work.id}" value="${work.teacherComment || "Good progress. Add more evidence and details."}"><button class="primary" data-review="${work.id}">${t("approve")}</button></div></article>`).join("")}</div></section>`;
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

  document.querySelectorAll("[data-read-saved-book]").forEach(button => {
    button.addEventListener("click", () => {
      state.portfolioBookId = button.dataset.readSavedBook;
      state.portfolioPageIndex = 0;
      renderApp();
    });
  });

  $("[data-close-saved-reader]")?.addEventListener("click", () => {
    stopStoryText();
    state.portfolioBookId = "";
    state.portfolioPageIndex = 0;
    renderApp();
  });

  document.querySelectorAll("[data-saved-reader-overlay]").forEach(overlay => {
    overlay.addEventListener("click", event => {
      if (event.target !== overlay) return;
      stopStoryText();
      state.portfolioBookId = "";
      state.portfolioPageIndex = 0;
      renderApp();
    });
  });

  $("[data-saved-prev]")?.addEventListener("click", () => {
    state.portfolioPageIndex = Math.max(0, state.portfolioPageIndex - 1);
    renderApp();
  });

  $("[data-saved-next]")?.addEventListener("click", () => {
    const book = (state.data.storyBooks || []).find(item => item.id === state.portfolioBookId);
    const pages = savedBookPages(book);
    state.portfolioPageIndex = Math.min(pages.length - 1, state.portfolioPageIndex + 1);
    renderApp();
  });

  $("[data-read-saved-page]")?.addEventListener("click", () => {
    const book = (state.data.storyBooks || []).find(item => item.id === state.portfolioBookId);
    const pages = savedBookPages(book);
    const page = pages[Math.min(Math.max(state.portfolioPageIndex, 0), pages.length - 1)];
    readStoryText(page?.text || "");
  });

  document.querySelectorAll("[data-submit-saved-book]").forEach(button => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Submitting...";
      try {
        await api("/api/storybook/submit", {
          method: "POST",
          body: JSON.stringify({
            studentId: state.user.id,
            storyBookId: button.dataset.submitSavedBook
          })
        });
        await refresh();
        renderApp();
      } catch (error) {
        button.disabled = false;
        button.textContent = "Submit";
        alert(error.message);
      }
    });
  });

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
      const friendlyMessage = imageErrorMessage(error.message);
      state.currentStoryPages = state.currentStoryPages.map(item => item.id === page.id ? { ...item, imageError: error.message, imageStatus: "failed" } : item);
      state.data.bookPages = state.data.bookPages.map(item => item.id === page.id ? { ...item, imageError: error.message, imageStatus: "failed" } : item);
      if ($("#storyStatus")) $("#storyStatus").textContent = friendlyMessage;
      refreshStoryOutputs();
      if (/INSUFFICIENT_BALANCE|QUOTA_EXHAUSTED|API_KEY_DISABLED/i.test(error.message)) return;
    }
  }
}

  $("#historyForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const button = $("#historyAskButton");
    const status = $("#historyStatus");
    const selectedPersona = form.get("persona");
    button.disabled = true;
    button.textContent = "Asking...";
    status.textContent = "";
    try {
      const result = await api("/api/history/chat", {
        method: "POST",
        body: JSON.stringify({
          studentId: state.user.id,
          persona: selectedPersona,
          question: form.get("question")
        })
      });
      await refresh();
      state.historyPersona = selectedPersona;
      renderApp();
      status.innerHTML = `<span class="chip ok">Answered · ${result.conversation.source || "local"}</span>`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Ask historical persona";
    }
  });

  document.querySelectorAll("[data-history-persona]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.historyPersona = btn.dataset.historyPersona;
      renderApp();
    });
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

  document.querySelectorAll("[data-read-work]").forEach(button => {
    button.addEventListener("click", () => {
      state.workReaderId = button.dataset.readWork;
      state.workReaderPageIndex = 0;
      renderApp();
    });
  });

  $("[data-close-work-reader]")?.addEventListener("click", () => {
    stopStoryText();
    state.workReaderId = "";
    state.workReaderPageIndex = 0;
    renderApp();
  });

  document.querySelectorAll("[data-work-reader-overlay]").forEach(overlay => {
    overlay.addEventListener("click", event => {
      if (event.target !== overlay) return;
      stopStoryText();
      state.workReaderId = "";
      state.workReaderPageIndex = 0;
      renderApp();
    });
  });

  $("[data-work-prev]")?.addEventListener("click", () => {
    state.workReaderPageIndex = Math.max(0, state.workReaderPageIndex - 1);
    renderApp();
  });

  $("[data-work-next]")?.addEventListener("click", () => {
    const work = state.data.works.find(item => item.id === state.workReaderId);
    const pages = workReaderPages(work);
    state.workReaderPageIndex = Math.min(pages.length - 1, state.workReaderPageIndex + 1);
    renderApp();
  });

  $("[data-read-work-page]")?.addEventListener("click", () => {
    const work = state.data.works.find(item => item.id === state.workReaderId);
    const pages = workReaderPages(work);
    const page = pages[Math.min(Math.max(state.workReaderPageIndex, 0), pages.length - 1)];
    readStoryText(page?.text || "");
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
