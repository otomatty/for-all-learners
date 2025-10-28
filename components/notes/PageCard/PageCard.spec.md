# PageCard.spec.md

## Component Overview

**Component Name:** PageCard
**Location:** `components/notes/PageCard.tsx`
**Type:** Pure UI Component (Presentational)
**Created:** 2025-10-27

## Purpose

A reusable, pure UI component for displaying page information in a card format. Supports multiple visual variants, optional thumbnails, content previews, and various interaction patterns (link-based or click-handler-based).

## Requirements

### Functional Requirements

#### FR-001: Basic Rendering
- **Description:** Card must render with a title
- **Priority:** Critical
- **Input:** `title` prop (string)
- **Output:** Card with title displayed in CardTitle component

#### FR-002: Thumbnail Display
- **Description:** Display thumbnail image when URL is provided
- **Priority:** High
- **Input:** `thumbnailUrl` prop (string | null)
- **Output:** Image component with proper dimensions (400x200, object-contain)

#### FR-003: Content Preview
- **Description:** Display text content preview when no thumbnail
- **Priority:** High
- **Input:** `contentPreview` prop (string)
- **Output:** Text content with line-clamp-5 styling

#### FR-004: Link Navigation
- **Description:** Make card clickable with Next.js Link when href provided
- **Priority:** High
- **Input:** `href` prop (string)
- **Output:** Card wrapped in Link component

#### FR-005: Click Handler
- **Description:** Support onClick handler when no href provided
- **Priority:** High
- **Input:** `onClick` prop (function)
- **Output:** Card wrapped in button with onClick

#### FR-006: Variant Support
- **Description:** Support multiple visual variants
- **Priority:** High
- **Variants:**
  - `default`: Standard card appearance
  - `highlighted`: Card with ring-2 ring-primary/20
  - `dashed`: Dashed border for creation actions
- **Input:** `variant` prop ("default" | "highlighted" | "dashed")
- **Output:** Card with appropriate CSS classes

#### FR-007: Image Security
- **Description:** Handle disallowed image domains
- **Priority:** Medium
- **Input:** `isImageAllowed` prop (boolean), `showSecurityWarning` prop (boolean)
- **Output:** Security warning message instead of image

#### FR-008: Dashed Variant Icon
- **Description:** Display icon in dashed variant cards
- **Priority:** Medium
- **Input:** `icon` prop (ReactNode), `variant="dashed"`
- **Output:** Icon displayed above title

#### FR-009: Custom Content
- **Description:** Support custom children content
- **Priority:** Low
- **Input:** `children` prop (ReactNode)
- **Output:** Children rendered in CardContent

#### FR-010: Keyboard Accessibility
- **Description:** Support keyboard navigation for interactive cards
- **Priority:** High
- **Input:** Enter or Space key on focused card with onClick
- **Output:** onClick handler triggered

### Non-Functional Requirements

#### NFR-001: Accessibility
- All interactive elements must be keyboard accessible
- Proper ARIA roles and attributes
- Alt text for images

#### NFR-002: Performance
- Optimized image loading with Next.js Image
- No unnecessary re-renders

#### NFR-003: Styling
- Consistent with shadcn/ui design system
- Responsive layout
- Smooth hover transitions

## Test Cases

### TC-001: Basic Rendering
**Description:** Verify card renders with title
**Input:**
```tsx
<PageCard title="Test Page" />
```
**Expected Output:**
- Card component is rendered
- Title "Test Page" is visible
- No thumbnail or content preview

**Test Type:** Unit
**Priority:** Critical

---

### TC-002: Thumbnail Display
**Description:** Verify thumbnail image is displayed
**Input:**
```tsx
<PageCard 
  title="Test Page" 
  thumbnailUrl="https://example.com/image.jpg"
/>
```
**Expected Output:**
- Image component is rendered
- src attribute is "https://example.com/image.jpg"
- alt attribute is "Test Page"
- Image has correct dimensions

**Test Type:** Unit
**Priority:** High

---

### TC-003: Content Preview Display
**Description:** Verify content preview when no thumbnail
**Input:**
```tsx
<PageCard 
  title="Test Page" 
  contentPreview="This is preview text"
/>
```
**Expected Output:**
- Text "This is preview text" is visible
- No image is rendered
- Text has line-clamp-5 class

**Test Type:** Unit
**Priority:** High

---

### TC-004: Link Navigation
**Description:** Verify card is clickable with Link
**Input:**
```tsx
<PageCard 
  title="Test Page" 
  href="/pages/123"
/>
```
**Expected Output:**
- Card is wrapped in Link component
- Link href is "/pages/123"
- Card is clickable

**Test Type:** Unit
**Priority:** High

---

### TC-005: Click Handler
**Description:** Verify onClick handler is called
**Input:**
```tsx
const handleClick = jest.fn();
<PageCard 
  title="Test Page" 
  onClick={handleClick}
/>
// User clicks card
```
**Expected Output:**
- handleClick is called once
- Card is wrapped in button element

**Test Type:** Unit
**Priority:** High

---

### TC-006: Default Variant
**Description:** Verify default variant styling
**Input:**
```tsx
<PageCard title="Test Page" variant="default" />
```
**Expected Output:**
- Card has base classes
- No ring or dashed border
- Standard hover shadow

**Test Type:** Unit
**Priority:** Medium

---

### TC-007: Highlighted Variant
**Description:** Verify highlighted variant styling
**Input:**
```tsx
<PageCard title="Test Page" variant="highlighted" />
```
**Expected Output:**
- Card has ring-2 ring-primary/20 class
- Standard card content layout

**Test Type:** Unit
**Priority:** Medium

---

### TC-008: Dashed Variant
**Description:** Verify dashed variant with icon
**Input:**
```tsx
<PageCard 
  title="Create Page" 
  variant="dashed"
  icon={<PlusCircle />}
  onClick={handleClick}
/>
```
**Expected Output:**
- Card has border-dashed border-2 class
- Icon is displayed
- Content is centered
- onClick works

**Test Type:** Unit
**Priority:** Medium

---

### TC-009: Image Security Warning
**Description:** Verify security warning for disallowed images
**Input:**
```tsx
<PageCard 
  title="Test Page" 
  thumbnailUrl="https://malicious.com/image.jpg"
  isImageAllowed={false}
  showSecurityWarning={true}
/>
```
**Expected Output:**
- Security warning message is displayed
- Image URL is shown in warning
- No actual image is rendered

**Test Type:** Unit
**Priority:** Medium

---

### TC-010: Custom Alt Text
**Description:** Verify custom thumbnail alt text
**Input:**
```tsx
<PageCard 
  title="Test Page" 
  thumbnailUrl="https://example.com/image.jpg"
  thumbnailAlt="Custom Alt Text"
/>
```
**Expected Output:**
- Image alt attribute is "Custom Alt Text"
- Not "Test Page"

**Test Type:** Unit
**Priority:** Low

---

### TC-011: Keyboard Accessibility
**Description:** Verify Enter key triggers onClick
**Input:**
```tsx
const handleClick = jest.fn();
<PageCard title="Test Page" onClick={handleClick} />
// User presses Enter key
```
**Expected Output:**
- handleClick is called once
- Same behavior as mouse click

**Test Type:** Unit
**Priority:** High

---

### TC-012: Custom Children
**Description:** Verify custom content is rendered
**Input:**
```tsx
<PageCard title="Test Page">
  <div data-testid="custom-content">Custom</div>
</PageCard>
```
**Expected Output:**
- Custom content is visible
- Content is within CardContent

**Test Type:** Unit
**Priority:** Low

---

### TC-013: Dashed Variant with Link
**Description:** Verify dashed variant can use href
**Input:**
```tsx
<PageCard 
  title="Create Page" 
  variant="dashed"
  href="/pages/new"
  icon={<PlusCircle />}
/>
```
**Expected Output:**
- Card is wrapped in Link
- href is "/pages/new"
- Dashed styling is applied

**Test Type:** Unit
**Priority:** Medium

---

### TC-014: Combined Thumbnail and Preview
**Description:** Verify thumbnail takes precedence over preview
**Input:**
```tsx
<PageCard 
  title="Test Page" 
  thumbnailUrl="https://example.com/image.jpg"
  contentPreview="This should not show"
/>
```
**Expected Output:**
- Image is displayed
- Content preview is not visible

**Test Type:** Unit
**Priority:** Medium

---

### TC-015: Empty Props
**Description:** Verify graceful handling of minimal props
**Input:**
```tsx
<PageCard title="Test Page" />
```
**Expected Output:**
- Card renders without errors
- Only title is visible
- No thumbnail or preview
- No interaction handlers

**Test Type:** Unit
**Priority:** High

---

## Implementation Notes

### Design Decisions

1. **Pure UI Component**: No data fetching, no business logic
2. **Flexible Interaction**: Supports both Link and onClick
3. **Variant System**: Extensible for future card types
4. **Image Security**: Built-in support for domain validation
5. **Accessibility First**: Keyboard navigation and ARIA support

### Performance Considerations

- Use Next.js Image for optimized loading
- Memoization not needed (pure UI, props-driven)
- CSS classes computed once per render

### Dependencies

- `@/components/ui/card` - shadcn/ui Card components
- `next/image` - Optimized image component
- `next/link` - Client-side navigation
- `react` - ReactNode, functional component

### Future Enhancements

- [ ] Support for loading state
- [ ] Support for error state
- [ ] Badge/tag display
- [ ] Card actions menu
- [ ] Animation variants
- [ ] Dark mode specific styling

## Related Documentation

- **Implementation**: `components/notes/PageCard.tsx`
- **Tests**: `components/notes/PageCard.test.tsx`
- **Usage Examples**:
  - `app/(protected)/pages/_components/pages-list.tsx`
  - `app/(protected)/pages/[id]/_components/target-page-card.tsx`
  - `app/(protected)/pages/[id]/_components/grouped-page-card.tsx`
  - `app/(protected)/pages/[id]/_components/create-page-card.tsx`

---

**Last Updated:** 2025-10-27
**Author:** AI (GitHub Copilot)
