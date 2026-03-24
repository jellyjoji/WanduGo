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
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(5);

  const fetchLocation = useCallback(() => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        // Default to Toronto as fallback
        setLat(43.6532);
        setLng(-79.3832);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
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
