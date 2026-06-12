import { useEffect, useRef, useState } from 'react'
import type { Character } from '../../types/project'
import { getAccessToken } from '../../stores/authStore'
import { uploadImage, getImageUrl } from '../../services/assets'

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
  const [tags, setTags] = useState<string[]>(character?.tags ?? [])
  const [portraitAssetId, setPortraitAssetId] = useState<string | null>(
    character?.portraitAssetId ?? null,
  )
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [nameError, setNameError] = useState(false)

  const [aliasInput, setAliasInput] = useState('')
  const [tagInput, setTagInput] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  // Load existing portrait
  useEffect(() => {
    if (!portraitAssetId) return
    const token = getAccessToken()
    if (!token) return
    getImageUrl(token, portraitAssetId).then(setPortraitUrl).catch(console.error)
  }, [portraitAssetId])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const token = getAccessToken()
    if (!token) return
    setUploading(true)
    try {
      const assetId = await uploadImage(token, file, bookFolderId)
      setPortraitAssetId(assetId)
      const url = await getImageUrl(token, assetId)
      setPortraitUrl(url)
    } catch (err) {
      console.error('Portrait upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  function handleAliasKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && aliasInput.trim()) {
      e.preventDefault()
      setAliases((prev) => [...prev, aliasInput.trim()])
      setAliasInput('')
    }
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      setTags((prev) => [...prev, tagInput.trim()])
      setTagInput('')
    }
  }

  function handleSubmit() {
    if (!name.trim()) {
      setNameError(true)
      return
    }
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#181c1e]">
            {isNew ? '新增角色' : '編輯角色'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Portrait */}
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full bg-[#f2f4ff] flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-[#c0c8ff] hover:border-[#7c6ee0] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {portraitUrl ? (
                <img src={portraitUrl} alt="portrait" className="w-full h-full object-cover" />
              ) : (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="12" r="5" stroke="#a0aec0" strokeWidth="1.5" />
                  <path d="M4 28c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#a0aec0" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-sm text-[#7c6ee0] hover:underline disabled:opacity-50"
              >
                {uploading ? '上傳中…' : '上傳肖像'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-xs text-gray-400 mt-0.5">建議正方形圖片</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#181c1e] mb-1">
              角色名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(false) }}
              placeholder="輸入角色名稱"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c6ee0] ${nameError ? 'border-red-400' : 'border-gray-200'}`}
            />
            {nameError && <p className="text-xs text-red-500 mt-1">請輸入角色名稱</p>}
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-[#181c1e] mb-1">標籤分類</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例如：主角、配角、反派"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c6ee0]"
            />
          </div>

          {/* Aliases */}
          <div>
            <label className="block text-sm font-medium text-[#181c1e] mb-1">別名</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {aliases.map((a, i) => (
                <span key={i} className="flex items-center gap-1 bg-[#f2f4ff] text-[#4c5354] rounded-full px-2.5 py-0.5 text-xs">
                  {a}
                  <button onClick={() => setAliases(aliases.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-400">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              onKeyDown={handleAliasKeyDown}
              placeholder="輸入後按 Enter 新增"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c6ee0]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#181c1e] mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="描述這個角色的背景、個性、外貌等…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c6ee0] resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[#181c1e] mb-1">標籤</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t, i) => (
                <span key={i} className="flex items-center gap-1 bg-[#e8eaff] text-[#7c6ee0] rounded-full px-2.5 py-0.5 text-xs">
                  {t}
                  <button onClick={() => setTags(tags.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-400">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="輸入後按 Enter 新增標籤"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c6ee0]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#4c5354] hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm bg-[#4c5354] text-white rounded-lg hover:bg-[#3a4041] transition-colors"
          >
            {isNew ? '新增' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  )
}
