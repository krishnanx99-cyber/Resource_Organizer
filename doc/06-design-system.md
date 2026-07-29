# Design System

**Product:** Resource Organizer

**Version:** 1.0

**Status:** Draft

---

# Purpose

The Design System defines the visual language, interaction rules, and reusable design tokens for Resource Organizer.

Its goals are to:

- Maintain visual consistency
- Improve usability
- Reduce design decisions during development
- Create reusable UI patterns
- Support both light and dark themes

The Design System focuses on **how the interface behaves**, not individual screens.

---

# Design Philosophy

Resource Organizer should feel like a modern productivity tool.

Characteristics:

- Clean
- Minimal
- Calm
- Fast
- Professional
- Content-first

The interface should never distract users from their saved knowledge.

---

# Core Principles

## 1. Content First

Content is always the primary focus.

The interface should support information, not compete with it.

---

## 2. Simplicity

Every component should have a clear purpose.

Avoid unnecessary visual complexity.

---

## 3. Consistency

The same interaction should always look and behave the same throughout the application.

---

## 4. Accessibility

Accessibility is a requirement, not an enhancement.

Every interactive element should be keyboard accessible.

---

## 5. Feedback

Every user action should provide immediate feedback.

Examples:

- Hover states
- Loading indicators
- Success notifications
- Error messages

---

# Visual Style

Inspired by:

- Linear
- Notion
- GitHub
- Raycast

Characteristics:

- Neutral color palette
- Rounded corners
- Thin borders
- Soft shadows
- Large whitespace
- Strong typography

---

# Theme Support

The application supports:

- Light Theme
- Dark Theme

Theme switching should not affect usability or accessibility.

---

# Color Roles

Instead of defining exact colors, define semantic roles.

## Primary

Main actions

Examples:

- Save Resource
- Confirm
- Primary Buttons

---

## Secondary

Supporting actions

Examples:

- Cancel
- Filters
- Navigation

---

## Surface

Used for:

- Cards
- Panels
- Modals

---

## Background

Application background.

---

## Border

Component outlines.

---

## Text

Levels:

- Primary
- Secondary
- Muted
- Disabled

---

## Semantic Colors

Success

Warning

Error

Information

These colors should only communicate meaning.

---

# Typography

Typography should prioritize readability.

Hierarchy:

Display

↓

Page Title

↓

Section Title

↓

Card Title

↓

Body

↓

Caption

↓

Label

Use consistent font sizes and spacing throughout the application.

---

# Spacing System

Use a consistent spacing scale.

Example:

```
4
8
12
16
24
32
48
64
```

Every margin and padding should use this scale.

---

# Border Radius

Use a small set of radius values.

Example:

```
Small

Medium

Large
```

Avoid inconsistent corner rounding.

---

# Shadows

Shadows should be subtle.

Levels:

- None
- Small
- Medium

Avoid heavy floating effects.

---

# Borders

Prefer borders over large shadows.

Use borders to separate information.

Cards should remain lightweight.

---

# Grid System

Desktop

12-column grid

Tablet

8-column grid

Mobile

4-column grid

Maintain consistent spacing between columns.

---

# Breakpoints

Suggested breakpoints:

```
Mobile

Tablet

Desktop

Large Desktop
```

Layouts should adapt without changing the overall navigation model.

---

# Icons

Use a single icon library throughout the application.

Guidelines:

- Outline style
- Consistent stroke width
- Minimal detail
- Clear meaning

Icons support labels rather than replacing them.

---

# Buttons

## Primary

Used for the main action on a page.

Examples:

- Save Resource
- Open Resource

---

## Secondary

Supporting actions.

Examples:

- Cancel
- Rename

---

## Tertiary

Low-emphasis actions.

Examples:

- View Details
- Learn More

---

## Destructive

Used only for irreversible actions.

Examples:

- Delete Resource
- Delete Cluster

---

# Inputs

Every input should include:

- Label
- Placeholder
- Focus State
- Error State
- Disabled State
- Helper Text (when needed)

---

# Cards

Cards display resources.

A resource card should contain:

- Thumbnail
- Title
- Description
- Platform
- Tags
- Quick Actions

Cards should remain easy to scan.

---

# Navigation

Desktop

Persistent Sidebar

Tablet

Collapsible Sidebar

Mobile

Bottom Navigation

Navigation should always remain predictable.

---

# Search

Search is a primary interaction.

Requirements:

- Easy to access
- Keyboard friendly
- Fast
- Responsive

Search should support:

- Keyword
- Semantic
- Hybrid

---

# Dialogs

Dialogs should be used only when user confirmation is required.

Examples:

- Delete Resource
- Duplicate Resource
- Merge Cluster

Dialogs should never interrupt simple workflows unnecessarily.

---

# Toast Notifications

Use toast notifications for:

- Save Successful
- Update Successful
- Delete Successful
- Background Processing Complete

Avoid excessive notifications.

---

# Loading States

Prefer skeleton screens over spinners.

Examples:

- Resource Cards
- Search Results
- Metadata Preview

Loading indicators should communicate progress without blocking the interface.

---

# Empty States

Every empty state should:

- Explain the situation
- Suggest the next action
- Provide a primary call-to-action

Example:

"No resources yet."

Button:

"Save Resource"

---

# Error States

Error messages should:

- Explain what happened
- Suggest a solution
- Preserve user input whenever possible

Avoid technical jargon.

---

# Motion

Animations should:

- Feel fast
- Be subtle
- Reinforce actions

Examples:

- Fade
- Scale
- Slide

Avoid:

- Long transitions
- Excessive bounce
- Distracting animations

---

# Accessibility

Requirements:

- Keyboard navigation
- Screen reader support
- Visible focus indicators
- High contrast
- Large touch targets
- Accessible form labels

Accessibility should be considered during design and development.

---

# Responsive Design

Desktop

- Multi-column layouts
- Persistent sidebar

Tablet

- Reduced columns
- Collapsible navigation

Mobile

- Single-column layout
- Bottom navigation
- Floating Save Button

---

# Performance

The interface should remain responsive.

Targets:

- Fast page transitions
- Smooth scrolling
- Instant hover feedback
- Minimal layout shifts

---

# Design Rules

When designing new screens:

- Reuse existing components.
- Maintain consistent spacing.
- Follow typography hierarchy.
- Keep navigation predictable.
- Minimize visual noise.
- Prioritize readability.
- Explain AI decisions clearly.

---

# Future Expansion

The Design System should support future features without introducing new visual patterns.

Examples:

- Browser Extension
- AI Assistant
- Knowledge Graph
- Mobile App
- Collaboration

New features should build upon the existing design language.

---

# Guiding Principle

Every visual decision should help users save, find, and rediscover knowledge with clarity, confidence, and minimal friction.
