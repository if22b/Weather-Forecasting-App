const GLASS = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: "24px 28px",
    backdropFilter: "blur(12px)",
    marginBottom: 16,
};

const LABEL = {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    fontFamily: "'DM Mono', monospace",
    margin: "0 0 12px",
};

function Pill({ text }) {
    return (
        <span style={{
            display: "inline-block",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 20,
            padding: "5px 14px",
            fontSize: 13,
            color: "rgba(255,255,255,0.72)",
            fontFamily: "'DM Sans', sans-serif",
        }}>
      {text}
    </span>
    );
}

function Skeleton() {
    return (
        <div style={GLASS}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0, fontStyle: "italic" }}>
                Loading recommendations...
            </p>
        </div>
    );
}

export default function RecommendationsCard({ recs }) {
    if (!recs) return <Skeleton />;

    return (
        <>
            {/* Clothing */}
            <div style={GLASS}>
                <p style={LABEL}>Clothing</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {recs.clothing.map((c, i) => <Pill key={i} text={c} />)}
                </div>
            </div>

            {/* Activities */}
            <div style={GLASS}>
                <p style={LABEL}>Activities</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {recs.activities.map((a, i) => <Pill key={i} text={a} />)}
                </div>
            </div>

            {/* Advisory */}
            <div style={{
                ...GLASS,
                background: recs.uvWarning || recs.windWarning
                    ? "rgba(255,180,50,0.08)"
                    : "rgba(255,255,255,0.04)",
                border: recs.uvWarning || recs.windWarning
                    ? "1px solid rgba(255,180,50,0.2)"
                    : "1px solid rgba(255,255,255,0.08)",
            }}>
                <p style={{ ...LABEL, color: recs.uvWarning || recs.windWarning ? "rgba(255,200,80,0.6)" : "rgba(255,255,255,0.35)" }}>
                    Advisory
                </p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", margin: 0, lineHeight: 1.6 }}>
                    {recs.advisory}
                </p>
            </div>
        </>
    );
}