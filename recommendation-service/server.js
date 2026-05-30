/**
 * WeatherSync - Recommendation Service (SOAP/WSDL)
 * Port 3002
 *
 * Dieser Service nimmt Wetterdaten entgegen und gibt Empfehlungen zurück:
 * welche Kleidung man tragen soll, welche Aktivitäten passen, und ob Warnungen gelten.
 *
 * Er kann auf zwei Arten angesprochen werden:
 *   1. SOAP-Protokoll (XML-basiert, für Enterprise-Systeme): POST http://localhost:3002/soap
 *   2. REST-Bridge (einfaches JSON):                         POST http://localhost:3002/recommend
 *
 * Weitere Endpunkte:
 *   GET /wsdl    -> liefert die WSDL-Schnittstellenbeschreibung (XML)
 *   GET /health  -> Statuscheck
 */

const express = require("express");
const { soap } = require("strong-soap"); // SOAP-Bibliothek: parst WSDL und nimmt SOAP-Requests entgegen
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");
const http    = require("http");

const app  = express();
const PORT = 3002;

// CORS: erlaubt Anfragen aus dem Browser (Frontend auf anderem Port)
app.use(cors());

// JSON-Body-Parser: ermöglicht req.body bei POST-Anfragen mit Content-Type: application/json
app.use(express.json());

// Middleware: jede Anfrage mit Zeitstempel loggen
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/**
 * recommend({ condition, temperature, humidity, windSpeed })
 * ----------------------------------------------------------
 * Kernlogik des Services: berechnet aus den Wetterdaten konkrete Empfehlungen.
 *
 * @param {string} condition   - Wetterzustand, z.B. "Rain", "Clear", "Snow"
 * @param {number} temperature - Temperatur in Celsius
 * @param {number} humidity    - Luftfeuchtigkeit in Prozent
 * @param {number} windSpeed   - Windgeschwindigkeit in m/s
 * @returns {object} - { clothing, activities, advisory, uvWarning, windWarning }
 */
function recommend({ condition, temperature, humidity, windSpeed }) {
  // Eingaben in Zahlen umwandeln; Fallback-Werte falls nichts übergeben wurde
  const temp = parseFloat(temperature) || 20;
  const wind = parseFloat(windSpeed)   || 0;
  const hum  = parseFloat(humidity)    || 50;

  // Bedingung in Kleinbuchstaben für einfachere String-Vergleiche
  const cond = String(condition || "").toLowerCase();

  // Ergebnis-Arrays, die befüllt werden
  const clothing   = [];
  const activities = [];

  // Warnflags: werden je nach Bedingung auf true gesetzt
  let uvWarning   = false;
  let windWarning = wind > 10; // Windwarnung ab 10 m/s

  // --- Kleidungsempfehlungen nach Temperatur ---

  if (temp >= 25) {
    // Sommerkleidung + UV-Schutz
    clothing.push("T-Shirt / leichtes Top", "Shorts oder Sommerkleid", "Sonnenbrille", "Sonnenhut");
    uvWarning = true; // Bei >=25°C ist UV-Index typischerweise hoch
  } else if (temp >= 18) {
    // Milde Temperaturen: leichte Kleidung
    clothing.push("Leichtes Hemd oder Bluse", "Jeans oder Chinos");
    // Jackentyp abhängig vom Wetterzustand (Regen oder nicht)
    clothing.push(cond.includes("rain") ? "Regenjacke" : "Leichte Jacke");
  } else if (temp >= 10) {
    // Kühl: Pullover/Mantel
    clothing.push("Pullover oder Hoodie", "Lange Hose", "Leichter Mantel");
    if (cond.includes("rain")) clothing.push("Regenschirm");
  } else if (temp >= 0) {
    // Kalt: Winterkleidung
    clothing.push("Warme Jacke", "Schal und Handschuhe");
    if (cond.includes("snow")) clothing.push("Wasserdichte Stiefel"); // Bei Schnee: Nässeschutz
  } else {
    // Unter 0°C: Extremkälte-Ausrüstung
    clothing.push("Schwerer Wintermantel", "Thermounterwaesche", "Warme Muetze und Handschuhe");
  }

  // Unabhängig von der Temperatur: bei starkem Wind winddichte Jacke empfehlen
  if (wind > 8) clothing.push("Winddichte Jacke");

  // --- Aktivitätsempfehlungen nach Wetterzustand ---

  if (cond.includes("clear") || cond.includes("sunny")) {
    // Schönes Wetter: Outdoor-Aktivitäten
    activities.push(temp >= 20 ? "Picknick im Freien" : "Spaziergang in der Natur");
    activities.push("Fahrradtour", "Joggen");
  } else if (cond.includes("cloud")) {
    // Bewölkt aber trocken: Draußen noch möglich, aber auch Indoor-Optionen
    activities.push("Spaziergang moeglich", "Museum oder Galerie", "Cafe-Besuch");
  } else if (cond.includes("rain") || cond.includes("drizzle")) {
    // Regen: lieber drinnen bleiben
    activities.push("Kino", "Bibliothek", "Restaurant-Besuch");
  } else if (cond.includes("snow")) {
    // Schnee: Wintersport oder gemütlich draußen
    activities.push("Skifahren", "Schneemann bauen");
  } else if (cond.includes("thunder")) {
    // Gewitter: auf keinen Fall raus
    activities.push("Drinnen bleiben", "Spieleabend");
  } else {
    // Unbekannte/sonstige Bedingung: generische Empfehlung
    activities.push("Spaziergang", "Cafe-Besuch");
  }

  // --- Warnhinweis (advisory): die wichtigste Handlungsempfehlung als Kurztext ---
  // Reihenfolge ist wichtig: schwerwiegendere Warnungen haben Vorrang (if-else-if)
  let advisory = "Bedingungen sind gut. Geniessen Sie den Tag!"; // Standard: kein Problem
  if      (cond.includes("thunder"))          advisory = "Gewitterwarnung - besser drinnen bleiben!";
  else if (temp <= -5)                        advisory = "Extreme Kaelte - Aufenthalt im Freien minimieren.";
  else if (temp >= 35)                        advisory = "Hitzewarnung - viel trinken, Schatten aufsuchen.";
  else if (wind > 15)                         advisory = "Starker Wind - im Freien vorsichtig sein.";
  else if (cond.includes("snow") && temp < 0) advisory = "Glatteisgefahr - rutschfeste Schuhe tragen!";
  else if (uvWarning)                         advisory = "Hoher UV-Index - Sonnencreme LSF 30+ auftragen.";

  // Gesamtergebnis zurückgeben
  return { clothing, activities, advisory, uvWarning, windWarning };
}

// WSDL-Datei beim Serverstart einmalig von der Festplatte lesen.
// WSDL (Web Services Description Language) beschreibt die SOAP-Schnittstelle in XML:
// welche Methoden es gibt, welche Parameter sie erwarten und was sie zurückgeben.
const wsdlPath = path.join(__dirname, "recommendation.wsdl");
const wsdlXml  = fs.readFileSync(wsdlPath, "utf8");

// --- Routen ---

/**
 * GET /health
 * Statuscheck – wird z.B. von Docker oder einem Load Balancer regelmäßig abgefragt.
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "recommendation-soap", port: PORT });
});

/**
 * POST /recommend  (REST-Bridge)
 * Body: { condition, temperature, humidity, windSpeed }
 *
 * Ermöglicht einfachen JSON-Zugriff auf die Empfehlungslogik, ohne SOAP nutzen zu müssen.
 * Das Frontend oder andere Services können so direkt JSON schicken und JSON empfangen.
 */
app.post("/recommend", (req, res) => {
  const { condition, temperature, humidity, windSpeed } = req.body;

  // Pflichtfelder prüfen: ohne Bedingung und Temperatur macht eine Empfehlung keinen Sinn
  if (!condition || temperature === undefined) {
    console.warn(`[WARN] Missing parameters in /recommend request`);
    return res.status(400).json({ success: false, error: "condition and temperature required" });
  }

  console.log(`[INFO] REST bridge called: condition=${condition}, temperature=${temperature}`);

  // Empfehlungslogik aufrufen und Ergebnis direkt zurückgeben
  const data = recommend({ condition, temperature, humidity, windSpeed });
  res.json({ success: true, data });
});

/**
 * GET /wsdl
 * Liefert die WSDL-Datei als XML zurück.
 * SOAP-Clients (z.B. SoapUI, Java-Clients) rufen dies ab, um die Schnittstelle zu kennen.
 */
app.get("/wsdl", (_req, res) => {
  res.set("Content-Type", "text/xml");
  res.send(wsdlXml);
});

/**
 * SOAP Service Definition
 * -----------------------
 * Dieses Objekt beschreibt die Struktur des SOAP-Services für die strong-soap-Bibliothek.
 * Die Hierarchie spiegelt die WSDL-Struktur wider:
 *   Service → Port → Operation
 *
 * GetRecommendation ist die einzige SOAP-Operation:
 *   - args: enthält die XML-Parameter aus dem SOAP-Request (condition, temperature, etc.)
 *   - cb:   Callback-Funktion; erstes Argument = Fehler, zweites = Ergebnis
 */
const soapService = {
  RecommendationService: {
    RecommendationPort: {
      GetRecommendation(args, cb) {
        console.log(`[INFO] SOAP call: condition=${args.condition}, temperature=${args.temperature}`);
        // Empfehlungslogik aufrufen; Ergebnis über Callback zurückgeben
        // strong-soap serialisiert das Objekt automatisch in XML
        cb(null, recommend(args));
      },
    },
  },
};

/**
 * Server starten
 * --------------
 * Wichtig: Wir erstellen einen raw http.Server (statt app.listen()),
 * weil strong-soap denselben Server-Handle braucht um den SOAP-Endpunkt darauf zu mounten.
 * app.listen() würde intern auch einen http.Server erstellen, aber wir hätten keinen Zugriff darauf.
 */
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`[INFO] Recommendation SOAP Service running on http://localhost:${PORT}`);
  console.log(`[INFO] WSDL: GET http://localhost:${PORT}/wsdl`);
  console.log(`[INFO] SOAP: http://localhost:${PORT}/soap`);
  console.log(`[INFO] REST bridge: POST http://localhost:${PORT}/recommend`);

  // SOAP-Endpunkt auf /soap mounten: strong-soap übernimmt ab hier alle SOAP-Requests
  // und leitet sie an die entsprechenden Methoden in soapService weiter
  soap.listen(server, "/soap", soapService, wsdlXml);
});