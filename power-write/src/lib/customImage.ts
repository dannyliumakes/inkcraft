import Image from '@tiptap/extension-image'

/**
 * CustomImage extends Tiptap's Image with two extra attributes:
 *   - assetId : Drive file ID, persisted in markdown as `drive:ASSET_ID`
 *   - caption  : alt-text / figcaption text
 *
 * Markdown serialization: tiptap-markdown does NOT automatically carry
 * custom attributes, so we use the `drive:ASSET_ID` URL convention.
 * ManuscriptPage transforms drive: → blob URL on load, and blob: → drive:
 * before saving.
 */
export const CustomImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-asset-id') ?? null,
        renderHTML: (attributes) =>
          attributes.assetId ? { 'data-asset-id': attributes.assetId } : {},
      },
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption') ?? '',
        renderHTML: (attributes) =>
          attributes.caption ? { 'data-caption': attributes.caption } : {},
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const { assetId, caption, ...rest } = HTMLAttributes
    return [
      'figure',
      { class: 'image-figure' },
      ['img', { ...rest, ...(assetId ? { 'data-asset-id': assetId } : {}) }],
      ['figcaption', { class: 'image-caption' }, caption ?? ''],
    ]
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-asset-id]',
        getAttrs: (el) => ({
          src: (el as HTMLElement).getAttribute('src'),
          assetId: (el as HTMLElement).getAttribute('data-asset-id'),
          caption: (el as HTMLElement).getAttribute('data-caption') ?? '',
        }),
      },
      // Also parse plain <img> (no assetId) for pasted images
      {
        tag: 'img[src]',
        getAttrs: (el) => ({
          src: (el as HTMLElement).getAttribute('src'),
          assetId: null,
          caption: '',
        }),
      },
    ]
  },
})
