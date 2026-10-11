import type { Config } from 'tailwindcss';
import { colors, shapes, typography } from './src/styles/tokens';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: colors.navy,
          dark: colors.navyDark,
          light: colors.navyLight,
        },
        'orbit-blue': {
          DEFAULT: colors.orbitBlue,
          dark: colors.orbitBlueDark,
          light: colors.orbitBlueLight,
        },
        'orbit-bg': colors.bg,
        panel: {
          DEFAULT: colors.panel,
          border: colors.panelBorder,
          headerDivider: colors.panelHeaderDivider,
        },
        'row-hover': colors.rowHover,
        'row-selected': colors.rowSelected,
        'text-primary': colors.textPrimary,
        'text-secondary': colors.textSecondary,
        'text-muted': colors.textMuted,
        status: {
          success: colors.status.success,
          nominal: colors.status.nominal,
          warn: colors.status.warn,
          critical: colors.status.critical,
          info: colors.status.info,
          stopped: colors.status.stopped,
        },
        kpi: {
          1: colors.kpiAccents[0],
          2: colors.kpiAccents[1],
          3: colors.kpiAccents[2],
          4: colors.kpiAccents[3],
          5: colors.kpiAccents[4],
        },
        chart: {
          attempted: colors.chart.attempted,
          succeeded: colors.chart.succeeded,
          failed: colors.chart.failed,
        },
        'map-waypoint': colors.map.waypoint,
      },
      fontFamily: {
        sans: [typography.fontFamily.sans],
      },
      fontSize: {
        xs: [typography.fontSize.xs, { lineHeight: typography.lineHeight.xs }],
        sm: [typography.fontSize.sm, { lineHeight: typography.lineHeight.sm }],
        base: [typography.fontSize.base, { lineHeight: typography.lineHeight.base }],
        lg: [typography.fontSize.lg, { lineHeight: typography.lineHeight.lg }],
        xl: [typography.fontSize.xl, { lineHeight: typography.lineHeight.xl }],
        kpi: [typography.fontSize.kpi, { lineHeight: typography.lineHeight.kpi }],
      },
      borderRadius: {
        panel: shapes.borderRadius.panel,
        button: shapes.borderRadius.button,
        pill: shapes.borderRadius.pill,
        'tab-container': shapes.borderRadius.tabContainer,
        'tab-item': shapes.borderRadius.tabItem,
      },
      zIndex: {
        'map-content': '10',
        'map-overlays': '100',
        'sub-toolbar': '190',
        navbar: '200',
        drawer: '300',
        popover: '350',
        toast: '400',
        'modal-backdrop': '500',
        modal: '510',
        tooltip: '600',
      },
    },
  },
  plugins: [],
};

export default config;
