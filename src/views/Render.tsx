import React, { useEffect, useState } from 'react';
import { proxy, store, weather } from '@telemetryos/sdk';
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
  LocationConfig,
} from '../hooks/store';

// Mock Data for "Basic Render"
const MOCK_WEATHER = {
  current: {
    temp: 22,
    condition: 'Cloudy',
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

// Helper: Dynamic Background Colors based on condition
const getDynamicBackground = (condition: string): string => {
  const c = condition.toLowerCase();
  if (c.includes('sunny') || c.includes('clear')) return 'linear-gradient(to bottom, #4facfe 0%, #00f2fe 100%)';
  if (c.includes('cloud')) return 'linear-gradient(to bottom, #89f7fe 0%, #66a6ff 100%)';
  if (c.includes('rain')) return 'linear-gradient(to bottom, #cfd9df 0%, #e2ebf0 100%)';
  if (c.includes('snow')) return 'linear-gradient(to bottom, #e6e9f0 0%, #eef1f5 100%)';
  if (c.includes('night')) return 'linear-gradient(to bottom, #0f2027 0%, #203a43 100%)';
  return 'linear-gradient(to bottom, #30cfd0 0%, #330867 100%)'; // Default
};

// Helper: Check if URL is video
const isVideo = (url: string) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg|mov)$/i);
};

export function Render() {
  const [isUiScaleLoading, uiScale] = useUiScaleStoreState();
  useUiScaleToSetRem(uiScale);

  // Store Hooks
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
  const [weather, setWeather] = useState<any>(null);

  // Cycling Logic
  useEffect(() => {
    if (!locations || locations.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % locations.length);
    }, cycleDuration * 1000);
    return () => clearInterval(interval);
  }, [locations, cycleDuration]);

  // API Probing
  useEffect(() => {
    console.log('--- SDK PROBE ---');
    console.log('weather module:', weather);
    console.log('weather.fetch:', weather?.fetch);
    // console.log('useDeviceInfo hook result:', useDeviceInfo ? 'Function exists' : 'Undefined');
    console.log('--- END PROBE ---');
  }, []);

  // Mock Fetching Logic
  useEffect(() => {
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
    padding: '3rem',
    fontFamily: 'inherit',
  };

  const currentCondition = weather?.current?.condition || '';
  const opacityValue = (bgOpacity ?? 100) / 100;

  // Background Rendering Logic
  const renderBackground = () => {
    const commonStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1,
      opacity: opacityValue,
      transition: 'all 0.5s ease',
    };

    if (bgType === 'image' && bgUrl) {
      if (isVideo(bgUrl)) {
        return (
          <video
            src={bgUrl}
            autoPlay
            loop
            muted
            playsInline
            style={{ ...commonStyle, objectFit: 'cover' }}
          />
        );
      }
      return (
        <div
          style={{
            ...commonStyle,
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      );
    }

    if (bgType === 'solid') {
      return <div style={{ ...commonStyle, backgroundColor: bgColor }} />;
    }

    // Dynamic
    return <div style={{ ...commonStyle, background: getDynamicBackground(currentCondition) }} />;
  };

  // Temperature Conversion
  const displayTemp = (celsius: number) => {
    if (unit === 'imperial') return Math.round(celsius * 9 / 5 + 32);
    return celsius;
  };
  const unitLabel = unit === 'imperial' ? '°F' : '°C';

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: timeFormat === '12h',
    });
  };

  // Format Date (Simple implementation, can be expanded for all formats)
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {};
    if (dateFormat === 'MMM DD, YYYY') { options.month = 'short'; options.day = '2-digit'; options.year = 'numeric'; }
    else if (dateFormat === 'YYYY-MM-DD') { return date.toISOString().split('T')[0]; } // Simplified
    else return date.toLocaleDateString(); // Fallback
    return date.toLocaleDateString('en-US', options);
  };

  if (!weather) return <div>Loading Weather...</div>;

  return (
    <div className="weather-app" style={containerStyle}>
      {renderBackground()}

      {/* Header with Location and TIME */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 1rem'
      }}>
        <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{displayName}</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{formatTime(currentTime)}</div>
          <div style={{ fontSize: '1.5rem', opacity: 0.8 }}>{formatDate(currentTime)}</div>
        </div>
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
        <span>Precipitation: {weather.current.precip}%</span>
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
