import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// Islamabad: used only when the device location is unavailable
export const DEFAULT_LOCATION = { lat: 33.6844, lng: 73.0479 };

const TIMEOUT_MS = 10000;

// Resolves { lat, lng } or rejects with an Error that has a user-safe message.
export async function getPosition() {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await Geolocation.requestPermissions();
      if (perm.location === 'denied') throw new Error('Location permission denied.');
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: TIMEOUT_MS });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (err) {
      throw new Error(err?.message || 'Could not get your location.');
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Location is not supported on this device.');
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.code === 1 ? 'Location permission denied.' : 'Could not get your location.')),
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: 60000 }
    );
  });
}

export const mapsDirectionsUrl = (org) => {
  const [lng, lat] = org?.location?.coordinates || [];
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
};

export const formatDistance = (km) => {
  if (typeof km !== 'number' || Number.isNaN(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
};
