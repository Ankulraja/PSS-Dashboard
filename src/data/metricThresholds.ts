import thresholds from './metricThresholds.json';

export type MetricRating = 'good' | 'needsImprovement' | 'poor';

type MetricKey = 'Performance_Score' | 'LCP' | 'FCP' | 'TBT' | 'SI' | 'CLS';
type DeviceType = 'mobile' | 'desktop';

/**
 * Returns the rating ('good' | 'needsImprovement' | 'poor') for a given
 * metric value based on official Google / Lighthouse thresholds.
 *
 * Uses the device-specific thresholds where they differ (FCP, TBT, SI)
 * and the shared thresholds for Core Web Vitals (LCP, CLS) and Performance Score.
 *
 * All time-based values must be passed in MILLISECONDS (matching ProcessedRecord).
 * CLS is unitless decimal. Performance_Score is 0–100.
 */
export function getMetricRating(
  metricKey: MetricKey,
  value: number,
  device: DeviceType = 'mobile'
): MetricRating {
  const config = thresholds[metricKey] as any;
  if (!config) return 'needsImprovement';

  const deviceConfig = config[device] as {
    good: { min?: number; max?: number };
    needsImprovement: { min?: number; max?: number };
    poor: { min?: number; max?: number };
  };

  if (config.higherIsBetter) {
    // Performance Score — higher is better
    if (value >= (deviceConfig.good.min ?? 0)) return 'good';
    if (value >= (deviceConfig.needsImprovement.min ?? 0)) return 'needsImprovement';
    return 'poor';
  } else {
    // Time / layout metrics — lower is better
    if (value <= (deviceConfig.good.max ?? Infinity)) return 'good';
    if (value <= (deviceConfig.needsImprovement.max ?? Infinity)) return 'needsImprovement';
    return 'poor';
  }
}

/**
 * Returns Tailwind colour tokens for each rating, respecting light/dark theme.
 * Use these for text colours, badge backgrounds, chart stroke colours, etc.
 */
export function getRatingColors(
  rating: MetricRating,
  theme: 'light' | 'dark' = 'light'
): { text: string; bg: string; border: string; label: string } {
  const isLight = theme === 'light';

  switch (rating) {
    case 'good':
      return {
        label:  'Good',
        text:   isLight ? 'text-emerald-700' : 'text-emerald-400',
        bg:     isLight ? 'bg-emerald-50'    : 'bg-emerald-950/60',
        border: isLight ? 'border-emerald-300' : 'border-emerald-800/60',
      };
    case 'needsImprovement':
      return {
        label:  'Needs Improvement',
        text:   isLight ? 'text-amber-700' : 'text-amber-400',
        bg:     isLight ? 'bg-amber-50'    : 'bg-amber-950/60',
        border: isLight ? 'border-amber-300' : 'border-amber-800/60',
      };
    case 'poor':
      return {
        label:  'Poor',
        text:   isLight ? 'text-rose-700' : 'text-rose-400',
        bg:     isLight ? 'bg-rose-50'    : 'bg-rose-950/60',
        border: isLight ? 'border-rose-300' : 'border-rose-800/60',
      };
  }
}

/**
 * Returns hex stroke color for Recharts line according to rating and theme.
 * Good -> Green/Teal, Needs Improvement -> Amber/Yellow, Poor -> Red/Rose
 */
export function getRatingHex(
  rating: MetricRating,
  theme: 'light' | 'dark' = 'light'
): string {
  const isLight = theme === 'light';
  switch (rating) {
    case 'good':
      return isLight ? '#0d9488' : '#10b981'; // Green / Emerald
    case 'needsImprovement':
      return isLight ? '#d97706' : '#f59e0b'; // Amber / Yellow
    case 'poor':
      return isLight ? '#e11d48' : '#f43f5e'; // Red / Rose
  }
}

/**
 * Returns the raw threshold numbers for a metric + device.
 * Useful for chart reference lines or axis annotations.
 *
 * For metrics with sameForBothDevices=true, device param is ignored.
 */
export function getMetricThresholds(
  metricKey: MetricKey,
  device: DeviceType = 'mobile'
): { goodCeiling: number; poorFloor: number } {
  const config = thresholds[metricKey] as any;
  if (!config) return { goodCeiling: 0, poorFloor: 0 };

  const deviceThresholds = config.thresholds;

  if (config.sameForBothDevices) {
    if (config.higherIsBetter) {
      // Performance Score: good >= 90, poor < 50
      return {
        goodCeiling: deviceThresholds.needsImprovement, // lower edge of "good"
        poorFloor:   deviceThresholds.good,             // upper edge of "poor"
      };
    }
    return {
      goodCeiling: deviceThresholds.good,
      poorFloor:   deviceThresholds.poor,
    };
  }

  // Device-specific (FCP, TBT, SI)
  const dt = deviceThresholds[device];
  return {
    goodCeiling: dt.good,
    poorFloor:   dt.poor,
  };
}

export { thresholds as rawThresholds };
