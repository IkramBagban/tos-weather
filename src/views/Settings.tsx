import React from 'react';
import { media } from '@telemetryos/sdk';
import {
  SettingsContainer,
  SettingsHeading,
  SettingsBox,
  SettingsField,
  SettingsLabel,
  SettingsInputFrame,
  SettingsSelectFrame,
  SettingsSliderFrame,
  SettingsColorFrame,
  SettingsButtonFrame,
  SettingsRadioFrame,
  SettingsRadioLabel,
  SettingsDivider,
  SettingsHint,
} from '@telemetryos/sdk/react';
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
  LocationConfig,
} from '../hooks/store';

export function Settings() {
  const [isLoadingLocations, locations, setLocations] = useLocationsState();
  const [isLoadingDuration, cycleDuration, setCycleDuration] = useCycleDurationState(5);
  const [isLoadingTransition, transition, setTransition] = useTransitionState();

  const [isLoadingRange, forecastRange, setForecastRange] = useForecastRangeState();

  const [isLoadingBgType, backgroundType, setBackgroundType] = useBackgroundTypeState();
  const [isLoadingBgColor, backgroundColor, setBackgroundColor] = useBackgroundColorState(5);
  const [isLoadingBgUrl, backgroundUrl, setBackgroundUrl] = useBackgroundUrlState();
  const [isLoadingOpacity, backgroundOpacity, setBackgroundOpacity] = useBackgroundOpacityState(5);
  const [isLoadingFontColor, fontColor, setFontColor] = useFontColorState(5);

  const [isLoadingUnit, unit, setUnit] = useUnitState();
  const [isLoadingTime, timeFormat, setTimeFormat] = useTimeFormatState();
  const [isLoadingDate, dateFormat, setDateFormat] = useDateFormatState();

  const isLoading =
    isLoadingLocations || isLoadingDuration || isLoadingTransition ||
    isLoadingRange || isLoadingBgType || isLoadingBgColor || isLoadingBgUrl ||
    isLoadingOpacity || isLoadingFontColor || isLoadingUnit ||
    isLoadingTime || isLoadingDate;

  // Location Handlers
  const addLocation = () => {
    const newLocation: LocationConfig = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'manual',
      city: '',
      label: '',
    };
    setLocations([...locations, newLocation]);
  };

  const removeLocation = (index: number) => {
    const newLocations = [...locations];
    newLocations.splice(index, 1);
    setLocations(newLocations);
  };

  const updateLocation = (index: number, updates: Partial<LocationConfig>) => {
    const newLocations = [...locations];
    newLocations[index] = { ...newLocations[index], ...updates };
    setLocations(newLocations);
  };

  const pickMedia = async () => {
    try {
      // @ts-ignore - Assuming media().pick() returns a promise with a selection
      const result = await media().pick();
      if (result && result.url) {
        setBackgroundUrl(result.url);
      } else if (typeof result === 'string') {
        setBackgroundUrl(result);
      }
    } catch (e) {
      console.error('Media picker failed', e);
    }
  };

  return (
    <SettingsContainer>

      {/* --- LOCATIONS SECTION --- */}
      <SettingsHeading>Locations</SettingsHeading>

      {locations.map((loc, index) => (
        <SettingsBox key={loc.id || index}>
          <SettingsHeading>Location {index + 1}</SettingsHeading>

          {/* Type Selection */}
          <SettingsField>
            <SettingsLabel>Detection Mode</SettingsLabel>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <SettingsRadioFrame>
                <input
                  type="radio"
                  checked={loc.type === 'manual'}
                  onChange={() => updateLocation(index, { type: 'manual' })}
                  disabled={isLoading}
                />
                <SettingsRadioLabel>Manual</SettingsRadioLabel>
              </SettingsRadioFrame>
              <SettingsRadioFrame>
                <input
                  type="radio"
                  checked={loc.type === 'auto'}
                  onChange={() => updateLocation(index, { type: 'auto' })}
                  disabled={isLoading}
                />
                <SettingsRadioLabel>Auto (Device)</SettingsRadioLabel>
              </SettingsRadioFrame>
            </div>
          </SettingsField>

          {/* City Input (Manual Only) */}
          {loc.type === 'manual' && (
            <SettingsField>
              <SettingsLabel>City Search</SettingsLabel>
              <SettingsInputFrame>
                <input
                  type="text"
                  placeholder="e.g. Vancouver, BC"
                  value={loc.city}
                  onChange={(e) => {
                    updateLocation(index, { city: e.target.value });
                  }}
                  disabled={isLoading}
                />
              </SettingsInputFrame>
              <SettingsHint>Enter city name or zip code.</SettingsHint>
            </SettingsField>
          )}

          {/* Display Label Override */}
          <SettingsField>
            <SettingsLabel>Display Name Override</SettingsLabel>
            <SettingsInputFrame>
              <input
                type="text"
                placeholder="e.g. Main Lobby (Optional)"
                value={loc.label || ''}
                onChange={(e) => updateLocation(index, { label: e.target.value })}
                disabled={isLoading}
              />
            </SettingsInputFrame>
            <SettingsHint>Overrides the API-provided location name.</SettingsHint>
          </SettingsField>

          <SettingsButtonFrame>
            <button onClick={() => removeLocation(index)} disabled={isLoading}>
              Remove Location
            </button>
          </SettingsButtonFrame>
        </SettingsBox>
      ))}

      <SettingsButtonFrame>
        <button onClick={addLocation} disabled={isLoading}>+ Add Location</button>
      </SettingsButtonFrame>

      <SettingsField>
        <SettingsLabel>Cycle Duration (seconds)</SettingsLabel>
        <SettingsSliderFrame>
          <input
            type="range"
            min="5"
            max="60"
            value={cycleDuration}
            onChange={(e) => setCycleDuration(Number(e.target.value))}
            disabled={isLoading}
          />
          <span>{cycleDuration}s</span>
        </SettingsSliderFrame>
      </SettingsField>

      <SettingsField>
        <SettingsLabel>Transition Effect</SettingsLabel>
        <SettingsSelectFrame>
          <select
            value={transition}
            onChange={(e) => setTransition(e.target.value)}
            disabled={isLoading}
          >
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="instant">Instant</option>
          </select>
        </SettingsSelectFrame>
      </SettingsField>

      <SettingsDivider />

      {/* --- DISPLAY OPTIONS --- */}
      <SettingsHeading>Display Options</SettingsHeading>

      <SettingsField>
        <SettingsLabel>Forecast Range</SettingsLabel>
        <SettingsSelectFrame>
          <select
            value={forecastRange}
            onChange={(e) => setForecastRange(e.target.value)}
            disabled={isLoading}
          >
            <option value="24h">24-Hour (Hourly)</option>
            <option value="3d">3-Day Forecast</option>
            <option value="7d">7-Day Forecast</option>
          </select>
        </SettingsSelectFrame>
      </SettingsField>

      <SettingsDivider />

      {/* --- VISUAL CUSTOMIZATION --- */}
      <SettingsHeading>Visual Customization</SettingsHeading>

      <SettingsField>
        <SettingsLabel>Background Type</SettingsLabel>
        <SettingsSelectFrame>
          <select
            value={backgroundType}
            onChange={(e) => setBackgroundType(e.target.value)}
            disabled={isLoading}
          >
            <option value="dynamic">Dynamic (Matches Weather)</option>
            <option value="solid">Solid Color</option>
            <option value="image">Image/Video</option>
          </select>
        </SettingsSelectFrame>
      </SettingsField>

      {backgroundType === 'solid' && (
        <SettingsField>
          <SettingsLabel>Background Color</SettingsLabel>
          <SettingsColorFrame>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              disabled={isLoading}
            />
            <span>{backgroundColor}</span>
          </SettingsColorFrame>
        </SettingsField>
      )}

      {backgroundType === 'image' && (
        <SettingsField>
          <SettingsLabel>Background Media</SettingsLabel>
          <SettingsInputFrame>
            <input type="text" value={backgroundUrl} disabled readOnly placeholder="Select media..." />
          </SettingsInputFrame>
          <SettingsButtonFrame>
            <button onClick={pickMedia} disabled={isLoading}>Choose from Library</button>
            {backgroundUrl && <button onClick={() => setBackgroundUrl('')}>Clear</button>}
          </SettingsButtonFrame>
        </SettingsField>
      )}

      <SettingsField>
        <SettingsLabel>Background Opacity</SettingsLabel>
        <SettingsSliderFrame>
          <input
            type="range"
            min="0"
            max="100"
            value={backgroundOpacity}
            onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
            disabled={isLoading}
          />
          <span>{backgroundOpacity}%</span>
        </SettingsSliderFrame>
      </SettingsField>

      <SettingsField>
        <SettingsLabel>Font Color</SettingsLabel>
        <SettingsColorFrame>
          <input
            type="color"
            value={fontColor}
            onChange={(e) => setFontColor(e.target.value)}
            disabled={isLoading}
          />
          <span>{fontColor}</span>
        </SettingsColorFrame>
      </SettingsField>

      <SettingsDivider />

      {/* --- DATE & UNITS --- */}
      <SettingsHeading>Date & Units</SettingsHeading>

      <SettingsField>
        <SettingsLabel>Temperature Unit</SettingsLabel>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <SettingsRadioFrame>
            <input
              type="radio"
              checked={unit === 'metric'}
              onChange={() => setUnit('metric')}
              disabled={isLoading}
            />
            <SettingsRadioLabel>Celsius (°C)</SettingsRadioLabel>
          </SettingsRadioFrame>
          <SettingsRadioFrame>
            <input
              type="radio"
              checked={unit === 'imperial'}
              onChange={() => setUnit('imperial')}
              disabled={isLoading}
            />
            <SettingsRadioLabel>Fahrenheit (°F)</SettingsRadioLabel>
          </SettingsRadioFrame>
        </div>
      </SettingsField>

      <SettingsField>
        <SettingsLabel>Time Format</SettingsLabel>
        <SettingsSelectFrame>
          <select
            value={timeFormat}
            onChange={(e) => setTimeFormat(e.target.value)}
            disabled={isLoading}
          >
            <option value="12h">12-Hour (AM/PM)</option>
            <option value="24h">24-Hour</option>
          </select>
        </SettingsSelectFrame>
      </SettingsField>

      <SettingsField>
        <SettingsLabel>Date Format</SettingsLabel>
        <SettingsSelectFrame>
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            disabled={isLoading}
          >
            <option value="MMM DD, YYYY">MMM DD, YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </SettingsSelectFrame>
      </SettingsField>

    </SettingsContainer>
  );
}
