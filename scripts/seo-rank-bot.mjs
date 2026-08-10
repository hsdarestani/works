import { chromium } from "playwright";
import fs from "node:fs/promises";

const DATA_FILE = new URL("../rankings-auto.json", import.meta.url);
const KEYWORDS = [
  "Botox Frankfurt",
  "Masseter Frankfurt",
  "Vitamin Infusion Frankfurt",
  "Filler Frankfurt",
  "Fett weg Spritze Frankfurt",
  "Skinbooster Frankfurt",
  "Haarentfernung Frankfurt",
  "Dauerhafte Haarentfernung Frankfurt",
  "PRP Behandlung Frankfurt",
  "Masseter Botox Frankfurt"
];
const TARGET_DOMAIN = "a-esthetic.de";
const TARGET_BUSINESS = "A+ Esthetic";
const FRANKFURT = { latitude: 50.1109, longitude: 8.6821 };
const MAX_MAP_RESULTS = 60;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const rankDate = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date());

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("de-DE")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isTargetBusiness(text) {
  const value = normalize(text).replace(/\s+/g, "");
  return value.includes("a+esthetic") || value.includes("a-esthetic") || value.includes("aplusesthetic");
}

async function dismissConsent(page) {
  const names = [/Alle ablehnen/i, /Reject all/i, /Alles ablehnen/i, /I agree/i, /Ich stimme zu/i];
  for (const name of names) {
    try {
      const button = page.getByRole("button", { name }).first();
      if (await button.isVisible({ timeout: 900 })) {
        await button.click({ timeout: 2500 });
        await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
        return;
      }
    } catch {}
  }
}

async function blocked(page) {
  const url = page.url();
  if (/\/sorry\//i.test(url) || /recaptcha/i.test(url)) return true;
  const text = normalize((await page.locator("body").innerText({ timeout: 3000 }).catch(() => "")).slice(0, 12000));
  return text.includes("ungewohnlichen datenverkehr") ||
    text.includes("unusual traffic") ||
    text.includes("automatisierte anfragen") ||
    text.includes("not a robot") ||
    text.includes("captcha");
}

function externalResultUrl(rawHref) {
  try {
    const url = new URL(rawHref, "https://www.google.com");
    if (url.hostname.endsWith("google.com") && url.pathname === "/url") {
      const q = url.searchParams.get("q") || url.searchParams.get("url");
      if (q) return new URL(q);
    }
    if (!/^https?:$/.test(url.protocol)) return null;
    if (/(^|\.)google\./i.test(url.hostname) || url.hostname.endsWith("googleusercontent.com")) return null;
    return url;
  } catch {
    return null;
  }
}

async function organicRank(context, keyword) {
  const page = await context.newPage();
  try {
    const url = new URL("https://www.google.com/search");
    url.searchParams.set("q", keyword);
    url.searchParams.set("hl", "de");
    url.searchParams.set("gl", "de");
    url.searchParams.set("pws", "0");
    url.searchParams.set("filter", "0");
    url.searchParams.set("num", "100");

    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 45000 });
    await dismissConsent(page);
    await sleep(1800);
    if (await blocked(page)) return { position: null, status: "blocked" };

    const links = await page.locator("a:has(h3)").evaluateAll(anchors => anchors.map(a => ({
      href: a.href,
      title: a.querySelector("h3")?.textContent || ""
    })));

    const seen = new Set();
    const results = [];
    for (const link of links) {
      const parsed = externalResultUrl(link.href);
      if (!parsed) continue;
      const key = `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ url: parsed.toString(), title: link.title });
    }

    const index = results.findIndex(result => {
      try { return new URL(result.url).hostname.replace(/^www\./, "") === TARGET_DOMAIN; }
      catch { return false; }
    });

    return index >= 0
      ? { position: index + 1, status: "ok", matched_url: results[index].url, results_seen: results.length }
      : { position: null, status: "not_found", results_seen: results.length };
  } catch (error) {
    return { position: null, status: "error", error: error.message || String(error) };
  } finally {
    await page.close().catch(() => {});
  }
}

async function mapsRank(context, keyword) {
  const page = await context.newPage();
  try {
    const query = encodeURIComponent(keyword);
    const url = `https://www.google.com/maps/search/${query}/@${FRANKFURT.latitude},${FRANKFURT.longitude},13z?hl=de`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await dismissConsent(page);
    await sleep(2200);
    if (await blocked(page)) return { position: null, status: "blocked" };

    const feed = page.locator('div[role="feed"]').first();
    const cards = page.locator('div[role="article"], div.Nv2PK');
    let previousCount = 0;
    let stableRounds = 0;

    for (let round = 0; round < 16; round += 1) {
      const count = await cards.count();
      if (count === previousCount) stableRounds += 1;
      else stableRounds = 0;
      previousCount = count;
      if (count >= MAX_MAP_RESULTS || stableRounds >= 3) break;

      try {
        if (await feed.count()) await feed.evaluate(el => el.scrollTo(0, el.scrollHeight));
        else await page.mouse.wheel(0, 5000);
      } catch {}
      await sleep(1100);
    }

    const rawCards = await cards.evaluateAll(nodes => nodes.slice(0, 100).map(node => ({
      text: node.innerText || "",
      href: node.querySelector('a[href*="/maps/place/"]')?.href || node.querySelector("a")?.href || ""
    })));

    const places = [];
    const seen = new Set();
    for (const card of rawCards) {
      const text = normalize(card.text);
      if (!text) continue;
      if (text.includes("gesponsert") || text.includes("anzeige") || text.includes("sponsored")) continue;
      const key = card.href || text.slice(0, 120);
      if (seen.has(key)) continue;
      seen.add(key);
      places.push(card);
    }

    const index = places.findIndex(place => isTargetBusiness(place.text) || normalize(place.href).includes(TARGET_DOMAIN));
    return index >= 0
      ? { position: index + 1, status: "ok", matched_text: places[index].text.split("\n").slice(0, 3).join(" · "), results_seen: places.length }
      : { position: null, status: "not_found", results_seen: places.length };
  } catch (error) {
    return { position: null, status: "error", error: error.message || String(error) };
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    geolocation: FRANKFURT,
    permissions: ["geolocation"],
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light"
  });

  const today = rankDate();
  const checkedAt = new Date().toISOString();
  const entries = [];
  const runDetails = [];

  try {
    for (const keyword of KEYWORDS) {
      console.log(`Checking: ${keyword}`);
      const organic = await organicRank(context, keyword);
      console.log(`  Organic: ${organic.status} ${organic.position ?? "—"}`);
      runDetails.push({ keyword, source: "gsc", ...organic });
      if (["ok", "not_found"].includes(organic.status)) {
        entries.push({ keyword, source: "gsc", position: organic.position, status: organic.status, metadata: organic });
      }
      await sleep(2200);

      const maps = await mapsRank(context, keyword);
      console.log(`  Orte: ${maps.status} ${maps.position ?? "—"}`);
      runDetails.push({ keyword, source: "maps", ...maps });
      if (["ok", "not_found"].includes(maps.status)) {
        entries.push({ keyword, source: "maps", position: maps.position, status: maps.status, metadata: maps });
      }
      await sleep(2200);
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const data = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  data.generated_at = checkedAt;
  data.runs ||= [];
  data.snapshots ||= [];

  const summary = {
    rank_date: today,
    checked_at: checkedAt,
    origin: "playwright_incognito",
    ok: runDetails.filter(x => x.status === "ok").length,
    not_found: runDetails.filter(x => x.status === "not_found").length,
    blocked: runDetails.filter(x => x.status === "blocked").length,
    errors: runDetails.filter(x => x.status === "error").length,
    details: runDetails
  };
  data.runs = data.runs.filter(run => !(run.rank_date === today && run.origin === "playwright_incognito"));
  data.runs.push(summary);
  data.runs = data.runs.slice(-120);

  if (entries.length) {
    const snapshot = { rank_date: today, checked_at: checkedAt, origin: "playwright_incognito", entries };
    data.snapshots = data.snapshots.filter(s => !(s.rank_date === today && s.origin === "playwright_incognito"));
    data.snapshots.push(snapshot);
    data.snapshots.sort((a, b) => a.rank_date.localeCompare(b.rank_date) || a.checked_at.localeCompare(b.checked_at));
    data.snapshots = data.snapshots.slice(-800);
  }

  await fs.writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Saved ${entries.length} valid observations for ${today}.`);
  console.log(`Summary: ${summary.ok} found, ${summary.not_found} not found, ${summary.blocked} blocked, ${summary.errors} errors.`);

  if (summary.blocked + summary.errors === runDetails.length) {
    process.exitCode = 2;
  }
}

await main();
