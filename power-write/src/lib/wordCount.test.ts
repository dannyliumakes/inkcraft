import { describe, it, expect } from 'vitest'
import { countWords } from './wordCount'

describe('countWords', () => {
  it('pure Chinese: "你好世界" → 4', () => {
    expect(countWords('你好世界')).toBe(4)
  })

  it('pure English: "hello world" → 2', () => {
    expect(countWords('hello world')).toBe(2)
  })

  it('mixed: "Hello 世界" → 3', () => {
    expect(countWords('Hello 世界')).toBe(3)
  })

  it('punctuation only: "，。！" → 0', () => {
    expect(countWords('，。！')).toBe(0)
  })

  it('mixed with punctuation: "Hello，世界！" → 3', () => {
    expect(countWords('Hello，世界！')).toBe(3)
  })
})
