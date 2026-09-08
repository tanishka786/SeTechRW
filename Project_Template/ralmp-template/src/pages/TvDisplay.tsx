import { Maximize, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { LogoMark } from "../components/AppShell";
import { fleetStats } from "../metrics";
import { useStore } from "../store";

export function TvDisplayPage() {
  const { active } = useStore();
  const nav = useNavigate();
  const s = fleetStats(active);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setSlide((n) => (n + 1) % 3), 8000);
    return () => clearInterval(t);
  }, [paused]);

  const goFs = () => document.documentElement.requestFullscreen?.();

  const tiles = [
    { label: "Total Fleet", value: s.total, color: "#e8d56a" },
    { label: "In-Plant", value: s.inPlant, color: "#7d9a70" },
    { label: "Customer Side", value: s.atCustomer, color: "#6ea8d8" },
    { label: "Maintenance", value: s.repair, color: "#e0b14a" },
    { label: "Lost / Scrap", value: s.lostScrap, color: "#e25a6a" },
  ];

  return (
    <div className="min-h-screen bg-[#050806] px-6 py-5 text-white">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white p-2 text-black">
            <LogoMark />
          </div>
          <div>
            <h1 className="text-3xl font-semibold md:text-4xl">Fleet Operations Center</h1>
            <p className="flex items-center gap-2 text-sm text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {slide === 0 ? "Overview" : slide === 1 ? "Customer Wise" : "Movement"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-3xl font-semibold tabular-nums">
              {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="text-sm text-white/60">{clock.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
          </div>
          <button className="rounded-full bg-white/10 px-3 py-2 text-sm" onClick={() => nav("/dashboard")}>
            Exit display
          </button>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label={paused ? "Play rotation" : "Pause rotation"} onClick={() => setPaused((p) => !p)}>
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Enter fullscreen" onClick={goFs}>
            <Maximize size={18} />
          </button>
        </div>
      </header>

      {slide === 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-3xl bg-white/5 p-5">
                <p className="text-white/60">{t.label}</p>
                <p className="mt-3 text-6xl font-semibold" style={{ color: t.color }}>{t.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-white/5 p-5">
              <p className="mb-3 text-sm tracking-widest text-white/50">MOVEMENT TREND</p>
              <div className="h-48">
                <ResponsiveContainer>
                  <LineChart data={[{ x: 1, v: 22 }, { x: 2, v: 4 }, { x: 3, v: 3 }, { x: 4, v: 2 }]}>
                    <Line type="monotone" dataKey="v" stroke="#e8d56a" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-3xl bg-white/5 p-5">
              {[
                ["In-Plant", s.inPlant],
                ["In-Trans to Cust", s.transitCust],
                ["At Customer", s.atCustomer],
                ["In-Trans to Plant", s.transitPlant],
              ].map(([l, v]) => (
                <div key={String(l)} className="rounded-2xl bg-black/30 p-4">
                  <p className="text-4xl font-semibold">{v}</p>
                  <p className="text-white/60">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {slide === 1 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-white/5 p-5">
            <p className="mb-4 text-white/70">Assets currently with each customer</p>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={active.customers.map((c) => ({ name: c.name.split(" ")[0], v: c.assetsOnSite || 2 }))} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} stroke="#ccc" />
                  <Bar dataKey="v" fill="#9ec4e8" radius={6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-3xl bg-white/5 p-5">
            <p className="mb-2 text-xl">Supplier Wise</p>
            <p className="mb-4 text-white/60">Assets currently out with each supplier / vendor.</p>
            {active.suppliers.map((sup) => (
              <div key={sup.id} className="mb-3">
                <div className="mb-1 flex justify-between text-sm"><span>{sup.name}</span><span>{sup.assetsOnSite}</span></div>
                <div className="h-3 rounded-full bg-white/10">
                  <div className="h-3 rounded-full bg-rose-300" style={{ width: `${Math.min(100, sup.assetsOnSite * 30)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {slide === 2 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["In-Trans to Cust", s.transitCust],
            ["At Customer", s.atCustomer],
            ["In-Trans to Plant", s.transitPlant],
            ["In-Plant", s.inPlant],
          ].map(([l, v]) => (
            <div key={String(l)} className="rounded-3xl bg-white/5 p-8">
              <p className="text-7xl font-semibold">{v}</p>
              <p className="mt-2 text-white/60">{l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-2" aria-label="Slides">
        {[0, 1, 2].map((i) => (
          <button key={i} aria-label={`Show slide ${i + 1}`} className={`h-2.5 rounded-full ${slide === i ? "w-8 bg-yellow-300" : "w-2.5 bg-white/30"}`} onClick={() => setSlide(i)} />
        ))}
      </div>
    </div>
  );
}
