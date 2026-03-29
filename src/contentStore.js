import fs from "fs";
import path from "path";

const defaultFile = path.join(process.cwd(), "data", "default-content.json");

function getDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  const renderDir = "/var/data";
  if (fs.existsSync(renderDir)) return renderDir;
  return path.join(process.cwd(), "data");
}

export function getContentFilePath() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "moolah-site-content.json");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function mergeDeep(base, override) {
  if (Array.isArray(base)) return Array.isArray(override) ? override : base;
  if (!isObject(base)) return override ?? base;
  const result = { ...base };
  if (!isObject(override)) return result;
  for (const [key, value] of Object.entries(override)) {
    result[key] = key in result ? mergeDeep(result[key], value) : value;
  }
  return result;
}

export function loadDefaultContent() {
  return clone(readJson(defaultFile));
}

export function loadContent() {
  const target = getContentFilePath();
  const defaults = loadDefaultContent();

  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, JSON.stringify(defaults, null, 2), "utf8");
    return defaults;
  }

  try {
    const saved = readJson(target);
    return mergeDeep(defaults, saved);
  } catch (error) {
    console.error("Failed to read content file, falling back to defaults:", error);
    return defaults;
  }
}

export function saveContent(nextContent) {
  const target = getContentFilePath();
  fs.writeFileSync(target, JSON.stringify(nextContent, null, 2), "utf8");
  return nextContent;
}
