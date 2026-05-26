#!/usr/bin/env node

/**
 * WeatherSync CLI
 * Usage:
 *   node weathersync-cli.js
 *   node weathersync-cli.js --city Vienna
 *   node weathersync-cli.js --city Vienna --forecast
 */

const axios = require("axios");
const readline = require("readline");

const API_KEY = "34264e65d5f791cd23ddddd79ce39977";
const OWM_BASE = "https://api.openweathermap.org/data/2.5";

// Farb-Codes für die Terminal-Ausgabe
const c = {
  reset:   "\x1b[0m",
  bold:    "\x1b[1m",
  dim:     "\x1b[2m",
  cyan:    "\x1b[36m",
  yellow:  "\x1b[33m",
  green:   "\x1b[32m",
  blue:    "\x1b[34m",
  red:     "\x1b[31m",
  magenta: "\x1b[35m",
  white:   "\x1b[37m",
};

// Hilfsfunktionen damit der Output-Code sauber bleibt
const fmt = {
  header:  (s) => `\n${c.bold}${c.cyan}=== ${s} ===${c.reset}\n`,
  section: (s) => `\n${c.bold}${c.blue}-- ${s} --${c.reset}`,
  label:   (s) => `${c.dim}${s}${c.reset}`,
  value:   (s) => `${c.bold}${s}${c.reset}`,
  warn:    (s) => `${c.yellow}[!] ${s}${c.reset}`,
  error:   (s) => `${c.red}[x] ${s}${c.reset}`,
  success: (s) => `${c.green}[ok] ${s}${c.reset}`,
  bullet:  (s) => `  - ${s}`,
};

// ─── Weather API ──────────────────────────────────────────────────────────────

// Holt das aktuelle Wetter für eine Stadt und gibt nur das zurück was wir brauchen
async function fetchWeather(city) {
  const { data: d } = await axios.get(
    `${OWM_BASE}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
  );
  return {
    city:        d.name,
    country:     d.sys.country,
    temperature: Math.round(d.main.temp),
    feels_like:  Math.round(d.main.feels_like),
    humidity:    d.main.humidity,
    wind_speed:  d.wind.speed,
    condition:   d.weather[0].main,   // z.B. "Rain", "Clear", "Clouds"
    description: d.weather[0].description,
    pressure:    d.main.pressure,
    // Unix-Timestamp in lesbare Uhrzeit umwandeln
    sunrise:     new Date(d.sys.sunrise * 1000).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }),
    sunset:      new Date(d.sys.sunset  * 1000).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }),
  };
}

// Holt die 5-Tage-Vorhersage (40 Einträge à 3h) und gruppiert sie nach Tag
async function fetchForecast(city) {
  const { data } = await axios.get(
    `${OWM_BASE}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&cnt=40`
  );

  // Alle Einträge nach Datum gruppieren
  const byDay = {};
  for (const item of data.list) {
    const day = new Date(item.dt * 1000).toLocaleDateString("de-AT", {
      weekday: "short", day: "2-digit", month: "2-digit",
    });
    if (!byDay[day]) byDay[day] = { temps: [], conds: [], descs: [], hums: [], winds: [] };
    byDay[day].temps.push(item.main.temp);
    byDay[day].conds.push(item.weather[0].main);
    byDay[day].descs.push(item.weather[0].description);
    byDay[day].hums.push(item.main.humidity);
    byDay[day].winds.push(item.wind.speed);
  }

  // Pro Tag Min/Max und Durchschnittswerte berechnen, nur 5 Tage zurückgeben
  return Object.entries(byDay).slice(0, 5).map(([day, v]) => {
    const mid = Math.floor(v.conds.length / 2); // mittlerer Eintrag als repräsentativer Wert
    return {
      day,
      temp_max:    Math.round(Math.max(...v.temps)),
      temp_min:    Math.round(Math.min(...v.temps)),
      description: v.descs[mid],
      humidity:    Math.round(v.hums.reduce((a, b) => a + b) / v.hums.length),
      wind_speed:  Math.round(v.winds.reduce((a, b) => a + b) / v.winds.length * 10) / 10,
    };
  });
}

// ─── Recommendations ──────────────────────────────────────────────────────────

// Leitet aus Temperatur, Wind und Wetterlage passende Kleidung, Aktivitäten und einen allgemeinen Hinweis ab
function recommend({ condition, temperature, wind_speed }) {
  const temp = parseFloat(temperature) || 20;
  const wind = parseFloat(wind_speed)  || 0;
  const cond = String(condition || "").toLowerCase();

  const clothing   = [];
  const activities = [];

  // Kleidung nach Temperatur-Stufen
  if (temp >= 25) {
    clothing.push("T-Shirt / leichtes Top", "Shorts oder Sommerkleid", "Sonnenbrille", "Sonnenhut");
  } else if (temp >= 18) {
    clothing.push("Leichtes Hemd oder Bluse", "Jeans oder Chinos");
    clothing.push(cond.includes("rain") ? "Regenjacke" : "Leichte Jacke");
  } else if (temp >= 10) {
    clothing.push("Pullover oder Hoodie", "Lange Hose", "Leichter Mantel");
    if (cond.includes("rain")) clothing.push("Regenschirm");
  } else if (temp >= 0) {
    clothing.push("Warme Jacke", "Schal und Handschuhe");
    if (cond.includes("snow")) clothing.push("Wasserdichte Stiefel");
  } else {
    clothing.push("Schwerer Wintermantel", "Thermounterwäsche", "Warme Mütze und Handschuhe");
  }
  // Windjacke extra empfehlen 
  if (wind > 8) clothing.push("Winddichte Jacke");

  // Aktivitäten je nach Wetterlage
  if (cond.includes("clear") || cond.includes("sunny")) {
    activities.push(temp >= 20 ? "Picknick im Freien" : "Spaziergang in der Natur");
    activities.push("Fahrradtour", "Joggen");
  } else if (cond.includes("cloud")) {
    activities.push("Spaziergang möglich", "Museum oder Galerie", "Café-Besuch");
  } else if (cond.includes("rain") || cond.includes("drizzle")) {
    activities.push("Kino", "Bibliothek", "Restaurant-Besuch");
  } else if (cond.includes("snow")) {
    activities.push("Skifahren", "Schneemann bauen");
  } else if (cond.includes("thunder")) {
    activities.push("Drinnen bleiben", "Spieleabend");
  } else {
    activities.push("Spaziergang", "Café-Besuch");
  }

  // Wichtigste Warnung gewinnt – Reihenfolge ist also Priorität
  let advisory = "Bedingungen sind gut. Geniessen Sie den Tag!";
  if      (cond.includes("thunder"))              advisory = "Gewitterwarnung – besser drinnen bleiben!";
  else if (temp <= -5)                             advisory = "Extreme Kälte – Aufenthalt im Freien minimieren.";
  else if (temp >= 35)                             advisory = "Hitzewarnung – viel trinken, Schatten aufsuchen.";
  else if (wind > 15)                              advisory = "Starker Wind – im Freien vorsichtig sein.";
  else if (cond.includes("snow") && temp < 0)      advisory = "Glatteisgefahr – rutschfeste Schuhe tragen!";
  else if (temp >= 25)                             advisory = "Hoher UV-Index – Sonnencreme LSF 30+ auftragen.";

  return { clothing, activities, advisory, uvWarning: temp >= 25, windWarning: wind > 10 };
}

// ─── Display ──────────────────────────────────────────────────────────────────

// Gibt das aktuelle Wetter übersichtlich aus
function printWeather(w) {
  console.log(fmt.header(`${w.city}, ${w.country}`));
  console.log(fmt.section("Aktuelles Wetter"));
  console.log(`  ${fmt.label("Temperatur:")}   ${fmt.value(w.temperature + "°C")}  (Gefühlt: ${w.feels_like}°C)`);
  console.log(`  ${fmt.label("Zustand:")}      ${fmt.value(w.description)}`);
  console.log(`  ${fmt.label("Luftfeuchte:")}  ${fmt.value(w.humidity + "%")}`);
  console.log(`  ${fmt.label("Wind:")}         ${fmt.value(w.wind_speed + " m/s")}`);
  console.log(`  ${fmt.label("Luftdruck:")}    ${fmt.value(w.pressure + " hPa")}`);
  console.log(`  ${fmt.label("Aufgang:")}      ${fmt.value(w.sunrise)}   ${fmt.label("Untergang:")} ${fmt.value(w.sunset)}`);
}

// Gibt die 5-Tage-Vorhersage als kompakte Tabelle aus
function printForecast(forecast) {
  console.log(fmt.section("5-Tage Forecast"));
  for (const day of forecast) {
    console.log(
      `  ${c.bold}${day.day.padEnd(14)}${c.reset}` +
      `${c.yellow}${String(day.temp_max + "°C").padStart(4)}${c.reset}` +
      ` / ${c.blue}${String(day.temp_min + "°C").padEnd(5)}${c.reset}` +
      `  ${c.dim}${day.description.padEnd(22)}${c.reset}` +
      `  Hum:${day.humidity}%  Wind:${day.wind_speed} m/s`
    );
  }
}

// Gibt Kleidung, Aktivitäten und den Tages-Hinweis aus
function printRecommendations(rec) {
  console.log(fmt.section("Empfehlungen"));

  // Warnungen ganz oben damit man sie nicht übersieht
  if (rec.uvWarning)   console.log(fmt.warn("UV-Warnung aktiv!"));
  if (rec.windWarning) console.log(fmt.warn("Starker Wind – winddichte Kleidung empfohlen!"));

  console.log(`\n  ${c.bold}Kleidung:${c.reset}`);
  rec.clothing.forEach(item => console.log(fmt.bullet(item)));

  console.log(`\n  ${c.bold}Aktivitäten:${c.reset}`);
  rec.activities.forEach(item => console.log(fmt.bullet(item)));

  console.log(`\n  ${c.bold}Hinweis:${c.reset}`);
  console.log(`  ${rec.advisory}`);
}

// ─── Core ─────────────────────────────────────────────────────────────────────

// Hauptlogik: Daten holen, ausgeben, Empfehlungen zeigen
// Wird sowohl vom interaktiven Menü als auch vom CLI-Modus verwendet
async function run(city, showForecast) {
  console.log(`\n  ${c.dim}Lade Wetterdaten für "${city}"...${c.reset}`);
  try {
    const weather = await fetchWeather(city);
    printWeather(weather);

    if (showForecast) {
      const forecast = await fetchForecast(city);
      printForecast(forecast);
    }

    printRecommendations(recommend(weather));
    console.log(`\n${c.dim}${"─".repeat(50)}${c.reset}\n`);
  } catch (err) {
    // Häufige API-Fehler verständlich ausgeben
    if      (err.response?.status === 404) console.log(fmt.error(`Stadt "${city}" nicht gefunden.`));
    else if (err.response?.status === 401) console.log(fmt.error("Ungültiger API-Key."));
    else                                   console.log(fmt.error(`Fehler: ${err.message}`));
  }
}

// Interaktiver Modus: fragt in einer Schleife nach Stadt und Forecast-Wunsch
async function interactiveMenu() {
  const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log(fmt.header("WeatherSync CLI"));

  while (true) {
    const city = (await ask(`${c.cyan}Stadt${c.reset} ${c.dim}(oder 'exit')${c.reset}: `)).trim();

    // Schleife beenden wenn der User "exit" oder nichts eingibt
    if (!city || ["exit", "quit"].includes(city.toLowerCase())) {
      console.log(fmt.success("Auf Wiedersehen!"));
      rl.close();
      break;
    }

    const fc = (await ask(`  5-Tage Forecast? ${c.dim}[j/N]${c.reset}: `)).trim().toLowerCase();
    await run(city, fc === "j" || fc === "ja" || fc === "y");
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

// Wenn --city übergeben wurde direkt loslegen, sonst interaktives Menü starten
(async () => {
  const args     = process.argv.slice(2);
  const cityIdx  = args.indexOf("--city");
  const forecast = args.includes("--forecast");

  if (cityIdx !== -1 && args[cityIdx + 1]) {
    await run(args[cityIdx + 1], forecast);
  } else {
    await interactiveMenu();
  }
})();