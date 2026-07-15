"use client";
import { useEffect, useState } from "react";
import SplashScreen from "./SplashScreen";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("splash_shown");
    if (!seen) setShowSplash(true);
  }, []);

  const handleComplete = () => {
    sessionStorage.setItem("splash_shown", "1");
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleComplete} />}
      <div style={{ opacity: showSplash ? 0 : 1, transition: "opacity 0.4s ease 0.2s" }}>
        {children}
      </div>
    </>
  );
}
