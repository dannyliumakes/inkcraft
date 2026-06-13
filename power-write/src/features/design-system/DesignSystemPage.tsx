import { useState } from 'react'
import { Button } from '../../shared/components/ui/Button'
import { Badge } from '../../shared/components/ui/Badge'
import { Input } from '../../shared/components/ui/Input'
import { Textarea } from '../../shared/components/ui/Textarea'
import { Spinner } from '../../shared/components/ui/Spinner'

// ─── Section wrapper ───────────────────────────────────────────────────────

const sectionStyles = {
  page:    'min-h-screen bg-surface px-8 py-12 max-w-5xl mx-auto',
  header:  'mb-12 pb-6 border-b border-gray-200',
  title:   'text-4xl font-bold text-primary mb-1',
  sub:     'text-secondary text-sm',
  section: 'mb-14',
  h2:      'section-title mb-6 pb-2 border-b border-gray-100',
  grid2:   'grid grid-cols-2 gap-4',
  grid3:   'grid grid-cols-3 gap-4',
  grid4:   'grid grid-cols-4 gap-4',
  label:   'field-label mb-1 block',
  swatch:  (bg: string) =>
    `${bg} rounded-xl h-14 w-full border border-black/5 shadow-sm`,
  swatchName: 'text-xs text-secondary mt-1.5 font-mono',
  row:     'flex flex-wrap items-center gap-3',
  box:     'bg-white rounded-2xl border border-gray-100 shadow-sm p-6',
  code:    'font-mono text-xs bg-gray-50 text-muted px-2 py-0.5 rounded',
}

// ─── Color token data ──────────────────────────────────────────────────────

const colorGroups = [
  {
    name: '主色系 Ink/Dark',
    tokens: [
      { label: 'primary',       bg: 'bg-primary',        css: '--color-primary',       hex: '#181c1e' },
      { label: 'primary-hover', bg: 'bg-primary-hover',  css: '--color-primary-hover', hex: '#2e3538' },
      { label: 'muted',         bg: 'bg-muted',          css: '--color-muted',          hex: '#4c5354' },
    ],
  },
  {
    name: '內文色 Text',
    tokens: [
      { label: 'body',        bg: 'bg-body',        css: '--color-body',        hex: '#1a1a1a' },
      { label: 'secondary',   bg: 'bg-secondary',   css: '--color-secondary',   hex: '#6d6d6d' },
      { label: 'placeholder', bg: 'bg-placeholder', css: '--color-placeholder', hex: '#a0aec0' },
    ],
  },
  {
    name: '強調色系 Accent/Purple',
    tokens: [
      { label: 'accent',        bg: 'bg-accent',        css: '--color-accent',        hex: '#7c6ee0' },
      { label: 'accent-hover',  bg: 'bg-accent-hover',  css: '--color-accent-hover',  hex: '#6a5ec8' },
      { label: 'accent-light',  bg: 'bg-accent-light',  css: '--color-accent-light',  hex: '#f2f4ff' },
      { label: 'accent-border', bg: 'bg-accent-border', css: '--color-accent-border', hex: '#c0c8ff' },
      { label: 'accent-soft',   bg: 'bg-accent-soft',   css: '--color-accent-soft',   hex: '#e8eaff' },
      { label: 'accent-softer', bg: 'bg-accent-softer', css: '--color-accent-softer', hex: '#e0e4ff' },
    ],
  },
  {
    name: '危險色 Danger',
    tokens: [
      { label: 'danger',       bg: 'bg-danger',       css: '--color-danger',       hex: '#ef4444' },
      { label: 'danger-hover', bg: 'bg-danger-hover', css: '--color-danger-hover', hex: '#dc2626' },
    ],
  },
  {
    name: '背景 Surface',
    tokens: [
      { label: 'surface', bg: 'bg-surface', css: '--color-surface', hex: '#f8f8f8' },
      { label: 'canvas',  bg: 'bg-canvas',  css: '--color-canvas',  hex: '#f9f9f8' },
    ],
  },
  {
    name: '書架裝飾 Shelf/Cover',
    tokens: [
      { label: 'cover',       bg: 'bg-cover',       css: '--color-cover',       hex: '#b0b8f0' },
      { label: 'cover-light', bg: 'bg-cover-light', css: '--color-cover-light', hex: '#d4d8f5' },
    ],
  },
]

// ─── Typography data ───────────────────────────────────────────────────────

const typographyTokens = [
  { cls: 'page-title',    label: 'page-title',    size: '--font-size-h1 (28px)',   desc: '頁面主標題，各功能頁 h1',    sample: '角色資料' },
  { cls: 'section-title', label: 'section-title', size: '--font-size-h2 (20px)',   desc: 'Modal / 區塊標題',           sample: '基本資訊' },
  { cls: 'card-title',    label: 'card-title',    size: '--font-size-h3 (16px)',   desc: '卡片標題',                   sample: '第一章・黎明' },
  { cls: 'field-label',   label: 'field-label',   size: '--font-size-h4 (14px)',   desc: '欄位標籤',                   sample: '角色名稱' },
]

// ─── Radius data ───────────────────────────────────────────────────────────

const radiusTokens = [
  { label: 'btn',   css: '--radius-btn',   value: '9999px', cls: 'rounded-full',   desc: '按鈕 pill' },
  { label: 'card',  css: '--radius-card',  value: '0.75rem', cls: 'rounded-xl',    desc: '卡片、modal' },
  { label: 'input', css: '--radius-input', value: '0.75rem', cls: 'rounded-xl',    desc: '輸入框' },
  { label: 'badge', css: '--radius-badge', value: '9999px', cls: 'rounded-full',   desc: 'Badge、tag' },
]

// ─── Main page ─────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  const [inputVal, setInputVal] = useState('')
  const [textareaVal, setTextareaVal] = useState('')

  return (
    <div className={sectionStyles.page}>
      {/* Header */}
      <header className={sectionStyles.header}>
        <h1 className={sectionStyles.title}>Design System</h1>
        <p className={sectionStyles.sub}>
          Power Write · 所有 token、元件、字型一覽。設計師可直接對照 <code className={sectionStyles.code}>src/index.css @theme</code> 編輯數值，改動即時反映於此頁。
        </p>
      </header>

      {/* ── 1. Color Tokens ───────────────────────────────────────── */}
      <section className={sectionStyles.section}>
        <h2 className={sectionStyles.h2}>🎨 Color Tokens</h2>
        <div className="flex flex-col gap-8">
          {colorGroups.map((group) => (
            <div key={group.name}>
              <p className={sectionStyles.label}>{group.name}</p>
              <div className="flex flex-wrap gap-4">
                {group.tokens.map((t) => (
                  <div key={t.label} className="w-28">
                    <div className={sectionStyles.swatch(t.bg)} />
                    <p className={sectionStyles.swatchName}>
                      {t.label}<br />
                      <span className="text-placeholder">{t.hex}</span>
                    </p>
                    <p className="font-mono text-[10px] text-placeholder">{t.css}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. Typography ─────────────────────────────────────────── */}
      <section className={sectionStyles.section}>
        <h2 className={sectionStyles.h2}>✏️ Typography</h2>
        <div className={sectionStyles.box}>
          <div className="flex flex-col gap-6">
            {typographyTokens.map((t) => (
              <div key={t.cls} className="flex items-baseline justify-between border-b border-gray-50 pb-5 last:border-0 last:pb-0">
                <div className="flex-1">
                  <span className={t.cls}>{t.sample}</span>
                </div>
                <div className="text-right ml-6 shrink-0">
                  <code className={sectionStyles.code}>.{t.label}</code>
                  <p className="text-xs text-placeholder mt-0.5">{t.size}</p>
                  <p className="text-xs text-secondary">{t.desc}</p>
                </div>
              </div>
            ))}
            {/* Body text */}
            <div className="flex items-baseline justify-between border-t border-gray-100 pt-5">
              <p className="text-body text-sm leading-relaxed max-w-xs">
                這是一段內文範例，用於編輯器主要文字顯示。字體大小 16px，行高 1.8。
              </p>
              <div className="text-right ml-6 shrink-0">
                <code className={sectionStyles.code}>text-body</code>
                <p className="text-xs text-placeholder mt-0.5">16px / line-height 1.8</p>
                <p className="text-xs text-secondary">編輯器主要內文</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Border Radius ──────────────────────────────────────── */}
      <section className={sectionStyles.section}>
        <h2 className={sectionStyles.h2}>⬛ Border Radius</h2>
        <div className="flex flex-wrap gap-6">
          {radiusTokens.map((r) => (
            <div key={r.label} className="flex flex-col items-center gap-3">
              <div className={`w-20 h-20 bg-accent-soft border-2 border-accent-border ${r.cls}`} />
              <div className="text-center">
                <code className={sectionStyles.code}>{r.css}</code>
                <p className="text-xs text-secondary mt-0.5">{r.value}</p>
                <p className="text-xs text-placeholder">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Button ─────────────────────────────────────────────── */}
      <section className={sectionStyles.section}>
        <h2 className={sectionStyles.h2}>🔘 Button</h2>
        <div className={sectionStyles.box}>
          <div className="flex flex-col gap-6">
            <div>
              <p className={sectionStyles.label}>Variants</p>
              <div className={sectionStyles.row}>
                <Button variant="primary">Primary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>
            <div>
              <p className={sectionStyles.label}>Sizes</p>
              <div className={sectionStyles.row}>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
              </div>
            </div>
            <div>
              <p className={sectionStyles.label}>States</p>
              <div className={sectionStyles.row}>
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button variant="ghost" disabled>Ghost Disabled</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Badge ──────────────────────────────────────────────── */}
      <section className={sectionStyles.section}>
        <h2 className={sectionStyles.h2}>🏷 Badge</h2>
        <div className={sectionStyles.box}>
          <p className={sectionStyles.label}>Variants</p>
          <div className={sectionStyles.row}>
            <Badge variant="default">Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
          </div>
        </div>
      </section>

      {/* ── 6. Input & Textarea ───────────────────────────────────── */}
      <section className={sectionStyles.section}>
        <h2 className={sectionStyles.h2}>📝 Input & Textarea</h2>
        <div className={sectionStyles.box}>
          <div className="flex flex-col gap-6">
            <div className={sectionStyles.grid2}>
              <Input
                label="Normal"
                placeholder="輸入文字…"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
              />
              <Input
                label="With Error"
                placeholder="輸入文字…"
                error="這是錯誤訊息"
              />
            </div>
            <Textarea
              label="Textarea"
              placeholder="輸入多行內容…"
              value={textareaVal}
              onChange={(e) => setTextareaVal(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </section>

      {/* ── 7. Spinner ────────────────────────────────────────────── */}
      <section className={sectionStyles.section}>
        <h2 className={sectionStyles.h2}>⏳ Spinner</h2>
        <div className={sectionStyles.box}>
          <p className={sectionStyles.label}>Sizes</p>
          <div className={sectionStyles.row + ' items-center'}>
            <div className="flex flex-col items-center gap-2">
              <Spinner size="sm" />
              <span className="text-xs text-secondary">sm</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner size="md" />
              <span className="text-xs text-secondary">md</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner size="lg" />
              <span className="text-xs text-secondary">lg</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Text Colors ────────────────────────────────────────── */}
      <section className={sectionStyles.section}>
        <h2 className={sectionStyles.h2}>🖊 Text Color Utilities</h2>
        <div className={sectionStyles.box}>
          <div className="flex flex-col gap-3">
            {[
              { cls: 'text-primary',     label: 'text-primary',     sample: '主要文字，按鈕標題' },
              { cls: 'text-muted',       label: 'text-muted',       sample: '次要文字，icon，ghost 按鈕' },
              { cls: 'text-body',        label: 'text-body',        sample: '編輯器內文' },
              { cls: 'text-secondary',   label: 'text-secondary',   sample: '說明文字，時間戳' },
              { cls: 'text-placeholder', label: 'text-placeholder', sample: 'Placeholder，空狀態' },
              { cls: 'text-accent',      label: 'text-accent',      sample: '強調色，tag，進度條' },
              { cls: 'text-danger',      label: 'text-danger',      sample: '危險色，錯誤訊息' },
            ].map(({ cls, label, sample }) => (
              <div key={cls} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className={`${cls} text-sm font-medium`}>{sample}</span>
                <code className={sectionStyles.code}>.{label}</code>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
