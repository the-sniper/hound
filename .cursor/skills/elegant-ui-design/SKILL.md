---
name: elegant-ui-design
description: Principles and patterns for creating elegant, sophisticated, and professional user interfaces. Use when designing or refining UI components, layouts, and visual styles to ensure high aesthetic quality and consistent user experience.
---

# Elegant UI Design

This skill defines the principles and patterns for creating elegant and sophisticated user interfaces for the Hound platform.

## Core Principles

### 1. Sophisticated Color Palette (OKLCH)
Avoid pure blacks and high-contrast primary colors. Use the OKLCH color space for perceptually uniform and sophisticated colors.
- **Primary**: Use deep, muted tones (e.g., deep indigo or charcoal with a hint of blue) instead of pure black.
- **Surface**: Use subtle variations in lightness to create depth, rather than just borders.
- **Semantic**: Ensure success, warning, and error colors are balanced and professional.

### 2. Refined Typography
- **Scale**: Use a clear typographic hierarchy with intentional contrast in size and weight.
- **Spacing**: Increase letter spacing slightly for uppercase labels; use generous line heights for readability.
- **Hierarchy**: Use muted colors for secondary text to guide the eye to primary information.

### 3. Elevation & Depth
- **Shadows**: Use multi-layered, soft shadows to create realistic depth. Avoid harsh, single-layer shadows.
- **Borders**: Use subtle borders that complement the background rather than high-contrast outlines.
- **Glassmorphism**: Use subtle background blurs for overlays and floating elements to maintain context.

### 4. Micro-interactions
- **Transitions**: Use smooth, consistent transitions (200-300ms) for all interactive states.
- **Hover States**: Go beyond background color changes; consider subtle scaling, shadow increases, or border refinements.
- **Feedback**: Provide clear but non-intrusive visual feedback for user actions.

## Elegant vs. Basic Patterns

| Feature | Basic (Avoid) | Elegant (Prefer) |
|---------|---------------|------------------|
| **Borders** | `border-gray-200` | `border-primary/5` or `border-border/50` |
| **Shadows** | `shadow-sm` | `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` |
| **Buttons** | Flat color, no transition | Subtle gradient, smooth hover scale, refined shadow |
| **Cards** | White bg, gray border | Subtle bg tint, soft layered shadow, rounded-xl+ |
| **Status** | `bg-green-500` | `bg-green-500/10 text-green-600 border-green-200/50` |

## Implementation Checklist

- [ ] Does the component use OKLCH-based semantic tokens?
- [ ] Is the typography hierarchy clear and intentional?
- [ ] Does the element have appropriate visual depth (elevation)?
- [ ] Are transitions smooth and consistent?
- [ ] Is spacing generous and standardized?
