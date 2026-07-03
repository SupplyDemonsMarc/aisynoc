// Renders an arbitrary API JSON payload into a friendly card: pulls out an
// image if one is obviously present, surfaces likely "download" links as
// buttons, lists remaining scalar fields as key/value rows, and always keeps
// the raw JSON visible underneath since API response shapes can vary.
function escapeHtmlSafe(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function prettyLabel(key) {
  return key.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function looksLikeUrl(v) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

function looksLikeImage(key, v) {
  if (!looksLikeUrl(v)) return false;
  return /avatar|thumb|thumbnail|image|photo|profile_pic|cover|dp\b/i.test(key) ||
    /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(v);
}

function looksLikeDownload(key, v) {
  if (!looksLikeUrl(v)) return false;
  return /url|link|download|video|play|hd|nowm|no_watermark|media/i.test(key);
}

function unwrap(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (payload.result && typeof payload.result === "object") return payload.result;
    if (payload.data && typeof payload.data === "object") return payload.data;
  }
  if (Array.isArray(payload) && payload.length) return payload[0];
  return payload;
}

function renderResultCard(container, payload) {
  const obj = unwrap(payload);
  container.innerHTML = "";

  const box = document.createElement("div");
  box.className = "result-box";

  if (!obj || typeof obj !== "object") {
    box.innerHTML = `<div class="raw-json">${escapeHtmlSafe(JSON.stringify(payload, null, 2))}</div>`;
    container.appendChild(box);
    return;
  }

  let imageUrl = null;
  const downloadLinks = [];
  const kvRows = [];

  Object.entries(obj).forEach(([key, val]) => {
    if (val === null || val === undefined || val === "") return;
    if (typeof val === "object") return; // skip nested objects/arrays in the kv list

    if (!imageUrl && looksLikeImage(key, val)) {
      imageUrl = val;
      return;
    }
    if (looksLikeDownload(key, val)) {
      downloadLinks.push({ label: prettyLabel(key), url: val });
      return;
    }
    kvRows.push({ key: prettyLabel(key), val });
  });

  let html = "";

  if (imageUrl || downloadLinks.length) {
    html += `<div class="profile-head">`;
    if (imageUrl) html += `<img src="${imageUrl}" class="profile-avatar" alt="preview">`;
    if (downloadLinks.length) {
      html += `<div style="display:flex; flex-wrap:wrap; gap:8px;">`;
      downloadLinks.forEach((d) => {
        html += `<a class="btn btn-primary btn-sm" href="${d.url}" target="_blank" rel="noopener">⬇ ${escapeHtmlSafe(d.label)}</a>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  }

  if (kvRows.length) {
    html += `<div class="kv-list">`;
    kvRows.forEach((r) => {
      html += `<div class="kv-row"><div class="kv-key">${escapeHtmlSafe(r.key)}</div><div class="kv-val">${escapeHtmlSafe(r.val)}</div></div>`;
    });
    html += `</div>`;
  }

  html += `
    <details style="margin-top:14px;">
      <summary style="cursor:pointer; color:var(--text-dim); font-size:12px; font-family:var(--font-mono); text-transform:uppercase; letter-spacing:.04em;">Lihat data mentah (JSON)</summary>
      <div class="raw-json" style="margin-top:10px;">${escapeHtmlSafe(JSON.stringify(payload, null, 2))}</div>
    </details>`;

  box.innerHTML = html;
  container.appendChild(box);
}
