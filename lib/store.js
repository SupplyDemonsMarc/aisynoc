// lib/store.js
const bcrypt = require("bcryptjs");
const { readJSON, writeJSON } = require("./db");

const USERS_FILE = "users.json";
const SETTINGS_FILE = "settings.json";
const LOGS_FILE = "logs.json";

const DEFAULT_SETTINGS = {
  siteName: "SynoxHub",
  tagline: "Satu pintu untuk AI, downloader, dan pencari profil.",
  background: {
    type: "color", // "color" | "image"
    value: "#0a0c10"
  },
  defaultLimit: 5
};

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ---------- Settings ----------
function getSettings() {
  return readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
}

function updateSettings(patch) {
  const current = getSettings();
  const next = { ...current, ...patch };
  writeJSON(SETTINGS_FILE, next);
  return next;
}

// ---------- Users ----------
function seedIfEmpty() {
  const users = readJSON(USERS_FILE, []);
  if (users.length === 0) {
    const admin = {
      id: "u_" + Date.now(),
      username: "admin",
      password: bcrypt.hashSync("admin123", 10),
      role: "admin",
      limit: 999999,
      usage: { date: todayStr(), count: 0 },
      createdAt: new Date().toISOString()
    };
    writeJSON(USERS_FILE, [admin]);
  }
}

function getUsers() {
  return readJSON(USERS_FILE, []);
}

function saveUsers(users) {
  writeJSON(USERS_FILE, users);
}

function findUserByUsername(username) {
  const users = getUsers();
  return users.find(
    (u) => u.username.toLowerCase() === String(username).toLowerCase()
  );
}

function findUserById(id) {
  const users = getUsers();
  return users.find((u) => u.id === id);
}

function createUser({ username, password, role = "user", limit }) {
  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("Username sudah dipakai");
  }
  const settings = getSettings();
  const user = {
    id: "u_" + Date.now() + Math.floor(Math.random() * 1000),
    username,
    password: bcrypt.hashSync(password, 10),
    role,
    limit: role === "admin" ? 999999 : (limit ?? settings.defaultLimit),
    usage: { date: todayStr(), count: 0 },
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);
  return user;
}

function deleteUser(id) {
  const users = getUsers();
  const next = users.filter((u) => u.id !== id);
  saveUsers(next);
  return next.length !== users.length;
}

function setUserLimit(id, limit) {
  const users = getUsers();
  const u = users.find((x) => x.id === id);
  if (!u) return null;
  u.limit = limit;
  saveUsers(users);
  return u;
}

function setUserRole(id, role) {
  const users = getUsers();
  const u = users.find((x) => x.id === id);
  if (!u) return null;
  u.role = role;
  if (role === "admin") u.limit = 999999;
  saveUsers(users);
  return u;
}

// Resets usage counter if the stored date isn't today, then returns fresh usage.
function getFreshUsage(user) {
  if (user.usage.date !== todayStr()) {
    user.usage = { date: todayStr(), count: 0 };
  }
  return user.usage;
}

function canUseFeature(userId) {
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { allowed: false, remaining: 0 };
  const usage = getFreshUsage(user);
  saveUsers(users);
  const remaining = Math.max(0, user.limit - usage.count);
  return { allowed: remaining > 0, remaining, limit: user.limit, used: usage.count };
}

function consumeUsage(userId) {
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  const usage = getFreshUsage(user);
  usage.count += 1;
  saveUsers(users);
  return { used: usage.count, limit: user.limit, remaining: Math.max(0, user.limit - usage.count) };
}

// ---------- Activity logs (small ring buffer, purely informational) ----------
function logActivity(entry) {
  const logs = readJSON(LOGS_FILE, []);
  logs.unshift({ ...entry, at: new Date().toISOString() });
  writeJSON(LOGS_FILE, logs.slice(0, 200));
}

function getLogs() {
  return readJSON(LOGS_FILE, []);
}

module.exports = {
  seedIfEmpty,
  getSettings,
  updateSettings,
  getUsers,
  saveUsers,
  findUserByUsername,
  findUserById,
  createUser,
  deleteUser,
  setUserLimit,
  setUserRole,
  canUseFeature,
  consumeUsage,
  logActivity,
  getLogs,
  todayStr
};
          
