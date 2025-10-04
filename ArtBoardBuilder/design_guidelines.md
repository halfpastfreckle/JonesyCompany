# Fingerboard Designer Tool - Design Guidelines

## Design Approach

**Selected Approach:** Design System + Product Reference Hybrid
- Primary inspiration: Figma (design tool clarity) + Canva (creative customization simplicity)
- Supporting systems: Linear's typography precision, Notion's organized controls
- Rationale: This is a utility-focused creative tool requiring both professional polish and intuitive customization controls

## Core Design Principles

1. **Preview Prominence** - The SVG canvas is the hero; all controls serve the preview
2. **Progressive Disclosure** - Show essential controls first, advanced options accessible but not overwhelming
3. **Immediate Feedback** - Every interaction updates the preview in real-time
4. **Production Confidence** - Design must communicate professional output quality

## Color Palette

### Light Mode (Primary)
- **Primary Brand:** 195 91% 55% (Cyan) - CTAs, active states, brand accents
- **Primary Variant:** 199 89% 48% (Blue) - Gradients, hover states
- **Background Base:** 210 40% 98% (Slate-50) - Page background
- **Surface:** 0 0% 100% (White) - Cards, inputs, canvas background
- **Surface Elevated:** 214 32% 91% (Slate-200) - Preview area gradient end
- **Border Default:** 214 32% 91% (Slate-200) - Input borders, dividers
- **Border Focus:** 195 91% 55% (Cyan) - Active input borders
- **Text Primary:** 222 47% 11% (Slate-900) - Headers, labels
- **Text Secondary:** 215 16% 47% (Slate-600) - Helper text, values
- **Text Muted:** 215 20% 65% (Slate-400) - Placeholders, disabled states

### Dark Mode
Not required for initial implementation - tool is primarily used in well-lit environments

### Functional Colors
- **Success:** 142 76% 36% (Green-600) - Export confirmation
- **Error:** 0 84% 60% (Red-500) - Upload errors, validation
- **Warning:** 25 95% 53% (Orange-500) - File size warnings
- **Info Chip Background:** 222 47% 11% with 85% opacity - Toolbar instruction chips
- **Guide Lines:** 0 84% 60% (Red-500) at 20% opacity - Safe area guides

## Typography

### Font Families
- **Primary Interface:** -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Custom Text Options:** Impact (default bold), Oswald (modern), Anton (strong), Arial Black (classic), Inter (clean)

### Type Scale
- **Page Title:** 20px / 700 weight - "Custom Fingerboard Designer"
- **Section Headers:** 18px / 700 weight - Control section titles
- **Control Labels:** 12px / 600 weight / uppercase / 0.5px letter-spacing - Input labels
- **Input Text:** 14px / 400 weight - Form inputs, buttons
- **Info Chips:** 11px / 400 weight - Toolbar instructions
- **Badge Text:** 11px / 400 weight - Status indicators
- **Helper Text:** 11px / 400 weight - Disclaimers, shipping info
- **Price Display:** 18px / 700 weight - Pricing information
- **Range Values:** 12px / 600 weight - Slider output values

## Layout System

### Spacing Primitives
Core spacing units: **4px, 8px, 12px, 16px, 20px, 24px**
- Component padding: 20px (cards), 12px (inputs), 8px (chips)
- Grid gaps: 24px (desktop), 16px (mobile), 12px (control grid)
- Vertical rhythm: 16px between control sections, 20px for major sections

### Grid Structure
- **Two-Column Desktop:** 1fr 1fr (Preview | Controls) with 24px gap
- **Single-Column Mobile:** Stack vertically, 16px gaps
- **Control Grid:** 2 columns on desktop, 1 column on mobile, 12px gaps
- **Max Width:** 1400px container with auto margins

### Canvas Dimensions
- **Max Width:** 200px (desktop), 300px (mobile)
- **Aspect Ratio:** 32:105 (fingerboard proportions)
- **Minimum Height:** 600px preview area

## Component Library

### Cards
- **Background:** White with 1px slate-200 border
- **Border Radius:** 16px rounded corners
- **Shadow:** `0 10px 24px rgba(2,6,23,.06), 0 2px 6px rgba(2,6,23,.04)`
- **Overflow:** Hidden for clean edges

### Inputs & Controls
- **Text Inputs:** 12px padding, 10px border radius, slate-200 border
- **Focus State:** Cyan border with `0 0 0 3px rgba(6,182,212,.35)` ring
- **Color Pickers:** 42px height, 4px padding, rounded appearance
- **File Upload:** 8px padding, 2px dashed border, slate-50 background
- **Hover:** Border color shifts to cyan, background to slate-100
- **Range Sliders:** 6px height, 3px border radius, custom thumb styling

### Buttons
- **Primary:** Cyan-to-blue gradient background, white text, 12px padding, 10px radius
- **Primary Shadow:** `0 4px 12px rgba(6,182,212,0.3)`
- **Primary Hover:** `translateY(-1px)` with enhanced shadow
- **Ghost:** White background, slate-200 border, slate-900 text
- **Ghost Hover:** Slate-50 background, cyan border
- **Disabled:** 60% opacity, no-pointer cursor
- **Icon Spacing:** 6px gap between icon and text

### SVG Canvas
- **Background:** Linear gradient `135deg, #f8fafc 0%, #e2e8f0 100%`
- **Border Radius:** 12px for fingerboard shape
- **Shadow:** `0 20px 40px rgba(0,0,0,0.15)` for depth
- **Clip Path:** 16px rounded rectangle matching board shape
- **Filters:** Soft shadow and text shadow at 25-40% opacity

### Information Elements
- **Chips:** Slate-900 at 85% opacity, 8px vertical / 12px horizontal padding, 20px radius, white 20% border
- **Badges:** Slate-400 text, slate-100 background, 4px vertical / 8px horizontal padding, 6px radius
- **Disclaimers:** Slate-600 text, slate-50 background, 12px padding, 8px radius, 3px cyan left border

### Brand Identity
- **Logo Dot:** 14px circle with cyan-to-blue gradient
- **Toolbar Chips:** Emoji + instruction pairs for visual guidance

## Interaction Patterns

### Drag & Drop
- **Cursor States:** grab (idle), grabbing (dragging)
- **Visual Feedback:** Maintain smooth dragging with no lag
- **Touch Support:** Touch-action: none for mobile compatibility

### Real-Time Preview
- **Update Frequency:** Instant on all control changes
- **Transitions:** None for controls (immediate feedback priority)
- **Image Loading:** Show opacity 0 until loaded, fade in

### Guide System
- **Toggle:** Show/hide via dropdown (default: on)
- **Visual Style:** Red dashed lines at 20% opacity, 0.3px stroke
- **Safe Area:** Outer boundary with "SAFE AREA" label
- **Truck Zones:** Horizontal rectangles at top/bottom with labels

## Responsive Behavior

### Desktop (>768px)
- Two-column preview + controls layout
- 2-column control grid
- 200px max canvas width
- Full toolbar visible

### Mobile (≤768px)
- Single column stack (preview above controls)
- Single column control grid
- 300px max canvas width
- Wrapped toolbar chips
- Full-width buttons in action area

## Visual Hierarchy

1. **Primary Focus:** SVG canvas preview (largest, centered, shadowed)
2. **Secondary:** Control inputs (organized grid, clear labels)
3. **Tertiary:** Toolbar instructions (subtle chips)
4. **Supporting:** Price/actions (bordered section at bottom)

## Accessibility

- All interactive SVG elements: tabindex="0" for keyboard access
- Color pickers: Visible borders for clarity
- Form labels: Proper for/id associations, uppercase for distinction
- Focus states: High-contrast cyan rings on all inputs
- Disabled states: Clear visual differentiation with opacity

## Production Export

- **Format:** High-quality PNG
- **Resolution:** Maintain SVG crispness at scale
- **Filename:** Descriptive with timestamp
- **Success Feedback:** Green confirmation message
- **Error Handling:** Red message for failures

This design creates a professional, trustworthy tool interface that balances creative freedom with production-ready precision, perfectly suited for Squarespace embedding and client-facing use.