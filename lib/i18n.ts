import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ko from '@/locales/ko.json';

// 화면 언어는 한국어 하나다 (CLAUDE.md 결정 #1). 문구를 한 파일에 모으려고 i18next 를 쓴다(형제 앱과 같은 방식).
void i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko } },
  lng: 'ko',
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
