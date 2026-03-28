import express from "express";
import session from "express-session";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { loadContent, saveContent, getContentFilePath } from "./contentStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";

app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "moolah-site-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    },
  })
);

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

function getFlash(req) {
  const flash = req.session.flash || null;
  delete req.session.flash;
  return flash;
}

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  return res.redirect("/admin/login");
}

function normalizeSitePayload(body, current) {
  const site = { ...current.site };
  const fields = [
    "businessName",
    "tagline",
    "metaDescription",
    "heroTitle",
    "heroIntro",
    "aboutTitle",
    "aboutIntro",
    "aboutStory",
    "deliTitle",
    "deliIntro",
    "visitTitle",
    "visitIntro",
    "phone",
    "email",
    "address1",
    "address2",
    "town",
    "postcode",
    "bookingNote",
  ];

  for (const field of fields) {
    site[field] = String(body[field] ?? "").trim();
  }

  return { ...current, site };
}

function normalizeHoursPayload(body, current) {
  const days = toArray(body.day);
  const opens = toArray(body.open);
  const closes = toArray(body.close);
  const closedDays = new Set(toArray(body.closed));

  const hours = days.map((day, index) => ({
    day: String(day || "").trim(),
    open: String(opens[index] || "").trim(),
    close: String(closes[index] || "").trim(),
    closed: closedDays.has(String(day || "").trim()),
  }));

  return { ...current, hours };
}

function normalizeBlocksPayload(body, current, fieldName) {
  const titles = toArray(body.title);
  const texts = toArray(body.text);

  const blocks = titles.map((title, index) => ({
    title: String(title || "").trim(),
    text: String(texts[index] || "").trim(),
  })).filter((item) => item.title || item.text);

  return { ...current, [fieldName]: blocks };
}

function normalizeMenuPayload(body, current) {
  const titles = toArray(body.title);
  const intros = toArray(body.intro);
  const itemsList = toArray(body.items);

  const menuSections = titles.map((title, index) => ({
    title: String(title || "").trim(),
    intro: String(intros[index] || "").trim(),
    items: String(itemsList[index] || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
  })).filter((section) => section.title || section.intro || section.items.length);

  return { ...current, menuSections };
}

app.use((req, res, next) => {
  const content = loadContent();
  res.locals.content = content;
  res.locals.site = content.site;
  res.locals.hours = content.hours;
  res.locals.specials = content.specials;
  res.locals.menuSections = content.menuSections;
  res.locals.deliSections = content.deliSections;
  res.locals.gallery = content.gallery;
  res.locals.socials = {
    facebook: content.site.facebookUrl,
    instagram: content.site.instagramUrl,
  };
  res.locals.currentPath = req.path;
  res.locals.flash = getFlash(req);
  next();
});

function renderPage(res, view, title, extra = {}) {
  return res.render(view, {
    title,
    year: new Date().getFullYear(),
    ...extra,
  });
}

app.get("/", (req, res) => renderPage(res, "index", "Moolah | Local food, deli and café"));
app.get("/about", (req, res) => renderPage(res, "about", "About Moolah"));
app.get("/menu", (req, res) => renderPage(res, "menu", "Menu highlights"));
app.get("/deli", (req, res) => renderPage(res, "deli", "Deli and local produce"));
app.get("/visit", (req, res) => renderPage(res, "visit", "Visit Moolah"));
app.get("/gallery", (req, res) => renderPage(res, "gallery", "Gallery"));
app.get("/admin/login", (req, res) => renderPage(res, "admin-login", "Admin login"));
app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.post("/admin/login", (req, res) => {
  const password = String(req.body.password || "");
  if (password !== ADMIN_PASSWORD) {
    setFlash(req, "error", "Incorrect admin password.");
    return res.redirect("/admin/login");
  }
  req.session.isAdmin = true;
  setFlash(req, "success", "You are now signed in.");
  return res.redirect("/admin");
});

app.get("/admin", requireAdmin, (req, res) => {
  const contentFile = getContentFilePath();
  const contentFileDisplay = fs.existsSync(contentFile) ? contentFile : "Not created yet";
  renderPage(res, "admin", "Admin content editor", { contentFileDisplay });
});

app.post("/admin/site", requireAdmin, (req, res) => {
  const current = loadContent();
  const next = normalizeSitePayload(req.body, current);
  saveContent(next);
  setFlash(req, "success", "Site content updated.");
  res.redirect("/admin");
});

app.post("/admin/hours", requireAdmin, (req, res) => {
  const current = loadContent();
  const next = normalizeHoursPayload(req.body, current);
  saveContent(next);
  setFlash(req, "success", "Opening hours updated.");
  res.redirect("/admin");
});

app.post("/admin/specials", requireAdmin, (req, res) => {
  const current = loadContent();
  const next = normalizeBlocksPayload(req.body, current, "specials");
  saveContent(next);
  setFlash(req, "success", "Homepage specials updated.");
  res.redirect("/admin");
});

app.post("/admin/menu", requireAdmin, (req, res) => {
  const current = loadContent();
  const next = normalizeMenuPayload(req.body, current);
  saveContent(next);
  setFlash(req, "success", "Menu highlights updated.");
  res.redirect("/admin");
});

app.post("/admin/deli", requireAdmin, (req, res) => {
  const current = loadContent();
  const next = normalizeBlocksPayload(req.body, current, "deliSections");
  saveContent(next);
  setFlash(req, "success", "Deli highlights updated.");
  res.redirect("/admin");
});

app.use((req, res) => {
  res.status(404);
  renderPage(res, "404", "Page not found");
});

app.listen(PORT, () => {
  console.log(`Moolah site running on port ${PORT}`);
});
