import React, { useEffect, useState } from 'react';
import { proxy, store } from '@telemetryos/sdk';
import { useUiScaleToSetRem } from '@telemetryos/sdk/react';
import {
  useLocationsState,
  useCycleDurationState,
  useTransitionState,
  useForecastRangeState,
  useBackgroundTypeState,
  useBackgroundColorState,
  useBackgroundUrlState,
  useBackgroundOpacityState,
  useFontColorState,
  useUnitState,
  useTimeFormatState,
  useDateFormatState,
  useUiScaleStoreState,
} from '../hooks/store';

// Mock Data for "Basic Render"
const MOCK_WEATHER = {
  current: {
    temp: 22,
    condition: 'Partly Cloudy',
    icon: '⛅',
    humidity: 45,
    wind: 12,
    feelsLike: 24,
    precip: 10,
  },
  forecast: [
    { day: 'Tue', temp: 23, icon: '☀️' },
    { day: 'Wed', temp: 20, icon: '🌧️' },
    { day: 'Thu', temp: 19, icon: '☁️' },
  ]
};

export function Render() {
  const [isUiScaleLoading, uiScale] = useUiScaleStoreState();
  useUiScaleToSetRem(uiScale);

  // Store Hooks - Destructure [isLoading, value]
  const [isLocationsLoading, locations] = useLocationsState();
  const [isDurationLoading, cycleDuration] = useCycleDurationState();
  const [isTransitionLoading, transition] = useTransitionState();
  const [isRangeLoading, forecastRange] = useForecastRangeState();
  const [isBgTypeLoading, bgType] = useBackgroundTypeState();
  const [isBgColorLoading, bgColor] = useBackgroundColorState();
  const [isBgUrlLoading, bgUrl] = useBackgroundUrlState();
  const [isBgOpacityLoading, bgOpacity] = useBackgroundOpacityState();
  const [isFontColorLoading, fontColor] = useFontColorState();
  const [isUnitLoading, unit] = useUnitState();
  const [isTimeLoading, timeFormat] = useTimeFormatState();
  const [isDateLoading, dateFormat] = useDateFormatState();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [weather, setWeather] = useState<any>(null); // Replace mock with real whenever ready

  // Cycling Logic
  useEffect(() => {
    if (!locations || locations.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % locations.length);
    }, cycleDuration * 1000);
    return () => clearInterval(interval);
  }, [locations, cycleDuration]);

  // Mock Fetching Logic (placeholder for API)
  useEffect(() => {
    // Simulate fetch
    setWeather(MOCK_WEATHER);
  }, [currentIndex, locations]);

  const currentLocation = locations?.[currentIndex] || { city: 'Configure in Settings', label: '' };
  const displayName = currentLocation.label || currentLocation.city || 'No Location Set';

  // Styles
  const containerStyle: React.CSSProperties = {
    color: fontColor,
    position: 'relative',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '3rem', // Title safe zone
  };

  const bgStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
    backgroundColor: bgType === 'solid' ? bgColor : '#000', // Default or solid
    backgroundImage: bgType === 'image' && bgUrl ? `url(${bgUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: (bgOpacity || 100) / 100,
    transition: 'background 0.5s ease',
  };

  // Temperature Conversion
  const displayTemp = (celsius: number) => {
    if (unit === 'imperial') return Math.round(celsius * 9 / 5 + 32);
    return celsius;
  };
  const unitLabel = unit === 'imperial' ? '°F' : '°C';

  if (!weather) return <div>Loading Weather...</div>;

  return (
    <div className="weather-app" style={containerStyle}>
      <div className="weather-bg" style={bgStyle} />

      {/* Header */}
      <header style={{ fontSize: '3rem', fontWeight: 'bold' }}>
        {displayName}
      </header>

      {/* Current Conditions (Main) */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4rem' }}>
        <div style={{ fontSize: '12rem' }}>{weather.current.icon}</div>
        <div>
          <div style={{ fontSize: '10rem', lineHeight: 1 }}>
            {displayTemp(weather.current.temp)}{unitLabel}
          </div>
          <div style={{ fontSize: '4rem' }}>{weather.current.condition}</div>
        </div>
      </main>

      {/* Secondary Data Strip */}
      <div style={{ display: 'flex', gap: '4rem', fontSize: '2rem', marginBottom: '3rem', opacity: 0.8 }}>
        <span>Feels like: {displayTemp(weather.current.feelsLike)}°</span>
        <span>Humidity: {weather.current.humidity}%</span>
        <span>Wind: {weather.current.wind} km/h</span>
      </div>

      {/* Forecast Strip */}
      <footer style={{
        display: 'flex',
        gap: '2rem',
        borderTop: `1px solid ${fontColor}`,
        paddingTop: '2rem'
      }}>
        {weather.forecast.map((day: any, i: number) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', opacity: 0.7 }}>{day.day}</div>
            <div style={{ fontSize: '3rem' }}>{day.icon}</div>
            <div style={{ fontSize: '2rem' }}>{displayTemp(day.temp)}°</div>
          </div>
        ))}
      </footer>
    </div>
  );
}
