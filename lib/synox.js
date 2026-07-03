// lib/synox.js
// Thin wrapper around the Synox Cloud API. All calls happen server-side so the
// API base never gets exposed to the browser, and so we can enforce daily limits
// before spending a request.

// Node 18+ ships a global fetch, no extra dependency needed.
const BASE = "https://api.synoxcloud.xyz";
const TIMEOUT_MS = 25000;

// Tracks in-flight AI requests by requestId so the chat UI's "Stop" button
// can cancel a call that's still waiting on the upstream API.
const activeControllers = new Map();

function stopRequest(requestId) {
  const controller = activeControllers.get(requestId);
  if (!controller) return false;
  controller.abort("user-stopped");
  activeControllers.delete(requestId);
  return true;
}

async function callApi(pathAndQuery, requestId) {
  const controller = new AbortController();
  if (requestId) activeControllers.set(requestId, controller);
  const timer = setTimeout(() => controller.abort("timeout"), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + pathAndQuery, { signal: controller.signal });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      return { ok: false, status: res.status, error: data?.message || `API merespon status ${res.status}`, data };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    if (controller.signal.reason === "user-stopped") {
      return { ok: false, stopped: true, status: 0, error: "Dihentikan oleh pengguna." };
    }
    if (err.name === "AbortError") {
      return { ok: false, status: 0, error: "Waktu tunggu API habis, coba lagi." };
    }
    return { ok: false, status: 0, error: "Tidak bisa terhubung ke API: " + err.message };
  } finally {
    clearTimeout(timer);
    if (requestId) activeControllers.delete(requestId);
  }
}

function aiChat(pesan, requestId) {
  return callApi(`/ai-chat/claude-opus-4.8?pesan=${encodeURIComponent(pesan)}`, requestId);
}

function downloadTiktok(url) {
  return callApi(`/download/tiktok?url=${encodeURIComponent(url)}`);
}

function downloadYoutube(url) {
  return callApi(`/download/youtube?url=${encodeURIComponent(url)}`);
}

function stalkTiktok(username) {
  return callApi(`/stalker/tiktokstalk?username=${encodeURIComponent(username)}`);
}

function stalkWhatsapp(number) {
  return callApi(`/stalker/whatsapp?number=${encodeURIComponent(number)}`);
}

function stalkInstagram(username) {
  return callApi(`/stalker/instagram?username=${encodeURIComponent(username)}`);
}

module.exports = {
  aiChat,
  downloadTiktok,
  downloadYoutube,
  stalkTiktok,
  stalkWhatsapp,
  stalkInstagram,
  stopRequest
};
    
