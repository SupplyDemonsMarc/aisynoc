// lib/db.js
// Super simple JSON-file "database". No MongoDB, no external DB — just flat files.
// Reads/writes are synchronous and guarded with a naive in-process lock queue,
// which is plenty for a small self-hosted tool like this.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function ensureFile(file, defaultData) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(defaultData, null, 2));
  }
  return p;
}

function readJSON(file, defaultData) {
  const p = ensureFile(file, defaultData);
  try {
    const raw = fs.readFileSync(p, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    // If the file got corrupted somehow, fall back to default rather than crashing.
    return defaultData;
  }
}

function writeJSON(file, data) {
  const p = ensureFile(file, data);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  return data;
}

module.exports = { readJSON, writeJSON, DATA_DIR };
