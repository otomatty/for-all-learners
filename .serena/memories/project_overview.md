# F.A.L (For All Learners) - Project Overview

## Project Purpose
F.A.L is an AI-powered Learning Experience Platform (LXP) built with Next.js. It's designed to maximize learning efficiency and engagement by providing personalized learning experiences for all types of learners.

### Key Features
- **AI-powered content generation**: Automatically generates flashcards and quiz questions from various input sources (audio, images, text files)
- **Scientific spaced repetition**: Uses FSRS (Free Spaced Repetition Scheduler) algorithm for optimal review timing
- **Interactive note-taking**: AI-assisted note creation with multimedia support, tagging, and knowledge graph construction
- **Gamification**: Points, badges, avatars, and skill trees to maintain motivation
- **Collaborative learning**: Shared decks, notes, group studies, and community features

### Target Users
- Students (exam preparation, coursework)
- Working professionals (certification, career development)
- Lifelong learners (skill acquisition, curiosity-driven learning)

## Technical Architecture

### Core Stack
- **Framework**: Next.js 15 with React 19 and TypeScript
- **Database**: Supabase (PostgreSQL) with SSR support
- **Styling**: Tailwind CSS with custom themes
- **Authentication**: Supabase Auth with middleware-based route protection
- **Package Manager**: Bun
- **Rich Text Editor**: Tiptap with custom extensions
- **AI Integration**: Google Gemini for content generation

### External Integrations
- **CoSense**: Knowledge base synchronization
- **Gyazo**: Image capture and storage integration
- **Quizlet**: Import functionality for existing flashcard sets

### Subscription Model
- **Free Plan**: Maximum 3 study goals
- **Paid Plan**: Maximum 10 study goals
- Real-time plan information displayed in user navigation