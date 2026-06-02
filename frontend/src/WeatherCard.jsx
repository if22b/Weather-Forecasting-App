// Wiederverwendbarer Karten-Style
const GLASS = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: "24px 28px",
    backdropFilter: "blur(12px)",
    marginBottom: 16,
};

// Style für kleine Labels
const LABEL = {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    fontFamily: "'DM Mono', monospace",
    margin: "0 0 2px",
};

// Style für Werte/Text
const VALUE = {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    margin: 0,
};

// Eine Zeile mit Label links und Wert rechts
function StatRow({ label, value }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={LABEL}>{label}</p>
            <p style={{ ...VALUE, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{value}</p>
        </div>
    );
}

// Zeigt aktuelle Wetterdaten und optional die Vorhersage an
export default function WeatherCard({ weather, forecast }) {
    return (
        <>
            {/* Hauptkarte mit Temperatur */}
            <div style={GLASS}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
                    <div>
                        {/* Aktuelle Temperatur */}
                        <p style={{ fontSize: 76, fontWeight: 300, color: "rgba(255,255,255,0.92)", margin: 0, lineHeight: 1, letterSpacing: "-2px" }}>
                            {weather.temperature}°
                        </p>

                        {/* Wetterbeschreibung */}
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "8px 0 0", fontWeight: 400, textTransform: "capitalize" }}>
                            {weather.description}
                        </p>
                    </div>

                    {/* Gefühlte Temperatur */}
                    <div style={{ textAlign: "right" }}>
                        <p style={{ ...LABEL, marginBottom: 4 }}>Feels like</p>
                        <p style={{ fontSize: 22, fontWeight: 300, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                            {weather.feels_like}°
                        </p>
                    </div>
                </div>

                {/* Weitere Wetterdetails */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
                    <StatRow label="Humidity"   value={`${weather.humidity}%`} />
                    <StatRow label="Wind"       value={`${weather.wind_speed} m/s`} />
                    <StatRow label="Pressure"   value={`${weather.pressure} hPa`} />

                    {/* Sonnenaufgang und Sonnenuntergang */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0" }}>
                        <div>
                            <p style={LABEL}>Sunrise</p>
                            <p style={{ ...VALUE, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{weather.sunrise}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <p style={LABEL}>Sunset</p>
                            <p style={{ ...VALUE, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{weather.sunset}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5-Tage-Vorhersage anzeigen, wenn Daten vorhanden sind */}
            {forecast && (
                <div style={GLASS}>
                    <p style={{ ...LABEL, marginBottom: 16 }}>5-day forecast</p>

                    {/* Horizontale Liste der Vorhersage-Tage */}
                    <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                        {forecast.map((d, i) => (
                            <div key={i} style={{
                                flex: "0 0 auto", minWidth: 90, textAlign: "center",
                                background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 8px",
                                border: "1px solid rgba(255,255,255,0.08)",
                            }}>
                                {/* Tag */}
                                <p style={{ ...LABEL, marginBottom: 8 }}>{d.day}</p>

                                {/* Höchsttemperatur */}
                                <p style={{ fontSize: 18, fontWeight: 300, color: "rgba(255,255,255,0.85)", margin: "0 0 2px" }}>
                                    {d.temp_max}°
                                </p>

                                {/* Tiefsttemperatur */}
                                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
                                    {d.temp_min}°
                                </p>

                                {/* Wetterbeschreibung für den Tag */}
                                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "6px 0 0", textTransform: "capitalize", lineHeight: 1.3 }}>
                                    {d.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}