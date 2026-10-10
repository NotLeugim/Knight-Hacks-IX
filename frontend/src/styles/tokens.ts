/**
 * SPOTSight Orbit-Style Design Tokens
 * 
 * Boston Dynamics Orbit robot fleet management design tokens.
 * Single source of truth for colors, typography, spacing, and shapes.
 */

export const colors = {
  // Chrome & Navigation
  navy: '#12335A',               // TopBar background (fixed 64px)
  navyDark: '#0B223D',           // TopBar pressed/darker shade
  navyLight: '#1B477D',          // TopBar hover/highlight
  orbitBlue: '#3F8FC9',          // SubToolbar background (fixed 48px), primary accent
  orbitBlueDark: '#2B6EA0',      // SubToolbar active/selected accents
  orbitBlueLight: '#62A9DB',     // Wordmark 'Sight' accent / hover state

  // SubToolbar SegmentedTabs Tokens (translucent white over blue bar)
  tabs: {
    containerBg: 'rgba(255, 255, 255, 0.14)', // Translucent white container over blue toolbar
    containerBorder: 'rgba(255, 255, 255, 0.18)',
    activeFill: 'rgba(255, 255, 255, 0.28)',   // Lighter translucent white active tab
    hoverFill: 'rgba(255, 255, 255, 0.12)',    // Subtle hover fill
    textInactive: 'rgba(255, 255, 255, 0.85)', // 85% opacity white
    textActive: '#FFFFFF',                     // Bold pure white
    badgeBg: 'rgba(0, 0, 0, 0.25)',            // Readable count badge pill background
    badgeText: '#FFFFFF',                      // High contrast badge text
  },

  // Surfaces & Backgrounds
  bg: '#101214',                 // Page background
  panel: '#23272B',              // Panel card surface (fill-differentiated, no outer border)
  panelBorder: '#2F353B',        // Panel border token (subtle/divider fallback)
  panelHeaderBg: '#23272B',      // Panel header surface
  panelHeaderDivider: '#343B42', // Panel header 1px divider
  tableHeaderBg: '#2A3036',      // Slightly lighter charcoal for table sticky header
  tableRowDivider: '#2F353B',    // Table 1px row divider
  rowHover: '#2A3036',           // Table row hover state
  rowSelected: '#2F4B66',        // Table row selected muted blue

  // Typography
  textPrimary: '#FFFFFF',        // Primary text (>= 14:1 on panel)
  textSecondary: '#9AA4AD',      // Secondary / subheaders / table headers (>= 5.5:1 on panel)
  textMuted: '#6B747C',          // Muted labels / disabled states

  // Status Colors (Solid fills & high contrast texts >= 4.5:1 verified)
  status: {
    success: '#4CC38A',          // Nominal / Operational / Success
    nominal: '#4CC38A',          // Alias for success
    warn: '#F5C842',             // Warning / Medium risk
    critical: '#F0716B',         // Critical / High risk
    info: '#6BB6E8',             // Informational / Low risk
    stopped: '#6B747C',          // Stopped / Inactive / Offline
  },

  // Status Badge High-Contrast Container Fills (Calculated >= 4.5:1 contrast against text)
  statusFills: {
    success: {
      bg: '#113523',             // Dark green fill
      text: '#4CC38A',           // 6.09:1 contrast ratio
      border: 'rgba(76, 195, 138, 0.40)',
      contrastRatio: '6.09:1',
    },
    nominal: {
      bg: '#113523',
      text: '#4CC38A',           // 6.09:1 contrast ratio
      border: 'rgba(76, 195, 138, 0.40)',
      contrastRatio: '6.09:1',
    },
    warn: {
      bg: '#3D2E0B',             // Dark amber fill
      text: '#F5C842',           // 8.30:1 contrast ratio
      border: 'rgba(245, 200, 66, 0.40)',
      contrastRatio: '8.30:1',
    },
    medium: {
      bg: '#3D2E0B',
      text: '#F5C842',           // 8.30:1 contrast ratio
      border: 'rgba(245, 200, 66, 0.40)',
      contrastRatio: '8.30:1',
    },
    critical: {
      bg: '#3E1B19',             // Dark red fill
      text: '#F0716B',           // 5.29:1 contrast ratio
      border: 'rgba(240, 113, 107, 0.40)',
      contrastRatio: '5.29:1',
    },
    high: {
      bg: '#3E1B19',
      text: '#F0716B',           // 5.29:1 contrast ratio
      border: 'rgba(240, 113, 107, 0.40)',
      contrastRatio: '5.29:1',
    },
    info: {
      bg: '#122B3F',             // Dark blue-cyan fill
      text: '#6BB6E8',           // 6.57:1 contrast ratio
      border: 'rgba(107, 182, 232, 0.40)',
      contrastRatio: '6.57:1',
    },
    low: {
      bg: '#122B3F',
      text: '#6BB6E8',           // 6.57:1 contrast ratio
      border: 'rgba(107, 182, 232, 0.40)',
      contrastRatio: '6.57:1',
    },
    stopped: {
      bg: '#252A2E',             // Dark slate fill
      text: '#B0B8C0',           // 7.49:1 contrast ratio
      border: 'rgba(176, 184, 192, 0.30)',
      contrastRatio: '7.49:1',
    },
  },

  // Pill Fills (Calculated >= 4.5:1 contrast against text)
  pillFills: {
    live: {
      bg: '#0F341F',             // Solid dark green fill
      text: '#55DC99',           // High contrast bright green: 6.95:1
      dot: '#55DC99',
      contrastRatio: '6.95:1',
    },
    confidence: {
      bg: 'rgba(0, 0, 0, 0.40)', // Dark translucent pill
      text: '#FFFFFF',           // 14.2:1
      highlight: '#55DC99',      // 7.1:1
      contrastRatio: '14.2:1',
    },
    stub: {
      bg: '#2A3036',
      text: '#D4DCE4',           // 8.8:1
      contrastRatio: '8.8:1',
    },
    neutral: {
      bg: '#2A3036',
      text: '#D4DCE4',
      contrastRatio: '8.8:1',
    },
    outline: {
      bg: 'transparent',
      text: '#E2E8F0',
      border: '#3E464E',
      contrastRatio: '11.5:1',
    },
  },

  // KPI Accent Bars (in exact required order)
  kpiAccents: [
    '#2B5FC7',                   // 1: Deep Blue
    '#3F8FC9',                   // 2: Orbit Blue
    '#4FA8B8',                   // 3: Teal
    '#8AD6CF',                   // 4: Mint
    '#F6E27A',                   // 5: Yellow
  ] as const,

  // Chart Series Colors
  chart: {
    attempted: '#6BB6E8',        // info
    succeeded: '#4CC38A',        // success
    failed: '#F0716B',           // critical
  },

  // Map & Waypoints
  map: {
    waypoint: '#3B8FD9',         // Map waypoint marker blue
    path: '#3F8FC9',
    robot: '#F5C842',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: 'var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  fontSize: {
    xs: '12px',                  // 12px
    sm: '14px',                  // 14px - table headers, KPI labels
    base: '16px',                // 16px - body, panel titles
    lg: '18px',                  // 18px - panel titles (large/Orbit standard)
    title: '22px',               // 22px - SubToolbar contextual page title
    xl: '24px',                  // 24px - wordmark "SPOTSight"
    kpi: '40px',                 // 40px - big centered KPI values
  },
  lineHeight: {
    xs: '16px',
    sm: '20px',
    base: '24px',
    lg: '28px',
    title: '26px',
    xl: '32px',
    kpi: '44px',
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const spacing = {
  grid: 4,                       // 4px base grid
  heights: {
    topBar: '64px',              // Fixed 64px TopBar height
    subToolbar: '48px',          // Fixed 48px SubToolbar height
  },
  gap: {
    panel: '16px',               // Gap between panels
    pagePaddingMin: '16px',      // Page padding minimum
    pagePaddingMax: '24px',      // Page padding maximum
  },
} as const;

export const shapes = {
  borderRadius: {
    panel: '12px',               // Panel radius
    button: '8px',               // Button and pill radius
    pill: '8px',                 // Pill radius
    tabContainer: '10px',        // Segmented-tab container radius
    tabItem: '8px',              // Segmented-tab active item radius
    full: '9999px',              // Circular avatar / status dots
  },
  borderWidth: {
    default: '1px',              // 1px borders
    kpiBar: '4px',               // 4px bottom accent bar
  },
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  shapes,
} as const;

export type ColorsToken = typeof colors;
export type TypographyToken = typeof typography;
export type SpacingToken = typeof spacing;
export type ShapesToken = typeof shapes;

export type StatusType =
  | 'SUCCESS'
  | 'STOPPED'
  | 'WARN'
  | 'INFO'
  | 'NOMINAL'
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW';

export type KpiAccentIndex = 0 | 1 | 2 | 3 | 4 | 1 | 2 | 3 | 4 | 5;

export default tokens;
