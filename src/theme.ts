export const theme = {
  colors: {
    background: '#101716', surface: '#1A2422', accent: '#82D5BE',
    text: '#EDF4F0', muted: '#B0BFB8', line: '#35443E', danger: '#FFB4AB',
    accentBackground: '#213D33', goalSurface: '#192B25',
    onAccent: '#10382C', overlay: '#000000',
    warning: '#E2C28F', warningBackground: '#342E23', dangerBackground: '#392A29',
  },
  gradients: {
    hero: 'radial-gradient(ellipse at 85% 10%, rgba(130, 213, 190, 0.14) 0%, rgba(130, 213, 190, 0) 75%)',
    onboarding: 'linear-gradient(145deg, #294D40 0%, #152B24 60%, #101716 100%)',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 16, lg: 24, full: 9999 },
  type: { number: 64, title: 32, heading: 22, body: 16, caption: 13 },
  home: { number: 56, compactNumber: 44, goalLabel: 18, goalHeight: 56, introTitle: 24, numberLineHeight: 1.15 },
  result: { number: 40, icon: 40 },
  touch: 52,
  layout: { maxWidth: 560, dialogMaxHeight: 460, dialogActionMinWidth: 88, narrowWidth: 320, compactHeight: 680 },
  effects: { dialogBlur: 6 },
} as const;
