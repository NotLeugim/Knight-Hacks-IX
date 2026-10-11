'use client';

import React, { useState, useEffect } from 'react';
import { CloudSun, AlertTriangle, RefreshCw } from 'lucide-react';
import { LocationPicker } from '@/components/weather/LocationPicker';
import { WeatherOverview } from '@/components/weather/WeatherOverview';
import { WeatherChart } from '@/components/weather/WeatherChart';
import { PlantImpactSection } from '@/components/weather/PlantImpactSection';
import { fetchWeatherForecast } from '@/lib/api';
import type { WeatherForecastResponse, WeatherUnits } from '@/lib/weatherTypes';

const SAVED_LOCATION_KEY = 'spotsight_weather_saved_location';
const SAVED_UNITS_KEY = 'spotsight_weather_saved_units';

// Default default location: Orlando, FL (Knight Hacks host location)
const DEFAULT_INITIAL_LOCATION = {
  name: 'Orlando, Florida (US)',
  latitude: 28.5383,
  longitude: -81.3792,
};

export default function WeatherPage() {
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  const [units, setUnits] = useState<WeatherUnits>({
    temp: 'F',
    precip: 'in',
    wind: 'mph',
  });

  const [forecastData, setForecastData] = useState<WeatherForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(-1); // -1 = 48-hour overview

  // Load saved location & units on mount
  useEffect(() => {
    try {
      const storedLoc = localStorage.getItem(SAVED_LOCATION_KEY);
      if (storedLoc) {
        setSelectedLocation(JSON.parse(storedLoc));
      } else {
        setSelectedLocation(DEFAULT_INITIAL_LOCATION);
      }

      const storedUnits = localStorage.getItem(SAVED_UNITS_KEY);
      if (storedUnits) {
        setUnits(JSON.parse(storedUnits));
      }
    } catch {
      setSelectedLocation(DEFAULT_INITIAL_LOCATION);
    }
  }, []);

  // Fetch forecast whenever location changes
  useEffect(() => {
    if (!selectedLocation) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchWeatherForecast(
      selectedLocation.latitude,
      selectedLocation.longitude,
      selectedLocation.name
    )
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setForecastData(res.data);
          setError(null);
        } else {
          setForecastData(null);
          setError('Weather is unavailable right now.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[WeatherPage] Fetch failed:', err);
        setForecastData(null);
        setError('Weather is unavailable right now.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedLocation]);

  const handleSelectLocation = (loc: { name: string; latitude: number; longitude: number }) => {
    setSelectedLocation(loc);
    setSelectedDayIndex(-1);
    try {
      localStorage.setItem(SAVED_LOCATION_KEY, JSON.stringify(loc));
    } catch {
      // Ignore storage errors
    }
  };

  const handleToggleUnits = () => {
    const nextUnits: WeatherUnits =
      units.temp === 'F'
        ? { temp: 'C', precip: 'mm', wind: 'ms' }
        : { temp: 'F', precip: 'in', wind: 'mph' };
    setUnits(nextUnits);
    try {
      localStorage.setItem(SAVED_UNITS_KEY, JSON.stringify(nextUnits));
    } catch {
      // Ignore storage errors
    }
  };

  const handleRefresh = () => {
    if (!selectedLocation) return;
    setLoading(true);
    fetchWeatherForecast(
      selectedLocation.latitude,
      selectedLocation.longitude,
      selectedLocation.name
    )
      .then((res) => {
        if (res.data) {
          setForecastData(res.data);
          setError(null);
        } else {
          setError('Weather is unavailable right now.');
        }
      })
      .catch(() => {
        setError('Weather is unavailable right now.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="h-full overflow-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner / Location Picker */}
      <LocationPicker
        selectedLocation={selectedLocation}
        onSelectLocation={handleSelectLocation}
      />

      {/* Loading indicator */}
      {loading && !forecastData && (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-orbit-text-muted animate-pulse">
          <CloudSun className="w-8 h-8 text-orbit-blue animate-bounce" />
          <p className="text-xs">Fetching high-resolution atmospheric forecast & alerts...</p>
        </div>
      )}

      {/* Offline / Service Error Banner */}
      {error && !loading && (
        <div
          className="p-6 rounded-xl border flex flex-col items-center justify-center gap-3 text-center"
          style={{
            background: 'var(--color-bg-card)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-orbit-text">
              Weather is unavailable right now.
            </h4>
            <p className="text-xs text-orbit-text-secondary max-w-md">
              Unable to reach external weather services or the backend is offline. Please check your connection or try again shortly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border bg-panel-header hover:bg-panel-header/80 text-orbit-text transition-colors"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Forecast</span>
          </button>
        </div>
      )}

      {/* Forecast & Operations Overview */}
      {forecastData && (
        <>
          <WeatherOverview
            forecast={forecastData}
            units={units}
            onToggleUnits={handleToggleUnits}
            selectedDayIndex={selectedDayIndex}
            onSelectDay={setSelectedDayIndex}
          />

          <WeatherChart
            hourly={forecastData.hourly}
            daily={forecastData.daily}
            units={units}
            selectedDayIndex={selectedDayIndex}
          />

          {selectedLocation && (
            <PlantImpactSection
              latitude={selectedLocation.latitude}
              longitude={selectedLocation.longitude}
              locationName={selectedLocation.name}
              hasOfficialAlerts={forecastData.alerts && forecastData.alerts.length > 0}
            />
          )}
        </>
      )}
    </div>
  );
}
