import { useRef, useState } from 'react'
import type { Character, Project } from '../../../shared/types/project'
import { Button, Input, Textarea, TagInput } from '../../../shared/components/ui'
import { useImageUpload } from '../../../shared/hooks/useImageUpload'
import { getAccessToken } from '../../../shared/stores/authStore'
import { saveProject } from '../../../shared/services/projectRepo'

interface Props {
  project: Project
  bookFolderId: string  // passed to useImageUpload for portrait uploads
  onProjectUpdate: (p: Project) => void
}

// ── List item ─────────────────────────────────────────────────────────────────

const listStyles = {
  root: 'flex flex-col h-full min-h-0',
  header: 'flex items-center justify-between px-3 py-2 shrink-0',
  label: 'text-xs font-semibold text-placeholder uppercase tracking-wide',
  list: 'flex-1 overflow-y-auto',
  item: 'flex items-center gap-2 px-3 py-2 hover:bg-accent-light cursor-pointer transition-colors',
  avatar: 'w-7 h-7 rounded-full bg-accent-light shrink-0 overflow-hidden flex items-center justify-center',
  info: 'flex-1 min-w-0',
  name: 'text-sm text-primary truncate leading-tight',
  desc: 'text-xs text-placeholder truncate leading-tight',
  empty: 'px-3 py-4 text-xs text-placeholder',
}

function AvatarPlaceholder() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="12" r="5" stroke="var(--color-placeholder)" strokeWidth="2" />
      <path d="M4 28c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="var(--color-placeholder)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── Detail / edit view ────────────────────────────────────────────────────────

const detailStyles = {
  root: 'flex flex-col h-full min-h-0',
  header: 'flex items-center gap-2 px-3 py-2 border-b border-gray-100 shrink-0',
  backBtn: 'w-6 h-6 flex items-center justify-center rounded hover:bg-accent-light text-muted transition-colors',
  title: 'text-sm font-medium text-primary truncate flex-1',
  body: 'flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3',
  portraitRow: 'flex items-center gap-3',
  portraitBtn: 'w-14 h-14 rounded-full bg-accent-light flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-accent-border hover:border-accent transition-colors shrink-0',
  portraitHint: 'text-xs text-placeholder',
  aliasLabel: 'block text-xs font-medium text-primary mb-1',
  aliasList: 'flex flex-wrap gap-1 mb-1',
  aliasTag: 'flex items-center gap-0.5 bg-accent-light text-muted rounded-full px-2 py-0.5 text-xs',
  aliasRemove: 'text-placeholder hover:text-danger leading-none',
  footer: 'shrink-0 flex justify-end gap-2 px-3 py-2 border-t border-gray-100',
}

interface DetailProps {
  character: Character
  bookFolderId: string
  onBack: () => void
  onSave: (c: Character) => void
}

function CharacterDetailEditor({ character, bookFolderId, onBack, onSave }: DetailProps) {
  const [name, setName] = useState(character.name)
  const [label, setLabel] = useState(character.label)
  const [description, setDescription] = useState(character.description)
  const [aliases, setAliases] = useState<string[]>(character.aliases)
  const [aliasInput, setAliasInput] = useState('')
  const [tags, setTags] = useState<string[]>(character.tags)
  const [nameError, setNameError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { assetId: portraitAssetId, imageUrl: portraitUrl, uploading, handleFileChange } =
    useImageUpload(bookFolderId, character.portraitAssetId)

  function handleAliasKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && aliasInput.trim()) {
      e.preventDefault()
      setAliases((prev) => [...prev, aliasInput.trim()])
      setAliasInput('')
    }
  }

  function handleSubmit() {
    if (!name.trim()) { setNameError(true); return }
    onSave({
      ...character,
      name: name.trim(),
      label: label.trim(),
      aliases,
      description,
      portraitAssetId,
      tags,
    })
  }

  return (
    <div className={detailStyles.root}>
      <div className={detailStyles.header}>
        <button className={detailStyles.backBtn} onClick={onBack} aria-label="返回">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className={detailStyles.title}>{character.name || '未命名角色'}</span>
      </div>

      <div className={detailStyles.body}>
        <div className={detailStyles.portraitRow}>
          <div className={detailStyles.portraitBtn} onClick={() => fileRef.current?.click()}>
            {portraitUrl ? (
              <img src={portraitUrl} alt="portrait" className="w-full h-full object-cover" />
            ) : (
              <AvatarPlaceholder />
            )}
          </div>
          <div>
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? '上傳中…' : '上傳肖像'}
            </Button>
            <p className={detailStyles.portraitHint}>建議正方形圖片</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
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
          <label className={detailStyles.aliasLabel}>別名</label>
          <div className={detailStyles.aliasList}>
            {aliases.map((a, i) => (
              <span key={i} className={detailStyles.aliasTag}>
                {a}
                <button onClick={() => setAliases(aliases.filter((_, j) => j !== i))} className={detailStyles.aliasRemove}>×</button>
              </span>
            ))}
          </div>
          <Input
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            onKeyDown={handleAliasKeyDown}
            placeholder="輸入後按 Enter 新增"
          />
        </div>

        <Textarea
          label="描述"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="描述這個角色的背景、個性、外貌等…"
        />
        <TagInput tags={tags} onChange={setTags} />
      </div>

      <div className={detailStyles.footer}>
        <Button variant="ghost" size="sm" onClick={onBack}>取消</Button>
        <Button size="sm" onClick={handleSubmit}>儲存</Button>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function SidebarCharacterPanel({ project, bookFolderId, onProjectUpdate }: Props) {
  const [selectedChar, setSelectedChar] = useState<Character | null>(null)

  async function handleSave(updated: Character) {
    const token = getAccessToken()
    if (!token) return
    const newProject: Project = {
      ...project,
      characters: project.characters.map((c) => c.id === updated.id ? updated : c),
    }
    onProjectUpdate(newProject)
    await saveProject(token, newProject)
    setSelectedChar(null)
  }

  if (selectedChar) {
    return (
      <CharacterDetailEditor
        character={selectedChar}
        bookFolderId={bookFolderId}
        onBack={() => setSelectedChar(null)}
        onSave={handleSave}
      />
    )
  }

  return (
    <div className={listStyles.root}>
      <div className={listStyles.header}>
        <span className={listStyles.label}>角色</span>
      </div>
      <div className={listStyles.list}>
        {project.characters.length === 0 ? (
          <p className={listStyles.empty}>尚無角色</p>
        ) : (
          project.characters.map((ch) => (
            <div key={ch.id} className={listStyles.item} onClick={() => setSelectedChar(ch)}>
              <div className={listStyles.avatar}>
                <AvatarPlaceholder />
              </div>
              <div className={listStyles.info}>
                <p className={listStyles.name}>{ch.name}</p>
                {ch.description && <p className={listStyles.desc}>{ch.description}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
