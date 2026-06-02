import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix für Marker-Icons in Vite
delete L.Icon.Default.prototype._getIconUrl;

// Standard-Icons für Leaflet setzen
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Zeigt eine Karte mit der Position der Stadt an
export default function WeatherMap({ weather }) {
    // Keine Karte anzeigen, wenn Koordinaten fehlen
    if (!weather?.lat || !weather?.lon) return null;

    return (
        <div
            style={{
                marginTop: 20,
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
            }}
        >
            {/* Leaflet-Karte mit Wetter-Koordinaten */}
            <MapContainer
                center={[weather.lat, weather.lon]}
                zoom={10}
                zoomControl={false}
                style={{ height: "320px", width: "100%" }}
            >
                {/* Dunkler Karten-Layer */}
                <TileLayer
                    attribution='&copy; Stadia Maps & OpenMapTiles & OpenStreetMap contributors'
                    url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                />

                {/* Marker auf der aktuellen Stadt */}
                <Marker position={[weather.lat, weather.lon]}>
                    <Popup>
                        <strong>{weather.city}</strong>
                        <br />
                        {weather.temperature}°
                        <br />
                        {weather.description}
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}