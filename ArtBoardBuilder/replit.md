# Custom Fingerboard Designer

## Overview

A web-based design tool for creating custom fingerboard deck graphics. Users can upload artwork, add custom text, adjust colors, and export production-ready designs in SVG or PNG format. The application is built with a React frontend and Express backend, using Google Cloud Storage for image uploads and Neon serverless PostgreSQL for potential data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### October 4, 2025 - Latest Updates
- **Image Centering Enhancement**: Fixed image scaling anchor point behavior
  - Image position now represents the center point (default: x: 8, y: 20)
  - Images scale from center instead of shifting right when enlarged
  - Top-left rendering position calculated dynamically as center minus half dimensions
  - Dragging updates center position for consistent behavior
  
- **Comprehensive Layer Management**: Full z-index control for images and text
  - Images can now be layered with text elements using layer property
  - Move up/down buttons swap layer values with adjacent elements
  - Layer swapping prevents collisions - guarantees unique layer values
  - Combined rendering array merges and sorts all elements by layer
  - Images can move behind or in front of text bidirectionally
  - UI shows current layer value for each element
  
- **Image Clipping Fix**: Removed clipPath restriction on uploaded images
  - Images now scale up to 1000% without being cropped at deck boundaries
  - Only background deck maintains rounded corners clipPath
  - Full image is always visible regardless of scale
  
- **Center Image Button**: Added quick-center functionality for uploaded artwork
  - One-click button to reset image to center position (x: 8, y: 20)
  - Located next to Flip Image button for easy access
  - Shows toast notification when clicked
  - Crosshair icon for visual clarity
  
- **Collapsible Templates Section**: Made Quick Templates section minimizable
  - Templates section starts collapsed to reduce visual clutter
  - Click toggle to expand/collapse template grid
  - Animated chevron icon indicates state (rotates 180deg when expanded)
  - Preserves full functionality while improving UX
  
- **Multiple Text Boxes**: Upgraded from single text element to support multiple independent text boxes
  - Add/delete individual text boxes with unique IDs
  - Select text box to edit content and styling
  - Each text box maintains its own position, font, color, size, and stroke settings
  - Text box list shows all boxes with preview content
  
- **Infinite Image Scaling**: Removed previous 300% limit
  - Image scale now supports up to 1000% (10x original size)
  - Enables larger artwork for full-board designs
  
- **Aging Effect Removal**: Completely removed wood grain aging feature
  - Removed all UI controls (aging style dropdown, opacity slider)
  - Cleaned up schema (removed agingStyle and agingOpacity fields)
  - Removed SVG rendering logic for aging effects
  - Simplified design configuration

### October 4, 2025 - Complete Feature Implementation
- **Database Persistence**: Implemented PostgreSQL database with Drizzle ORM for design storage
- **Design Gallery**: Created dedicated gallery page (`/gallery`) with search/filter/delete
- **Template System**: Added preset template library with 6 default templates
- **Batch Export**: Implemented multi-variation export with JSZip
- **Squarespace Commerce Integration**: Added cart functionality with PNG export
- **React Query Integration**: Migrated upload and export to TanStack Query mutations
- **Icon-Based UI**: Removed all emoji characters, replaced with Lucide React icons
- **Comprehensive Test Coverage**: Added data-testid attributes for e2e testing

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- React with TypeScript for type safety and developer experience
- Vite as the build tool for fast development and optimized production builds
- Wouter for lightweight client-side routing
- TanStack Query for server state management and API data fetching

**UI Component System**
- shadcn/ui component library with Radix UI primitives for accessible, customizable components
- Tailwind CSS for utility-first styling with custom design tokens
- CSS variables for theming with HSL color values for flexible color manipulation
- New York style variant of shadcn components

**Design System**
- Hybrid approach inspired by Figma (design tool clarity) and Canva (creative simplicity)
- Core principle: Preview-first interface where the SVG canvas is the hero element
- Progressive disclosure pattern - essential controls visible, advanced options accessible
- Real-time feedback - all interactions update preview immediately
- Light mode primary (tool used in well-lit environments)

**State Management**
- Local component state for design configuration (background color, image properties, text elements)
- Form state managed with React Hook Form and Zod validation
- Global toast notifications for user feedback

### Backend Architecture

**Server Framework**
- Express.js with TypeScript in ESM module format
- Vite middleware integration for development with HMR
- Error handling middleware for consistent error responses

**Data Layer**
- Drizzle ORM configured for PostgreSQL with Neon serverless adapter
- Schema-first approach with Zod validation for design and export configurations
- In-memory storage fallback (MemStorage) for development without database dependency

**File Storage**
- Google Cloud Storage for image uploads using external account credentials
- Replit sidecar endpoint for authentication token provisioning
- Object storage service abstraction for upload URL generation and file serving
- Public object search paths for serving uploaded images via `/objects/:objectPath` endpoint

### API Structure

**Image Upload Flow**
1. Client requests upload URL: `POST /api/objects/upload`
2. Server generates signed GCS upload URL
3. Client uploads directly to GCS
4. Client normalizes path: `PUT /api/images` with imageURL
5. Server returns normalized object path

**Object Serving**
- `GET /objects/:objectPath(*)` - Serves uploaded images publicly
- Searches configured public object paths
- Returns 404 for missing objects, 500 for server errors

**Design Management**
- `POST /api/designs` - Create new design with config and name
- `GET /api/designs` - Get all saved designs for gallery
- `GET /api/designs/:shareId` - Load specific design by share ID
- `PUT /api/designs/:shareId` - Update existing design
- `DELETE /api/designs/:id` - Delete design by ID

**Templates**
- `GET /api/templates` - Get all active preset templates

**Squarespace Integration**
The Add to Cart button integrates with Squarespace Commerce:
1. Converts current design to PNG/base64 format
2. Checks for Squarespace.Commerce API availability
3. If available: Calls `Squarespace.Commerce.addToCart()` with design data
4. Fallback: Opens cart URL with design parameters for manual processing
5. Design data includes: name, image, and shareable URL

### External Dependencies

**Third-Party Services**
- Google Cloud Storage - Image file hosting and delivery
- Neon PostgreSQL - Serverless database (configured but optional)
- Replit Sidecar - Authentication token service for GCS

**Key Libraries**
- @google-cloud/storage - GCS SDK for file operations
- @neondatabase/serverless - Neon database driver
- drizzle-orm & drizzle-kit - Database ORM and migration tooling
- @radix-ui/* - Accessible UI component primitives
- @tanstack/react-query - Async state management
- react-hook-form - Form state and validation
- zod - Runtime type validation
- tailwindcss - Utility-first CSS framework

**Font Resources**
- Google Fonts CDN for custom typography (Anton, Oswald, Inter)
- System fonts as fallback (Apple system, Segoe UI, Roboto)