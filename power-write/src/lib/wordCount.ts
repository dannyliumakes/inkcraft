/**
 * CJK-aware word counter.
 *
 * Rules:
 * - CJK characters each count as 1 word
 * - ASCII words (sequences of [a-zA-Z0-9]) count as 1 per token
 * - Punctuation is ignored
 */
export function countWords(text: string): number {
  if (!text) return 0

  // CJK ranges:
  // 一-鿿  U+4E00–U+9FFF  CJK Unified Ideographs
  // 㐀-䶿  U+3400–U+4DBF  CJK Unified Ideographs Extension A
  // 豈-﫿  U+F900–U+FAFF  CJK Compatibility Ideographs (and more)
  // ぀-ゟ  U+3040–U+309F  Hiragana
  // ゠-ヿ  U+30A0–U+30FF  Katakana
  // 가-힯  U+AC00–U+D7AF  Hangul Syllables
  const cjkRegex = /[一-鿿㐀-䶿豈-﫿぀-ゟ゠-ヿ가-힯]/g
  const asciiWordRegex = /[a-zA-Z0-9]+/g

  const cjkMatches = text.match(cjkRegex)
  const asciiMatches = text.match(asciiWordRegex)

  const cjkCount = cjkMatches ? cjkMatches.length : 0
  const asciiCount = asciiMatches ? asciiMatches.length : 0

  return cjkCount + asciiCount
}

export function countChars(text: string): number {
  return text.length
}
