# PagesList.spec.md

## Component Information

- **File Path**: `components/notes/PagesList/PagesList.tsx`
- **Created**: 2025-10-28
- **Last Updated**: 2025-10-28
- **Category**: UI Component

---

## Specifications

### Purpose
Displays a grid of pages with thumbnails and text previews. Used across multiple note views.

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `pages` | `PageRow[]` | ✅ Yes | - | Array of page records to display |
| `slug` | `string` | ❌ No | `"all-pages"` | Note slug for generating links |
| `gridCols` | `string` | ❌ No | `"grid-cols-2 sm:grid-cols-3 md:grid-cols-4"` | Tailwind grid column classes |

### Features

1. **Empty State Display**
   - Shows message when no pages exist
   - Provides guidance to create pages

2. **Page Cards**
   - Displays page title
   - Shows thumbnail if available
   - Falls back to text preview
   - Security warning for external images

3. **Link Generation**
   - Generates links to `/notes/[slug]/[id]`
   - Defaults to `/notes/all-pages/[id]` for backward compatibility

4. **Responsive Grid**
   - Default: 2 cols on mobile, 3 on tablet, 4 on desktop
   - Customizable via `gridCols` prop

---

## Test Cases

### TC-001: Empty State Display
**Input**: Empty pages array `[]`
**Expected**: 
- Displays "ページがありません" message
- Shows guidance text

### TC-002: Page Cards Rendering
**Input**: Array with 2 pages
**Expected**:
- Renders 2 page cards
- Each card displays page title
- Cards are clickable links

### TC-003: Default Slug
**Input**: Pages without slug prop
**Expected**:
- Links use `/notes/all-pages/[id]` format
- Backward compatibility maintained

### TC-004: Custom Slug
**Input**: Pages with `slug="my-note"`
**Expected**:
- Links use `/notes/my-note/[id]` format

### TC-005: Custom Grid Columns
**Input**: `gridCols="grid-cols-1 md:grid-cols-2"`
**Expected**:
- Grid applies custom column classes
- Responsive layout matches specification

### TC-006: Thumbnail Display
**Input**: Page with valid `thumbnail_url`
**Expected**:
- Displays image using Next.js Image component
- Image has proper alt text

### TC-007: Text Preview Fallback
**Input**: Page without thumbnail
**Expected**:
- Extracts and displays text from Tiptap content
- Text is truncated with `line-clamp-5`

### TC-008: Security Warning
**Input**: Page with external image URL
**Expected**:
- Checks domain with `isAllowedImageDomain`
- Shows warning for disallowed domains

---

## Implementation Notes

### Text Extraction Algorithm
```typescript
function extractTextFromTiptap(node: Json): string {
  // Recursively extracts text from Tiptap JSON
  // Handles text nodes, paragraphs, lists, etc.
}
```

### Link Structure
```
/notes/[slug]/[pageId]
     ├─ slug: Note identifier (default: "all-pages")
     └─ pageId: Page UUID or title
```

### Grid Responsiveness
- Mobile (default): 2 columns
- Tablet (sm): 3 columns
- Desktop (md): 4 columns
- Can be overridden via `gridCols` prop

---

## Dependencies

### External Dependencies
- `next/link` - Client-side navigation
- `next/image` - Optimized image loading
- `@/components/ui/card` - Card component
- `@/lib/utils/domainValidation` - Image domain validation

### Internal Dependencies
- `@/types/database.types` - Supabase type definitions

---

## Usage Examples

### Basic Usage (All Pages)
```tsx
import { PagesList } from "@/components/notes/PagesList";

export function AllPagesView({ pages }) {
  return <PagesList pages={pages} />;
}
```

### Specific Note
```tsx
export function NoteView({ pages, noteSlug }) {
  return <PagesList pages={pages} slug={noteSlug} />;
}
```

### Custom Grid
```tsx
export function CompactView({ pages }) {
  return (
    <PagesList
      pages={pages}
      gridCols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    />
  );
}
```

---

## Related Files

- **Implementation**: `./PagesList.tsx`
- **Tests**: `./PagesList.test.tsx`
- **Index**: `./index.ts`
- **Usage**: 
  - `app/(protected)/notes/[slug]/_components/pages-list.tsx`
  - `app/(protected)/pages/_components/pages-list.tsx` (deprecated)

---

## Migration Notes

### From `/pages` Component
- Previously used `PageCard` component
- Now uses inline Card components for consistency
- Default slug ensures backward compatibility

### From `/notes/[slug]` Component
- Unified implementation
- Removed duplicate code
- Enhanced with optional props

---

## Future Improvements

- [ ] Add sorting options (by date, title, etc.)
- [ ] Add filtering capabilities
- [ ] Implement virtualization for large lists
- [ ] Add drag-and-drop reordering
- [ ] Support different view modes (grid, list, compact)

---

**Author**: AI Assistant (GitHub Copilot)
**Last Updated**: 2025-10-28
