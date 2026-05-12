"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function initGtag(measurementId: string) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("consent", "default", { analytics_storage: "denied" });
  window.gtag("config", measurementId, { scroll: true });
}

function handleConsentEvent(event: Event) {
  const detail = (event as CustomEvent<{ accepted: string[] }>).detail;
  if (detail?.accepted?.includes("analytics")) {
    window.gtag("consent", "update", { analytics_storage: "granted" });
  }
}

export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    const cookieYesConsent = document.cookie
      .split("; ")
      .find((row) => row.startsWith("cookieyes-consent="));
    if (cookieYesConsent?.includes("analytics:yes")) {
      window.gtag?.("consent", "update", { analytics_storage: "granted" });
    }

    document.addEventListener("cookieyes:consent", handleConsentEvent);
    return () => {
      document.removeEventListener("cookieyes:consent", handleConsentEvent);
    };
  }, []);

  if (!measurementId) return null;

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
      onLoad={() => initGtag(measurementId)}
    />
  );
}
