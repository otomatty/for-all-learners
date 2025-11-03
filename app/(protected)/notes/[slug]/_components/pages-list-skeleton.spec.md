# PagesListSkeleton.spec.md

## Component Information

- **File Path**: `app/(protected)/notes/[slug]/_components/pages-list-skeleton.tsx`
- **Created**: 2025-11-04
- **Last Updated**: 2025-11-04
- **Category**: UI Component (Loading State)

---

## Specifications

### Purpose
Displays a loading skeleton for the pages list grid. Used during data fetching to provide visual feedback and reduce layout shift.

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `count` | `number` | ❌ No | `24` | Number of skeleton cards to display |
| `gridCols` | `string` | ❌ No | `"grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"` | Tailwind grid column classes |

### Features

1. **Default Skeleton Count**
   - Displays 24 skeleton cards by default (4 rows on large screens with 6 columns)
   - Provides balanced loading state

2. **Customizable Count**
   - Accepts `count` prop for dynamic skeleton count
   - Useful when actual page count is known

3. **Grid Layout**
   - Default matches `PagesList` component layout
   - Prevents layout shift when data loads
   - Supports custom grid configuration

4. **Skeleton Card Structure**
   - Each card contains:
     - One title skeleton (h-6, w-3/4)
     - Four full-width content skeletons (h-4)
     - One partial-width skeleton (h-4, w-2/3)
   - Uses `animate-pulse` for loading animation

---

## Test Cases

### TC-001: Default Skeleton Count
**Input**: No props provided
**Expected**: 
- Renders 24 skeleton cards
- Each card has unique key

### TC-002: Custom Count
**Input**: `count={12}`
**Expected**:
- Renders exactly 12 skeleton cards
- All cards have proper structure

### TC-003: Default Grid Columns
**Input**: No `gridCols` prop
**Expected**:
- Grid applies default classes: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`
- Matches `PagesList` component layout

### TC-004: Custom Grid Columns
**Input**: `gridCols="grid-cols-1 md:grid-cols-2"`
**Expected**:
- Grid applies custom column classes
- Responsive layout matches specification

### TC-005: Skeleton Card Structure
**Input**: Any valid count
**Expected**:
- Each card contains 6 Skeleton components
- Cards have proper styling classes:
  - `bg-background`
  - `p-4`
  - `border border-border`
  - `rounded-md`
  - `animate-pulse`
  - `space-y-2`

### TC-006: Zero Count Handling
**Input**: `count={0}`
**Expected**:
- Renders empty grid container
- No skeleton cards displayed

### TC-007: Large Count Handling
**Input**: `count={100}`
**Expected**:
- Renders all 100 skeleton cards
- Performance remains acceptable

---

## Implementation Notes

### Default Count Rationale
- 24 cards default = 4 rows × 6 columns (large screens)
- Balances visual feedback with performance
- Matches common page list sizes

### Grid Layout Consistency
- Matches `PagesList` default grid to prevent layout shift
- Customizable via `gridCols` prop for flexibility

### Skeleton Structure
- Mimics actual page card structure
- Provides consistent loading experience
- Uses Tailwind's `animate-pulse` for smooth animation

### Key Generation
- Uses array index for unique keys
- Format: `skeleton-${i}` (e.g., "skeleton-0", "skeleton-1")

---

## Dependencies

### External Dependencies
- `@/components/ui/skeleton` - Skeleton component from shadcn/ui

### Internal Dependencies
- None (self-contained component)

---

## Usage Examples

### Basic Usage (Default)
```tsx
import { PagesListSkeleton } from "./_components/pages-list-skeleton";

export function LoadingView() {
  return <PagesListSkeleton />;
}
```

### With Known Count
```tsx
export function LoadingView({ totalCount }: { totalCount: number }) {
  return <PagesListSkeleton count={Math.min(totalCount, 48)} />;
}
```

### Custom Grid Layout
```tsx
export function CompactLoadingView() {
  return (
    <PagesListSkeleton
      count={12}
      gridCols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    />
  );
}
```

---

## Related Files

- **Implementation**: `./pages-list-skeleton.tsx`
- **Tests**: `./pages-list-skeleton.test.tsx`
- **Related Component**: 
  - `./pages-list.tsx` - Actual pages list component
  - `components/notes/PagesList/PagesList.tsx` - Shared pages list component

---

## Migration Notes

### Previous Implementation
- Previously used fixed `SKELETON_COUNT = 36`
- Grid layout was `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` (missing `lg:grid-cols-6`)
- No customization options

### Current Implementation
- Dynamic count based on props
- Grid layout matches `PagesList` component
- Customizable via props for flexibility

---

## Future Improvements

- [ ] Add skeleton variants (compact, detailed)
- [ ] Optimize rendering for very large counts
- [ ] Add fade-in animation on mount
- [ ] Support skeleton card customization

---

**Author**: AI Assistant
**Last Updated**: 2025-11-04

