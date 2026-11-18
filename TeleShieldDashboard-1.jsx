import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from "recharts";

// ─────────────────────────────────────────────
// MOCK DATA  (replace with real API calls later)
// ─────────────────────────────────────────────
const WEEKLY_DATA = [
  { day: "Mon", simBox: 42, smishing: 28, subscription: 17, wangiri: 12 },
  { day: "Tue", simBox: 58, smishing: 41, subscription: 23, wangiri: 9  },
  { day: "Wed", simBox: 35, smishing: 33, subscription: 29, wangiri: 18 },
  { day: "Thu", simBox: 71, smishing: 52, subscription: 16, wangiri: 22 },
  { day: "Fri", simBox: 63, smishing: 47, subscription: 31, wangiri: 11 },
  { day: "Sat", simBox: 38, smishing: 55, subscription: 25, wangiri: 16 },
  { day: "Sun", simBox: 84, smishing: 68, subscription: 40, wangiri: 27 },
];

const FRAUD_TYPES = [
  { label: "SIM Box",      pct: 62, color: "#ef4444", icon: "📱", desc: "High-volume international call routing" },
  { label: "Smishing",     pct: 21, color: "#f97316", icon: "💬", desc: "Bulk SMS phishing campaigns"            },
  { label: "Subscription", pct: 11, color: "#8b5cf6", icon: "🔐", desc: "Rapid account activation fraud"        },
  { label: "Wangiri",      pct: 6,  color: "#06b6d4", icon: "📞", desc: "Missed-call premium number scams"      },
];

const INITIAL_ALERTS = [
  { id: 1, sev: "Critical", type: "SIM Box",      account: "+254712•••421", detail: "847 intl calls in 1 hr · 3 s avg duration",   score: 0.96, time: "2 min ago",  read: false },
  { id: 2, sev: "High",     type: "Smishing",     account: "BATCH #4471",   detail: "1 240 SMS sent · 3 shortened URLs detected",   score: 0.89, time: "8 min ago",  read: false },
  { id: 3, sev: "Critical", type: "Subscription", account: "DEV-98A:2F",    detail: "6 activations in 4 min from same device",       score: 0.94, time: "14 min ago", read: false },
  { id: 4, sev: "Medium",   type: "Wangiri",      account: "+881 cluster",  detail: "320 missed-call attempts · premium prefix",     score: 0.77, time: "31 min ago", read: true  },
  { id: 5, sev: "Low",      type: "Behavioural",  account: "ACC-#99812",    detail: "Deviation from 30-day baseline profile",        score: 0.61, time: "1 hr ago",   read: true  },
];

const ACCOUNTS = [
  { id: 1, account: "+254712•••421", type: "SIM Box",      tag: "red",    score: 0.96, time: "09:14", signal: "847 intl calls/hr",         status: "Open"   },
  { id: 2, account: "BATCH #4471",   type: "Smishing",     tag: "orange", score: 0.89, time: "09:08", signal: "1 240 SMS · 3 URLs",        status: "Review" },
  { id: 3, account: "DEV-98A:2F",    type: "Subscription", tag: "purple", score: 0.94, time: "09:02", signal: "6 activations · same device", status: "Open"   },
  { id: 4, account: "+881 cluster",  type: "Wangiri",      tag: "cyan",   score: 0.77, time: "08:45", signal: "320 missed calls",          status: "Closed" },
  { id: 5, account: "ACC-#99812",    type: "SIM Box",      tag: "red",    score: 0.61, time: "08:14", signal: "Baseline deviation",        status: "Watch"  },
];

const SHAP = [
  { name: "Intl call volume/hr",   val: 0.41, dir: 1 },
  { name: "Avg call duration",     val: 0.35, dir: 1 },
  { name: "Repeat dest. ratio",    val: 0.29, dir: 1 },
  { name: "Active hours score",    val: 0.24, dir: 1 },
  { name: "Baseline deviation",    val: 0.19, dir: 1 },
  { name: "Account age (days)",    val: 0.13, dir: -1 },
  { name: "ID verified",           val: 0.08, dir: -1 },
];

const METRICS = [
  { label: "Accuracy",  val: "97.4%" },
  { label: "Precision", val: "96.1%" },
  { label: "Recall",    val: "95.8%" },
  { label: "F1 Score",  val: "96.0%" },
];

const STREAMS = [
  { label: "CDR",           rate: "4.7K/s" },
  { label: "SMS Logs",      rate: "1.2K/s" },
  { label: "Subscriptions", rate: "312/s"  },
];

const NEW_ALERTS = [
  { sev: "Critical", type: "SIM Box",  account: "+254799•••003", detail: "High-volume intl calls detected",    score: 0.93 },
  { sev: "High",     type: "Smishing", account: "BATCH #4502",   detail: "980 bulk messages · URL detected",  score: 0.85 },
  { sev: "Medium",   type: "Wangiri",  account: "+883 cluster",  detail: "Missed-call cluster, premium prefix", score: 0.74 },
];

// ─────────────────────────────────────────────
// COLOUR HELPERS
// ─────────────────────────────────────────────
const SEV_COLOR = {
  Critical: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626", dot: "#ef4444" },
  High:     { bg: "#fff7ed", border: "#fed7aa", text: "#ea580c", dot: "#f97316" },
  Medium:   { bg: "#f5f3ff", border: "#ddd6fe", text: "#7c3aed", dot: "#8b5cf6" },
  Low:      { bg: "#ecfeff", border: "#a5f3fc", text: "#0891b2", dot: "#06b6d4" },
  Behavioural: { bg: "#ecfeff", border: "#a5f3fc", text: "#0891b2", dot: "#06b6d4" },
};

const TAG_COLOR = {
  red:    { bg: "#fef2f2", text: "#dc2626" },
  orange: { bg: "#fff7ed", text: "#ea580c" },
  purple: { bg: "#f5f3ff", text: "#7c3aed" },
  cyan:   { bg: "#ecfeff", text: "#0891b2" },
};

const STATUS_COLOR = {
  Open:   "#dc2626",
  Review: "#ea580c",
  Watch:  "#ca8a04",
  Closed: "#16a34a",
};

// ─────────────────────────────────────────────
// SMALL REUSABLE COMPONENTS
// ─────────────────────────────────────────────

// Coloured pill badge
function Pill({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      background: bg, color,
    }}>
      {label}
    </span>
  );
}

// Section card wrapper
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 20px rgba(0,0,0,0.04)",
      padding: "20px 24px", ...style,
    }}>
      {children}
    </div>
  );
}

// Card heading row
function CardTitle({ icon, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{title}</span>
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

// Thin horizontal divider
function Divider() {
  return <div style={{ height: 1, background: "#f3f4f6", margin: "12px 0" }} />;
}

// ─────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────
function KPICard({ icon, label, value, sub, subColor = "#6b7280", accent }) {
  return (
    <Card style={{ flex: 1, minWidth: 0, borderTop: `3px solid ${accent}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: "6px 0 4px", lineHeight: 1 }}>
            {value}
          </div>
          <div style={{ fontSize: 12, color: subColor }}>{sub}</div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: accent + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// LIVE ALERT ITEM
// ─────────────────────────────────────────────
function AlertItem({ alert, onDismiss }) {
  const c = SEV_COLOR[alert.sev] || SEV_COLOR.Low;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 14px", borderRadius: 10,
      background: alert.read ? "#fafafa" : c.bg,
      border: `1px solid ${alert.read ? "#e5e7eb" : c.border}`,
      marginBottom: 8,
      transition: "all 0.2s",
      animation: "slideIn 0.3s ease",
    }}>
      {/* Coloured dot */}
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: c.dot, marginTop: 5, flexShrink: 0,
        boxShadow: alert.read ? "none" : `0 0 0 3px ${c.dot}28`,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: severity pill + type */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <Pill label={alert.sev} color={c.text} bg={c.bg} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{alert.type}</span>
          {!alert.read && (
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#ef4444", display: "inline-block", marginLeft: 2,
            }} />
          )}
        </div>
        {/* Row 2: account + detail */}
        <div style={{ fontSize: 12, color: "#111827", fontWeight: 600 }}>{alert.account}</div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{alert.detail}</div>
      </div>

      {/* Right side: score + time */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 800,
          color: alert.score > 0.8 ? "#dc2626" : alert.score > 0.6 ? "#ea580c" : "#6b7280",
        }}>
          {alert.score.toFixed(2)}
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{alert.time}</div>
        <button
          onClick={() => onDismiss(alert.id)}
          style={{
            marginTop: 4, fontSize: 10, color: "#9ca3af", background: "none",
            border: "none", cursor: "pointer", padding: 0,
          }}
        >
          dismiss
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FRAUD BREAKDOWN BAR
// ─────────────────────────────────────────────
function BreakdownBar({ label, pct, color, icon, desc }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", flex: 1 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 32, textAlign: "right" }}>{pct}%</span>
      </div>
      <div style={{ height: 8, background: "#f3f4f6", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 8, transition: "width 1s ease" }} />
      </div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{desc}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SHAP ROW
// ─────────────────────────────────────────────
function SHAPRow({ name, val, dir }) {
  const color = dir > 0 ? "#ef4444" : "#06b6d4";
  const pct = Math.round((val / 0.5) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div style={{ width: 155, fontSize: 11, color: "#374151", fontFamily: "monospace", flexShrink: 0,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
      </div>
      <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 6 }} />
      </div>
      <div style={{ width: 44, fontSize: 11, fontFamily: "monospace", color, textAlign: "right", fontWeight: 700 }}>
        {dir > 0 ? "+" : "−"}{val.toFixed(2)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SCORE BAR (table)
// ─────────────────────────────────────────────
function ScoreBar({ score }) {
  const color = score > 0.8 ? "#ef4444" : score > 0.6 ? "#f97316" : "#9ca3af";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 100 }}>
      <div style={{ flex: 1, height: 4, background: "#f3f4f6", borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${score * 100}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: "monospace", color, fontWeight: 700, width: 30 }}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// CUSTOM CHART TOOLTIP
// ─────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 10, padding: "10px 14px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.fill }} />
          <span style={{ color: "#6b7280" }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: "#111827" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR NAV
// ─────────────────────────────────────────────
const NAV = [
  { section: "Detection", items: [
    { id: "dashboard",    icon: "📊", label: "Dashboard"           },
    { id: "simbox",       icon: "📱", label: "SIM Box",    badge: 14 },
    { id: "smishing",     icon: "💬", label: "Smishing",   badge: 9  },
    { id: "subscription", icon: "🔐", label: "Subscription", badge: 5 },
    { id: "wangiri",      icon: "📞", label: "Wangiri",    badge: 3  },
  ]},
  { section: "Analysis", items: [
    { id: "profiles", icon: "🧠", label: "Behavioural Profiles" },
    { id: "shap",     icon: "🔬", label: "SHAP Explainability"  },
    { id: "model",    icon: "🌲", label: "Random Forest"        },
  ]},
  { section: "Data", items: [
    { id: "cdr",   icon: "📡", label: "CDR Ingestion" },
    { id: "sms",   icon: "📨", label: "SMS Logs"      },
    { id: "subs",  icon: "📋", label: "Subscriptions" },
  ]},
  { section: "System", items: [
    { id: "audit",  icon: "📁", label: "Audit Log"    },
    { id: "config", icon: "⚙️", label: "Configuration" },
    { id: "users",  icon: "👥", label: "Admin Users"   },
  ]},
];

function Sidebar({ active, onNav, collapsed }) {
  return (
    <aside style={{
      width: collapsed ? 60 : 230,
      flexShrink: 0,
      background: "#fff",
      borderRight: "1px solid #e5e7eb",
      overflowY: "auto",
      overflowX: "hidden",
      transition: "width 0.25s ease",
      display: "flex", flexDirection: "column",
    }}>
      {NAV.map(group => (
        <div key={group.section}>
          {!collapsed && (
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
              color: "#9ca3af", padding: "16px 18px 4px",
              textTransform: "uppercase",
            }}>
              {group.section}
            </div>
          )}
          {collapsed && <div style={{ height: 12 }} />}
          {group.items.map(item => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  gap: collapsed ? 0 : 10,
                  padding: collapsed ? "10px 0" : "9px 14px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  border: "none", cursor: "pointer", borderRadius: 0,
                  background: isActive ? "#eff6ff" : "transparent",
                  color: isActive ? "#2563eb" : "#374151",
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  textAlign: "left", transition: "background 0.15s",
                  borderLeft: isActive ? "3px solid #2563eb" : "3px solid transparent",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                {!collapsed && item.badge && (
                  <span style={{
                    background: "#fee2e2", color: "#dc2626",
                    fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

// ─────────────────────────────────────────────
// TOPBAR
// ─────────────────────────────────────────────
function Topbar({ onToggleSidebar, unread }) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-GB"));
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, []);

  return (
    <header style={{
      height: 58, display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px", background: "#fff",
      borderBottom: "1px solid #e5e7eb",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Left: hamburger + logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={onToggleSidebar}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6b7280", padding: 4 }}
          title="Toggle sidebar"
        >
          ☰
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
          }}>🛡</div>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>
            Tele<span style={{ color: "#2563eb" }}>Shield</span>
          </span>
        </div>
      </div>

      {/* Center: search bar */}
      <div style={{ position: "relative", flex: 1, maxWidth: 360, margin: "0 24px" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>🔍</span>
        <input
          placeholder="Search accounts, alerts, fraud types…"
          style={{
            width: "100%", padding: "7px 12px 7px 34px", borderRadius: 8,
            border: "1px solid #e5e7eb", background: "#f9fafb",
            fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit",
          }}
        />
      </div>

      {/* Right: clock + bell + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Live indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 10px", borderRadius: 20,
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          fontSize: 11, fontWeight: 700, color: "#16a34a",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "#22c55e",
            display: "inline-block", animation: "pulse 2s infinite",
          }} />
          LIVE
        </div>

        <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>{time}</span>

        {/* Notification bell */}
        <div style={{ position: "relative", cursor: "pointer" }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          {unread > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              background: "#ef4444", color: "#fff",
              fontSize: 9, fontWeight: 700, padding: "1px 5px",
              borderRadius: 10, minWidth: 16, textAlign: "center",
            }}>
              {unread}
            </span>
          )}
        </div>

        {/* User avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #2563eb, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer",
        }}>
          AD
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────
// COMING SOON PAGE
// ─────────────────────────────────────────────
function ComingSoon({ page }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 12, color: "#9ca3af",
    }}>
      <span style={{ fontSize: 48 }}>🚧</span>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#374151", textTransform: "capitalize" }}>{page}</div>
      <div style={{ fontSize: 13 }}>This section is under construction</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ─────────────────────────────────────────────
function Dashboard() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [alertCount, setAlertCount] = useState(0);

  // Dismiss an alert
  const dismiss = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // Simulate a new alert every 10 seconds
  useEffect(() => {
    let idx = 0;
    const t = setInterval(() => {
      const base = NEW_ALERTS[idx % NEW_ALERTS.length];
      setAlerts(prev => [{
        ...base, id: Date.now(), time: "Just now", read: false,
      }, ...prev.slice(0, 9)]);
      setAlertCount(c => c + 1);
      idx++;
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const unread = alerts.filter(a => !a.read).length;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, maxWidth: 1400, margin: "0 auto" }}>

      {/* ── PAGE TITLE ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>
            Fraud Detection <span style={{ color: "#2563eb" }}>Overview</span>
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            Monday, 21 April 2026 · All data sources active
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{
            padding: "8px 18px", borderRadius: 8, border: "1px solid #e5e7eb",
            background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            📥 Export Report
          </button>
          <button style={{
            padding: "8px 18px", borderRadius: 8, border: "none",
            background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            + New Investigation
          </button>
        </div>
      </div>

      {/* ── ROW 1: KPI CARDS ── */}
      <div style={{ display: "flex", gap: 16 }}>
        <KPICard icon="🚨" label="Critical Alerts Today" value={31 + alertCount}
          sub="↑ 12% vs yesterday" subColor="#dc2626" accent="#ef4444" />
        <KPICard icon="📡" label="CDR Records / Hour" value="284K"
          sub="↓ 2% vs last hour" subColor="#16a34a" accent="#f97316" />
        <KPICard icon="🎯" label="Model Accuracy" value="97.4%"
          sub="↑ 0.2% this week" subColor="#16a34a" accent="#22c55e" />
        <KPICard icon="🔍" label="Accounts Flagged" value={148 + alertCount}
          sub="↑ 8 since 08:00" subColor="#dc2626" accent="#2563eb" />
      </div>

      {/* ── ROW 2: CHART + ALERTS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>

        {/* Bar Chart */}
        <Card>
          <CardTitle icon="📈" title="Fraud Events — Last 7 Days" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={WEEKLY_DATA} barSize={9} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }} />
              <Bar dataKey="simBox"       name="SIM Box"      fill="#ef4444" radius={[3,3,0,0]} />
              <Bar dataKey="smishing"     name="Smishing"     fill="#f97316" radius={[3,3,0,0]} />
              <Bar dataKey="subscription" name="Subscription" fill="#8b5cf6" radius={[3,3,0,0]} />
              <Bar dataKey="wangiri"      name="Wangiri"      fill="#06b6d4" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Alert Feed */}
        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardTitle
            icon="🔔"
            title="Live Alert Feed"
            right={
              unread > 0 && (
                <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 11,
                  fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>
                  {unread} new
                </span>
              )
            }
          />
          <div style={{ overflowY: "auto", maxHeight: 280, paddingRight: 2 }}>
            {alerts.length === 0 ? (
              <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, padding: 24 }}>
                ✅ No active alerts
              </div>
            ) : (
              alerts.map(a => <AlertItem key={a.id} alert={a} onDismiss={dismiss} />)
            )}
          </div>
        </Card>
      </div>

      {/* ── ROW 3: BREAKDOWN + METRICS + SHAP ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 20 }}>

        {/* Fraud Type Breakdown + Data Streams stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <CardTitle icon="🥧" title="Fraud Type Distribution" />
            {FRAUD_TYPES.map(f => <BreakdownBar key={f.label} {...f} />)}
          </Card>

          <Card>
            <CardTitle icon="📡" title="Live Data Ingestion" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {STREAMS.map(s => (
                <div key={s.label} style={{
                  background: "#f9fafb", borderRadius: 10, padding: "12px 8px", textAlign: "center",
                  border: "1px solid #e5e7eb",
                }}>
                  <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb", margin: "4px 0" }}>{s.rate}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 10, color: "#16a34a" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                    Live
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Model Metrics */}
        <Card>
          <CardTitle icon="🌲" title="Random Forest Performance" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {METRICS.map(m => (
              <div key={m.label} style={{
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 10, padding: 14, textAlign: "center",
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a", fontFamily: "monospace" }}>{m.val}</div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>

          <Divider />

          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
            Per-Category Confidence
          </div>
          {FRAUD_TYPES.map(f => (
            <div key={f.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginBottom: 3 }}>
                <span>{f.icon} {f.label}</span>
                <span style={{ color: f.color, fontWeight: 700, fontFamily: "monospace" }}>
                  {(0.93 + Math.random() * 0.05).toFixed(2)}
                </span>
              </div>
              <div style={{ height: 5, background: "#f3f4f6", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${92 + Math.random() * 6}%`, background: f.color, borderRadius: 5 }} />
              </div>
            </div>
          ))}
        </Card>

        {/* SHAP Panel */}
        <Card>
          <CardTitle icon="🔬" title="SHAP Explainability" />
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 8, padding: "8px 12px", marginBottom: 14,
            fontSize: 11, color: "#374151",
          }}>
            <span style={{ fontWeight: 700, color: "#dc2626" }}>Account:</span> +254712•••421 &nbsp;·&nbsp;
            <span style={{ fontWeight: 700, color: "#dc2626" }}>Fraud Score:</span>{" "}
            <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#dc2626" }}>0.96</span>
          </div>

          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>Feature</span><span>SHAP value</span>
          </div>

          {SHAP.map(s => <SHAPRow key={s.name} {...s} />)}

          <Divider />

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
              <div style={{ width: 10, height: 6, borderRadius: 3, background: "#ef4444" }} />
              Increases risk
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
              <div style={{ width: 10, height: 6, borderRadius: 3, background: "#06b6d4" }} />
              Reduces risk
            </div>
          </div>

          {/* Recommended action */}
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 8, padding: 10, fontSize: 11, color: "#374151",
          }}>
            <strong style={{ color: "#dc2626" }}>⚠️ Recommended Action: </strong>
            Suspend account immediately and flag for manual review. Block destination prefix cluster.
          </div>
        </Card>
      </div>

      {/* ── ROW 4: FLAGGED ACCOUNTS TABLE ── */}
      <Card>
        <CardTitle
          icon="🗂️"
          title="Recently Flagged Accounts"
          right={
            <button style={{
              padding: "6px 14px", borderRadius: 7, border: "1px solid #e5e7eb",
              background: "#fff", color: "#374151", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              View All →
            </button>
          }
        />

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Account ID","Fraud Type","Confidence","Detected","Key Signal","Status","Action"].map(h => (
                  <th key={h} style={{
                    textAlign: "left", padding: "8px 12px",
                    fontSize: 11, fontWeight: 700, color: "#6b7280",
                    textTransform: "uppercase", letterSpacing: 0.5,
                    borderBottom: "2px solid #f3f4f6",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACCOUNTS.map(row => {
                const tc = TAG_COLOR[row.tag] || TAG_COLOR.cyan;
                return (
                  <tr key={row.id}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    style={{ transition: "background 0.1s" }}
                  >
                    <td style={{ padding: "12px 12px", borderBottom: "1px solid #f3f4f6" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "#2563eb" }}>
                        {row.account}
                      </span>
                    </td>
                    <td style={{ padding: "12px 12px", borderBottom: "1px solid #f3f4f6" }}>
                      <span style={{
                        padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: tc.bg, color: tc.text,
                      }}>
                        {row.type}
                      </span>
                    </td>
                    <td style={{ padding: "12px 12px", borderBottom: "1px solid #f3f4f6" }}>
                      <ScoreBar score={row.score} />
                    </td>
                    <td style={{ padding: "12px 12px", borderBottom: "1px solid #f3f4f6",
                      fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>
                      {row.time}
                    </td>
                    <td style={{ padding: "12px 12px", borderBottom: "1px solid #f3f4f6",
                      fontSize: 12, color: "#6b7280", maxWidth: 180 }}>
                      {row.signal}
                    </td>
                    <td style={{ padding: "12px 12px", borderBottom: "1px solid #f3f4f6" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR[row.status] }}>
                        ● {row.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 12px", borderBottom: "1px solid #f3f4f6" }}>
                      <button style={{
                        padding: "5px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit", border: "none",
                        background: row.status === "Closed" ? "#f3f4f6" : "#eff6ff",
                        color: row.status === "Closed" ? "#6b7280" : "#2563eb",
                      }}>
                        {row.status === "Closed" ? "View" : "Investigate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────
export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const unread = 3; // would come from global state in real app

  function renderPage() {
    if (activePage === "dashboard") return <Dashboard />;
    return <ComingSoon page={activePage} />;
  }

  return (
    <>
      {/* Global animation keyframes injected once */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f3f4f6; color: #111827; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.5; }
        }
        button { font-family: inherit; }
        input  { font-family: inherit; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        {/* Top navigation bar */}
        <Topbar onToggleSidebar={() => setSidebarCollapsed(c => !c)} unread={unread} />

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left sidebar */}
          <Sidebar active={activePage} onNav={setActivePage} collapsed={sidebarCollapsed} />

          {/* Scrollable page content */}
          <main style={{ flex: 1, overflowY: "auto", background: "#f3f4f6" }}>
            {renderPage()}
          </main>
        </div>
      </div>
    </>
  );
}
