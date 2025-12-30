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

export function Settings() {
  const [isLoadingLocations, locations, setLocations] = useLocationsState();
  const [isLoadingDuration, cycleDuration, setCycleDuration] = useCycleDurationState(5);
  const [isLoadingTransition, transition, setTransition] = useTransitionState();

  const [isLoadingRange, forecastRange, setForecastRange] = useForecastRangeState();
  const [isLoadingCount, forecastCount, setForecastCount] = useForecastCountState();

  const [isLoadingBgType, backgroundType, setBackgroundType] = useBackgroundTypeState();
  const [isLoadingBgColor, backgroundColor, setBackgroundColor] = useBackgroundColorState(5);
  const [isLoadingBgUrl, backgroundUrl, setBackgroundUrl] = useBackgroundUrlState();
  const [isLoadingOpacity, backgroundOpacity, setBackgroundOpacity] = useBackgroundOpacityState(5);
  const [isLoadingFontColor, fontColor, setFontColor] = useFontColorState(5);

  const [isLoadingUnit, unit, setUnit] = useUnitState();
  const [isLoadingTime, timeFormat, setTimeFormat] = useTimeFormatState();

  const [isLoadingDate, dateFormat, setDateFormat] = useDateFormatState();
  const [isLoadingScale, uiScale, setUiScale] = useUiScaleStoreState();

  const isLoading =
    isLoadingLocations || isLoadingDuration || isLoadingTransition ||
    isLoadingRange || isLoadingBgType || isLoadingBgColor || isLoadingBgUrl ||
    isLoadingOpacity || isLoadingFontColor || isLoadingUnit ||
    isLoadingTime || isLoadingDate || isLoadingScale;

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

  // Media Picker State
  const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState(false);
  const [mediaFolders, setMediaFolders] = React.useState<any[]>([]);
  const [mediaFiles, setMediaFiles] = React.useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = React.useState<{ id: string | null, name: string }[]>([{ id: null, name: 'Root' }]);

  // Fetch initial folders
  React.useEffect(() => {
    if (isMediaPickerOpen) {
      loadFolder(currentFolderId);
    }
  }, [isMediaPickerOpen, currentFolderId]);

  const loadFolder = async (folderId: string | null) => {
    try {
      if (!folderId) {
        // Root: Get all folders
        const folders = await media().getAllFolders();
        // Filter for root folders (where parentId is null or empty if logic dictates, 
        // SDK doc says getAllFolders returns all, we might need to filter client side or just show all folders flat if no hierarchy structure is strictly defined by API return for root?)
        // The doc says "getAllFolders: Retrieve all media folders". "MediaFolder" has "parentId".
        // Let's assume we show root folders (parentId === undefined/null) at root.
        const rootFolders = folders.filter((f: any) => !f.parentId);
        setMediaFolders(rootFolders);
        setMediaFiles([]); // Root probably only has folders? Or maybe root has files too? 
        // The API says "getAllByFolderId(folderId)". Root usually doesn't have an ID unless there's a specific root ID.
        // If we want root files, maybe passing null works? Doc doesn't say. 
        // Let's assume we start by showing folders.
        // Actually, many systems have a flattened folder list or strict hierarchy.
        // Let's just show ALL folders if hierarchy is complex, or filter.
        // To be safe, let's just show folders.
      } else {
        // Get content
        const [contents, allFolders] = await Promise.all([
          media().getAllByFolderId(folderId),
          media().getAllFolders()
        ]);
        setMediaFiles(contents);
        // Find subfolders
        const subFolders = allFolders.filter((f: any) => f.parentId === folderId);
        setMediaFolders(subFolders);
      }
    } catch (e) {
      console.error('Failed to load media', e);
    }
  };

  const navigateToFolder = (folder: any) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
  };

  const navigateUp = (index: number) => {
    const target = breadcrumbs[index];
    setCurrentFolderId(target.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const selectFile = (file: any) => {
    if (file.publicUrls && file.publicUrls.length > 0) {
      setBackgroundUrl(file.publicUrls[0]);
      setIsMediaPickerOpen(false);
    }
  };

  // Render Media Picker Modal
  const renderMediaPicker = () => {
    if (!isMediaPickerOpen) return null;

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
        display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}>
        <div style={{
          backgroundColor: '#1a1a1a', color: 'white', width: '80%', height: '80%',
          borderRadius: '1rem', padding: '2rem', display: 'flex', flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>Media Library</h2>
            <button onClick={() => setIsMediaPickerOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '1.4rem' }}>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} onClick={() => navigateUp(i)} style={{ cursor: 'pointer', textDecoration: i === breadcrumbs.length - 1 ? 'none' : 'underline', opacity: i === breadcrumbs.length - 1 ? 1 : 0.7 }}>
                {crumb.name} {i < breadcrumbs.length - 1 && ' > '}
              </span>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', alignContent: 'start' }}>
            {/* Folders */}
            {mediaFolders.map(folder => (
              <div key={folder.id} onClick={() => navigateToFolder(folder)} style={{
                backgroundColor: '#333', padding: '1rem', borderRadius: '0.5rem',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                aspectRatio: '1'
              }}>
                <div style={{ fontSize: '3rem' }}>📁</div>
                <div style={{ textAlign: 'center', wordBreak: 'break-word', marginTop: '0.5rem' }}>{folder.name}</div>
              </div>
            ))}

            {/* Files */}
            {mediaFiles.map(file => (
              <div key={file.id} onClick={() => selectFile(file)} style={{
                backgroundColor: '#333', padding: '0.5rem', borderRadius: '0.5rem',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
                border: backgroundUrl === file.publicUrls?.[0] ? '2px solid #4facfe' : 'none',
                position: 'relative'
              }}>
                {file.contentType.startsWith('video') ? (
                  <div style={{ fontSize: '3rem', height: '100px', display: 'flex', alignItems: 'center' }}>🎥</div>
                ) : (
                  <img src={file.thumbnailUrl || file.publicUrls?.[0]} alt={file.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '0.2rem' }} />
                )}
                <div style={{ textAlign: 'center', fontSize: '1.2rem', marginTop: '0.5rem', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              </div>
            ))}

            {mediaFolders.length === 0 && mediaFiles.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', opacity: 0.5 }}>This folder is empty</div>
            )}
          </div>
        </div>
      </div>
    );
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

                />
                <SettingsRadioLabel>Manual</SettingsRadioLabel>
              </SettingsRadioFrame>
              <SettingsRadioFrame>
                <input
                  type="radio"
                  checked={loc.type === 'auto'}
                  onChange={() => updateLocation(index, { type: 'auto' })}

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

              />
            </SettingsInputFrame>
            <SettingsHint>Overrides the API-provided location name.</SettingsHint>
          </SettingsField>

          <SettingsButtonFrame>
            <button onClick={() => removeLocation(index)} >
              Remove Location
            </button>
          </SettingsButtonFrame>
        </SettingsBox>
      ))}

      <SettingsButtonFrame>
        <button onClick={addLocation} >+ Add Location</button>
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
        <SettingsLabel>Forecast Type</SettingsLabel>
        <SettingsSelectFrame>
          <select
            value={forecastRange}
            onChange={(e) => setForecastRange(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="hourly">Hourly</option>
            <option value="none">None</option>
          </select>
        </SettingsSelectFrame>
      </SettingsField>

      {forecastRange !== 'none' && (
        <SettingsField>
          <SettingsLabel>Number of Items</SettingsLabel>
          <SettingsInputFrame>
            <input
              type="number"
              min="1"
              max="24"
              value={forecastCount}
              onChange={(e) => setForecastCount(Number(e.target.value))}
            />
          </SettingsInputFrame>
          <SettingsHint>Enter the number of forecast items to display (1-24).</SettingsHint>
        </SettingsField>
      )}

      <SettingsField>
        <SettingsLabel>UI Scale</SettingsLabel>
        <SettingsSliderFrame>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={uiScale}
            onChange={(e) => setUiScale(Number(e.target.value))}

          />
          <span>{uiScale}x</span>
        </SettingsSliderFrame>
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
            <button onClick={() => setIsMediaPickerOpen(true)} >Choose from Library</button>
            {backgroundUrl && <button onClick={() => setBackgroundUrl('')}>Clear</button>}
          </SettingsButtonFrame>
        </SettingsField>
      )}

      {renderMediaPicker()}

      <SettingsField>
        <SettingsLabel>Background Opacity</SettingsLabel>
        <SettingsSliderFrame>
          <input
            type="range"
            min="0"
            max="100"
            value={backgroundOpacity}
            onChange={(e) => setBackgroundOpacity(Number(e.target.value))}

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

            />
            <SettingsRadioLabel>Celsius (°C)</SettingsRadioLabel>
          </SettingsRadioFrame>
          <SettingsRadioFrame>
            <input
              type="radio"
              checked={unit === 'imperial'}
              onChange={() => setUnit('imperial')}

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
