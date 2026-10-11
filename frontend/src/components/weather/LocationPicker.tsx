'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, Clock, AlertCircle, X, ChevronRight } from 'lucide-react';
import { fetchWeatherGeocode, type GeocodeResult } from '@/lib/api';

const RECENT_LOCATIONS_KEY = 'spotsight_weather_recent_locations';

export interface LocationPickerProps {
  selectedLocation: { name: string; latitude: number; longitude: number } | null;
  onSelectLocation: (loc: { name: string; latitude: number; longitude: number }) => void;
}

export function LocationPicker({
  selectedLocation,
  onSelectLocation,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [recentLocations, setRecentLocations] = useState<
    Array<{ name: string; latitude: number; longitude: number }>
  >([]);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent locations from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_LOCATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentLocations(parsed.slice(0, 3));
        }
      }
    } catch {
      // LocalStorage access denied or corrupt
    }
  }, []);

  const saveRecentLocation = (loc: { name: string; latitude: number; longitude: number }) => {
    try {
      const filtered = recentLocations.filter(
        (r) =>
          Math.abs(r.latitude - loc.latitude) > 0.01 ||
          Math.abs(r.longitude - loc.longitude) > 0.01
      );
      const updated = [loc, ...filtered].slice(0, 3);
      setRecentLocations(updated);
      localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const handleQueryChange = (q: string) => {
    setSearchQuery(q);
    setGeoError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (q.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      const res = await fetchWeatherGeocode(q);
      setSearchResults(res.results || []);
      setIsSearching(false);
    }, 400);
  };

  const handleSelect = (loc: { name: string; latitude: number; longitude: number }) => {
    saveRecentLocation(loc);
    onSelectLocation(loc);
    setSearchQuery('');
    setSearchResults([]);
    setIsOpen(false);
    setGeoError(null);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Location access is off. Search for your site instead.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const loc = {
          name: `Current Location (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        handleSelect(loc);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location access is off. Search for your site instead.');
        } else {
          setGeoError('Location access is off. Search for your site instead.');
        }
      },
      { timeout: 8000 }
    );
  };

  return (
    <div
      className="rounded-xl p-4 border flex flex-col gap-3 transition-all"
      style={{
        background: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-orbit-text-secondary block">
            Site location (chosen by you)
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <MapPin className="w-4 h-4 text-orbit-blue shrink-0" />
            <h3 className="text-sm font-semibold text-orbit-text">
              {selectedLocation ? selectedLocation.name : 'Choose a plant or site location'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border bg-panel-header hover:bg-panel-header/80 text-orbit-text transition-colors"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Navigation className={`w-3.5 h-3.5 text-orbit-blue ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Use my location'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border bg-orbit-blue/15 text-orbit-blue border-orbit-blue/30 hover:bg-orbit-blue/25 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isOpen ? 'Close search' : 'Search site'}</span>
          </button>
        </div>
      </div>

      {/* Geolocation Denied Notice */}
      {geoError && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Search & Recent Panel */}
      {isOpen && (
        <div className="pt-2 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="relative">
            <Search className="w-4 h-4 text-orbit-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search plant city, county, or site (e.g. Orlando, Juno Beach, Houston)..."
              className="w-full pl-9 pr-8 py-2 rounded-lg text-xs bg-panel-header border text-orbit-text placeholder:text-orbit-text-muted focus:outline-none focus:border-orbit-blue"
              style={{ borderColor: 'var(--color-border)' }}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleQueryChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-orbit-text-muted hover:text-orbit-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearching && (
            <p className="text-xs text-orbit-text-muted italic px-1">Searching locations...</p>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-orbit-text-muted block px-1">
                Matching Locations
              </span>
              <div className="rounded-lg border divide-y overflow-hidden bg-panel-header/70 divide-panel-border" style={{ borderColor: 'var(--color-border)' }}>
                {searchResults.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() =>
                      handleSelect({
                        name: `${match.name}${match.region ? `, ${match.region}` : ''} (${match.countryCode || match.country})`,
                        latitude: match.latitude,
                        longitude: match.longitude,
                      })
                    }
                    className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-orbit-blue/15 transition-colors text-orbit-text"
                  >
                    <div>
                      <span className="font-semibold">{match.name}</span>
                      <span className="text-orbit-text-secondary ml-1.5">
                        {match.region ? `${match.region}, ` : ''}{match.country}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-orbit-text-muted">
                      {match.latitude.toFixed(2)}°, {match.longitude.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Locations */}
          {recentLocations.length > 0 && searchResults.length === 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-orbit-text-muted flex items-center gap-1 px-1">
                <Clock className="w-3 h-3" />
                Recent Locations
              </span>
              <div className="flex flex-wrap gap-1.5">
                {recentLocations.map((rec) => (
                  <button
                    key={`${rec.latitude}-${rec.longitude}`}
                    type="button"
                    onClick={() => onSelectLocation(rec)}
                    className="text-xs font-mono px-2.5 py-1 rounded-md border bg-panel-header hover:bg-panel-header/80 text-orbit-text flex items-center gap-1 transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <span>{rec.name}</span>
                    <ChevronRight className="w-3 h-3 text-orbit-text-muted" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Privacy note */}
      <p className="text-[10px] text-orbit-text-muted">
        Your location is sent only to fetch the forecast.
      </p>
    </div>
  );
}
