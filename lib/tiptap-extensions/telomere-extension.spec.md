# Telomere Extension Specification

**Created**: 2025-11-16  
**Status**: Implemented  
**Related Issue**: https://github.com/otomatty/for-all-learners/issues/139

## Overview

The Telomere Extension adds visual indicators to TipTap editor block elements to show:
- **Line age**: Lines get thinner as they age (based on `updatedAt` timestamp)
- **Unread lines**: Lines updated after the last visit are shown in green
- **Minimum width**: Lines never completely disappear (minimum 1px)

This feature is inspired by Cosense (Scrapbox) telomere functionality.

## Requirements

### Functional Requirements

- **FR-001**: The extension MUST add `updatedAt` attribute to all block elements (paragraph, heading, listItem, blockquote, codeBlock)
- **FR-002**: The extension MUST automatically update `updatedAt` when block elements are modified
- **FR-003**: The extension MUST calculate telomere width based on elapsed time since `updatedAt`
- **FR-004**: The extension MUST apply visual styles (border width and color) to block elements based on telomere calculation
- **FR-005**: The extension MUST show unread lines (updated after `lastVisitedAt`) in green
- **FR-006**: The extension MUST show read lines in gray
- **FR-007**: The extension MUST maintain minimum border width of 1px (lines never completely disappear)
- **FR-008**: The extension MUST apply styles via DOM manipulation after rendering

### Technical Requirements

- **TR-001**: The extension MUST use TipTap's `addGlobalAttributes` to add `updatedAt` to block elements
- **TR-002**: The extension MUST use ProseMirror plugin's `appendTransaction` to update `updatedAt` on content changes
- **TR-003**: The extension MUST use ProseMirror plugin's `view` property to apply styles to DOM elements
- **TR-004**: The extension MUST use `getTelomereStyle` from `lib/utils/telomere-calculator.ts` for style calculation
- **TR-005**: The extension MUST accept `lastVisitedAt` as an option to determine unread lines

## Time Intervals for Width Calculation

The telomere width decreases by 1px at the following intervals:
- 0 hours
- 1 hour
- 2 hours
- 6 hours
- 8 hours
- 12 hours
- 24 hours
- 72 hours (3 days)
- 7 days
- 30 days
- 60 days
- 90 days
- 180 days
- ~1 year

Maximum width is 14px (number of intervals), minimum width is 1px.

## Test Cases

### TC-001: UpdatedAt Attribute Addition
- **Given**: A page with block elements
- **When**: The page is loaded
- **Then**: All block elements should have `data-updated-at` attribute

### TC-002: UpdatedAt Auto-Update
- **Given**: A block element with `updatedAt` attribute
- **When**: The block element is modified
- **Then**: The `updatedAt` attribute should be updated to current timestamp

### TC-003: Telomere Width Calculation
- **Given**: A block element with `updatedAt` of 2 hours ago
- **When**: The telomere style is calculated
- **Then**: The border width should be 12px (14 - 2 = 12)

### TC-004: Unread Line Detection
- **Given**: A block element updated 1 hour ago, last visit was 2 hours ago
- **When**: The telomere style is calculated
- **Then**: The border color should be green

### TC-005: Read Line Detection
- **Given**: A block element updated 3 hours ago, last visit was 2 hours ago
- **When**: The telomere style is calculated
- **Then**: The border color should be gray

### TC-006: Minimum Width
- **Given**: A block element with `updatedAt` of 2 years ago
- **When**: The telomere style is calculated
- **Then**: The border width should be 1px (minimum)

## Related Files

- Implementation: `lib/tiptap-extensions/telomere-extension.ts`
- Calculator: `lib/utils/telomere-calculator.ts`
- Integration: `components/pages/_hooks/usePageEditorLogic.ts`
- Page Visits: `app/_actions/page-visits.ts`

## Related Documentation

- Issue: https://github.com/otomatty/for-all-learners/issues/139
- Plan: `docs/03_plans/telomere-feature/20251116_01_implementation-plan.md`

