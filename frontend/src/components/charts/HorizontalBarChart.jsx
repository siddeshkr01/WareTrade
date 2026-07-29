import { useState } from "react";

// A ranked horizontal bar list: label + value are always visible (never
// hover-only), so a colored bar never has to carry meaning by hue alone —
// this is what lets status colors (which aren't CVD-distinct on their own)
// be used safely here.
const HorizontalBarChart = ({ data, emptyText = "No data yet." }) => {
    const [hoverKey, setHoverKey] = useState(null);

    if (!data || data.length === 0) {
        return <p className="muted" style={{ margin: 0 }}>{emptyText}</p>;
    }

    const maxValue = Math.max(1, ...data.map((d) => d.value));

    return (
        <div className="chart-bars">
            {data.map((d) => {
                const pct = Math.max(3, Math.round((d.value / maxValue) * 100));
                return (
                    <div
                        key={d.key}
                        className="chart-bar-row"
                        tabIndex={0}
                        onPointerEnter={() => setHoverKey(d.key)}
                        onPointerLeave={() => setHoverKey(null)}
                        onFocus={() => setHoverKey(d.key)}
                        onBlur={() => setHoverKey(null)}
                    >
                        <div className="chart-bar-label">{d.label}</div>
                        <div className="chart-bar-track">
                            <div
                                className="chart-bar-fill"
                                style={{ width: `${pct}%`, background: d.color }}
                            />
                        </div>
                        <div className="chart-bar-value">{d.value}</div>
                        {hoverKey === d.key && (
                            <div className="chart-bar-tooltip">
                                <strong>{d.value}</strong> {d.label}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default HorizontalBarChart;
