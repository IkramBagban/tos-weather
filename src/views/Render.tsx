
import React, { useEffect, useState, useRef } from 'react';
import { proxy, store, weather } from '@telemetryos/sdk';
import { useUiScaleToSetRem, useUiAspectRatio } from '@telemetryos/sdk/react';
import {
  Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, CloudSun,
  Thermometer, Droplets, Wind, CloudDrizzle, Ban, MapPin
} from 'lucide-react';
import {
  useLocationsState,
  useCycleDurationState,
  useTransitionState,
  useForecastRangeState,
  useForecastCountState,
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

const getDynamicBackgroundImage = (condition: string): string => {
  const c = condition.toLowerCase();

  if (c.includes('storm') || c.includes('thunder')) return './lightning-strike-cloudy-sky-night-time.jpg';
  if (c.includes('rain') || c.includes('drizzle')) return './light-moderate-rain.jpg';
  if (c.includes('snow') || c.includes('flurry') || c.includes('ice') || c.includes('sleet')) return './snow.jpg';
  if (c.includes('overcast')) return './overcast-cloud.jpg';
  if (c.includes('broken clouds')) return './broken-cloud.jpg';
  if (c.includes('scattered clouds')) return './scattered-clouds.jpg';
  if (c.includes('few clouds')) return './few-cloud.jpg';
  if (c.includes('cloud')) return './overcast-cloud.jpg'; // Generic cloud fallback
  if (c.includes('clear') || c.includes('sun')) return './clear-sky.jpg';
  if (c.includes('mist') || c.includes('fog')) return './overcast-cloud.jpg'; // Use overcast for mist/fog if no specific image

  return './summer-grass-beautiful-day.jpg'; // Default
};

const isVideo = (url: string) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg|mov)$/i);
};

const getIconKey = (condition: string): string => {
  if (!condition) return 'question';
  const c = condition.toLowerCase();
  if (c.includes('storm') || c.includes('thunder')) return 'storm';
  if (c.includes('rain') || c.includes('drizzle')) return 'rain';
  if (c.includes('snow') || c.includes('flurry')) return 'snow';
  if (c.includes('fog') || c.includes('mist')) return 'fog';
  if (c.includes('cloud') || c.includes('overcast')) return 'cloud';
  if (c.includes('partly')) return 'partly';
  if (c.includes('clear') || c.includes('sun')) return 'sun';
  return 'thermometer';
};

const WeatherIcon = ({ icon, size = '100%', className }: { icon: string; size?: string | number, className?: string }) => {
  const props = { size, className, strokeWidth: 1.5 }; // Consistent stroke
  switch (icon) {
    case 'storm': return <CloudLightning {...props} />;
    case 'rain': return <CloudRain {...props} />;
    case 'snow': return <Snowflake {...props} />;
    case 'fog': return <CloudFog {...props} />;
    case 'cloud': return <Cloud {...props} />;
    case 'partly': return <CloudSun {...props} />;
    case 'sun': return <Sun {...props} />;
    case 'thermometer': return <Thermometer {...props} />;
    case 'droplet': return <Droplets {...props} />;
    case 'wind': return <Wind {...props} />;
    default: return <Ban {...props} />;
  }
};

export function Render() {
  const [isUiScaleLoading, uiScale] = useUiScaleStoreState();
  useUiScaleToSetRem(uiScale);

  // Store Hooks
  const [isLocationsLoading, locations] = useLocationsState();
  const [isDurationLoading, cycleDuration] = useCycleDurationState();
  const [isTransitionLoading, transition] = useTransitionState();
  const [isRangeLoading, forecastRange] = useForecastRangeState();
  const [isCountLoading, forecastCount] = useForecastCountState();
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
      const count = forecastCount || 5; // Default fallback

      // Legacy support map: '24h' -> 'hourly', '3d'/'7d' -> 'daily'
      // Default to 'daily' if unknown
      const type = (forecastRange === '24h' || forecastRange === 'hourly') ? 'hourly' : 'daily';

      if (type === 'hourly') {
        // Hourly: Show next N hours
        const hourly = await weather().getHourlyForecast({ ...params, hours: count });
        forecast = hourly.slice(0, count).map((f: any) => ({
          day: new Date(f.Timestamp * 1000).toLocaleTimeString([], { hour: 'numeric' }),
          temp: f.Temp,
          icon: f.Label,
        }));
      } else {
        // Daily: Show next N days
        // Ensure we fetch enough days
        const daily = await weather().getDailyForecast({ ...params, days: count });
        console.log('Requested daily:', count, 'Received:', daily?.length);
        forecast = daily.slice(0, count).map((f: any) => ({
          day: new Date(f.Timestamp * 1000).toLocaleDateString([], { weekday: 'short' }),
          temp: f.MaxTemp, // Keep for backward compat or primary display
          min: f.MinTemp,
          max: f.MaxTemp,
          icon: f.Label,
          isDaily: true // Flag to distinguish
        }));
      }

      return {
        current: {
          temp: current.Temp,
          condition: current.WeatherText,
          icon: getIconKey(current.WeatherText),
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
          icon: getIconKey(f.icon)
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
  }, [unit, forecastRange, forecastCount]); // Only run when these meaningful configs change, NOT on currentIndex change (handled by loop)

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
  const isLandscapeRibbon = aspectRatio > 2.6;
  const isExtremeRibbon = aspectRatio > 3.5;
  const isVerticalStrip = aspectRatio < 0.6;
  const isWideCompact = aspectRatio > 1.8 && aspectRatio <= 2.6;

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
    padding: '4rem', // Increased safe zone (Giving Content "Air")
    fontFamily: 'inherit',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  };

  const glassCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)', // Very light white
    backdropFilter: 'blur(20px)', // Premium blur
    borderRadius: '1.5rem',
    padding: '2rem',
    border: '1px solid rgba(255, 255, 255, 0.1)', // Subtle border
    boxShadow: '0 20px 50px rgba(0,0,0,0.3)', // "Float" effect
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
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

  const [bgError, setBgError] = useState(false);

  // Reset error when URL changes
  useEffect(() => {
    setBgError(false);
  }, [bgUrl]);

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
      objectFit: 'cover'
    };

    // 1. Manual Image/Video
    if (bgType === 'image' && bgUrl && !bgError) {
      if (isVideo(bgUrl)) {
        return (
          <video
            src={bgUrl}
            autoPlay loop muted playsInline
            style={commonStyle}
            onError={() => setBgError(true)}
          />
        );
      }
      return (
        <img
          src={bgUrl}
          alt="Background"
          style={commonStyle}
          onError={() => setBgError(true)}
        />
      );
    }

    // 2. Solid Color
    if (bgType === 'solid') {
      return <div style={{ ...commonStyle, backgroundColor: bgColor }} />;
    }

    // 3. Dynamic (Default) - Try Image first, then Fallback Gradient
    // We treat "Dynamic Image Error" separately from "Manual Image Error" if we want,
    // but reusing bgError might be tricky if we switch modes. 
    // Actually, for dynamic, let's just use a separate img logic or valid path.
    // If dynamic image fails, we show the gradient div behind it?
    // A clean way: Render the gradient div ALWAYS (or as fallback), and put the image on top.

    const dynamicImgUrl = getDynamicBackgroundImage(currentCondition);
    const dynamicGradient = getDynamicBackground(currentCondition);

    return (
      <>
        {/* Fallback Gradient (Always rendered behind, or visible if image fails/loads) */}
        <div style={{ ...commonStyle, background: dynamicGradient }} />

        {/* Dynamic Image Overlay */}
        <img
          src={dynamicImgUrl}
          alt={currentCondition}
          style={{ ...commonStyle, opacity: opacityValue }} // Re-apply opacity
          onError={(e) => {
            e.currentTarget.style.display = 'none'; // Hide broken image, revealing gradient
          }}
        />
      </>
    );
  };

  const renderGradientOverlay = () => (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '100%',
      height: '40%',
      background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
      zIndex: 0,
      pointerEvents: 'none'
    }} />
  );

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

  if (loading && !weatherData) {
    return (
      <div style={{ ...containerStyle, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ fontSize: '3rem' }}>Loading Weather...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...containerStyle, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ fontSize: '3rem', color: '#ff6b6b' }}>Error: {error}</div>
        <button
          onClick={() => {
            setLoading(true);
            const loc = locations[currentIndex];
            if (loc) {
              getWeatherData(loc).then(data => {
                if (data) {
                  setWeatherData(data);
                  setError(null);
                } else {
                  setError('Retry failed. Please check connection.');
                }
                setLoading(false);
              });
            } else {
              // Should not happen if locations exist
              setError('No location configuration found.');
              setLoading(false);
            }
          }}
          style={{
            fontSize: '2rem',
            padding: '1rem 3rem',
            borderRadius: '1rem',
            border: 'none',
            background: 'white',
            color: 'black',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div style={{ ...containerStyle, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>Welcome to Weather Widget!</div>
        <div style={{ fontSize: '2rem', opacity: 0.8 }}>No locations configured.</div>
        <div style={{ fontSize: '2rem', opacity: 0.8 }}>Please add a location in the settings to get started.</div>
      </div>
    );
  }

  return (
    <div className="weather-app" style={containerStyle}>
      {renderBackground()}

      {renderGradientOverlay()}

      {/* Content Wrapper for Transitions */}
      <div style={{
        position: 'relative', // Ensure z-index works
        zIndex: 1,
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
              <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: 1.1 }}>
                {currentLocation.label || weatherData.current.city || displayName}
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{formatTime(currentTime)}</div>
              <div style={{ fontSize: '1.5rem', opacity: 0.8 }}>{formatDate(currentTime)}</div>
            </div>

            {/* 2. Hero (Stacked) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
              <div className="weather-icon-3d" style={{ marginBottom: '1rem', width: '12rem', height: '12rem' }}>
                <WeatherIcon icon={weatherData.current.icon} size="100%" />
              </div>
              <div style={{ fontSize: '7rem', fontWeight: '900', lineHeight: 0.9 }}>
                {Math.round(weatherData.current.temp)}{unitLabel}
              </div>
              <div style={{ fontSize: '2rem', marginTop: '0.5rem', fontWeight: '400', opacity: 0.8 }}>{weatherData.current.condition}</div>
            </div>

            {/* 3. Secondary Details (Glass Card) */}
            <div style={{ ...glassCardStyle, width: '100%', marginBottom: '2rem', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', fontSize: '1.6rem', opacity: 0.9 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Thermometer size="2rem" strokeWidth={1.5} /> {Math.round(weatherData.current.feelsLike)}°</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Droplets size="2rem" strokeWidth={1.5} /> {weatherData.current.humidity}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', fontSize: '1.6rem', opacity: 0.9 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Wind size="2rem" strokeWidth={1.5} /> {Math.round(weatherData.current.wind)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CloudRain size="2rem" strokeWidth={1.5} /> {weatherData.current.precip}%</span>
              </div>
            </div>

            {/* 4. Forecast (Vertical List - Glass Card) */}
            {forecastRange !== 'none' && (
              <div style={{
                ...glassCardStyle,
                width: '100%',
                padding: '1.5rem',
                gap: '1.5rem'
              }}>
                {weatherData.forecast.map((day: any, i: number) => (
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
                    <div className="weather-forecast-icon weather-icon-3d" style={{ width: '30%', textAlign: 'center' }}>
                      <WeatherIcon icon={day.icon} size="3.5rem" />
                    </div>
                    <div className="weather-forecast-temp" style={{ width: '30%', textAlign: 'right' }}>{Math.round(day.temp)}°</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : isExtremeRibbon ? (
          // EXTREME RIBBON LAYOUT (> 3.5)
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>

            {/* LEFT: City, Icon, Temp, Condition */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 'bold', marginBottom: '0.5rem', lineHeight: 1.1 }}>
                {currentLocation.label || weatherData.current.city || displayName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div className="weather-icon-3d" style={{ width: '10rem', height: '10rem' }}>
                  <WeatherIcon icon={weatherData.current.icon} size="100%" />
                </div>
                <div style={{ fontSize: '7rem', fontWeight: '900', lineHeight: 1 }}>
                  {Math.round(weatherData.current.temp)}{unitLabel}
                </div>
              </div>
              <div style={{ fontSize: '2.5rem', marginTop: '0.5rem', fontWeight: '400', opacity: 0.8 }}>{weatherData.current.condition}</div>
            </div>

            {/* CENTER: Forecast & Secondary Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '0 2rem', gap: '1.5rem' }}>
              {/* Forecast (Glass) */}
              {forecastRange !== 'none' && (
                <div style={{ ...glassCardStyle, flexDirection: 'row', gap: '3rem', width: 'auto', minWidth: '50%' }}>
                  {weatherData.forecast.map((day: any, i: number) => (
                    <div key={i} className="weather-forecast-item" style={{ minWidth: '70px' }}>
                      <div className="weather-forecast-day">{day.day}</div>
                      <div className="weather-forecast-icon weather-icon-3d">
                        <WeatherIcon icon={day.icon} size="4rem" />
                      </div>
                      <div className="weather-forecast-temp">{Math.round(day.temp)}°</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Secondary Stats (Glass) */}
              <div style={{ ...glassCardStyle, flexDirection: 'row', gap: '3rem', fontSize: '1.8rem', opacity: 0.9 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Thermometer size="2.5rem" strokeWidth={1.5} /> {Math.round(weatherData.current.feelsLike)}°</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Droplets size="2.5rem" strokeWidth={1.5} /> {weatherData.current.humidity}%</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Wind size="2.5rem" strokeWidth={1.5} /> {Math.round(weatherData.current.wind)}</span>
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
              <div style={{ fontSize: '3.5rem', fontWeight: 'bold', marginBottom: '0.5rem', lineHeight: 1.1 }}>
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
                <div className="weather-icon-3d" style={{ width: '14rem', height: '14rem' }}>
                  <WeatherIcon icon={weatherData.current.icon} size="100%" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '9rem', fontWeight: '900', lineHeight: 0.9 }}>
                    {Math.round(weatherData.current.temp)}{unitLabel}
                  </div>
                  <div style={{ fontSize: '3rem', marginTop: '0.5rem', fontWeight: '400', opacity: 0.8 }}>
                    {weatherData.current.condition}
                  </div>
                </div>
              </div>

              <div style={{ ...glassCardStyle, flexDirection: 'row', gap: '3rem', fontSize: '2rem', opacity: 0.9, marginBottom: '1.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Thermometer size="2.5rem" strokeWidth={1.5} /> {Math.round(weatherData.current.feelsLike)}°</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Droplets size="2.5rem" strokeWidth={1.5} /> {weatherData.current.humidity}%</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Wind size="2.5rem" strokeWidth={1.5} /> {Math.round(weatherData.current.wind)}</span>
              </div>

              {/* FORECAST */}
              {forecastRange !== 'none' && (
                <div style={{
                  ...glassCardStyle,
                  flexDirection: 'row',
                  gap: '3rem',
                  maxWidth: '100%',
                  flexWrap: 'wrap'
                }}>
                  {weatherData.forecast.map((day: any, i: number) => (
                    <div key={i} className="weather-forecast-item" style={{ minWidth: '70px' }}>
                      <div className="weather-forecast-day">{day.day}</div>
                      <div className="weather-forecast-icon weather-icon-3d">
                        <WeatherIcon icon={day.icon} size="4.5rem" />
                      </div>
                      <div className="weather-forecast-temp">{Math.round(day.temp)}°</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          // STANDARD / DASHBOARD LAYOUT
          <>
            {/* TOP LEFT HEADER: Location + Time + Date */}
            {/* TOP LEFT HEADER: Location + Time + Date */}
            <header style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              marginBottom: isWideCompact ? '0.5rem' : '1.4rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isWideCompact ? '0.5rem' : '0.7rem' }}>
                <MapPin size={isWideCompact ? "2rem" : "2.5rem"} />
                <div style={{ fontSize: isWideCompact ? '2rem' : '2.5rem', fontWeight: 'bold' }}>
                  {currentLocation.label || weatherData.current.city || displayName}
                </div>
              </div>
              <div style={{ fontSize: isWideCompact ? '1.1rem' : '1.4rem', opacity: 0.9, marginTop: isWideCompact ? '0.2rem' : '0.3rem' }}>
                {formatTime(currentTime)} • {formatDate(currentTime)}
              </div>
            </header>

            {/* MAIN CONTENT SPLIT: Sidebar (Left) + Hero (Right) */}
            {/* MAIN CONTENT SPLIT: Sidebar (Left) + Hero (Right) */}
            <main style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: isWideCompact ? '2rem' : '2.8rem',
              width: '100%',
              marginBottom: isWideCompact ? '0.5rem' : '1.4rem',
              overflow: 'hidden' // Ensure no spill
            }}>

              {/* LEFT SIDEBAR: Secondary Details Card */}
              {/* LEFT SIDEBAR: Secondary Details Card */}
              <div style={{
                ...glassCardStyle,
                width: '30%',
                alignItems: 'flex-start', // Align text left inside card
                justifyContent: 'space-evenly', // Distribute vertically
                height: '100%', // Fill available height
                padding: isWideCompact ? '1.5rem' : '2.1rem',
                gap: isWideCompact ? '0.8rem' : '1.4rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', fontSize: isWideCompact ? '1.4rem' : '1.8rem', width: '100%' }}>
                  <Thermometer size={isWideCompact ? "1.8rem" : "2.1rem"} strokeWidth={1.5} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: isWideCompact ? '1rem' : '1.3rem', opacity: 0.7 }}>Feels Like</span>
                    <span>{Math.round(weatherData.current.feelsLike)}°</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', fontSize: isWideCompact ? '1.4rem' : '1.8rem', width: '100%' }}>
                  <Wind size={isWideCompact ? "1.8rem" : "2.1rem"} strokeWidth={1.5} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: isWideCompact ? '1rem' : '1.3rem', opacity: 0.7 }}>Wind</span>
                    <span>{Math.round(weatherData.current.wind)} {unit === 'imperial' ? 'mph' : 'km/h'} {weatherData.current.windDir}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', fontSize: isWideCompact ? '1.4rem' : '1.8rem', width: '100%' }}>
                  <Droplets size={isWideCompact ? "1.8rem" : "2.1rem"} strokeWidth={1.5} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: isWideCompact ? '1rem' : '1.3rem', opacity: 0.7 }}>Humidity</span>
                    <span>{weatherData.current.humidity}%</span>
                  </div>
                </div>

                {/* Precipitation (Replaced UV Index) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', fontSize: isWideCompact ? '1.4rem' : '1.8rem', width: '100%' }}>
                  <CloudRain size={isWideCompact ? "1.8rem" : "2.1rem"} strokeWidth={1.5} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: isWideCompact ? '1rem' : '1.3rem', opacity: 0.7 }}>Precipitation</span>
                    <span>{weatherData.current.precip}%</span>
                  </div>
                </div>
              </div>

              {/* RIGHT HERO: Big Temp & Icon in open space */}
              {/* RIGHT HERO: Big Temp & Icon in open space */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'row', // Horizontal layout for hero
                alignItems: 'center',
                justifyContent: 'center', // Center in remaining space
                gap: isWideCompact ? '2rem' : '3.6rem'
              }}>
                <div style={{ fontSize: isWideCompact ? '10rem' : '12.6rem', fontWeight: '700', lineHeight: 0.8, letterSpacing: isWideCompact ? '-0.3rem' : '-0.5rem' }}>
                  {Math.round(weatherData.current.temp)}°
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div className="weather-icon-3d" style={{ width: isWideCompact ? '8rem' : '10rem', height: isWideCompact ? '8rem' : '10rem', marginBottom: isWideCompact ? '0.8rem' : '1rem' }}>
                    <WeatherIcon icon={weatherData.current.icon} size="100%" />
                  </div>
                  <div style={{ fontSize: isWideCompact ? '2.5rem' : '3.2rem', fontWeight: '500' }}>{weatherData.current.condition}</div>
                </div>
              </div>

            </main>

            {forecastRange !== 'none' && (
              <footer style={{
                ...glassCardStyle,
                flexDirection: 'row',
                gap: isWideCompact ? '2rem' : '3rem',
                width: '100%',
                marginTop: 'auto', // Push to bottom
                padding: isWideCompact ? '1.5rem' : '2rem'
              }}>
                {weatherData.forecast.map((day: any, i: number) => (
                  <div key={i} className="weather-forecast-item" style={{ flex: 1, fontSize: isWideCompact ? '0.85em' : '1em' }}>
                    <div className="weather-forecast-day">{day.day}</div>
                    <div className="weather-forecast-icon weather-icon-3d">
                      <WeatherIcon icon={day.icon} size={isWideCompact ? "4rem" : "6rem"} />
                    </div>
                    <div className="weather-forecast-temp">
                      {day.isDaily ? (
                        <span>
                          <span style={{ fontSize: '1.15em' }}>{Math.round(day.max)}°</span><span style={{ opacity: 0.7, fontWeight: 200 }}>/{Math.round(day.min)}°</span>
                        </span>
                      ) : (
                        <>{Math.round(day.temp)}°</>
                      )}
                    </div>
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
