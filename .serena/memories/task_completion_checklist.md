# Task Completion Checklist

## After Completing Any Development Task

### 1. Code Quality Check
```bash
bun run lint        # Run Biome linting and formatting (auto-fixes issues)
```
- **Required**: This command must be run after any code changes
- **Auto-fixes**: Biome automatically fixes formatting and many linting issues
- **No separate format command**: Linting includes formatting

### 2. Type Safety Verification
```bash
bun run build      # Verify TypeScript compilation and build
```
- **Purpose**: Ensures no TypeScript errors and successful build
- **Required for**: Any TypeScript changes, component modifications, or API changes

### 3. Database Type Updates (When Applicable)
```bash
bun run gen:types   # Generate TypeScript types from Supabase schema
```
- **When needed**: After any database schema changes
- **Updates**: `types/database.types.ts` file
- **Important**: Commit the generated types along with schema changes

### 4. Testing Considerations
- **No formal testing framework**: The codebase does not appear to have automated tests configured
- **Manual testing**: Test functionality in development server (`bun dev`)
- **Browser testing**: Verify responsive design and cross-browser compatibility

### 5. Development Server Testing
```bash
bun dev             # Start development server for manual testing
```
- **Verify**: All new features work as expected
- **Check**: No console errors or warnings
- **Test**: Authentication flows if authentication-related changes were made

## Pre-Commit Checklist

### Essential Steps
1. ✅ Run `bun run lint` (fixes formatting and linting issues automatically)
2. ✅ Run `bun run build` (verifies TypeScript compilation)
3. ✅ Test functionality in development server
4. ✅ Check for console errors
5. ✅ Verify responsive design on different screen sizes
6. ✅ Update database types if schema was modified

### Optional but Recommended
- Review changed files for sensitive information (API keys, passwords)
- Check that new features follow established patterns
- Verify proper error handling
- Test authentication flows if applicable

## Notes
- **No separate format command**: Formatting is included in the lint command
- **Biome configuration**: Automatically handles code style enforcement
- **Build verification**: Essential for catching TypeScript errors early
- **Manual testing**: Critical since automated tests are not configured