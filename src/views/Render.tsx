import React, { useEffect, useState } from 'react';
import { proxy, store, weather } from '@telemetryos/sdk';
import { useUiScaleToSetRem, useUiAspectRatio } from '@telemetryos/sdk/react';
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
import './Render.css';

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

// Helper: Get Icon from condition text
const getIcon = (condition: string): string => {
  if (!condition) return '❓';
  const c = condition.toLowerCase();
  if (c.includes('storm') || c.includes('thunder')) return '⛈️';
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️';
  if (c.includes('snow') || c.includes('flurry')) return '❄️';
  if (c.includes('fog') || c.includes('mist')) return '🌫️';
  if (c.includes('cloud') || c.includes('overcast')) return '☁️';
  if (c.includes('partly')) return '⛅';
  if (c.includes('clear') || c.includes('sun')) return '☀️';
  return '🌡️';
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

  // State for real weather data
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitLabel = unit === 'imperial' ? '°F' : '°C';

  // Helper: Fetch Weather
  const fetchWeather = async (loc: LocationConfig) => {
    setLoading(true);
    setError(null);
    try {
      const units = unit === 'imperial' ? 'imperial' : 'metric';
      let params: any = { units };

      if (loc.type === 'manual' && loc.city) {
        params.city = loc.city;
      }
      // If auto, we send no location params, expecting SDK to use device location

      // Fetch Current Conditions
      const current = await weather().getConditions(params);
      console.log('API Response for', params, ':', current.CityEnglish, current);

      // Fetch Forecast (Hourly for 24h, Daily for others)
      let forecast = [];
      if (forecastRange === '24h') {
        const hourly = await weather().getHourlyForecast({ ...params, hours: 24 });
        forecast = hourly.slice(0, 24).map((f: any) => ({
          day: new Date(f.Timestamp * 1000).toLocaleTimeString([], { hour: 'numeric' }),
          temp: f.Temp,
          icon: f.Label,
        }));
      } else {
        const days = forecastRange === '7d' ? 7 : 3;
        const daily = await weather().getDailyForecast({ ...params, days });
        forecast = daily.slice(0, days).map((f: any) => ({
          day: new Date(f.Timestamp * 1000).toLocaleDateString([], { weekday: 'short' }),
          temp: f.MaxTemp,
          icon: f.Label,
        }));
      }

      setWeatherData({
        current: {
          temp: current.Temp,
          condition: current.WeatherText,
          icon: getIcon(current.WeatherText),
          humidity: current.RelativeHumidity,
          wind: current.WindSpeed,
          windDir: current.WindDirectionEnglish || '', // Keeping API units
          feelsLike: current.Temp, // Using Temp as fallback
          precip: current.Precip,
          timezone: current.Timezone,
          city: current.CityLocalized || current.CityEnglish,
        },
        forecast: forecast.map((f: any) => ({
          ...f,
          icon: getIcon(f.icon)
        }))
      });
    } catch (err) {
      console.error('Weather Fetch Error:', err);
      setError('Unable to load weather data');
    } finally {
      setLoading(false);
    }
  };

  // Cycling Logic
  useEffect(() => {
    if (!locations || locations.length === 0) return;

    // Cycle index
    const interval = setInterval(() => {
      if (transition === 'none') {
        setCurrentIndex((prev) => (prev + 1) % locations.length);
      }
    }, cycleDuration * 1000);

    return () => clearInterval(interval);
  }, [locations, cycleDuration, transition]);

  // Transition Logic
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!locations || locations.length <= 1) return;
    // Cycle index
    const interval = setInterval(() => {
      if (transition === 'none') {
        setCurrentIndex((prev) => (prev + 1) % locations.length);
      } else {
        setVisible(false);
        setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % locations.length);
          setVisible(true);
        }, 500);
      }
    }, cycleDuration * 1000);
    return () => clearInterval(interval);
  }, [locations, cycleDuration, transition]);

  const getTransitionStyle = (): React.CSSProperties => {
    if (transition === 'none') return {};
    const base: React.CSSProperties = {
      transition: 'all 0.5s ease-in-out',
      opacity: visible ? 1 : 0,
    };
    if (transition === 'slide') {
      return { ...base, transform: visible ? 'translateX(0)' : 'translateX(-20px)' };
    }
    return base; // fade
  };

  // Initial Fetch effect
  useEffect(() => {
    if (!locations || locations.length === 0) return;
    const loc = locations[currentIndex] || locations[0];
    if (loc) {
      fetchWeather(loc);
    }
  }, [currentIndex, locations, forecastRange, unit]);


  const currentLocation = locations?.[currentIndex] || { city: 'Configure in Settings', label: '' };
  const displayName = currentLocation.label || currentLocation.city || (currentLocation.type === 'auto' ? 'Current Location' : 'No Location Set');

  const aspectRatio = useUiAspectRatio();
  const isLandscapeRibbon = aspectRatio > 2.5;
  const isExtremeRibbon = aspectRatio > 3.5;

  const containerStyle: React.CSSProperties = {
    color: fontColor,
    position: 'relative',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: isLandscapeRibbon ? 'row' : 'column',
    justifyContent: isLandscapeRibbon ? 'space-between' : 'space-between',
    alignItems: isLandscapeRibbon ? 'center' : 'stretch',
    padding: isLandscapeRibbon ? '1rem 3rem' : '3rem',
    fontFamily: 'inherit',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: isLandscapeRibbon ? 'flex-start' : 'space-between',
    alignItems: 'center',
    padding: '0 1rem',
    flex: isLandscapeRibbon ? 1 : undefined,
    flexDirection: isLandscapeRibbon ? 'column' : 'row',
  };

  const currentCondition = weatherData?.current?.condition || '';
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
            autoPlay loop muted playsInline
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

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  // Format Time (Timezone aware)
  const formatTime = (date: Date) => {
    const timeZone = weatherData?.current?.timezone;
    try {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: timeFormat === '12h',
        timeZone: timeZone || undefined,
      });
    } catch (e) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: timeFormat === '12h',
      });
    }
  };

  // Format Date (Timezone aware)
  const formatDate = (date: Date) => {
    const timeZone = weatherData?.current?.timezone;
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timeZone || undefined
    };

    if (dateFormat === 'MMM DD, YYYY') { options.month = 'short'; options.day = '2-digit'; options.year = 'numeric'; }
    else if (dateFormat === 'YYYY-MM-DD') {
      return date.toLocaleDateString('en-CA', { ...options, year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    else return date.toLocaleDateString('en-US', options);

    return date.toLocaleDateString('en-US', options);
  };

  if (loading && !weatherData) return <div style={{ ...containerStyle, justifyContent: 'center', alignItems: 'center', fontSize: '3rem' }}>Loading Weather...</div>;
  if (error) return <div style={{ ...containerStyle, justifyContent: 'center', alignItems: 'center', fontSize: '3rem' }}>{error}</div>;
  if (!weatherData) return <div style={{ ...containerStyle, justifyContent: 'center', alignItems: 'center', fontSize: '3rem' }}>Configure Locations in Settings</div>;

  return (
    <div className="weather-app" style={containerStyle}>
      {renderBackground()}

      {/* Content Wrapper for Transitions */}
      <div style={{
        display: 'flex',
        flex: 1,
        flexDirection: isLandscapeRibbon ? 'row' : 'column',
        width: '100%',
        justifyContent: 'space-between',
        ...getTransitionStyle()
      }}>

        {isExtremeRibbon ? (
          // EXTREME RIBBON LAYOUT (> 3.5)
          <>
            {/* anchored headers */}
            <div style={{ position: 'absolute', top: '1rem', left: '2rem', fontSize: '2.5rem', fontWeight: 'bold', zIndex: 10 }}>
              {weatherData.current.city || displayName}
            </div>
            <div style={{ position: 'absolute', top: '1rem', right: '2rem', textAlign: 'right', zIndex: 10 }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', lineHeight: 1 }}>{formatTime(currentTime)}</div>
              <div style={{ fontSize: '1.5rem', opacity: 0.8 }}>{formatDate(currentTime)}</div>
            </div>

            {/* Main Content Area - Horizontal Centered */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 4rem',
              width: '100%',
              marginTop: '2rem' /* clear headers */
            }}>

              {/* Current Weather - Horizontal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                <div className="weather-icon-3d" style={{ fontSize: '9rem' }}>{weatherData.current.icon}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '8rem', fontWeight: 'bold', lineHeight: 0.9 }}>
                    {Math.round(weatherData.current.temp)}{unitLabel}
                  </div>
                  <div style={{ fontSize: '2.5rem', marginTop: '0.5rem', fontWeight: '500' }}>
                    {weatherData.current.condition}
                  </div>
                </div>
                {/* Metrics integrated nicely */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '1.6rem', opacity: 0.8, marginLeft: '3rem', justifyContent: 'center' }}>
                  <span>🌡️ {Math.round(weatherData.current.feelsLike)}°</span>
                  <span>💧 {weatherData.current.humidity}%</span>
                  <span>💨 {Math.round(weatherData.current.wind)}</span>
                </div>
              </div>

              {/* Forecast - Compact Horizontal on Right */}
              {forecastRange !== 'none' && (
                <div style={{ display: 'flex', gap: '2rem' }}>
                  {weatherData.forecast.slice(0, 5).map((day: any, i: number) => (
                    <div key={i} className="weather-forecast-item" style={{ minWidth: '70px' }}>
                      <div className="weather-forecast-day">{day.day}</div>
                      <div className="weather-forecast-icon weather-icon-3d">{day.icon}</div>
                      <div className="weather-forecast-temp">{Math.round(day.temp)}°</div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </>
        ) : isLandscapeRibbon ? (
          // RIBBON LAYOUT (Split Left/Right)
          <>
            {/* Left Panel: Context (City, Time, Date) */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingLeft: '3rem',
              alignItems: 'flex-start',
              textAlign: 'left',
              opacity: 0.9
            }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem', lineHeight: 1.1 }}>
                {weatherData.current.city || displayName}
              </div>
              <div style={{ fontSize: '5.5rem', fontWeight: 'bold', lineHeight: 1 }}>
                {formatTime(currentTime)}
              </div>
              <div style={{ fontSize: '2rem', opacity: 0.8, marginTop: '0.5rem' }}>
                {formatDate(currentTime)}
              </div>
            </div>

            {/* Right Panel: Weather Data & Forecast */}
            <div style={{
              flex: 1.8,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingRight: '3rem',
              alignItems: 'center'
            }}>
              {/* Current Weather - HERO */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4rem', marginBottom: '1rem' }}>
                <div className="weather-icon-3d" style={{ fontSize: '10rem' }}>{weatherData.current.icon}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '9rem', fontWeight: 'bold', lineHeight: 0.9 }}>
                    {Math.round(weatherData.current.temp)}{unitLabel}
                  </div>
                  <div style={{ fontSize: '3rem', marginTop: '0.5rem', fontWeight: '500' }}>
                    {weatherData.current.condition}
                  </div>
                </div>
              </div>

              {/* Secondary Metrics (Horizontal) - Condensed */}
              <div style={{ display: 'flex', gap: '3rem', fontSize: '2rem', opacity: 0.8, marginBottom: '1rem' }}>
                <span>🌡️ {Math.round(weatherData.current.feelsLike)}°</span>
                <span>💧 {weatherData.current.humidity}%</span>
                <span>💨 {Math.round(weatherData.current.wind)}</span>
              </div>

              {/* Forecast Strip (Horizontal) */}
              {forecastRange !== 'none' && (
                <div style={{
                  display: 'flex',
                  gap: '2rem',
                  width: '100%',
                  justifyContent: 'center',
                  borderTop: `1px solid ${fontColor}`,
                  paddingTop: '0.8rem',
                  opacity: 0.9
                }}>
                  {weatherData.forecast.slice(0, 5).map((day: any, i: number) => (
                    <div key={i} className="weather-forecast-item" style={{ minWidth: '70px' }}>
                      <div className="weather-forecast-day">{day.day}</div>
                      <div className="weather-forecast-icon weather-icon-3d">{day.icon}</div>
                      <div className="weather-forecast-temp">{Math.round(day.temp)}°</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          // STANDARD LAYOUT (Original)
          <>
            {/* Header with Location and TIME */}
            <header style={headerStyle}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{weatherData.current.city || displayName}</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{formatTime(currentTime)}</div>
                <div style={{ fontSize: '1.5rem', opacity: 0.8 }}>{formatDate(currentTime)}</div>
              </div>
            </header>

            {/* Current Conditions (Main) */}
            <main style={{
              flex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4rem'
            }}>
              <div className="weather-icon-3d" style={{ fontSize: '12rem' }}>{weatherData.current.icon}</div>
              <div>
                <div style={{ fontSize: '10rem', lineHeight: 1 }}>
                  {Math.round(weatherData.current.temp)}{unitLabel}
                </div>
                <div style={{ fontSize: '4rem' }}>{weatherData.current.condition}</div>
              </div>
            </main>

            {/* Secondary Data Strip */}
            <div style={{
              display: 'flex',
              gap: '4rem',
              fontSize: '2rem',
              marginBottom: '3rem',
              opacity: 0.8,
              justifyContent: 'center'
            }}>
              <span>🌡️ {Math.round(weatherData.current.feelsLike)}°</span>
              <span>💧 {weatherData.current.humidity}%</span>
              <span>💨 {Math.round(weatherData.current.wind)} {unit === 'imperial' ? 'mph' : 'km/h'} {weatherData.current.windDir}</span>
              <span>🌧️ {weatherData.current.precip}%</span>
            </div>

            {/* Forecast Strip */}
            {forecastRange !== 'none' && (
              <footer style={{
                display: 'flex',
                gap: '2rem',
                borderTop: `1px solid ${fontColor}`,
                paddingTop: '2rem',
                overflow: 'hidden'
              }}>
                {weatherData.forecast.map((day: any, i: number) => (
                  <div key={i} className="weather-forecast-item" style={{ flex: 1 }}>
                    <div className="weather-forecast-day">{day.day}</div>
                    <div className="weather-forecast-icon weather-icon-3d">{day.icon}</div>
                    <div className="weather-forecast-temp">{Math.round(day.temp)}°</div>
                  </div>
                ))}
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
}
