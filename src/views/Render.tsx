import React, { useEffect, useState, useRef } from 'react';
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

const getDynamicBackground = (condition: string): string => {
  const c = condition.toLowerCase();
  if (c.includes('sunny') || c.includes('clear')) return 'linear-gradient(to bottom, #4facfe 0%, #00f2fe 100%)';
  if (c.includes('cloud')) return 'linear-gradient(to bottom, #89f7fe 0%, #66a6ff 100%)';
  if (c.includes('rain')) return 'linear-gradient(to bottom, #cfd9df 0%, #e2ebf0 100%)';
  if (c.includes('snow')) return 'linear-gradient(to bottom, #e6e9f0 0%, #eef1f5 100%)';
  if (c.includes('night')) return 'linear-gradient(to bottom, #0f2027 0%, #203a43 100%)';
  return 'linear-gradient(to bottom, #30cfd0 0%, #330867 100%)'; // Default
};

const isVideo = (url: string) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg|mov)$/i);
};

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
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  const unitLabel = unit === 'imperial' ? '°F' : '°C';
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getWeatherData = async (loc: LocationConfig) => {
    try {
      const units = unit === 'imperial' ? 'imperial' : 'metric';
      let params: any = { units };

      if (loc.type === 'manual' && loc.city) {
        params.city = loc.city;
      }

      const current = await weather().getConditions(params);
      console.log('Fetching for index:', loc.city, current.CityEnglish);

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

      return {
        current: {
          temp: current.Temp,
          condition: current.WeatherText,
          icon: getIcon(current.WeatherText),
          humidity: current.RelativeHumidity,
          wind: current.WindSpeed,
          windDir: current.WindDirectionEnglish || '',
          feelsLike: current.Temp,
          precip: current.Precip,
          timezone: current.Timezone,
          city: current.CityLocalized || current.CityEnglish,
        },
        forecast: forecast.map((f: any) => ({
          ...f,
          icon: getIcon(f.icon)
        }))
      };
    } catch (err) {
      console.error('Weather Fetch Error:', err);
      // Return null to signal error but don't crash
      return null;
    }
  };

  // The Main Loop using Pre-Fetch Pattern
  useEffect(() => {
    if (!locations || locations.length === 0) return;

    const cycle = async () => {
      const nextIndex = (currentIndex + 1) % locations.length;

      if (transition !== 'instant') {
        // 1. Start Fade Out
        setVisible(false);
      }

      // 2. Fetch Data for NEXT index
      // We wait for at least 500ms (animation time) AND the data fetch
      const [newData] = await Promise.all([
        getWeatherData(locations[nextIndex]),
        transition !== 'instant' ? new Promise(resolve => setTimeout(resolve, 500)) : Promise.resolve()
      ]);

      if (newData) {
        // 3. Update EVERYTHING at once (Index + Data)
        // This effectively "cuts" to the new scene
        setWeatherData(newData);
        setCurrentIndex(nextIndex);
        setError(null);
      } else {
        setError('Failed to load next location');
      }

      // 4. Start Fade In
      if (transition !== 'instant') {
        setVisible(true);
      }
    };

    timerRef.current = setTimeout(cycle, cycleDuration * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, locations, cycleDuration, transition, unit, forecastRange]); // Dependency on currentIndex drives the loop loop

  // React to Config Changes (Unit, Range) - Immediate Update
  useEffect(() => {
    if (!weatherData || !locations || locations.length === 0) return;

    const refreshCurrent = async () => {
      // Don't set global loading true here to avoid full screen flicker, 
      // but we could if we wanted to show it's updating. 
      // Let's just update quietly or use a small indicator if needed.
      // User complaint was "not reflecting", so we must update data.
      const loc = locations[currentIndex];
      if (loc) {
        setLoading(true);
        const newData = await getWeatherData(loc);
        if (newData) {
          setWeatherData(newData);
        }
        setLoading(false);
      }
    };

    refreshCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, forecastRange]); // Only run when these meaningful configs change, NOT on currentIndex change (handled by loop)

  // Initial Load & Manual Setting Changes (Immediate Fetch)
  useEffect(() => {
    if (!locations || locations.length === 0) return;

    if (!weatherData) {
      setLoading(true);
      getWeatherData(locations[0]).then(data => {
        if (data) {
          setWeatherData(data);
          setCurrentIndex(0);
        } else setError('Could not load initial data');
        setLoading(false);
      });
    }
  }, [locations]);


  // Styles (Derived)
  const currentLocation = locations?.[currentIndex] || { city: 'Configure in Settings', label: '' };
  // Now we use the INDEX strictly for the config (label/manual city).
  // The WEATHER DATA is guaranteed to match this index because of the pre-fetch logic.
  const displayName = currentLocation.label || weatherData?.current?.city || (currentLocation.type === 'auto' ? 'Current Location' : 'No Location Set');

  const aspectRatio = useUiAspectRatio();
  const isLandscapeRibbon = aspectRatio > 2.5;
  const isExtremeRibbon = aspectRatio > 3.5;
  const isVerticalStrip = aspectRatio < 0.6;

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

  const getTransitionStyle = (): React.CSSProperties => {
    if (transition === 'instant') return {};
    const base: React.CSSProperties = {
      transition: 'all 0.5s ease-in-out',
      opacity: visible ? 1 : 0,
    };
    if (transition === 'slide') {
      return { ...base, transform: visible ? 'translateX(0)' : 'translateX(-100px)' };
    }
    return base;
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
      transition: transition === 'instant' ? 'none' : 'all 0.5s ease',
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

        {isVerticalStrip ? (
          // VERTICAL STRIP LAYOUT (< 0.6)
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '2rem 1rem', textAlign: 'center' }}>

            {/* 1. Header (Stacked) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', lineHeight: 1.1 }}>
                {currentLocation.label || weatherData.current.city || displayName}
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{formatTime(currentTime)}</div>
              <div style={{ fontSize: '1.5rem', opacity: 0.8 }}>{formatDate(currentTime)}</div>
            </div>

            {/* 2. Hero (Stacked) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
              <div className="weather-icon-3d" style={{ fontSize: '9rem', marginBottom: '1rem' }}>{weatherData.current.icon}</div>
              <div style={{ fontSize: '7rem', fontWeight: 'bold', lineHeight: 0.9 }}>
                {Math.round(weatherData.current.temp)}{unitLabel}
              </div>
              <div style={{ fontSize: '2rem', marginTop: '0.5rem', fontWeight: '500' }}>{weatherData.current.condition}</div>
            </div>

            {/* 3. Secondary Details (Option B: Vertical Stack) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '1.6rem', opacity: 0.8, marginBottom: '2rem', width: '100%', alignItems: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
                <span>🌡️ {Math.round(weatherData.current.feelsLike)}°</span>
                <span>💧 {weatherData.current.humidity}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
                <span>💨 {Math.round(weatherData.current.wind)}</span>
                <span>🌧️ {weatherData.current.precip}%</span>
              </div>
            </div>

            {/* 4. Forecast (Vertical List) */}
            {forecastRange !== 'none' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                width: '100%',
                borderTop: `1px solid ${fontColor}`,
                paddingTop: '1.5rem'
              }}>
                {weatherData.forecast.slice(0, 5).map((day: any, i: number) => (
                  <div key={i} className="weather-forecast-item" style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    fontSize: '1.8rem',
                    gap: '1rem' // Added explicit gap
                  }}>
                    <div className="weather-forecast-day" style={{ width: '30%', textAlign: 'left' }}>{day.day}</div>
                    <div className="weather-forecast-icon weather-icon-3d" style={{ width: '30%', textAlign: 'center', fontSize: '2.5rem' }}>{day.icon}</div>
                    <div className="weather-forecast-temp" style={{ width: '30%', textAlign: 'right' }}>{Math.round(day.temp)}°</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : isExtremeRibbon ? (
          // EXTREME RIBBON LAYOUT (> 3.5)
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 3rem' }}>

            {/* LEFT: City, Icon, Temp, Condition */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem', lineHeight: 1.1 }}>
                {currentLocation.label || weatherData.current.city || displayName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div className="weather-icon-3d" style={{ fontSize: '7rem' }}>{weatherData.current.icon}</div>
                <div style={{ fontSize: '7rem', fontWeight: 'bold', lineHeight: 1 }}>
                  {Math.round(weatherData.current.temp)}{unitLabel}
                </div>
              </div>
              <div style={{ fontSize: '2.5rem', marginTop: '0.5rem', fontWeight: '500' }}>{weatherData.current.condition}</div>
            </div>

            {/* CENTER: Forecast & Secondary Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '0 4rem' }}>
              {/* Forecast */}
              {forecastRange !== 'none' && (
                <div style={{ display: 'flex', gap: '3rem', marginBottom: '1.5rem', width: '100%', justifyContent: 'center' }}>
                  {weatherData.forecast.map((day: any, i: number) => (
                    <div key={i} className="weather-forecast-item" style={{ minWidth: '70px' }}>
                      <div className="weather-forecast-day">{day.day}</div>
                      <div className="weather-forecast-icon weather-icon-3d">{day.icon}</div>
                      <div className="weather-forecast-temp">{Math.round(day.temp)}°</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Secondary Stats (Moved Below Forecast) */}
              <div style={{ display: 'flex', gap: '3rem', fontSize: '1.8rem', opacity: 0.8 }}>
                <span>🌡️ {Math.round(weatherData.current.feelsLike)}°</span>
                <span>💧 {weatherData.current.humidity}%</span>
                <span>💨 {Math.round(weatherData.current.wind)}</span>
              </div>
            </div>

            {/* RIGHT: Time & Date */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
              <div style={{ fontSize: '6rem', fontWeight: 'bold', lineHeight: 1 }}>{formatTime(currentTime)}</div>
              <div style={{ fontSize: '2.5rem', opacity: 0.8, marginTop: '0.5rem' }}>{formatDate(currentTime)}</div>
            </div>

          </div>
        ) : isLandscapeRibbon ? (
          // RIBBON LAYOUT (Split Left/Right)
          <>
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
                {currentLocation.label || weatherData.current.city || displayName}
              </div>
              <div style={{ fontSize: '5.5rem', fontWeight: 'bold', lineHeight: 1 }}>
                {formatTime(currentTime)}
              </div>
              <div style={{ fontSize: '2rem', opacity: 0.8, marginTop: '0.5rem' }}>
                {formatDate(currentTime)}
              </div>
            </div>

            <div style={{
              flex: 1.8,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingRight: '3rem',
              alignItems: 'center'
            }}>
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

              <div style={{ display: 'flex', gap: '3rem', fontSize: '2rem', opacity: 0.8, marginBottom: '1rem' }}>
                <span>🌡️ {Math.round(weatherData.current.feelsLike)}°</span>
                <span>💧 {weatherData.current.humidity}%</span>
                <span>💨 {Math.round(weatherData.current.wind)}</span>
              </div>

              {/* FORECAST: REMOVED SLICE LIMIT */}
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
                  {weatherData.forecast.map((day: any, i: number) => (
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
          // STANDARD LAYOUT (Original) - Scaled 1.1x
          <>
            <header style={headerStyle}>
              <div style={{ fontSize: '3.3rem', fontWeight: 'bold' }}>{currentLocation.label || weatherData.current.city || displayName}</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '3.3rem', fontWeight: 'bold' }}>{formatTime(currentTime)}</div>
                <div style={{ fontSize: '1.65rem', opacity: 0.8 }}>{formatDate(currentTime)}</div>
              </div>
            </header>

            <main style={{
              flex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4.4rem'
            }}>
              <div className="weather-icon-3d" style={{ fontSize: '13.2rem' }}>{weatherData.current.icon}</div>
              <div>
                <div style={{ fontSize: '11rem', lineHeight: 1 }}>
                  {Math.round(weatherData.current.temp)}{unitLabel}
                </div>
                <div style={{ fontSize: '4.4rem' }}>{weatherData.current.condition}</div>
              </div>
            </main>

            <div style={{
              display: 'flex',
              gap: '4.4rem',
              fontSize: '2.2rem',
              marginBottom: '3.3rem',
              opacity: 0.8,
              justifyContent: 'center'
            }}>
              <span>🌡️ {Math.round(weatherData.current.feelsLike)}°</span>
              <span>💧 {weatherData.current.humidity}%</span>
              <span>💨 {Math.round(weatherData.current.wind)} {unit === 'imperial' ? 'mph' : 'km/h'} {weatherData.current.windDir}</span>
              <span>🌧️ {weatherData.current.precip}%</span>
            </div>

            {forecastRange !== 'none' && (
              <footer style={{
                display: 'flex',
                gap: '2.2rem',
                borderTop: `1px solid ${fontColor}`,
                paddingTop: '2.2rem',
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
