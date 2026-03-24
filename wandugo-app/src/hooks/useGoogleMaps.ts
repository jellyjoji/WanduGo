"use client";

import { useEffect, useRef, useState } from "react";

let optionsSet = false;

export function useGoogleMaps(
  mapRef: React.RefObject<HTMLDivElement | null>,
  center: { lat: number; lng: number } | null,
) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapsApi, setMapsApi] = useState<typeof google.maps | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!mapRef.current || !center || initialized.current) return;
    initialized.current = true;

    import("@googlemaps/js-api-loader").then(
      ({ setOptions, importLibrary }) => {
        if (!optionsSet) {
          setOptions({
            key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
            v: "weekly",
          });
          optionsSet = true;
        }

        return importLibrary("maps").then(() =>
          importLibrary("marker").then(() => {
            const mapInstance = new google.maps.Map(mapRef.current!, {
              center,
              zoom: 13,
              disableDefaultUI: false,
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
              mapId: "wandugo_map",
              styles: [
                {
                  featureType: "poi",
                  stylers: [{ visibility: "off" }],
                },
              ],
            });
            setMap(mapInstance);
            setMapsApi(google.maps);
          }),
        );
      },
    );
  }, [mapRef, center]);

  return { map, mapsApi };
}
