const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const starterDb = {
  users: [
    { id: "u-teacher", name: "Ms Chan", role: "teacher", className: "P5A", password: "teacher" },
    { id: "u-admin", name: "School Admin", role: "admin", className: "Whole school", password: "admin" },
    { id: "u-student", name: "Hei Lam", role: "student", className: "P5A", level: "P5", password: "student" }
  ],
  assignments: [
    {
      id: "a-writing",
      title: "校園一角描寫",
      subject: "Chinese Writing",
      level: "P5",
      dueDate: "2026-07-12",
      prompt: "拍攝或輸入一段關於校園一角的描寫，AI 會協助擴寫、續寫及修訂。",
      supports: ["photo upload", "rewrite", "outline", "grammar feedback"]
    },
    {
      id: "a-history",
      title: "絲綢之路歷史探究",
      subject: "Humanities",
      level: "P5",
      dueDate: "2026-07-18",
      prompt: "與歷史人物對話，分析史料及生成復原場景圖。",
      supports: ["persona chat", "source detective", "image prompt"]
    }
  ],
  works: [
    {
      id: "w-demo",
      studentId: "u-student",
      assignmentId: "a-writing",
      type: "writing",
      title: "榕樹下的小息",
      content: "小息時，同學們在榕樹下聊天。陽光穿過葉縫，像一片片金色的小紙船。",
      feedback: "句子有畫面感。可加入聲音和人物動作，令段落更完整。",
      status: "reviewed",
      score: 82,
      updatedAt: new Date().toISOString()
    }
  ],
  bookPages: [],
  storyBooks: [],
  conversations: [],
  auditLogs: [
    { id: "log-1", userId: "u-student", action: "Opened writing assistant", createdAt: new Date().toISOString() }
  ],
  moderationQueue: [],
  aiSettings: {
    provider: "sub2api",
    baseUrl: "http://localhost:8080/v1",
    model: "gpt-5.4-mini",
    chatModel: "gpt-5.4-mini",
    imageModel: "gpt-image-1",
    apiKey: "",
    enabled: false
  }
};

function ensureDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(starterDb, null, 2));
  }
}

function readDb() {
  ensureDb();
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  db.aiSettings ||= { ...starterDb.aiSettings };
  db.storyBooks ||= [];
  return db;
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function send(res, status, data, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  if (Buffer.isBuffer(data) || typeof data === "string") {
    res.end(data);
    return;
  }
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function id(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

function currentUser(req, db) {
  const userId = req.headers["x-user-id"];
  return db.users.find(user => user.id === userId) || null;
}

function safeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

function publicAiSettings(settings) {
  return {
    provider: settings.provider || "sub2api",
    baseUrl: settings.baseUrl || "http://localhost:8080/v1",
    model: settings.chatModel || settings.model || "gpt-5.4-mini",
    chatModel: settings.chatModel || settings.model || "gpt-5.4-mini",
    imageModel: settings.imageModel || "gpt-image-1",
    enabled: Boolean(settings.enabled && settings.apiKey),
    hasKey: Boolean(settings.apiKey)
  };
}

function requireAdmin(req, db) {
  const user = currentUser(req, db);
  if (!user || user.role !== "admin") {
    const error = new Error("Admin access required");
    error.status = 403;
    throw error;
  }
  return user;
}

function moderateText(text) {
  const blocked = ["暴力", "色情", "政治敏感", "歧視", "仇恨", "personal data"];
  const hits = blocked.filter(term => String(text || "").toLowerCase().includes(term.toLowerCase()));
  return {
    safe: hits.length === 0,
    hits,
    note: hits.length ? "Content requires teacher review before publishing." : "Passed school safety filter."
  };
}

function writingFeedback(content, level = "P5") {
  const text = String(content || "").trim();
  const length = text.length;
  const suggestions = [];
  if (length < 80) suggestions.push("加入時間、地點、人物動作，令內容更完整。");
  if (!/[，。！？,.!?]/.test(text)) suggestions.push("加入標點，讓句子節奏更清楚。");
  if (!/(看見|聽見|感到|想到|香|聲|光|影)/.test(text)) suggestions.push("加入感官描寫，例如聲音、光線或心情。");
  suggestions.push(`${level} 層級建議：先用三句建立情境，再用兩句表達感受或反思。`);
  return {
    score: Math.min(96, Math.max(55, 62 + Math.floor(length / 8) + (suggestions.length <= 2 ? 12 : 0))),
    summary: "內容方向清楚，下一步可提升描寫層次和段落組織。",
    suggestions
  };
}

function generateStory(seed, style, language) {
  const subject = seed || "一位好奇的小學生";
  const lang = language || "繁體中文";
  return [
    {
      page: 1,
      text: `${subject} 在圖書館發現一張會發光的舊地圖，地圖用${lang}寫着第一個謎題。`,
      imagePrompt: `${style} children's book illustration, school library, glowing old map, curious student`
    },
    {
      page: 2,
      text: "他跟着線索來到校園的榕樹下，聽見樹葉像在低聲講述一段歷史。",
      imagePrompt: `${style} illustration, banyan tree in a Hong Kong primary school, warm sunlight`
    },
    {
      page: 3,
      text: "同學們一起查證資料，分辨哪些是真實史料，哪些只是傳說。",
      imagePrompt: `${style} illustration, children examining photos and artifacts, classroom teamwork`
    },
    {
      page: 4,
      text: "最後，他們把故事做成電子繪本，向全班分享學到的知識和勇氣。",
      imagePrompt: `${style} illustration, students presenting an e-book on screen, joyful classroom`
    }
  ];
}

function historicalReply(persona, question) {
  const profiles = {
    "秦始皇": "我重視統一制度、文字與度量衡，但你也應思考人民承受的代價。",
    "玄奘": "求知需要毅力。我西行取經，是為了理解不同地方的文化與思想。",
    "鄭和": "航海讓我們看見世界很大，交流比征服更能留下長遠影響。",
    "孫中山": "改革來自對社會問題的觀察，也需要很多人共同參與。"
  };
  return {
    persona,
    reply: `${profiles[persona] || "讓我們根據史料一起推理。"} 你問「${question || "這件事有甚麼意義？"}」，可以先找出時間、地點、人物和證據，再判斷可信程度。`,
    sourceTip: "請比較至少兩項資料，例如相片、課本段落、博物館說明或老師提供的史料。"
  };
}

function extractJson(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("AI returned an empty response");
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const match = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("AI response was not JSON");
    return JSON.parse(match[0]);
  }
}

async function callAi(db, messages, responseFormat = "json_object") {
  const settings = db.aiSettings || {};
  const apiKey = String(settings.apiKey || "").trim();
  if (!settings.enabled || !apiKey) return null;

  const baseUrl = String(settings.baseUrl || "").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "x-api-key": apiKey,
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        model: settings.chatModel || settings.model || "gpt-5.4-mini",
        messages,
        temperature: 0.7,
        response_format: responseFormat ? { type: responseFormat } : undefined
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.error?.message || payload.message || `AI provider returned HTTP ${response.status}`;
      const code = payload.error?.code || payload.code || response.status;
      throw new Error(`${message} (${code})`);
    }
    return payload.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timeout);
  }
}

async function callImageAi(db, prompt) {
  const settings = db.aiSettings || {};
  const apiKey = String(settings.apiKey || "").trim();
  if (!settings.enabled || !apiKey) return null;

  const baseUrl = String(settings.baseUrl || "").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/images/generations`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "x-api-key": apiKey,
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        model: settings.imageModel || "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024"
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.error?.message || payload.message || `Image provider returned HTTP ${response.status}`;
      const code = payload.error?.code || payload.code || response.status;
      throw new Error(`${message} (${code})`);
    }
    const first = payload.data?.[0] || {};
    if (first.url) return { imageUrl: first.url, source: "sub2api-image" };
    if (first.b64_json) return { imageUrl: `data:image/png;base64,${first.b64_json}`, source: "sub2api-image" };
    throw new Error("Image provider returned no image URL or base64 data");
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Image generation timed out after 5 minutes. Please retry this page.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function attachStoryImages(db, pages) {
  const [first, ...rest] = pages;
  if (!first) return pages;
  try {
    const image = await callImageAi(db, first.imagePrompt);
    return [{ ...first, ...image }, ...rest.map(page => ({ ...page, imageStatus: "prompt-ready" }))];
  } catch (error) {
    return [{ ...first, imageError: error.message }, ...rest.map(page => ({ ...page, imageStatus: "prompt-ready" }))];
  }
}

async function aiWritingFeedback(db, content, level) {
  const fallback = writingFeedback(content, level);
  const text = await callAi(db, [
    { role: "system", content: "You are a primary school writing teacher in Hong Kong. Return JSON only with score number, summary string, and suggestions array in Traditional Chinese." },
    { role: "user", content: `Student level: ${level}\nDraft:\n${content}` }
  ]).catch(error => ({ __error: error.message }));
  if (!text || text.__error) return { ...fallback, source: "local", providerError: text?.__error };
  try {
    const parsed = extractJson(text);
    return {
      score: Number(parsed.score || fallback.score),
      summary: parsed.summary || fallback.summary,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : fallback.suggestions,
      source: "sub2api"
    };
  } catch (error) {
    return { ...fallback, source: "local", providerError: error.message };
  }
}

async function aiStoryPages(db, seed, style, language) {
  const fallback = generateStory(seed, style, language);
  const text = await callAi(db, [
    { role: "system", content: "You create age-appropriate primary school storybooks. Return JSON only: {\"pages\":[{\"page\":1,\"text\":\"...\",\"imagePrompt\":\"...\"}]} with exactly 4 pages. Use safe Traditional Chinese unless another language is requested." },
    { role: "user", content: `Story seed: ${seed}\nArt style: ${style}\nLanguage: ${language}\nEach imagePrompt should be in English for image generation and keep character consistency.` }
  ]).catch(error => ({ __error: error.message }));
  if (!text || text.__error) return { pages: fallback, source: "local", providerError: text?.__error };
  try {
    const parsed = extractJson(text);
    const pages = Array.isArray(parsed) ? parsed : parsed.pages;
    if (!Array.isArray(pages) || !pages.length) throw new Error("Missing pages array");
    return {
      pages: pages.slice(0, 4).map((page, index) => ({
        page: Number(page.page || index + 1),
        text: page.text || fallback[index]?.text || "",
        imagePrompt: page.imagePrompt || page.image_prompt || fallback[index]?.imagePrompt || ""
      })),
      source: "sub2api"
    };
  } catch (error) {
    return { pages: fallback, source: "local", providerError: error.message };
  }
}

async function aiHistoricalReply(db, persona, question) {
  const fallback = historicalReply(persona, question);
  const text = await callAi(db, [
    { role: "system", content: "You are a safe historical inquiry tutor for Hong Kong primary students. Return JSON only with persona, reply, and sourceTip in Traditional Chinese. Do not invent modern anachronisms." },
    { role: "user", content: `Persona: ${persona}\nQuestion: ${question}` }
  ]).catch(error => ({ __error: error.message }));
  if (!text || text.__error) return { ...fallback, source: "local", providerError: text?.__error };
  try {
    const parsed = extractJson(text);
    return {
      persona: parsed.persona || persona,
      reply: parsed.reply || fallback.reply,
      sourceTip: parsed.sourceTip || parsed.source_tip || fallback.sourceTip,
      source: "sub2api"
    };
  } catch (error) {
    return { ...fallback, source: "local", providerError: error.message };
  }
}

function apiSummary(db) {
  const students = db.users.filter(user => user.role === "student");
  const reviewed = db.works.filter(work => work.status === "reviewed");
  const avg = reviewed.length ? Math.round(reviewed.reduce((sum, work) => sum + (work.score || 0), 0) / reviewed.length) : 0;
  return {
    studentCount: students.length,
    workCount: db.works.length,
    pendingReview: db.works.filter(work => work.status !== "reviewed").length + db.moderationQueue.length,
    averageScore: avg,
    aiInteractions: db.auditLogs.length + db.conversations.length,
    storageItems: db.works.length + db.bookPages.length + db.storyBooks.length + db.conversations.length
  };
}

async function handleApi(req, res) {
  const db = readDb();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = `${req.method} ${url.pathname}`;

  try {
    if (route === "POST /api/login") {
      const body = await parseBody(req);
      const user = db.users.find(item => item.role === body.role && item.password === body.password);
      if (!user) return send(res, 401, { error: "Invalid role or password" });
      const { password, ...safeUser } = user;
      return send(res, 200, { user: safeUser });
    }

    if (route === "GET /api/bootstrap") {
      const user = currentUser(req, db);
      const safeUsers = db.users.map(safeUser);
      return send(res, 200, {
        user: safeUser(user),
        users: safeUsers,
        assignments: db.assignments,
        works: db.works,
        bookPages: db.bookPages,
        storyBooks: db.storyBooks,
        conversations: db.conversations.slice(-20),
        moderationQueue: db.moderationQueue,
        aiSettings: publicAiSettings(db.aiSettings),
        summary: apiSummary(db)
      });
    }

    if (route === "POST /api/writing/feedback") {
      const body = await parseBody(req);
      const check = moderateText(body.content);
      const feedback = await aiWritingFeedback(db, body.content, body.level);
      const work = {
        id: id("w"),
        studentId: body.studentId,
        assignmentId: body.assignmentId,
        type: "writing",
        title: body.title || "Untitled writing",
        content: body.content || "",
        feedback: feedback.suggestions.join(" "),
        status: check.safe ? "submitted" : "blocked",
        score: feedback.score,
        moderation: check,
        updatedAt: new Date().toISOString()
      };
      db.works.unshift(work);
      if (!check.safe) {
        db.moderationQueue.unshift({ id: id("mod"), workId: work.id, reason: check.hits.join(", "), createdAt: new Date().toISOString() });
      }
      db.auditLogs.unshift({ id: id("log"), userId: body.studentId, action: "Requested writing feedback", createdAt: new Date().toISOString() });
      writeDb(db);
      return send(res, 201, { work, feedback, moderation: check });
    }

    if (route === "POST /api/storybook/generate") {
      const body = await parseBody(req);
      const moderation = moderateText(body.seed);
      const generated = await aiStoryPages(db, body.seed, body.style || "watercolor", body.language || "繁體中文");
      const pagesWithoutImages = generated.pages.map(page => ({
        ...page,
        id: id("page"),
        studentId: body.studentId,
        style: body.style || "watercolor",
        createdAt: new Date().toISOString()
      }));
      const pages = pagesWithoutImages.map(page => ({ ...page, imageStatus: "pending" }));
      db.bookPages.unshift(...pages);
      db.auditLogs.unshift({ id: id("log"), userId: body.studentId, action: "Generated storybook pages", createdAt: new Date().toISOString() });
      if (!moderation.safe) {
        db.moderationQueue.unshift({ id: id("mod"), workId: pages[0].id, reason: moderation.hits.join(", "), createdAt: new Date().toISOString() });
      }
      writeDb(db);
      return send(res, 201, { pages, moderation, source: generated.source, providerError: generated.providerError });
    }

    if (route === "POST /api/storybook/image") {
      const body = await parseBody(req);
      const page = db.bookPages.find(item => item.id === body.pageId);
      if (!page) return send(res, 404, { error: "Story page not found" });
      try {
        const image = await callImageAi(db, page.imagePrompt);
        delete page.imageError;
        Object.assign(page, image, { imageStatus: "ready" });
        writeDb(db);
        return send(res, 200, { page });
      } catch (error) {
        page.imageError = error.message;
        page.imageStatus = "failed";
        writeDb(db);
        return send(res, 502, { error: error.message, page });
      }
    }

    if (route === "POST /api/storybook/save") {
      const body = await parseBody(req);
      const pageIds = Array.isArray(body.pageIds) ? body.pageIds : [];
      const pages = pageIds
        .map(pageId => db.bookPages.find(page => page.id === pageId && page.studentId === body.studentId))
        .filter(Boolean);
      if (!pages.length) return send(res, 400, { error: "No story pages to save" });
      const existing = db.storyBooks.find(book => book.studentId === body.studentId && pageIds.every(pageId => book.pageIds.includes(pageId)));
      if (existing) {
        existing.title = String(body.title || existing.title || "AI Storybook").trim();
        existing.prompt = String(body.prompt || existing.prompt || "").trim();
        existing.updatedAt = new Date().toISOString();
        writeDb(db);
        return send(res, 200, { storyBook: existing });
      }
      const storyBook = {
        id: id("book"),
        studentId: body.studentId,
        title: String(body.title || "AI Storybook").trim(),
        prompt: String(body.prompt || "").trim(),
        pageIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.storyBooks.unshift(storyBook);
      db.auditLogs.unshift({ id: id("log"), userId: body.studentId, action: "Saved storybook to portfolio", createdAt: new Date().toISOString() });
      writeDb(db);
      return send(res, 201, { storyBook });
    }

    if (route === "POST /api/history/chat") {
      const body = await parseBody(req);
      const moderation = moderateText(body.question);
      const response = await aiHistoricalReply(db, body.persona || "玄奘", body.question);
      const conversation = {
        id: id("chat"),
        studentId: body.studentId,
        persona: response.persona,
        question: body.question,
        reply: response.reply,
        sourceTip: response.sourceTip,
        source: response.source,
        providerError: response.providerError,
        moderation,
        createdAt: new Date().toISOString()
      };
      db.conversations.unshift(conversation);
      writeDb(db);
      return send(res, 201, { conversation });
    }

    if (route === "POST /api/teacher/review") {
      const body = await parseBody(req);
      const work = db.works.find(item => item.id === body.workId);
      if (!work) return send(res, 404, { error: "Work not found" });
      work.status = body.status || "reviewed";
      work.teacherComment = body.teacherComment || work.teacherComment || "Reviewed by teacher.";
      work.score = Number(body.score || work.score || 75);
      work.updatedAt = new Date().toISOString();
      db.moderationQueue = db.moderationQueue.filter(item => item.workId !== work.id);
      writeDb(db);
      return send(res, 200, { work });
    }

    if (route === "POST /api/admin/user") {
      const body = await parseBody(req);
      const user = {
        id: id("u"),
        name: body.name,
        role: body.role,
        className: body.className || "Unassigned",
        level: body.level || "P5",
        password: body.password || body.role
      };
      db.users.push(user);
      writeDb(db);
      const { password, ...safeUser } = user;
      return send(res, 201, { user: safeUser });
    }

    if (route === "POST /api/admin/ai-settings") {
      requireAdmin(req, db);
      const body = await parseBody(req);
      db.aiSettings = {
        provider: String(body.provider || "sub2api").trim(),
        baseUrl: String(body.baseUrl || "http://localhost:8080/v1").trim(),
        model: String(body.chatModel || body.model || "gpt-5.4-mini").trim(),
        chatModel: String(body.chatModel || body.model || "gpt-5.4-mini").trim(),
        imageModel: String(body.imageModel || "gpt-image-1").trim(),
        apiKey: body.apiKey === "__keep__" ? db.aiSettings?.apiKey || "" : String(body.apiKey || "").trim(),
        enabled: Boolean(body.enabled)
      };
      db.auditLogs.unshift({ id: id("log"), userId: currentUser(req, db).id, action: "Updated AI provider settings", createdAt: new Date().toISOString() });
      writeDb(db);
      return send(res, 200, { aiSettings: publicAiSettings(db.aiSettings) });
    }

    if (route === "POST /api/admin/ai-settings/test") {
      requireAdmin(req, db);
      const body = await parseBody(req);
      const testDb = {
        ...db,
        aiSettings: {
          provider: body.provider || db.aiSettings.provider,
          baseUrl: String(body.baseUrl || db.aiSettings.baseUrl || "").trim(),
          model: String(body.chatModel || body.model || db.aiSettings.chatModel || db.aiSettings.model || "").trim(),
          chatModel: String(body.chatModel || body.model || db.aiSettings.chatModel || db.aiSettings.model || "").trim(),
          imageModel: String(body.imageModel || db.aiSettings.imageModel || "gpt-image-1").trim(),
          apiKey: body.apiKey === "__keep__" ? db.aiSettings.apiKey : String(body.apiKey || db.aiSettings.apiKey || "").trim(),
          enabled: true
        }
      };
      const reply = await callAi(testDb, [
        { role: "system", content: "Return JSON only: {\"ok\":true,\"message\":\"...\"}" },
        { role: "user", content: "Say the AI provider connection works in Traditional Chinese." }
      ]);
      return send(res, 200, { ok: true, reply: extractJson(reply) });
    }

    if (route === "POST /api/admin/ai-settings/test-image") {
      requireAdmin(req, db);
      const body = await parseBody(req);
      const testDb = {
        ...db,
        aiSettings: {
          provider: body.provider || db.aiSettings.provider,
          baseUrl: String(body.baseUrl || db.aiSettings.baseUrl || "").trim(),
          model: String(body.chatModel || body.model || db.aiSettings.chatModel || db.aiSettings.model || "").trim(),
          chatModel: String(body.chatModel || body.model || db.aiSettings.chatModel || db.aiSettings.model || "").trim(),
          imageModel: String(body.imageModel || db.aiSettings.imageModel || "gpt-image-1").trim(),
          apiKey: body.apiKey === "__keep__" ? db.aiSettings.apiKey : String(body.apiKey || db.aiSettings.apiKey || "").trim(),
          enabled: true
        }
      };
      const image = await callImageAi(testDb, "simple safe children's book illustration of a smiling star, no text");
      return send(res, 200, { ok: true, source: image.source || "image" });
    }

    if (route === "GET /api/export/ebook") {
      const studentId = url.searchParams.get("studentId");
      const pages = db.bookPages.filter(page => !studentId || page.studentId === studentId).slice(0, 8);
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>E-book Export</title><style>body{font-family:Arial,"Noto Sans TC",sans-serif;line-height:1.7;padding:32px;color:#172033}.page{break-after:page;margin-bottom:32px}.art{height:220px;background:#f0f7f4;border:1px solid #bad7c8;border-radius:12px;padding:18px}</style></head><body><h1>AI Storybook Export</h1>${pages.map(page => `<section class="page"><h2>Page ${page.page}</h2><p>${page.text}</p><div class="art"><strong>Image prompt:</strong><br>${page.imagePrompt}</div></section>`).join("")}</body></html>`;
      return send(res, 200, html, "text/html; charset=utf-8");
    }
  } catch (error) {
    return send(res, error.status || 400, { error: error.message });
  }

  return send(res, 404, { error: "API route not found" });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (indexError, indexData) => {
        if (indexError) return send(res, 404, "Not found", "text/plain; charset=utf-8");
        send(res, 200, indexData, "text/html; charset=utf-8");
      });
      return;
    }
    send(res, 200, data, mimeTypes[path.extname(filePath)] || "application/octet-stream");
  });
}

ensureDb();

http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }
  serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`School AI Learning Platform running at http://localhost:${PORT}`);
});
