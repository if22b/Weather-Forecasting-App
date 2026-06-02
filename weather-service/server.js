/**
 * WeatherSync - Weather Service (REST API)
 * Port 3001
 *
 * Dieser Service stellt Wetterdaten über eine REST API bereit.
 * Er ruft intern die OpenWeatherMap API auf und gibt die Daten aufbereitet zurück.
 *
 * Endpunkte:
 *   GET /weather?city=Vienna   -> aktuelles Wetter für eine Stadt
 *   GET /forecast?city=Vienna  -> 5-Tage-Vorhersage
 *   GET /health                -> Statuscheck (ist der Service erreichbar?)
 *
 * Voraussetzung: Umgebungsvariable OPENWEATHER_API_KEY muss gesetzt sein.
 */

const express = require("express");
const axios   = require("axios");
const cors    = require("cors");

const app     = express();
const PORT    = 3001;

// API-Key aus der Umgebungsvariable lesen (wird beim Starten des Servers gesetzt)
const API_KEY = process.env.OPENWEATHER_API_KEY;

// Basis-URL der OpenWeatherMap API
const OWM = "https://api.openweathermap.org/data/2.5";

// Sicherheitscheck: Ohne API-Key kann der Service nicht funktionieren → sofort beenden
if (!API_KEY) {
  console.error("[ERROR] OPENWEATHER_API_KEY is not set. Exiting.");
  process.exit(1);
}

// CORS aktivieren: erlaubt Anfragen aus dem Browser (z.B. vom Frontend auf anderem Port)
app.use(cors());

// Middleware: Jede eingehende Anfrage wird mit Zeitstempel, HTTP-Methode und URL geloggt
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // Weiter zur nächsten Middleware / Route
});

/**
 * fetchWeather(city)
 * -----------------
 * Ruft das aktuelle Wetter für eine Stadt von OpenWeatherMap ab.
 * Gibt ein aufbereitetes Objekt zurück (nur die relevanten Felder, kein roher API-Response).
 *
 * @param {string} city - Stadtname (z.B. "Vienna")
 * @returns {object} - Wetterdaten: Temperatur, Luftfeuchtigkeit, Wind, Condition, etc.
 */
async function fetchWeather(city) {
  // HTTP GET zur OWM-API; units=metric → Temperatur in Celsius
  const { data: d } = await axios.get(
      `${OWM}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
  );

  function formatTime(unix, offset) {
    const local = new Date((unix + offset) * 1000);

    return local.toUTCString().slice(17, 22);
  }

  // Rohdaten aus der API-Antwort in ein sauberes Objekt umwandeln
  return {
    city:        d.name,                    // Von OWM zurückgegebener offizieller Stadtname
    lat:         d.coord.lat,               // Breitengrad (für Karten nützlich)
    lon:         d.coord.lon,               // Längengrad
    country:     d.sys.country,             // Ländercode, z.B. "AT"
    temperature: Math.round(d.main.temp),   // Aktuelle Temperatur, gerundet auf ganze Zahl
    feels_like:  Math.round(d.main.feels_like), // Gefühlte Temperatur (berücksichtigt Wind/Luftfeuchte)
    humidity:    d.main.humidity,           // Luftfeuchtigkeit in Prozent
    wind_speed:  d.wind.speed,              // Windgeschwindigkeit in m/s
    condition:   d.weather[0].main,         // Hauptkategorie, z.B. "Rain", "Clear", "Clouds"
    description: d.weather[0].description,  // Detailbeschreibung, z.B. "light rain"
    icon:        d.weather[0].icon,         // Icon-Code für OWM-Wettersymbole (z.B. "10d")
    pressure:    d.main.pressure,           // Luftdruck in hPa
    // Unix-Timestamp (Sekunden) × 1000 = JS-Millisekunden → als lesbare Uhrzeit formatieren
    sunrise: formatTime(d.sys.sunrise, d.timezone),
    sunset:  formatTime(d.sys.sunset,  d.timezone),
  };
}

/**
 * fetchForecast(city)
 * -------------------
 * Ruft eine 5-Tage-Vorhersage von OpenWeatherMap ab (3-Stunden-Intervalle, max. 40 Einträge).
 * Die Einträge werden nach Wochentag gruppiert und zu Tageswerten zusammengefasst.
 *
 * @param {string} city - Stadtname
 * @returns {Array} - Array mit bis zu 5 Tagesobjekten (Min/Max-Temp, Icon, etc.)
 */
async function fetchForecast(city) {
  // cnt=40 = maximale Anzahl 3-Stunden-Slots (= ca. 5 Tage)
  const { data } = await axios.get(
      `${OWM}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&cnt=40`
  );

  // Alle Slots nach Wochentag (z.B. "Mon", "Tue") gruppieren
  const byDay = {};
  for (const item of data.list) {
    // Datum des Slots in Wochentag-Kürzel umwandeln (englisch, für stabilen Key)
    const day = new Date(item.dt * 1000).toLocaleDateString("en-US", { weekday: "short" });

    // Falls dieser Tag noch nicht existiert, leere Arrays anlegen
    if (!byDay[day]) byDay[day] = { temps: [], icons: [], descs: [], hums: [], winds: [] };

    // Werte des aktuellen Slots dem jeweiligen Tag hinzufügen
    byDay[day].temps.push(item.main.temp);
    byDay[day].icons.push(item.weather[0].icon);
    byDay[day].descs.push(item.weather[0].description);
    byDay[day].hums.push(item.main.humidity);
    byDay[day].winds.push(item.wind.speed);
  }

  // Die gruppierten Tage in ein sauberes Array umwandeln (max. 5 Tage)
  return Object.entries(byDay).slice(0, 5).map(([day, v]) => ({
    day,
    temp_max:    Math.round(Math.max(...v.temps)),   // Höchstwert aus allen Slots des Tages
    temp_min:    Math.round(Math.min(...v.temps)),   // Tiefstwert
    // Mittlere Beschreibung/Icon: Slot aus der Mitte des Tages (repräsentativer als Morgen/Abend)
    description: v.descs[Math.floor(v.descs.length / 2)],
    icon:        v.icons[Math.floor(v.icons.length / 2)],
    // Durchschnittliche Luftfeuchtigkeit über alle Slots
    humidity:    Math.round(v.hums.reduce((a, b) => a + b) / v.hums.length),
    // Durchschnittliche Windgeschwindigkeit, auf 1 Dezimalstelle gerundet
    wind_speed:  Math.round(v.winds.reduce((a, b) => a + b) / v.winds.length * 10) / 10,
  }));
}

// --- Routen ---

/**
 * GET /health
 * Gibt zurück ob der Service läuft. Wird z.B. von Docker oder einem Load Balancer genutzt.
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "weather-rest", port: PORT });
});

/**
 * GET /weather?city=<stadtname>
 * Gibt das aktuelle Wetter für die angegebene Stadt zurück.
 * Fehlerbehandlung:
 *   - 404: Stadt nicht gefunden (OWM gibt 404 zurück)
 *   - 500: Sonstiger API-Fehler
 */
app.get("/weather", async (req, res) => {
  // city aus Query-Parameter lesen, Standard: "Vienna"
  const city = (req.query.city || "Vienna").trim();
  try {
    const data = await fetchWeather(city);
    console.log(`[INFO] Weather fetched for: ${city}`);
    res.json({ success: true, data });
  } catch (err) {
    // OWM gibt HTTP 404 zurück wenn die Stadt unbekannt ist
    if (err.response?.status === 404) {
      console.warn(`[WARN] City not found: ${city}`);
      return res.status(404).json({ success: false, error: `City "${city}" not found.` });
    }
    // Alle anderen Fehler (Netzwerk, API-Limit, etc.) als 500 zurückgeben
    console.error(`[ERROR] /weather - ${err.message}`);
    res.status(500).json({ success: false, error: "Weather API error." });
  }
});

/**
 * GET /forecast?city=<stadtname>
 * Gibt die 5-Tage-Vorhersage für die angegebene Stadt zurück.
 */
app.get("/forecast", async (req, res) => {
  const city = (req.query.city || "Vienna").trim();
  try {
    const data = await fetchForecast(city);
    console.log(`[INFO] Forecast fetched for: ${city}`);
    res.json({ success: true, data });
  } catch (err) {
    console.error(`[ERROR] /forecast - ${err.message}`);
    res.status(500).json({ success: false, error: "Forecast API error." });
  }
});

// Server starten und auf dem definierten Port lauschen
app.listen(PORT, () => {
  console.log(`[INFO] Weather REST API running on http://localhost:${PORT}`);
  console.log(`[INFO] GET /weather?city=Vienna`);
  console.log(`[INFO] GET /forecast?city=Vienna`);
});