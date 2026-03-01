# Luma Seated

## Project Vision
A Luma-style event platform focused on **seated events**. Think Luma's beautiful event pages and discovery, but with integrated seat selection for concerts, theater, conferences, etc.

**Inspiration:** [lu.ma](https://lu.ma) - but for seated events

## Key Differences from seat-map-generator
- **Focus:** Event discovery & attendee experience (not just organizer tools)
- **UX:** Luma-style beautiful event pages, social sharing, RSVPs
- **Seating:** Integrated seat map selection during ticket purchase

## Core Features (Planned)
- [ ] Beautiful event pages (Luma-style)
- [ ] Seat map selection during checkout
- [ ] Event discovery feed
- [ ] Social features (who's attending, share with friends)
- [ ] Organizer dashboard
- [ ] Mobile-first design

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **State**: Zustand
- **Backend**: Supabase (Auth, PostgreSQL, Realtime)
- **Payments**: Stripe

## Shared Code (from seat-map-generator)
- `/src/components/editor/` - Seat map editor & renderer
- `/src/stores/` - Zustand stores for map state
- `/src/lib/auth.ts` - Supabase auth utilities
- `/src/lib/supabase.ts` - Supabase client
- `/src/components/ui/` - UI components

## Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
```

## Environment Variables
Copy `.env.local.example` to `.env.local` and fill in your values.
