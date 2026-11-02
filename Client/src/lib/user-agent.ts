// Small user agent parser for the device list. Rough on purpose: it only has to name
// the common browsers and systems, a library would add a dependency for little gain.
// Order matters: many browsers copy the tokens of others (Edge says "Chrome",
// Chrome says "Safari", iPhones say "like Mac OS X", Android says "Linux").

const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
  [/Windows/, 'Windows'],
  [/iPhone|iPod/, 'iOS'],
  [/iPad/, 'iPadOS'],
  [/Android/, 'Android'],
  [/CrOS/, 'ChromeOS'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
];

const find = (list: [RegExp, string][], userAgent: string) =>
  list.find(([pattern]) => pattern.test(userAgent))?.[1];

/** "Mozilla/5.0 (Windows NT 10.0; ...) ... Chrome/141.0 ..." -> "Chrome on Windows" */
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  const browser = find(BROWSERS, userAgent);
  const system = find(SYSTEMS, userAgent);
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? system ?? 'Unknown device';
}
