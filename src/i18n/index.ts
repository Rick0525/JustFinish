import { useMemo } from 'react'
import { zh } from './zh'
import { en } from './en'

export type TranslationKey = keyof typeof zh

/** 检测浏览器语言，返回 'zh' 或 'en' */
function detectLanguage(): 'zh' | 'en' {
  const lang = navigator.language || 'en'
  return lang.startsWith('zh') ? 'zh' : 'en'
}

const translations = { zh, en }

/** 获取当前语言的翻译 */
export function getT() {
  const lang = detectLanguage()
  return translations[lang]
}

/** React hook：获取当前语言的翻译对象 */
export function useT() {
  return useMemo(() => getT(), [])
}

/** 获取当前语言 */
export function getLang() {
  return detectLanguage()
}
