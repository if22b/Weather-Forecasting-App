/**
 * WeatherSync - Recommendation Service (SOAP/WSDL)
 * Port 3002
 *
 * WSDL:        GET  http://localhost:3002/wsdl
 * SOAP:             http://localhost:3002/soap
 * REST bridge: POST http://localhost:3002/recommend  { condition, temperature, humidity, windSpeed }
 * Health:      GET  http://localhost:3002/health
 */

const express = require("express");
const { soap } = require("strong-soap");
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");
const http    = require("http");

const app  = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Recommendation logic
function recommend({ condition, temperature, humidity, windSpeed }) {
  const temp = parseFloat(temperature) || 20;
  const wind = parseFloat(windSpeed)   || 0;
  const hum  = parseFloat(humidity)    || 50;
  const cond = String(condition || "").toLowerCase();

  const clothing   = [];
  const activities = [];
  let uvWarning   = false;
  let windWarning = wind > 10;

  // Clothing based on temperature
  if (temp >= 25) {
    clothing.push("T-Shirt / leichtes Top", "Shorts oder Sommerkleid", "Sonnenbrille", "Sonnenhut");
    uvWarning = true;
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
    clothing.push("Schwerer Wintermantel", "Thermounterwaesche", "Warme Muetze und Handschuhe");
  }
  if (wind > 8) clothing.push("Winddichte Jacke");

  // Activities based on condition
  if (cond.includes("clear") || cond.includes("sunny")) {
    activities.push(temp >= 20 ? "Picknick im Freien" : "Spaziergang in der Natur");
    activities.push("Fahrradtour", "Joggen");
  } else if (cond.includes("cloud")) {
    activities.push("Spaziergang moeglich", "Museum oder Galerie", "Cafe-Besuch");
  } else if (cond.includes("rain") || cond.includes("drizzle")) {
    activities.push("Kino", "Bibliothek", "Restaurant-Besuch");
  } else if (cond.includes("snow")) {
    activities.push("Skifahren", "Schneemann bauen");
  } else if (cond.includes("thunder")) {
    activities.push("Drinnen bleiben", "Spieleabend");
  } else {
    activities.push("Spaziergang", "Cafe-Besuch");
  }

  // Advisory message
  let advisory = "Bedingungen sind gut. Geniessen Sie den Tag!";
  if      (cond.includes("thunder"))          advisory = "Gewitterwarnung - besser drinnen bleiben!";
  else if (temp <= -5)                        advisory = "Extreme Kaelte - Aufenthalt im Freien minimieren.";
  else if (temp >= 35)                        advisory = "Hitzewarnung - viel trinken, Schatten aufsuchen.";
  else if (wind > 15)                         advisory = "Starker Wind - im Freien vorsichtig sein.";
  else if (cond.includes("snow") && temp < 0) advisory = "Glatteisgefahr - rutschfeste Schuhe tragen!";
  else if (uvWarning)                         advisory = "Hoher UV-Index - Sonnencreme LSF 30+ auftragen.";

  return { clothing, activities, advisory, uvWarning, windWarning };
}

// Load WSDL
const wsdlPath = path.join(__dirname, "recommendation.wsdl");
const wsdlXml  = fs.readFileSync(wsdlPath, "utf8");

// Routes
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "recommendation-soap", port: PORT });
});

app.post("/recommend", (req, res) => {
  const { condition, temperature, humidity, windSpeed } = req.body;
  if (!condition || temperature === undefined) {
    console.warn(`[WARN] Missing parameters in /recommend request`);
    return res.status(400).json({ success: false, error: "condition and temperature required" });
  }
  console.log(`[INFO] REST bridge called: condition=${condition}, temperature=${temperature}`);
  const data = recommend({ condition, temperature, humidity, windSpeed });
  res.json({ success: true, data });
});

app.get("/wsdl", (_req, res) => {
  res.set("Content-Type", "text/xml");
  res.send(wsdlXml);
});

// SOAP service definition
const soapService = {
  RecommendationService: {
    RecommendationPort: {
      GetRecommendation(args, cb) {
        console.log(`[INFO] SOAP call: condition=${args.condition}, temperature=${args.temperature}`);
        cb(null, recommend(args));
      },
    },
  },
};

// Start server
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`[INFO] Recommendation SOAP Service running on http://localhost:${PORT}`);
  console.log(`[INFO] WSDL: GET http://localhost:${PORT}/wsdl`);
  console.log(`[INFO] SOAP: http://localhost:${PORT}/soap`);
  console.log(`[INFO] REST bridge: POST http://localhost:${PORT}/recommend`);
  soap.listen(server, "/soap", soapService, wsdlXml);
});
