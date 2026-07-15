"use client";
import { useEffect, useState } from "react";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t0 = setTimeout(() => setPhase(1), 60);
    const t1 = setTimeout(() => setPhase(2), 950);
    const t2 = setTimeout(() => setPhase(3), 3600);
    const t3 = setTimeout(() => onComplete(), 4300);
    return () => [t0, t1, t2, t3].forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#000",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: phase === 3 ? 0 : 1,
      transition: phase === 3 ? "opacity 0.65s ease-in" : "none",
      pointerEvents: phase === 3 ? "none" : "all",
      overflow: "hidden",
    }}>

      {/* Red grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(239,68,68,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.05) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      {/* Top-left radial glow */}
      <div style={{
        position: "absolute", top: "-200px", left: "-200px",
        width: "600px", height: "600px",
        background: "radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)",
        borderRadius: "50%",
      }} />

      {/* Bottom-right radial glow */}
      <div style={{
        position: "absolute", bottom: "-200px", right: "-200px",
        width: "500px", height: "500px",
        background: "radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)",
        borderRadius: "50%",
      }} />

      {/* Scan line */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)",
        animation: "scan 2s linear infinite",
        opacity: phase >= 1 && phase < 3 ? 1 : 0,
      }} />

      {/* 3D Title block */}
      <div style={{ perspective: "900px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{
          transform: phase >= 1 ? "rotateX(0deg) translateZ(0px) scale(1)" : "rotateX(-75deg) translateZ(-120px) scale(0.7)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "transform 0.9s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease",
          transformOrigin: "center 60%",
        }}>
          {/* Eyebrow */}
          <div style={{
            fontSize: "10px", letterSpacing: "0.5em",
            color: "#ef4444", fontWeight: 900,
            textTransform: "uppercase", marginBottom: "20px",
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(-8px)",
            transition: "opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s",
          }}>
            Investment Intelligence Platform
          </div>

          {/* Main title */}
          <div style={{
            fontSize: "clamp(54px, 9vw, 108px)",
            fontWeight: 900, lineHeight: 1,
            letterSpacing: "-3px", color: "#fff",
            textShadow: "0 0 80px rgba(239,68,68,0.35), 0 0 160px rgba(239,68,68,0.15)",
          }}>
            Product <span style={{ color: "#ef4444" }}>Analyser</span>
          </div>

          {/* Divider line */}
          <div style={{
            margin: "28px auto",
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.6), transparent)",
            width: phase >= 2 ? "320px" : "0px",
            transition: "width 0.6s ease 0.2s",
          }} />

          {/* Sub-tools */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: "20px",
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#ef4444", fontWeight: 800, letterSpacing: "0.05em" }}>Feedback Analyser</div>
              <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>User signals → Investment score</div>
            </div>
            <div style={{ width: "1px", height: "32px", background: "#1f1f1f" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#3b82f6", fontWeight: 800, letterSpacing: "0.05em" }}>Company Analyser</div>
              <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>AI research → Investment brief</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        position: "absolute", bottom: "56px", left: "50%",
        transform: "translateX(-50%)", width: "220px",
        height: "1.5px", background: "#111", borderRadius: "2px", overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          background: "linear-gradient(90deg, #ef4444, #f97316)",
          width: phase >= 1 ? "100%" : "0%",
          transition: "width 3.4s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "0 0 8px rgba(239,68,68,0.7)",
        }} />
      </div>

      <div style={{
        position: "absolute", bottom: "32px",
        fontSize: "9px", letterSpacing: "0.35em",
        color: "#2a2a2a", fontWeight: 700, textTransform: "uppercase",
      }}>Powered by Groq · Tavily · llama-3.1-8b</div>
    </div>
  );
}
