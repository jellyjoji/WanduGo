export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  const { setOptions, importLibrary } = await import(
    "@googlemaps/js-api-loader"
  );
  setOptions({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    v: "weekly",
  });
  await importLibrary("geocoding");

  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        resolve(results[0].formatted_address);
      } else {
        resolve(null);
      }
    });
  });
}
