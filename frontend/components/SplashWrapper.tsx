"use client";
import { useEffect, useState } from "react";
import SplashScreen from "./SplashScreen";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  // Start true so the page is invisible before useEffect decides — prevents content flash
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const seen = sessionStorage.getItem("splash_shown");
    if (seen) setShowSplash(false); // already seen — skip splash, reveal page immediately
    // if not seen — keep showSplash true and let SplashScreen render
  }, []);

  const handleComplete = () => {
    sessionStorage.setItem("splash_shown", "1");
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleComplete} />}
      <div style={{ opacity: showSplash ? 0 : 1, transition: "opacity 0.3s ease" }}>
        {children}
      </div>
    </>
  );
}
