import { useState, useEffect, useCallback } from "react";
import WeatherCard from "./WeatherCard";
import RecommendationsCard from "./RecommendationsCard";
import WeatherMap from "./WeatherMap";

// API-Endpunkte
const WEATHER_API = "/api/weather";
const SOAP_API    = "/api/recommend";

// Schnellauswahl für Städte
const QUICK_CITIES = ["Vienna", "Berlin", "Paris", "Tokyo", "London", "New York"];

// Hintergrundfarben je nach Wetterzustand
const CONDITION_BACKGROUNDS = {
    clear:    "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    sunny:    "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    cloud:    "linear-gradient(160deg, #1c1c1e 0%, #2c2c2e 50%, #3a3a3c 100%)",
    rain:     "linear-gradient(160deg, #0d1117 0%, #161b22 50%, #1c2433 100%)",
    drizzle:  "linear-gradient(160deg, #0d1117 0%, #161b22 50%, #1c2433 100%)",
    snow:     "linear-gradient(160deg, #1a1a2e 0%, #2d2d44 50%, #3d3d5c 100%)",
    thunder:  "linear-gradient(160deg, #0a0a0f 0%, #111118 50%, #1a1a24 100%)",
    default:  "linear-gradient(160deg, #111114 0%, #1c1c22 50%, #26262e 100%)",
};

// Passenden Hintergrund zum Wetter finden
function getBg(condition = "") {
    const c = condition.toLowerCase();

    for (const [key, val] of Object.entries(CONDITION_BACKGROUNDS)) {
        if (c.includes(key)) return val;
    }

    return CONDITION_BACKGROUNDS.default;
}

// Hauptkomponente der App
export default function App() {
    // State für Stadt, Eingabe und Wetterdaten
    const [city,    setCity]    = useState("Vienna");
    const [input,   setInput]   = useState("Vienna");
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [recs,    setRecs]    = useState(null);

    // State für Ladezustand, Fehler und aktiven Tab
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(null);
    const [tab,     setTab]     = useState("weather");

    // Wetterdaten für eine Stadt laden
    const search = useCallback(async (target) => {
        const q = target ?? input;

        // Keine leere Suche erlauben
        if (!q.trim()) return;

        // Alte Daten zurücksetzen und Ladezustand starten
        setLoading(true);
        setError(null);
        setWeather(null);
        setForecast(null);
        setRecs(null);

        try {
            // Aktuelles Wetter laden
            const r = await fetch(`${WEATHER_API}/weather?city=${encodeURIComponent(q)}`);
            const j = await r.json();

            // Fehler vom Backend anzeigen
            if (!j.success) throw new Error(j.error);

            // Wetterdaten speichern
            setWeather(j.data);
            setCity(q);

            // Wettervorhersage laden
            fetch(`${WEATHER_API}/forecast?city=${encodeURIComponent(q)}`)
                .then(r => r.json())
                .then(j => { if (j.success) setForecast(j.data); })
                .catch(() => {});

            // Empfehlungen vom Recommendation-Service laden
            fetch(`${SOAP_API}/recommend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    condition:   j.data.condition,
                    temperature: j.data.temperature,
                    humidity:    j.data.humidity,
                    windSpeed:   j.data.wind_speed,
                }),
            })
                .then(r => r.json())
                .then(j => { if (j.success) setRecs(j.data); })
                .catch(() => {});

        } catch (e) {
            // Fehler speichern
            setError(e.message);
        } finally {
            // Ladezustand beenden
            setLoading(false);
        }
    }, [input]);

    // Beim Start automatisch Wien laden
    useEffect(() => {
        search("Vienna");
    }, []);

    // Hintergrund abhängig vom Wetter setzen
    const bg = getBg(weather?.condition);

    return (
        <div style={{ minHeight: "100vh", background: bg, transition: "background 1.2s ease", fontFamily: "'DM Sans', sans-serif" }}>
            {/* Google Fonts laden */}
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />

            <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px 60px" }}>

                {/* Header mit App-Titel und Stadt */}
                <div style={{ marginBottom: 36 }}>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.25em", color: "rgba(255,255,255,0.35)", margin: "0 0 6px", textTransform: "uppercase" }}>
                        Weather Forecasting App
                    </p>

                    <h1 style={{ fontSize: 13, fontWeight: 300, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                        {city}
                    </h1>
                </div>

                {/* Suchfeld */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && search()}
                        placeholder="city..."
                        style={{
                            flex: 1,
                            background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 10,
                            padding: "10px 16px",
                            fontSize: 14,
                            color: "rgba(255,255,255,0.9)",
                            outline: "none",
                            fontFamily: "'DM Sans', sans-serif",
                        }}
                    />

                    {/* Suchbutton */}
                    <button
                        onClick={() => search()}
                        disabled={loading}
                        style={{
                            background: "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: 10,
                            padding: "10px 20px",
                            fontSize: 13,
                            color: "rgba(255,255,255,0.9)",
                            cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                            opacity: loading ? 0.5 : 1,
                        }}
                    >
                        {loading ? "..." : "Search"}
                    </button>
                </div>

                {/* Buttons für schnelle Stadtauswahl */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 32 }}>
                    {QUICK_CITIES.map(c => (
                        <button
                            key={c}
                            onClick={() => { setInput(c); search(c); }}
                            style={{
                                background: city === c ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 20,
                                padding: "4px 14px",
                                fontSize: 12,
                                color: "rgba(255,255,255,0.7)",
                                cursor: "pointer",
                                fontFamily: "'DM Sans', sans-serif",
                                transition: "all 0.15s",
                            }}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                {/* Fehlermeldung */}
                {error && (
                    <p style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 20, background: "rgba(255,107,107,0.1)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,107,107,0.2)" }}>
                        {error}
                    </p>
                )}

                {/* Tabs für Wetter und Empfehlungen */}
                {weather && (
                    <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                        {["weather", "recs"].map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                style={{
                                    background: tab === t ? "rgba(255,255,255,0.15)" : "transparent",
                                    border: "1px solid " + (tab === t ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"),
                                    borderRadius: 8,
                                    padding: "7px 18px",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: tab === t ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                                    cursor: "pointer",
                                    fontFamily: "'DM Sans', sans-serif",
                                    textTransform: "capitalize",
                                    transition: "all 0.15s",
                                }}
                            >
                                {t === "weather" ? "Weather" : "Recommendations"}
                            </button>
                        ))}
                    </div>
                )}

                {/* Wetterkarte und Karte anzeigen */}
                {tab === "weather" && weather && (
                    <>
                        <WeatherCard weather={weather} forecast={forecast} />
                        <WeatherMap weather={weather} />
                    </>
                )}

                {/* Empfehlungen anzeigen */}
                {tab === "recs" && weather && (
                    <RecommendationsCard recs={recs} />
                )}
            </div>
        </div>
    );
}