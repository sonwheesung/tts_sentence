// 토큰 정본 (docs/UI_GUIDE.md §2). 화면 코드는 색·수치 리터럴 대신 이것만 쓴다.
// 시니어 기준으로 형제 앱보다 글자와 누르는 영역을 크게 잡았다 (CLAUDE.md 기둥 4).

export const COLOR = {
  background: '#FFFFFF',
  surface: '#F4F6F8',
  surfaceStrong: '#E7EBF0',
  text: '#111827',
  textSub: '#4B5563',
  textFaint: '#6B7280',
  border: '#D9DEE5',
  primary: '#2563EB',
  primaryText: '#FFFFFF',
  primarySoft: '#E0EAFF',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
  adSlot: '#E5E7EB',
} as const;

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const RADIUS = 14;

/** 누르는 영역 최소 (UI_GUIDE.md §2) */
export const TOUCH = 56;

export const TYPE = {
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 20, fontWeight: '700' },
  sentence: { fontSize: 20, lineHeight: 30, fontWeight: '400' },
  body: { fontSize: 18, lineHeight: 26, fontWeight: '400' },
  button: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
} as const;
