"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

interface LocationState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
  radius: number; // km
  setRadius: (r: number) => void;
  refresh: () => void;
}

const LocationContext = createContext<LocationState>({
  lat: null,
  lng: null,
  loading: true,
  error: null,
  radius: 5,
  setRadius: () => {},
  refresh: () => {},
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  // Start with SSR-safe defaults (avoids hydration mismatch)
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(50);

  const fetchLocation = useCallback(() => {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        setLat(newLat);
        setLng(newLng);
        setLoading(false);
        localStorage.setItem("loc_lat", String(newLat));
        localStorage.setItem("loc_lng", String(newLng));
      },
      (err) => {
        setError(err.message);
        // Use Toronto as fallback — setLat(prev) keeps any already-set cached value
        setLat((prev) => prev ?? 43.6532);
        setLng((prev) => prev ?? -79.3832);
        setLoading(false);
      },
      // Lower accuracy = much faster (1–2s vs 5–10s)
      { enableHighAccuracy: false, timeout: 5000 },
    );
  }, []);

  useEffect(() => {
    // Read cached coords instantly — no spinner on revisit
    const cachedLat = parseFloat(localStorage.getItem("loc_lat") || "");
    const cachedLng = parseFloat(localStorage.getItem("loc_lng") || "");
    if (!isNaN(cachedLat) && !isNaN(cachedLng)) {
      setLat(cachedLat);
      setLng(cachedLng);
      setLoading(false); // Show feed immediately
    }
    // Refresh GPS in background (updates quietly without spinner)
    fetchLocation();
  }, [fetchLocation]);

  return (
    <LocationContext.Provider
      value={{
        lat,
        lng,
        loading,
        error,
        radius,
        setRadius,
        refresh: fetchLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
