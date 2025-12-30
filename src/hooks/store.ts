import { createUseInstanceStoreState } from '@telemetryos/sdk/react';

export interface LocationConfig {
    id: string;
    type: 'manual' | 'auto';
    city: string; // Used for separate display name if needed, or just the query
    label?: string; // Display name override
}

// Default locations: one manual entry to start, or empty to prompt user
const defaultLocations: LocationConfig[] = [];

// Locations
export const useLocationsState = createUseInstanceStoreState<LocationConfig[]>('locations', defaultLocations);
export const useCycleDurationState = createUseInstanceStoreState<number>('cycleDuration', 10);
export const useTransitionState = createUseInstanceStoreState<string>('transition', 'fade');

// Forecast
export const useForecastRangeState = createUseInstanceStoreState<string>('forecastRange', '3d');

// Visuals
export const useBackgroundTypeState = createUseInstanceStoreState<string>('backgroundType', 'dynamic');
export const useBackgroundColorState = createUseInstanceStoreState<string>('backgroundColor', '#1a1a1a');
export const useBackgroundUrlState = createUseInstanceStoreState<string>('backgroundUrl', '');
export const useBackgroundOpacityState = createUseInstanceStoreState<number>('backgroundOpacity', 80);
export const useFontColorState = createUseInstanceStoreState<string>('fontColor', '#ffffff');

// Units & Formats
export const useUnitState = createUseInstanceStoreState<string>('unit', 'metric'); // metric (C) or imperial (F)
export const useTimeFormatState = createUseInstanceStoreState<string>('timeFormat', '12h');
export const useDateFormatState = createUseInstanceStoreState<string>('dateFormat', 'MMM DD, YYYY');

// System
export const useUiScaleStoreState = createUseInstanceStoreState<number>('ui-scale', 1);
