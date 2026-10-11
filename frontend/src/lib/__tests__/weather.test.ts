import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getWeatherCodeLabel,
  formatTemp,
  formatPrecip,
  formatWind,
} from '../../components/weather/WeatherOverview';
import {
  fetchWeatherGeocode,
  fetchWeatherForecast,
  fetchPlantImpacts,
} from '../api';

describe('Weather Dashboard & Plant Impacts Tests', () => {
  test('unit conversions convert temperature, precipitation, and wind accurately', () => {
    // Temperature: Celsius & Fahrenheit
    assert.equal(formatTemp(0, 'C'), '0°C');
    assert.equal(formatTemp(0, 'F'), '32°F');
    assert.equal(formatTemp(25, 'C'), '25°C');
    assert.equal(formatTemp(25, 'F'), '77°F');
    assert.equal(formatTemp(100, 'F'), '212°F');
    assert.equal(formatTemp(-10, 'F'), '14°F');

    // Precipitation: mm & inches
    assert.equal(formatPrecip(0, 'mm'), '0.0 mm');
    assert.equal(formatPrecip(25.4, 'in'), '1.00 in');
    assert.equal(formatPrecip(12.7, 'in'), '0.50 in');
    assert.equal(formatPrecip(7.6, 'mm'), '7.6 mm');

    // Wind: m/s & mph
    assert.equal(formatWind(0, 'ms'), '0.0 m/s');
    assert.equal(formatWind(10, 'mph'), '22 mph');
    assert.equal(formatWind(12, 'ms'), '12.0 m/s');
    assert.equal(formatWind(25, 'mph'), '56 mph');
  });

  test('weather-code text mapping covers all official WMO weather codes', () => {
    const knownCodes = [
      0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75,
      77, 80, 81, 82, 85, 86, 95, 96, 99,
    ];

    for (const code of knownCodes) {
      const label = getWeatherCodeLabel(code);
      assert.ok(label && label.length > 0, `Missing label for code ${code}`);
      assert.notEqual(
        label,
        'Variable conditions',
        `Known code ${code} should not return default 'Variable conditions'`
      );
    }

    // Specific key codes
    assert.equal(getWeatherCodeLabel(0), 'Clear sky');
    assert.equal(getWeatherCodeLabel(65), 'Heavy rain');
    assert.equal(getWeatherCodeLabel(75), 'Heavy snow fall');
    assert.equal(getWeatherCodeLabel(95), 'Thunderstorm');
    assert.equal(getWeatherCodeLabel(96), 'Thunderstorm with slight hail');
    assert.equal(getWeatherCodeLabel(99), 'Thunderstorm with heavy hail');

    // Fallback on unknown code
    assert.equal(getWeatherCodeLabel(999), 'Variable conditions');
  });

  test('fetchWeatherGeocode handles short queries without network requests', async () => {
    const res = await fetchWeatherGeocode('a');
    assert.equal(res.source, 'api');
    assert.deepEqual(res.results, []);
  });

  test('fetch helpers return friendly offline results without throwing when backend is down', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Connection refused (mock server down)');
    };

    try {
      const geoRes = await fetchWeatherGeocode('Orlando');
      assert.equal(geoRes.source, 'offline');
      assert.deepEqual(geoRes.results, []);

      const forecastRes = await fetchWeatherForecast(28.5, -81.3);
      assert.equal(forecastRes.source, 'offline');
      assert.equal(forecastRes.data, null);

      const impactRes = await fetchPlantImpacts(28.5, -81.3, 'mix');
      assert.equal(impactRes.source, 'offline');
      assert.equal(impactRes.data, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
