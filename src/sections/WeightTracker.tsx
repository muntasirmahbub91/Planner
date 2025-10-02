// src/sections/WeightTracker.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useWeightStore } from "../stores/weight";
import type { Units, WeightEntry } from "../stores/weight";
import "../styles/weight.css";

export default function WeightTracker({ dateISO }: { dateISO?: string }) {
  const todayISO = useMemo(() => toLocalISO(new Date()), []);
  const iso = dateISO ?? todayISO;

  const { entries, units, setUnits, addOrUpdate, remove } = useWeightStore();
  const [open, setOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);

  const existing = useMemo(
    () => entries.find((e) => e.date === iso),
    [entries, iso]
  );

  const [valKg, setValKg] = useState<number>(existing?.kg ?? 70);
  const [dragging, setDragging] = useState(false);

  const minKg = 30, maxKg = 180, stepKg = 0.1;

  useEffect(() => { if (existing) setValKg(existing.kg); }, [existing?.kg, iso]);

  const unitLabel = units === "kg" ? "kg" : "lb";
  const shownValue =
    units === "kg"
      ? format1(clamp(valKg, minKg, maxKg))
      : format1(kgToLb(clamp(valKg, minKg, maxKg)));

  const onConfirm = () => { addOrUpdate(iso, clamp(valKg, minKg, maxKg)); setOpen(false); };
  const onDelete = () => { remove(iso); setOpen(false); };

  const lastN = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.ts - b.ts);
    return sorted.slice(-30);
  }, [entries]);

  return (
    <section className="wtk__wrap" aria-label="Weight tracker">
      <header className="wtk__header">
        <div className="wtk__title">Weight</div>
        <div className="wtk__meta">
          <span className="wtk__count">{entries.length}</span>
          <span className="wtk__countLabel">entries</span>
        </div>
      </header>

      <div className="wtk__card">
        <div className="wtk__row">
          <button
            type="button"
            className="wtk__btn wtk__btnPrimary"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            {existing ? "Edit today’s weight" : "Add today’s weight"}
          </button>

          <div className="wtk__rowRight">
            <button
              type="button"
              className="wtk__btn"
              onClick={() => setGraphOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={graphOpen}
            >
              View graph
            </button>
            <div className="wtk__unitSwitch" role="group" aria-label="Units">
              <button
                type="button"
                className={`wtk__chip ${units === "kg" ? "is-active" : ""}`}
                onClick={() => setUnits("kg")}
              >
                kg
              </button>
              <button
                type="button"
                className={`wtk__chip ${units === "lb" ? "is-active" : ""}`}
                onClick={() => setUnits("lb")}
              >
                lb
              </button>
            </div>
          </div>
        </div>

        <Sparkline entries={lastN} units={units} />

        {existing && (
          <div className="wtk__hint">
            Today ({iso}):{" "}
            <strong>
              {units === "kg" ? format1(existing.kg) : format1(kgToLb(existing.kg))} {unitLabel}
            </strong>
          </div>
        )}
      </div>

      {/* Input modal */}
      {open && (
        <Modal onClose={() => setOpen(false)} ariaLabel="Enter weight">
          <div className="wtk__modal">
            <div className="wtk__modalHead">
              <div className="wtk__modalTitle">Enter weight</div>
              <div className="wtk__modalDate">{iso}</div>
            </div>

            <Dial
              valueKg={valKg}
              minKg={minKg}
              maxKg={maxKg}
              onChangeKg={setValKg}
              dragging={dragging}
              setDragging={setDragging}
            />

            <div className="wtk__inputs">
              <label className="wtk__field">
                <span className="wtk__label">Weight</span>
                <div className="wtk__fieldRow">
                  <input
                    type="number"
                    inputMode="decimal"
                    step={units === "kg" ? stepKg : 0.1}
                    min={units === "kg" ? minKg : kgToLb(minKg)}
                    max={units === "kg" ? maxKg : kgToLb(maxKg)}
                    value={shownValue}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value || "0");
                      setValKg(units === "kg" ? v : lbToKg(v));
                    }}
                    className="wtk__number"
                    aria-label={`Weight in ${unitLabel}`}
                  />
                  <span className="wtk__unit">{unitLabel}</span>
                </div>
              </label>

              <input
                type="range"
                min={minKg}
                max={maxKg}
                step={stepKg}
                value={clamp(valKg, minKg, maxKg)}
                onChange={(e) => setValKg(parseFloat(e.target.value))}
                className="wtk__range"
                aria-label="Weight slider in kg"
              />
            </div>

            <div className="wtk__actions">
              {existing && (
                <button type="button" className="wtk__btn wtk__btnDanger" onClick={onDelete}>
                  Delete
                </button>
              )}
              <div className="wtk__spacer" />
              <button type="button" className="wtk__btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="wtk__btn wtk__btnPrimary" onClick={onConfirm}>
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Graph modal */}
      {graphOpen && (
        <Modal onClose={() => setGraphOpen(false)} ariaLabel="Weight graph">
          <GraphModal
            units={units}
            entries={entries}
            onClose={() => setGraphOpen(false)}
          />
        </Modal>
      )}
    </section>
  );
}

/* ---------------- Graph Modal ---------------- */

function GraphModal({
  units,
  entries,
  onClose,
}: {
  units: Units;
  entries: WeightEntry[];
  onClose: () => void;
}) {
  const [days, setDays] = useState<number>(90); // default window
  const dayOptions = [14, 30, 90, 180, 365, 99999]; // 99999 = All

  const now = Date.now();
  const fromTs = days >= 99999 ? 0 : now - days * 86400000;

  const filtered = useMemo(() => {
    const arr = [...entries].sort((a, b) => a.ts - b.ts);
    return arr.filter((e) => e.ts >= fromTs);
  }, [entries, fromTs]);

  const w = 440, h = 220, pad = 28;

  const view = filtered.length ? filtered : [...entries].slice(-1);

  const xs = view.map((e) => e.ts);
  const ys = view.map((e) => e.kg);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const ySpan = yMax - yMin || 1;

  const xScale = (t: number) =>
    pad + ((t - xMin) / Math.max(xMax - xMin || 1, 1)) * (w - pad * 2);
  const yScale = (kg: number) => pad + (1 - (kg - yMin) / ySpan) * (h - pad * 2);

  const path = view
    .map((e, i) => {
      const x = xScale(e.ts);
      const y = yScale(e.kg);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  const last = view[view.length - 1];

  return (
    <div className="wtk__modal wtk__graphModal">
      <div className="wtk__modalHead">
        <div className="wtk__modalTitle">Weight graph</div>
        <div className="wtk__modalDate">
          Window: {days >= 99999 ? "All" : `${days}d`}
        </div>
      </div>

      <div className="wtk__chartToolbar">
        <div className="wtk__seg">
          {dayOptions.map((d) => (
            <button
              key={d}
              className={`wtk__chip ${days === d ? "is-active" : ""}`}
              onClick={() => setDays(d)}
              type="button"
            >
              {d >= 99999 ? "All" : `${d}d`}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={14}
          max={365}
          step={1}
          value={Math.min(days, 365)}
          onChange={(e) => setDays(Number(e.target.value))}
          className="wtk__range"
          aria-label="Zoom window days"
        />
      </div>

      <div className="wtk__chartWrap">
        <svg className="wtk__chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          {/* Axes */}
          <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} className="wtk__axis" />
          <line x1={pad} y1={pad} x2={pad} y2={h - pad} className="wtk__axis" />
          {/* Grid */}
          {Array.from({ length: 4 }).map((_, i) => {
            const y = pad + (i / 4) * (h - pad * 2);
            return <line key={i} x1={pad} y1={y} x2={w - pad} y2={y} className="wtk__grid" />;
          })}
          {/* Line */}
          <path d={path} className="wtk__chartPath" />
          {/* Last dot */}
          {view.length > 0 && (
            <circle cx={xScale(last.ts)} cy={yScale(last.kg)} r="3" className="wtk__sparkDot" />
          )}
        </svg>
      </div>

      <div className="wtk__chartMeta">
        <div className="wtk__sparkNow">
          {units === "kg" ? `${format1(last.kg)} kg` : `${format1(kgToLb(last.kg))} lb`}
        </div>
        <div className="wtk__sparkRange">
          Min {format1(units === "kg" ? yMin : kgToLb(yMin))} ·
          Max {format1(units === "kg" ? yMax : kgToLb(yMax))}
        </div>
      </div>

      <div className="wtk__actions">
        <div className="wtk__spacer" />
        <button type="button" className="wtk__btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* ---------------- Modal ---------------- */

function Modal(props: { children: React.ReactNode; onClose: () => void; ariaLabel: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <div className="wtk__overlay" role="dialog" aria-label={props.ariaLabel}>
      <div className="wtk__bg" onClick={props.onClose} />
      <div className="wtk__sheet" role="document">
        <button className="wtk__close" aria-label="Close" onClick={props.onClose} type="button">×</button>
        {props.children}
      </div>
    </div>
  );
}

/* ---------------- Dial/Sparkline (unchanged) ---------------- */

function Dial(props: {
  valueKg: number; minKg: number; maxKg: number;
  onChangeKg: (v: number) => void; dragging: boolean; setDragging: (b: boolean) => void;
}) {
  const { valueKg, minKg, maxKg, onChangeKg, dragging, setDragging } = props;
  const ref = useRef<SVGSVGElement | null>(null);

  const ratio = (valueKg - minKg) / (maxKg - minKg);
  const angle = -135 + clamp(ratio, 0, 1) * 270;
  const display = format1(valueKg);

  const onPointer = (clientX: number, clientY: number) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const theta = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
    const t = clamp((theta + 135) / 270, 0, 1);
    onChangeKg(round1(minKg + t * (maxKg - minKg)));
  };

  return (
    <div className="wtk__dialWrap">
      <svg
        ref={ref}
        className={`wtk__dial ${dragging ? "is-dragging" : ""}`}
        viewBox="0 0 200 200"
        onMouseDown={(e) => { setDragging(true); onPointer(e.clientX, e.clientY); }}
        onMouseMove={(e) => dragging && onPointer(e.clientX, e.clientY)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={(e) => { setDragging(true); onPointer(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchMove={(e) => onPointer(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={() => setDragging(false)}
        role="slider" aria-valuemin={minKg} aria-valuemax={maxKg} aria-valuenow={valueKg}
        aria-label="Weight dial in kg"
      >
        <circle cx="100" cy="100" r="84" className="wtk__dialTrack" />
        <DialArc valueRatio={clamp(ratio, 0, 1)} />
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (-135 + (i / 9) * 270) * (Math.PI / 180), r1 = 72, r2 = 82;
          return <line key={i}
            x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)}
            x2={100 + r2 * Math.cos(a)} y2={100 + r2 * Math.sin(a)}
            className="wtk__dialTick" />;
        })}
        <g transform={`rotate(${angle} 100 100)`}>
          <line x1="100" y1="100" x2="165" y2="100" className="wtk__dialNeedle" />
          <circle cx="100" cy="100" r="4" className="wtk__dialHub" />
        </g>
        <text x="100" y="96" textAnchor="middle" className="wtk__dialVal">{display}</text>
        <text x="100" y="116" textAnchor="middle" className="wtk__dialUnit">kg</text>
      </svg>
    </div>
  );
}
function DialArc({ valueRatio }: { valueRatio: number }) {
  const start = polar(100, 100, 84, -135);
  const endAngle = -135 + valueRatio * 270;
  const end = polar(100, 100, 84, endAngle);
  const largeArc = endAngle - -135 > 180 ? 1 : 0;
  return <path d={`M ${start.x} ${start.y} A 84 84 0 ${largeArc} 1 ${end.x} ${end.y}`} className="wtk__dialArc" />;
}

function Sparkline({ entries, units }: { entries: WeightEntry[]; units: Units }) {
  const w = 320, h = 56, pad = 4;
  if (!entries.length) return <div className="wtk__empty">No data yet</div>;
  const ys = entries.map((e) => e.kg);
  const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
  const pts = entries.map((e, i) => {
    const x = pad + (i / Math.max(entries.length - 1, 1)) * (w - pad * 2);
    const y = pad + (1 - (e.kg - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
  const last = entries[entries.length - 1];
  const lastDisp = units === "kg" ? `${format1(last.kg)} kg` : `${format1(kgToLb(last.kg))} lb`;
  return (
    <div className="wtk__sparkWrap">
      <svg className="wtk__spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path className="wtk__sparkPath" d={d} />
        {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.75" className="wtk__sparkDot" />}
      </svg>
      <div className="wtk__sparkMeta">
        <div className="wtk__sparkNow">{lastDisp}</div>
        <div className="wtk__sparkRange">
          Min {format1(units === "kg" ? min : kgToLb(min))} · Max {format1(units === "kg" ? max : kgToLb(max))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Utils ---------------- */

function toLocalISO(d: Date) { const off = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - off).toISOString().slice(0, 10); }
function kgToLb(kg: number) { return kg * 2.2046226218; }
function lbToKg(lb: number) { return lb / 2.2046226218; }
function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }
function round1(v: number) { return Math.round(v * 10) / 10; }
function format1(v: number) { return round1(v).toFixed(1); }
function polar(cx: number, cy: number, r: number, deg: number) { const a = (deg * Math.PI) / 180; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; }
