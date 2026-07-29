# Component Library

**Product:** Resource Organizer

**Version:** 1.0

**Status:** Draft

---

# Purpose

The Component Library defines every reusable UI component used throughout Resource Organizer.

Goals:

- Reduce duplicate code
- Maintain UI consistency
- Improve accessibility
- Increase development speed
- Create predictable interactions

Components should be composable, reusable, and independent whenever possible.

---

# Component Categories

The library is divided into six groups:

1. Layout Components
2. Navigation Components
3. Form Components
4. Data Display Components
5. Feedback Components
6. Overlay Components

---

# Component Hierarchy

```

App

├── Layout

│ ├── Sidebar

│ ├── Header

│ └── Container

│

├── Navigation

│ ├── Navigation Item

│ ├── Breadcrumb

│ └── Tabs

│

├── Forms

│ ├── Button

│ ├── Input

│ ├── Textarea

│ ├── Select

│ ├── Checkbox

│ └── Search Bar

│

├── Display

│ ├── Resource Card

│ ├── Cluster Card

│ ├── Badge

│ ├── Avatar

│ └── Metadata Row

│

├── Feedback

│ ├── Toast

│ ├── Skeleton

│ ├── Empty State

│ └── Error State

│

└── Overlay

├── Modal

├── Dialog

├── Dropdown

└── Tooltip

```

---

# Layout Components

## Container

### Purpose

Provides consistent page width and spacing.

### Usage

- Page layouts
- Dashboard sections
- Detail pages

---

## Sidebar

### Purpose

Primary navigation.

### Features

- Active state
- Collapse support
- Responsive behavior

---

## Header

### Purpose

Displays page title and actions.

### Common Content

- Page title
- Search
- Primary action
- User menu

---

# Navigation Components

## Navigation Item

### States

- Default
- Hover
- Active
- Disabled

---

## Tabs

### Purpose

Switch between related content.

Example

- Grid
- List

---

## Breadcrumb

### Purpose

Show current navigation path.

Example

Library

>

React

>

React Hooks Guide

---

# Form Components

## Button

### Variants

- Primary
- Secondary
- Ghost
- Destructive

### States

- Default
- Hover
- Active
- Loading
- Disabled

### Accessibility

- Keyboard accessible
- Visible focus state

---

## Input

### Features

- Label
- Placeholder
- Validation
- Helper text

### States

- Default
- Focus
- Error
- Disabled

---

## Textarea

Used for:

- Description
- Notes

Supports:

- Auto resize
- Character limit (future)

---

## Search Bar

### Features

- Search icon
- Clear button
- Keyboard shortcut
- Loading indicator

Supports:

- Keyword search
- Semantic search

---

## Select

Used for

- Sorting
- Filters

---

## Checkbox

Used for

- Multi-select
- Filter options

---

# Data Display Components

## Resource Card

### Purpose

Display a saved resource.

### Contains

- Thumbnail
- Title
- Description
- Platform
- Tags
- Quick actions

### Actions

- Open
- Edit
- Delete

### Variants

- Grid
- List
- Compact

---

## Cluster Card

### Purpose

Display an AI-generated cluster.

### Contains

- Name
- Resource count
- Status
- Confidence

### Actions

- Open
- Rename
- Merge

---

## Badge

Used for

- Platform
- Tags
- Status

Examples

GitHub

YouTube

Active

Draft

---

## Metadata Row

Displays key-value information.

Example

Platform : GitHub

Creator : Fireship

Added : Yesterday

---

# Feedback Components

## Toast

### Types

- Success
- Warning
- Error
- Information

### Examples

Resource Saved

Cluster Updated

Delete Successful

---

## Skeleton

Used while loading.

Examples

- Resource Card
- Detail Page
- Search Results

---

## Empty State

Purpose

Guide users when no data exists.

Includes

- Illustration (optional)
- Title
- Description
- CTA Button

---

## Error State

Displays

- Error message
- Suggested action
- Retry button

---

# Overlay Components

## Modal

Used for

- Save Resource
- Edit Resource

Should trap keyboard focus.

---

## Confirmation Dialog

Used for

- Delete
- Merge
- Remove Resource

Always requires explicit confirmation.

---

## Dropdown

Used for

- Sort
- User Menu
- Quick Actions

---

## Tooltip

Used for

- Icon explanations
- AI confidence
- Metadata

Should never contain critical information.

---

# Shared States

Every interactive component should support:

- Default
- Hover
- Focus
- Active
- Disabled
- Loading

---

# Icons

Use one icon library throughout the application.

Examples

- Search
- Edit
- Delete
- Settings
- Bookmark
- Folder
- Link

Icons should always communicate meaning clearly.

---

# Accessibility

All components must support:

- Keyboard navigation
- Focus visibility
- Screen readers
- ARIA labels where necessary

Interactive components should never rely only on color.

---

# Responsive Behavior

Desktop

Full layout

Tablet

Adaptive spacing

Mobile

Touch-friendly sizing

Responsive behavior should be built into each component.

---

# Naming Convention

Component names should be clear and descriptive.

Examples

```
Button
Input
SearchBar
Sidebar
ResourceCard
ClusterCard
Badge
Modal
Toast
Skeleton
```

Avoid ambiguous names.

---

# Component Organization

```
components/

ui/
Button
Input
Textarea
Modal
Badge
Tooltip

layout/
Sidebar
Header
Container

navigation/
Tabs
Breadcrumb

resource/
ResourceCard
ResourceList
ResourceDetail

cluster/
ClusterCard
ClusterList

feedback/
Toast
Skeleton
EmptyState
ErrorState
```

---

# Design Principles

Every component should:

- Solve one problem well.
- Be reusable.
- Be composable.
- Be accessible.
- Be responsive.
- Minimize props.
- Follow the Design System.

---

# Future Components

Reserved for future versions:

- Knowledge Graph
- AI Chat Panel
- Bookmark Import Wizard
- Activity Timeline
- Analytics Dashboard
- Command Palette
- Calendar View

---

# Guiding Principle

Build small, reusable components that combine to create a consistent, fast, and accessible user experience.

The Component Library should evolve with the product while remaining simple, predictable, and easy to maintain.
