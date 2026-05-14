# COMPONENT STYLING GUIDE — Dark Red Theme Implementation

## Quick Reference: Color Replacements

### Backgrounds
- `bg-white` → `glass-card` (for cards/panels) or `bg-slate-900/95` (for container sections)
- `bg-slate-50` → `bg-red-600/20`
- `bg-slate-100` → `bg-red-950/40` or `bg-red-600/10`
- `bg-slate-200` → `bg-red-600/20`
- `bg-indigo-*` → `bg-red-*` (same intensity level)
- `bg-violet-*` → `bg-red-*` (same intensity level)
- `bg-blue-*` → keep as is OR convert to `bg-red-*` depending on context

### Borders
- `border-slate-200` → `border-red-600/30`
- `border-slate-100` → `border-red-600/20`
- `border-slate-50` → `border-red-600/15`
- `border-indigo-*` → `border-red-*`
- `border-violet-*` → `border-red-*`
- Add: `border-red-600/40` for prominent card borders

### Text Colors
- `text-slate-900` → `text-red-100`
- `text-slate-800` → `text-red-100`
- `text-slate-700` → `text-red-200`
- `text-slate-600` → `text-red-400/70`
- `text-slate-500` → `text-red-500/60`
- `text-slate-400` → `text-red-500/50`
- `text-indigo-600` → `text-red-400` or `text-red-300`
- `text-indigo-500` → `text-red-400`
- `text-violet-600` → `text-red-400`
- `text-violet-500` → `text-red-400`
- `text-blue-600` → `text-red-400` (in most contexts)

### Shadows & Hovers
- `hover:bg-slate-100` → `hover:bg-red-600/15`
- `hover:shadow-slate-200` → `hover:shadow-red-600/30`
- `shadow-slate-*` → `shadow-red-*`
- `hover:shadow-lg` → `hover:shadow-lg hover:shadow-red-600/30`
- `shadow-xl` → `shadow-xl shadow-red-600/30`

### Gradients
- `from-indigo-* to-indigo-*` → `from-red-* to-red-*`
- `from-violet-* to-violet-*` → `from-red-* to-red-*`
- `from-blue-* to-blue-*` → `from-red-* to-red-*`
- `from-slate-* to-slate-*` → `from-slate-900 to-black` or context-appropriate variant

### Progress Bars & Status
- `bg-indigo-600` → `bg-gradient-to-r from-red-700 to-red-500`
- `bg-violet-600` → `bg-gradient-to-r from-violet-700 to-violet-500`
- `bg-emerald-600` → `bg-gradient-to-r from-emerald-700 to-emerald-500`
- `bg-amber-600` → `bg-gradient-to-r from-amber-700 to-amber-500`
- `bg-rose-600` → `bg-gradient-to-r from-rose-700 to-rose-500`

---

## Component-Specific Patterns

### STAT CARDS / KPI CARDS
```
Card Wrapper:
- FROM: bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg
- TO:   glass-card p-6 rounded-2xl card-hover-lift relative overflow-hidden
        + inner glow div (optional): absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent rounded-2xl

Icon Container:
- FROM: bg-indigo-50 text-indigo-600
- TO:   bg-red-600/20 text-red-400 border border-red-600/30

Value Text:
- FROM: text-3xl font-black text-slate-900
- TO:   text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600

Label Text:
- FROM: text-slate-600 text-xs font-black uppercase
- TO:   text-red-400/70 text-xs font-black uppercase

Progress Bar Track:
- FROM: h-2 bg-slate-200 rounded-full
- TO:   h-1.5 bg-red-950/50 rounded-full

Progress Bar Fill:
- FROM: bg-indigo-600
- TO:   bg-gradient-to-r from-red-700 to-red-500
```

### TABLES
```
Wrapper:
- FROM: bg-white border border-slate-200 rounded-2xl overflow-hidden
- TO:   glass-card overflow-hidden rounded-2xl

Header Row (thead):
- FROM: bg-slate-50 border-b border-slate-200
- TO:   bg-red-950/80 border-b border-red-600/30

Header Cell (th):
- FROM: text-slate-600 text-xs font-black uppercase
- TO:   text-red-400/80 font-black uppercase tracking-wider text-xs px-4 py-3

Body Row (tbody tr):
- FROM: border-b border-slate-200 hover:bg-slate-50
- TO:   border-b border-red-600/15 hover:bg-red-600/10 transition-colors

Body Cell (td):
- FROM: text-slate-900 text-sm px-4 py-3
- TO:   text-red-100/90 text-sm px-4 py-3

Even Row (optional striping):
- FROM: bg-slate-50
- TO:   bg-red-950/20

Empty State:
- FROM: text-slate-500 font-bold
- TO:   text-red-500/60 font-bold
```

### FORM INPUTS
```
Label:
- FROM: text-slate-700 text-sm font-bold
- TO:   text-red-400/90 text-sm font-black uppercase tracking-wider mb-2

Input/Select/Textarea:
- FROM: w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600
- TO:   w-full px-4 py-3 rounded-xl border border-red-600/40 bg-slate-900/60 text-red-100 placeholder-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all backdrop-blur-md hover:border-red-600/60 hover:bg-slate-900/80
```

### BUTTONS
```
PRIMARY BUTTON:
- FROM: bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-xl font-bold uppercase text-sm
- TO:   relative group overflow-hidden rounded-xl py-3 px-6 font-black uppercase text-sm tracking-widest
         background: bg-gradient-to-r from-red-800 via-red-600 to-red-800
         hover: group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700
         glow: shadow-lg shadow-red-600/40 hover:shadow-red-500/60
         shimmer overlay: absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100
         text: text-white

SECONDARY BUTTON:
- FROM: bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200
- TO:   rounded-xl py-3 px-5 font-black text-sm border border-red-600/40 text-red-400 hover:bg-red-600/20 hover:border-red-500/60 hover:text-red-300 bg-slate-900/40

DANGER BUTTON:
- FROM: bg-red-50 text-red-600 border border-red-200
- TO:   bg-gradient-to-r from-rose-900 to-rose-700 hover:from-rose-800 hover:to-rose-600 shadow-lg shadow-rose-600/30 text-white

SUCCESS/CONFIRM BUTTON:
- FROM: bg-emerald-50 text-emerald-600
- TO:   bg-gradient-to-r from-emerald-900 to-emerald-700 hover:from-emerald-800 hover:to-emerald-600 text-white
```

### MODALS & DRAWERS
```
Overlay:
- FROM: bg-black/30 backdrop-blur-sm
- TO:   bg-black/80 backdrop-blur-sm

Modal Panel:
- FROM: bg-white rounded-3xl shadow-2xl
- TO:   bg-gradient-to-b from-slate-900/98 via-black to-black border border-red-600/40 rounded-3xl shadow-[0_0_80px_rgba(220,38,38,0.3)] backdrop-blur-2xl

Modal Header:
- FROM: bg-slate-50 border-b border-slate-200
- TO:   border-b border-red-600/30 bg-gradient-to-r from-red-950/50 to-transparent
         + top line: absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50

Modal Title:
- FROM: text-slate-900 text-xl font-bold
- TO:   text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 font-black text-xl

Close Button:
- FROM: text-slate-400 hover:text-slate-600
- TO:   bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 rounded-xl text-red-400
```

### BADGES / STATUS PILLS
```
ACTIVE/SUCCESS:
- FROM: bg-emerald-50 text-emerald-600 border border-emerald-200
- TO:   bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-lg px-2 py-0.5

WARNING:
- FROM: bg-amber-50 text-amber-600 border border-amber-200
- TO:   bg-amber-600/20 text-amber-400 border border-amber-600/30

DANGER/DEBT:
- FROM: bg-red-50 text-red-600 border border-red-200
- TO:   bg-rose-600/20 text-rose-400 border border-rose-600/30

INFO:
- FROM: bg-blue-50 text-blue-600 border border-blue-200
- TO:   bg-blue-600/20 text-blue-400 border border-blue-600/30

NEUTRAL:
- FROM: bg-slate-100 text-slate-600 border border-slate-200
- TO:   bg-red-600/15 text-red-400 border border-red-600/25
```

### LOADING SPINNERS
```
FROM: border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin
TO:   border-4 border-red-950 border-t-red-600 rounded-full animate-spin

Text:
FROM: text-slate-600 uppercase tracking-widest text-xs
TO:   text-red-400/70 uppercase tracking-widest text-xs
```

### TABS / SEGMENTED CONTROLS
```
Container:
- FROM: p-1.5 bg-slate-100 rounded-lg
- TO:   p-1.5 bg-slate-900/70 border border-red-600/30 rounded-xl

Active Tab:
- FROM: bg-white text-indigo-600 shadow-sm
- TO:   bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg shadow-red-600/40 scale-105

Inactive Tab:
- FROM: text-slate-600 hover:text-slate-900
- TO:   text-red-400/70 hover:text-red-300 hover:bg-red-600/15 rounded-lg
```

### SECTION HEADERS
```
<div className="flex items-center gap-3 mb-6">
  <div className="h-8 w-1 bg-gradient-to-b from-red-500 to-red-700 rounded-full"></div>
  <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
    {title}
  </h2>
  <div className="flex-1 h-px bg-gradient-to-r from-red-600/30 to-transparent"></div>
</div>
```

### SEARCH BARS
```
Container: relative group
Input:
- FROM: w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-indigo-600
- TO:   w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900/70 border border-red-600/30 text-red-100 placeholder-red-500/40 focus:ring-2 focus:ring-red-600 focus:outline-none backdrop-blur-md hover:border-red-600/50

Icon:
- FROM: absolute left-3.5 top-3.5 text-slate-400
- TO:   absolute left-3.5 top-3.5 text-red-500/50
```

---

## Global Patterns

### Page Wrapper (add to all page components)
```tsx
<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
  {/* Ambient background blobs */}
  <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-red-800 rounded-full blur-[120px] opacity-[0.04] animate-blob pointer-events-none -z-10"></div>
  <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-red-700 rounded-full blur-[100px] opacity-[0.04] animate-blob pointer-events-none -z-10" style={{animationDelay:'2s'}}></div>
  {/* Grid overlay */}
  <div className="fixed inset-0 bg-[linear-gradient(rgba(220,38,38,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none -z-10"></div>
  {/* Your content here */}
</div>
```

### Card Hover Effect
Use `card-hover-lift` class defined in index.css for consistent hover animations.

### Glass Morphism Cards
Use `glass-card` class defined in index.css for all panels and containers.

### Text Gradients (Headings)
```
text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 font-black
```

---

## Testing Checklist

For each component, verify:
- [ ] No white backgrounds remain (except on print)
- [ ] All text is visible on dark background
- [ ] Hover states show red-600 color changes
- [ ] Borders are red-600 with appropriate opacity
- [ ] Gradients transition smoothly from red shades
- [ ] Forms are clearly visible and interactive
- [ ] Tables maintain proper contrast
- [ ] Modals overlay with proper backdrop blur
- [ ] Loading spinners show red colors
- [ ] Status badges are distinguishable by color
