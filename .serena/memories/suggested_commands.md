# Development Commands

## Essential Commands

### Package Management
```bash
bun install          # Install dependencies
```

### Development Server
```bash
bun dev             # Start development server with Turbopack (recommended)
```

### Build & Production
```bash
bun run build      # Build for production
bun start          # Start production server
```

### Code Quality
```bash
bun run lint       # Run Biome linting and formatting (auto-fixes issues)
```

### Database & Types
```bash
bun run gen:types  # Generate TypeScript types from Supabase schema
```

## macOS/Darwin System Commands
Since the project is being developed on Darwin (macOS), these standard Unix commands are available:

### File Operations
```bash
ls                 # List directory contents
cd                 # Change directory
pwd                # Print working directory
mkdir              # Create directory
rm                 # Remove files/directories
cp                 # Copy files
mv                 # Move/rename files
find               # Search for files
grep               # Search text in files
```

### Git Operations
```bash
git status         # Check repository status
git add            # Stage changes
git commit         # Commit changes
git push           # Push to remote
git pull           # Pull from remote
git branch         # List/create branches
git checkout       # Switch branches
```

### Process Management
```bash
ps                 # List running processes
kill               # Terminate processes
killall            # Kill all processes by name
```

### Text Processing
```bash
cat                # Display file contents
head               # Display first lines of file
tail               # Display last lines of file
less               # Page through file contents
wc                 # Word, line, character count
```

## Port Information
- Development server runs on `http://localhost:3000`
- Ensure port 3000 is available or Next.js will use the next available port