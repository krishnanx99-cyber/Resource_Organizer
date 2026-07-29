# Information Architecture

**Product:** Resource Organizer

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the overall structure of Resource Organizer.

It describes:

- Application hierarchy
- Navigation structure
- Screen organization
- Routing
- Content hierarchy
- Relationships between screens

The objective is to make navigation intuitive, reduce cognitive load, and ensure every important action is easily accessible.

---

# Information Architecture Principles

The application follows five principles.

## 1. Retrieval Before Organization

Users should be able to find resources quickly without relying on manual folder structures.

---

## 2. Flat Resource Library

Every resource belongs to one master library.

Clusters organize resources conceptually but never move or duplicate them.

---

## 3. Search Everywhere

Search is the primary navigation mechanism.

Users should always be one interaction away from finding any saved resource.

---

## 4. Progressive Disclosure

Show only what users need at the current moment.

Advanced actions should remain accessible without overwhelming the interface.

---

## 5. Consistency

Navigation, layouts, and interactions should behave consistently across all screens.

---

# Application Structure

```
Application
│
├── Dashboard (Future)
│
├── Library
│   ├── Resource Detail
│   └── Edit Resource
│
├── Clusters
│   └── Cluster Detail
│
├── Search
│
├── Settings
│
└── Profile
```

---

# Navigation Structure

Primary Navigation

```
Library

Clusters

Search

Settings

Profile
```

The navigation should remain visible throughout the application.

Desktop

Persistent Sidebar

Tablet

Collapsible Sidebar

Mobile

Bottom Navigation

---

# Route Structure

```
/

↓

/library

↓

/resources/:id

↓

/resources/:id/edit

↓

/clusters

↓

/clusters/:id

↓

/search

↓

/settings

↓

/profile
```

---

# Screen Hierarchy

## Level 1

Top-level pages

- Library
- Clusters
- Search
- Settings
- Profile

---

## Level 2

Content pages

- Resource Detail
- Cluster Detail
- Edit Resource

---

## Level 3

Dialogs & Modals

- Save Resource
- Rename Cluster
- Merge Cluster
- Delete Confirmation
- Duplicate Resource Warning

---

# Navigation Flow

```
Library
│
├── Open Resource
│
├── Save Resource
│
├── Search
│
└── Filters

↓

Resource Detail

↓

Edit Resource

↓

Back to Library
```

---

# Primary Screens

## Library

Purpose

The central location containing every saved resource.

Features

- Grid View
- List View
- Sorting
- Filtering
- Search
- Quick Actions

Primary Action

Save Resource

---

## Resource Detail

Purpose

Display complete information about one resource.

Contains

- Metadata
- Description
- Notes
- Tags
- Cluster Membership
- Similar Resources

Actions

- Open Original Resource
- Edit
- Delete

---

## Search

Purpose

Find resources using keywords or semantic meaning.

Features

- Search Bar
- Filters
- Results
- Suggested Searches

---

## Clusters

Purpose

Display AI-generated topic groups.

Clusters contain references to resources.

Resources always remain in the Library.

Actions

- Open
- Rename
- Merge
- Remove Resource

---

## Settings

Purpose

Application preferences.

Future settings

- Theme
- Export Data
- AI Preferences
- Keyboard Shortcuts

---

## Profile

Purpose

User account information.

Future additions

- Storage Usage
- Connected Accounts
- API Keys

---

# Content Hierarchy

For every Resource Card

Priority

1. Title
2. Description
3. Platform
4. Tags
5. Date Added

The most important information should always appear first.

---

# Resource Relationships

```
Library
      │
      │
      ▼
+--------------+
|  Resource    |
+--------------+
      │
      ├────────────► Similar Resources
      │
      └────────────► Cluster Membership
```

Resources are the central entity.

Everything else connects to them.

---

# Search Architecture

Search combines multiple methods.

```
User Query
      │
      ▼
Keyword Search
      +
Semantic Search
      │
      ▼
Rank Results
      │
      ▼
Display Results
```

Search should return relevant results even when exact words are not used.

---

# Save Flow Architecture

```
Paste URL
      │
      ▼
Metadata Fetch
      │
      ▼
Save Resource
      │
      ▼
Background AI Processing
      │
      ▼
Update Search & Clusters
```

Saving should never wait for AI processing.

---

# Global Components

Available from every major screen.

- Navigation Sidebar
- Search
- Save Resource Button
- Toast Notifications
- Confirmation Dialog
- Loading Indicators

---

# Empty States

Library

"No resources yet."

Primary CTA

Save Your First Resource

---

Search

"No matching resources."

Suggestions

- Try broader keywords.
- Remove filters.

---

Clusters

"No clusters available yet."

Explanation

Clusters will appear automatically as your library grows.

---

# Error States

Metadata unavailable

↓

Allow manual saving.

---

Search unavailable

↓

Fallback to keyword search.

---

Embedding failure

↓

Retry in background.

---

# Responsive Layout

## Desktop

- Persistent Sidebar
- Multi-column resource grid
- Floating Save button

---

## Tablet

- Collapsible Sidebar
- Two-column grid

---

## Mobile

- Bottom Navigation
- Single-column layout
- Floating Save button

---

# Accessibility

Support

- Keyboard navigation
- Screen readers
- Focus indicators
- High contrast mode
- Large touch targets

Accessibility should be considered throughout the application.

---

# Future Expansion

The architecture supports future features without major structural changes.

Possible additions

- Browser Extension
- AI Assistant
- Knowledge Graph
- Bookmark Import
- Smart Reminders
- Collaboration
- Mobile Applications

---

# Design Guidelines

The application should feel

- Calm
- Minimal
- Fast
- Predictable
- Content-focused

Users should never wonder where to find a feature.

Navigation should remain simple regardless of library size.

---

# Guiding Principle

The application's structure should help users move from **saving** to **rediscovering** knowledge with the fewest possible interactions.
