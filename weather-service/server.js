/**
 * WeatherSync - Weather Service (REST API)
 * Port 3001
 *
 * GET /weather?city=Vienna  -> current weather
 * GET /forecast?city=Vienna -> 5-day forecast
 * GET /health
 *
 * Requires OPENWEATHER_API_KEY environment variable.
 */

const express = require("express");
const axios   = require("axios");
const cors    = require("cors");

const app     = express();
const PORT    = 3001;
const API_KEY = process.env.OPENWEATHER_API_KEY;
const OWM     = "https://api.openweathermap.org/data/2.5";

if (!API_KEY) {
  console.error("[ERROR] OPENWEATHER_API_KEY is not set. Exiting.");
  process.exit(1);
}

app.use(cors());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Fetch current weather from OpenWeatherMap
async function fetchWeather(city) {
  const { data: d } = await axios.get(
      `${OWM}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
  );
  return {
    city:        d.name,
    country:     d.sys.country,
    temperature: Math.round(d.main.temp),
    feels_like:  Math.round(d.main.feels_like),
    humidity:    d.main.humidity,
    wind_speed:  d.wind.speed,
    condition:   d.weather[0].main,
    description: d.weather[0].description,
    icon:        d.weather[0].icon,
    pressure:    d.main.pressure,
    sunrise:     new Date(d.sys.sunrise * 1000).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }),
    sunset:      new Date(d.sys.sunset  * 1000).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }),
  };
}

// Fetch 5-day forecast from OpenWeatherMap
async function fetchForecast(city) {
  const { data } = await axios.get(
      `${OWM}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&cnt=40`
  );
  const byDay = {};
  for (const item of data.list) {
    const day = new Date(item.dt * 1000).toLocaleDateString("en-US", { weekday: "short" });
    if (!byDay[day]) byDay[day] = { temps: [], icons: [], descs: [], hums: [], winds: [] };
    byDay[day].temps.push(item.main.temp);
    byDay[day].icons.push(item.weather[0].icon);
    byDay[day].descs.push(item.weather[0].description);
    byDay[day].hums.push(item.main.humidity);
    byDay[day].winds.push(item.wind.speed);
  }
  return Object.entries(byDay).slice(0, 5).map(([day, v]) => ({
    day,
    temp_max:    Math.round(Math.max(...v.temps)),
    temp_min:    Math.round(Math.min(...v.temps)),
    description: v.descs[Math.floor(v.descs.length / 2)],
    icon:        v.icons[Math.floor(v.icons.length / 2)],
    humidity:    Math.round(v.hums.reduce((a, b) => a + b) / v.hums.length),
    wind_speed:  Math.round(v.winds.reduce((a, b) => a + b) / v.winds.length * 10) / 10,
  }));
}

// Routes
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "weather-rest", port: PORT });
});

app.get("/weather", async (req, res) => {
  const city = (req.query.city || "Vienna").trim();
  try {
    const data = await fetchWeather(city);
    console.log(`[INFO] Weather fetched for: ${city}`);
    res.json({ success: true, data });
  } catch (err) {
    if (err.response?.status === 404) {
      console.warn(`[WARN] City not found: ${city}`);
      return res.status(404).json({ success: false, error: `City "${city}" not found.` });
    }
    console.error(`[ERROR] /weather - ${err.message}`);
    res.status(500).json({ success: false, error: "Weather API error." });
  }
});

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

app.listen(PORT, () => {
  console.log(`[INFO] Weather REST API running on http://localhost:${PORT}`);
  console.log(`[INFO] GET /weather?city=Vienna`);
  console.log(`[INFO] GET /forecast?city=Vienna`);
});
