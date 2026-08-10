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
const FRANKFURT = { latitude: 50.1109, longitude: 8.6821 };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function berlinDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const pick = type => parts.find(part => part.type === type)?.value;
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function normalize(value) {
  return String(value || "").toLocaleLowerCase("de-DE").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function isTargetBusiness(text) {
  const value = normalize(text).replace(/\s+/g, "");
  return value.includes("a+esthetic") || value.includes("a-esthetic") || value.includes("aplusesthetic");
}

async function dismissConsent(page) {
  for (const name of [/Alle ablehnen/i, /Reject all/i, /Alles ablehnen/i, /Ich stimme zu/i, /I agree/i]) {
    try {
      const button = page.getByRole("button", { name }).first();
      if (await button.isVisible({ timeout: 700 })) {
        await button.click({ timeout: 2500 });
        await page.waitForLoadState("domcontentloaded", { timeout: 7000 }).catch(() => {});
        return;
      }
    } catch {}
  }
}

async function blockInfo(page) {
  const url = page.url();
  const body = normalize((await page.locator("body").innerText({ timeout: 3000 }).catch(() => "")).slice(0, 5000));
  const blocked = /\/sorry\//i.test(url) || /recaptcha/i.test(url) ||
    body.includes("ungewohnlichen datenverkehr") || body.includes("unusual traffic") ||
    body.includes("automatisierte anfragen") || body.includes("not a robot") || body.includes("captcha");
  return blocked ? { blocked: true, url, excerpt: body.slice(0, 500) } : { blocked: false };
}

function parseExternalHref(rawHref) {
  try {
    let url = new URL(rawHref, "https://www.google.de");
    if (/(^|\.)google\./i.test(url.hostname) && url.pathname === "/url") {
      const redirected = url.searchParams.get("q") || url.searchParams.get("url");
      if (redirected) url = new URL(redirected);
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
  const seen = new Set();
  const results = [];
  try {
    for (let start = 0; start < 100; start += 10) {
      const url = new URL("https://www.google.de/search");
      url.searchParams.set("q", keyword);
      url.searchParams.set("hl", "de");
      url.searchParams.set("gl", "de");
      url.searchParams.set("pws", "0");
      url.searchParams.set("filter", "0");
      if (start) url.searchParams.set("start", String(start));

      await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 35000 });
      await dismissConsent(page);
      await sleep(1200);
      const block = await blockInfo(page);
      if (block.blocked) return { position: null, status: "blocked", page_start: start, ...block };

      const links = await page.locator("a:has(h3)").evaluateAll(anchors => anchors.map(anchor => ({
        href: anchor.href,
        title: anchor.querySelector("h3")?.textContent || ""
      })));

      for (const link of links) {
        const parsed = parseExternalHref(link.href);
        if (!parsed) continue;
        const hostname = parsed.hostname.replace(/^www\./, "");
        const key = `${hostname}${parsed.pathname}`.replace(/\/$/, "");
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ url: parsed.toString(), hostname, title: link.title });
        if (hostname === TARGET_DOMAIN) {
          return { position: results.length, status: "ok", matched_url: parsed.toString(), results_seen: results.length };
        }
      }

      if (!links.length && start === 0) return { position: null, status: "error", error: "No organic result links found" };
      await sleep(900);
    }
    return { position: null, status: "not_found", results_seen: results.length };
  } catch (error) {
    return { position: null, status: "error", error: error.message || String(error), results_seen: results.length };
  } finally {
    await page.close().catch(() => {});
  }
}

async function mapsRank(context, keyword) {
  const page = await context.newPage();
  try {
    const query = encodeURIComponent(keyword);
    await page.goto(`https://www.google.com/maps/search/${query}/@${FRANKFURT.latitude},${FRANKFURT.longitude},13z?hl=de`, {
      waitUntil: "domcontentloaded", timeout: 35000
    });
    await dismissConsent(page);
    await sleep(1800);
    const block = await blockInfo(page);
    if (block.blocked) return { position: null, status: "blocked", ...block };

    const feed = page.locator('div[role="feed"]').first();
    const cards = page.locator('div[role="article"], div.Nv2PK');
    let previous = -1;
    let stable = 0;
    for (let round = 0; round < 12; round += 1) {
      const count = await cards.count();
      stable = count === previous ? stable + 1 : 0;
      previous = count;
      if (count >= 60 || stable >= 2) break;
      try {
        if (await feed.count()) await feed.evaluate(el => el.scrollTo(0, el.scrollHeight));
        else await page.mouse.wheel(0, 5000);
      } catch {}
      await sleep(950);
    }

    const raw = await cards.evaluateAll(nodes => nodes.slice(0, 100).map(node => ({
      text: node.innerText || "",
      href: node.querySelector('a[href*="/maps/place/"]')?.href || node.querySelector("a")?.href || ""
    })));
    const places = [];
    const seen = new Set();
    for (const card of raw) {
      const text = normalize(card.text);
      if (!text || text.includes("gesponsert") || text.includes("anzeige") || text.includes("sponsored")) continue;
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

  const today = berlinDate();
  const checkedAt = new Date().toISOString();
  const entries = [];
  const details = [];
  try {
    for (const keyword of KEYWORDS) {
      console.log(`Checking: ${keyword}`);
      const organic = await organicRank(context, keyword);
      console.log(`  Organic: ${organic.status} ${organic.position ?? "—"}`);
      details.push({ keyword, source: "gsc", ...organic });
      if (["ok", "not_found"].includes(organic.status)) entries.push({ keyword, source: "gsc", position: organic.position, status: organic.status, metadata: organic });
      await sleep(1300);

      const maps = await mapsRank(context, keyword);
      console.log(`  Orte: ${maps.status} ${maps.position ?? "—"}`);
      details.push({ keyword, source: "maps", ...maps });
      if (["ok", "not_found"].includes(maps.status)) entries.push({ keyword, source: "maps", position: maps.position, status: maps.status, metadata: maps });
      await sleep(1300);
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
    origin: "playwright_incognito_v2",
    ok: details.filter(x => x.status === "ok").length,
    not_found: details.filter(x => x.status === "not_found").length,
    blocked: details.filter(x => x.status === "blocked").length,
    errors: details.filter(x => x.status === "error").length,
    details
  };
  data.runs = data.runs.filter(run => !(run.rank_date === today && String(run.origin).startsWith("playwright_incognito")));
  data.runs.push(summary);
  data.runs = data.runs.slice(-120);

  if (entries.length) {
    data.snapshots = data.snapshots.filter(snapshot => !(snapshot.rank_date === today && String(snapshot.origin).startsWith("playwright_incognito")));
    data.snapshots.push({ rank_date: today, checked_at: checkedAt, origin: "playwright_incognito_v2", entries });
    data.snapshots.sort((a, b) => a.rank_date.localeCompare(b.rank_date) || String(a.checked_at).localeCompare(String(b.checked_at)));
    data.snapshots = data.snapshots.slice(-800);
  }
  await fs.writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Saved ${entries.length} valid observations for ${today}.`);
  console.log(`Summary: ${summary.ok} found, ${summary.not_found} not found, ${summary.blocked} blocked, ${summary.errors} errors.`);
}

await main();
