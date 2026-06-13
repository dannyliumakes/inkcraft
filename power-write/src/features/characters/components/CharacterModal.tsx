import { useEffect, useRef, useState } from 'react'
import type { Character } from '../../../shared/types/project'
import { Button, Input, Textarea, TagInput } from '../../../shared/components/ui'
import { useImageUpload } from '../../../shared/hooks/useImageUpload'

interface Props {
  character?: Character | null
  bookFolderId: string
  totalCharacters: number
  onSave: (c: Character) => void
  onClose: () => void
}

export default function CharacterModal({
  character,
  bookFolderId,
  totalCharacters,
  onSave,
  onClose,
}: Props) {
  const isNew = !character

  const [name, setName] = useState(character?.name ?? '')
  const [label, setLabel] = useState(character?.label ?? '')
  const [description, setDescription] = useState(character?.description ?? '')
  const [aliases, setAliases] = useState<string[]>(character?.aliases ?? [])
  const [aliasInput, setAliasInput] = useState('')
  const [tags, setTags] = useState<string[]>(character?.tags ?? [])
  const [nameError, setNameError] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const { assetId: portraitAssetId, imageUrl: portraitUrl, uploading, handleFileChange } =
    useImageUpload(bookFolderId, character?.portraitAssetId)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleAliasKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && aliasInput.trim()) {
      e.preventDefault()
      setAliases((prev) => [...prev, aliasInput.trim()])
      setAliasInput('')
    }
  }

  function handleSubmit() {
    if (!name.trim()) { setNameError(true); return }
    const saved: Character = {
      id: character?.id ?? `char_${Date.now()}`,
      name: name.trim(),
      label: label.trim(),
      aliases,
      description,
      portraitAssetId,
      tags,
      order: character?.order ?? totalCharacters,
    }
    onSave(saved)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="section-title">{isNew ? '新增角色' : '編輯角色'}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="關閉">✕</Button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Portrait */}
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full bg-accent-light flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-accent-border hover:border-accent transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {portraitUrl ? (
                <img src={portraitUrl} alt="portrait" className="w-full h-full object-cover" />
              ) : (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="12" r="5" stroke="var(--color-placeholder)" strokeWidth="1.5" />
                  <path d="M4 28c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="var(--color-placeholder)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div>
              <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading} size="sm">
                {uploading ? '上傳中…' : '上傳肖像'}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <p className="text-xs text-gray-400 mt-0.5">建議正方形圖片</p>
            </div>
          </div>

          <Input
            label="角色名稱"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(false) }}
            placeholder="輸入角色名稱"
            error={nameError ? '請輸入角色名稱' : undefined}
          />
          <Input
            label="標籤分類"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="例如：主角、配角、反派"
          />

          <div>
            <label className="block text-sm font-medium text-primary mb-1">別名</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {aliases.map((a, i) => (
                <span key={i} className="flex items-center gap-1 bg-accent-light text-muted rounded-full px-2.5 py-0.5 text-xs">
                  {a}
                  <button onClick={() => setAliases(aliases.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-400">×</button>
                </span>
              ))}
            </div>
            <Input value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} onKeyDown={handleAliasKeyDown} placeholder="輸入後按 Enter 新增" />
          </div>

          <Textarea label="描述" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="描述這個角色的背景、個性、外貌等…" />
          <TagInput tags={tags} onChange={setTags} />
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit}>{isNew ? '新增' : '儲存'}</Button>
        </div>
      </div>
    </div>
  )
}
