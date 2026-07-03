(function () {
  const chatLog = document.getElementById("chatLog");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const stopBtn = document.getElementById("stopBtn");
  const uploadBtn = document.getElementById("uploadBtn");
  const photoInput = document.getElementById("photoInput");
  const uploadPreview = document.getElementById("uploadPreview");

  let controller = null;
  let attachedPhoto = null;
  let currentRequestId = null;
  const history = []; // { role: 'user'|'assistant', content }

  // ---- autosize textarea ----
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + "px";
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.requestSubmit();
    }
  });

  function scrollToBottom() {
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  const EXT_BY_LANG = {
    javascript: "js", js: "js", typescript: "ts", ts: "ts",
    python: "py", py: "py", java: "java", c: "c", cpp: "cpp", "c++": "cpp",
    csharp: "cs", "c#": "cs", php: "php", html: "html", css: "css",
    json: "json", bash: "sh", sh: "sh", shell: "sh", sql: "sql",
    go: "go", rust: "rs", ruby: "rb", kotlin: "kt", swift: "swift",
    yaml: "yml", yml: "yml", xml: "xml", dart: "dart"
  };

  // Parses ```lang\ncode\n``` fenced blocks out of text, returns array of
  // { type: 'text'|'code', content, lang }
  function parseSegments(text) {
    const segments = [];
    const regex = /```([a-zA-Z0-9+#]*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      segments.push({ type: "code", lang: (match[1] || "text").toLowerCase(), content: match[2].replace(/\n$/, "") });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      segments.push({ type: "text", content: text.slice(lastIndex) });
    }
    return segments;
  }

  function buildCodeBlock(lang, code) {
    const wrap = document.createElement("div");
    wrap.className = "code-block";

    const head = document.createElement("div");
    head.className = "code-block-head";
    head.innerHTML = `<span>${escapeHtml(lang || "text")}</span>`;

    const actions = document.createElement("div");
    actions.className = "code-block-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn btn-sm";
    copyBtn.type = "button";
    copyBtn.textContent = "Salin";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.textContent = "Tersalin!";
        setTimeout(() => (copyBtn.textContent = "Salin"), 1500);
      });
    });

    const dlBtn = document.createElement("button");
    dlBtn.className = "btn btn-sm btn-cyan";
    dlBtn.type = "button";
    dlBtn.textContent = "Unduh";
    dlBtn.addEventListener("click", () => {
      const ext = EXT_BY_LANG[lang] || "txt";
      const blob = new Blob([code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `snippet.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    actions.appendChild(copyBtn);
    actions.appendChild(dlBtn);
    head.appendChild(actions);

    const pre = document.createElement("pre");
    const codeEl = document.createElement("code");
    codeEl.textContent = code;
    pre.appendChild(codeEl);

    wrap.appendChild(head);
    wrap.appendChild(pre);
    return wrap;
  }

  function addMessage(role, text, opts) {
    opts = opts || {};
    const msg = document.createElement("div");
    msg.className = "msg " + (role === "user" ? "msg-user" : "msg-bot");

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = role === "user" ? "KAMU".slice(0, 2) : "AI";

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";

    if (opts.thumb) {
      const img = document.createElement("img");
      img.src = opts.thumb;
      img.className = "msg-thumb";
      bubble.appendChild(document.createTextNode(text));
      bubble.appendChild(img);
    } else if (opts.isBot) {
      const segments = parseSegments(text);
      segments.forEach((seg) => {
        if (seg.type === "text") {
          if (seg.content.trim() === "") return;
          const p = document.createElement("div");
          p.textContent = seg.content.trim();
          bubble.appendChild(p);
        } else {
          bubble.appendChild(buildCodeBlock(seg.lang, seg.content));
        }
      });
      if (!text.trim()) bubble.textContent = "(tidak ada balasan)";
    } else {
      bubble.textContent = text;
    }

    msg.appendChild(avatar);
    msg.appendChild(bubble);
    chatLog.appendChild(msg);
    scrollToBottom();
    return msg;
  }

  function addTyping() {
    const msg = document.createElement("div");
    msg.className = "msg msg-bot";
    msg.id = "typingMsg";
    msg.innerHTML = `<div class="msg-avatar">AI</div><div class="msg-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>`;
    chatLog.appendChild(msg);
    scrollToBottom();
  }

  function removeTyping() {
    const el = document.getElementById("typingMsg");
    if (el) el.remove();
  }

  function updateUsage(usage) {
    if (!usage) return;
    const usedEl = document.getElementById("usageUsed");
    const limitEl = document.getElementById("usageLimit");
    const pill = document.getElementById("usagePill");
    if (usedEl) usedEl.textContent = usage.used;
    if (limitEl) limitEl.textContent = usage.limit >= 999999 ? "∞" : usage.limit;
    if (pill && usage.remaining <= 0) pill.classList.add("limit-hit");
  }

  function setSending(isSending) {
    sendBtn.style.display = isSending ? "none" : "inline-flex";
    stopBtn.style.display = isSending ? "inline-flex" : "none";
    chatInput.disabled = isSending;
  }

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage("user", text);
    chatInput.value = "";
    chatInput.style.height = "auto";
    attachedPhoto = null;
    uploadPreview.style.display = "none";
    uploadPreview.innerHTML = "";

    setSending(true);
    addTyping();

    controller = new AbortController();
    currentRequestId = "req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

    try {
      const res = await fetch("/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pesan: text, requestId: currentRequestId, history }),
        signal: controller.signal
      });
      const data = await res.json();
      removeTyping();

      if (data.stopped) {
        addMessage("bot", "⏹️ " + (data.error || "Dihentikan."), { isBot: true });
      } else if (!data.ok) {
        addMessage("bot", "⚠️ " + data.error, { isBot: true });
      } else {
        history.push({ role: "user", content: text });
        history.push({ role: "assistant", content: String(data.reply) });
        addMessage("bot", String(data.reply), { isBot: true });
      }
      updateUsage(data.usage);
    } catch (err) {
      removeTyping();
      if (err.name === "AbortError") {
        addMessage("bot", "Percakapan dihentikan.", { isBot: true });
      } else {
        addMessage("bot", "⚠️ Gagal terhubung ke server.", { isBot: true });
      }
    } finally {
      setSending(false);
      controller = null;
      currentRequestId = null;
    }
  });

  stopBtn.addEventListener("click", () => {
    if (controller) controller.abort();
    if (currentRequestId) {
      fetch("/ai/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: currentRequestId })
      }).catch(() => {});
    }
  });

  uploadBtn.addEventListener("click", () => photoInput.click());

  photoInput.addEventListener("change", async () => {
    const file = photoInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    uploadPreview.style.display = "block";
    uploadPreview.innerHTML = `<div class="alert alert-info" style="margin:10px 0 0;">Mengunggah foto...</div>`;

    try {
      const res = await fetch("/ai/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) {
        uploadPreview.innerHTML = `<div class="alert alert-error" style="margin:10px 0 0;">${data.error}</div>`;
        return;
      }
      attachedPhoto = data.url;
      uploadPreview.innerHTML = `
        <div class="alert alert-info" style="margin:10px 0 0; align-items:center;">
          <img src="${data.url}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;">
          <span>${data.note}</span>
        </div>`;
    } catch {
      uploadPreview.innerHTML = `<div class="alert alert-error" style="margin:10px 0 0;">Gagal mengunggah foto.</div>`;
    }
    photoInput.value = "";
  });
})();
    
