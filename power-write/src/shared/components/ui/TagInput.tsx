import { useState, type KeyboardEvent } from 'react'
import { Badge } from './Badge'
import { Input } from './Input'
import { Button } from './Button'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ tags, onChange, placeholder = '輸入後按 Enter 新增' }: TagInputProps) {
  const [input, setInput] = useState('')

  function addTag() {
    const t = input.trim()
    if (t && !tags.includes(t)) {
      onChange([...tags, t])
    }
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <Badge>{t}</Badge>
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="text-placeholder hover:text-danger text-xs leading-none"
              aria-label={`移除標籤 ${t}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <Button variant="ghost" type="button" onClick={addTag}>
          新增
        </Button>
      </div>
    </div>
  )
}