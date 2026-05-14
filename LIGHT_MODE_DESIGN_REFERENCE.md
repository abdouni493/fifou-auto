# 🎨 Light Mode Design Quick Reference

## Color Palette

### Backgrounds
```
white          #ffffff     Main card/modal backgrounds
slate-50       #f9fafb     Light section backgrounds
slate-100      #f2f4f8     Subtle highlighted areas
blue-50        #eff6ff     Accent backgrounds
indigo-50      #eef2ff     Active/selected backgrounds
```

### Text
```
slate-900      #1e293b     Primary/headings
slate-700      #334155     Strong secondary text
slate-600      #475569     Regular secondary text
slate-500      #64748b     Tertiary/helper text
```

### Borders
```
slate-200      #e2e8f0     Primary borders (most common)
slate-300      #cbd5e1     Focus/interactive borders
indigo-300     #a5b4fc     Active/selected borders
```

### Accents
```
indigo-600     #4f46e5     Primary actions, highlights
violet-600     #7c3aed     Secondary actions, gradients
emerald-600    #059669     Success states
amber-600      #d97706     Warning states
red-600        #dc2626     Error/critical states
```

## Card Design Patterns

### Standard Light Card
```tsx
<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
  {/* Card content */}
</div>
```

### Card with Title
```tsx
<div className="bg-white rounded-2xl shadow-md overflow-hidden">
  <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4 border-b border-slate-200">
    <h3 className="text-slate-900 font-black">Title</h3>
  </div>
  <div className="p-6">{/* Content */}</div>
</div>
```

### Active/Selected Card
```tsx
<div className="bg-indigo-100 border border-indigo-300 rounded-2xl p-6 shadow-md shadow-indigo-100">
  <p className="text-indigo-600 font-black">Active State</p>
</div>
```

## Button Patterns

### Primary Button
```tsx
<button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black px-6 py-3 rounded-xl hover:scale-105 transition-all">
  Primary Action
</button>
```

### Secondary Button
```tsx
<button className="bg-white border border-slate-300 text-slate-700 font-black px-6 py-3 rounded-xl hover:bg-slate-100 transition-all">
  Secondary Action
</button>
```

### Tertiary Button (Icon-style)
```tsx
<button className="h-10 w-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all">
  Icon
</button>
```

## Input Patterns

### Text/Email Input
```tsx
<input 
  type="text"
  placeholder="Enter text..."
  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
/>
```

### Select Dropdown
```tsx
<select className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

## Alert/Status Patterns

### Success Alert
```tsx
<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
  <span className="text-2xl">✅</span>
  <p className="text-emerald-700 font-bold">Success message</p>
</div>
```

### Warning Alert
```tsx
<div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
  <span className="text-2xl">⚠️</span>
  <p className="text-amber-700 font-bold">Warning message</p>
</div>
```

### Error Alert
```tsx
<div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
  <span className="text-2xl">❌</span>
  <p className="text-red-700 font-bold">Error message</p>
</div>
```

### Info Alert
```tsx
<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
  <span className="text-2xl">ℹ️</span>
  <p className="text-blue-700 font-bold">Info message</p>
</div>
```

## Badge/Chip Patterns

### Primary Badge
```tsx
<span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black">
  Badge Text
</span>
```

### Secondary Badge
```tsx
<span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-black">
  Badge Text
</span>
```

### Status Badge
```tsx
<span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black">
  Active
</span>
```

## Modal Pattern

### Light Mode Modal
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
  
  {/* Modal */}
  <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
    {/* Header */}
    <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50">
      <h2 className="text-slate-900 font-black">Modal Title</h2>
    </div>
    
    {/* Content */}
    <div className="p-6">{/* Content */}</div>
    
    {/* Footer */}
    <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-4">
      <button className="flex-1 bg-white border border-slate-300 text-slate-700 font-black py-3 rounded-xl hover:bg-slate-100">
        Cancel
      </button>
      <button className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black py-3 rounded-xl hover:scale-105">
        Confirm
      </button>
    </div>
  </div>
</div>
```

## Sidebar Pattern

### Light Mode Sidebar
```tsx
<aside className="bg-white border-r border-slate-200 w-[280px] flex flex-col shadow-lg">
  {/* Logo */}
  <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50">
    Logo/Branding
  </div>
  
  {/* Menu */}
  <nav className="flex-grow mt-8 px-4 space-y-1.5">
    {/* Active menu item */}
    <button className="w-full bg-indigo-100 border border-indigo-300 text-indigo-600 font-black px-4 py-3 rounded-2xl">
      Active Item
    </button>
    
    {/* Inactive menu item */}
    <button className="w-full text-slate-600 hover:bg-slate-100 px-4 py-3 rounded-2xl transition-all">
      Inactive Item
    </button>
  </nav>
  
  {/* Footer */}
  <div className="p-4 border-t border-slate-200 bg-slate-50">
    Footer content
  </div>
</aside>
```

## Dashboard Header Pattern

### Hero Banner
```tsx
<div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-12 text-white shadow-xl overflow-hidden relative">
  <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
  <div className="relative z-10">
    <h1 className="text-6xl font-black mb-4">Welcome 👋</h1>
    <p className="text-white/90 font-bold">Subheading</p>
  </div>
</div>
```

## Grid Patterns

### Cards Grid (Responsive)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Grid items - each with standard card styling */}
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
    Item
  </div>
</div>
```

### Data Table Pattern
```tsx
<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          <th className="px-6 py-4 text-left text-slate-900 font-black text-sm">Column</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-slate-200 hover:bg-slate-50 transition-all">
          <td className="px-6 py-4 text-slate-600">Data</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

## Spacing Standards

```
XS: p-2, gap-2
S:  p-4, gap-4
M:  p-6, gap-6
L:  p-8, gap-8
XL: p-12, gap-12
```

## Radius Standards

```
Compact: rounded-lg (0.5rem)
Standard: rounded-xl (0.75rem)
Large: rounded-2xl (1rem)
Extra Large: rounded-3xl (1.5rem)
```

## Shadow Standards

```
Subtle: shadow-sm    /* 0 1px 3px rgba(0,0,0,0.08) */
Medium: shadow-md    /* 0 4px 12px rgba(0,0,0,0.05) */
Large:  shadow-lg    /* 0 10px 40px rgba(0,0,0,0.08) */
Extra:  shadow-2xl   /* 0 25px 50px rgba(0,0,0,0.15) */
```

## Animation Patterns

### Fade In Entrance
```tsx
<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
  Content
</div>
```

### Hover Scale
```tsx
<button className="hover:scale-105 transition-all duration-300">
  Button
</button>
```

### Loading Spinner
```tsx
<div className="h-12 w-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
```

### Pulse Animation
```tsx
<div className="animate-pulse">
  Content that pulses
</div>
```

## Responsive Design

### Breakpoints (Tailwind defaults)
```
sm:  640px    - Small phones
md:  768px    - Tablets
lg:  1024px   - Desktops
xl:  1280px   - Large screens
2xl: 1536px   - Extra large screens
```

### Common Responsive Patterns
```tsx
{/* Single column on mobile, 2 on tablet, 3 on desktop */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

{/* Hidden on mobile, visible on desktop */}
<div className="hidden lg:block">

{/* Full width on mobile, fixed on desktop */}
<div className="w-full lg:w-[280px]">

{/* Stack on mobile, row on desktop */}
<div className="flex flex-col lg:flex-row gap-4">
```

## Best Practices

✅ **DO:**
- Use consistent shadow levels across card types
- Apply proper contrast for accessibility
- Use color sparingly for meaning (status, alerts)
- Maintain consistent padding/spacing throughout
- Use indigo/violet for primary actions
- Test on light backgrounds for readability

❌ **DON'T:**
- Mix light and dark mode colors
- Use opacity-based colors on light backgrounds
- Apply shadows that are too strong
- Forget hover/focus states on interactive elements
- Use colors purely for decoration
- Forget about mobile responsiveness

## Color Contrast Ratios (Accessibility)
```
Text on white background:
- slate-900 on white: 15.3:1 ✅ AAA
- slate-600 on white: 7.4:1 ✅ AAA
- slate-500 on white: 5.8:1 ✅ AA

Buttons:
- Indigo 600 text on white: 4.7:1 ✅ AA
- On indigo-100 background: 8.4:1 ✅ AAA
```

This light mode design system provides a modern, professional, and accessible interface throughout the showroom management application.
