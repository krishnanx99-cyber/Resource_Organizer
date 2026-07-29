# User Flows

**Product:** Resource Organizer

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the primary user journeys within Resource Organizer.

Each flow describes how a user completes a task from start to finish, including system behavior, alternative paths, and error scenarios.

These flows serve as the foundation for:

- UI/UX Design
- Frontend Development
- Backend APIs
- Testing
- Feature Validation

---

# User Journey Overview

```
Discover Resource

↓

Save Resource

↓

AI Processing

↓

Library

↓

Search / Browse

↓

Rediscover Resource

↓

Open Original Resource

↓

Continue Learning
```

---

# Flow 1 — First-Time User

## Goal

Help new users understand the product and save their first resource.

---

### Trigger

User opens the application for the first time.

---

### Main Flow

```
Open Application

↓

Welcome Screen

↓

Short Product Introduction

↓

"Save Your First Resource"

↓

User Pastes URL

↓

Metadata Fetch Begins

↓

User Adds (Optional)
• Description
• Notes
• Tags

↓

Save Resource

↓

Resource Added

↓

Background AI Processing

↓

Library Opens
```

---

### Success

- First resource saved.
- User reaches the Library.

---

### Empty State

```
No resources yet.

Start building your knowledge library.

[ Save Resource ]
```

---

# Flow 2 — Save Resource

## Goal

Save a new online resource.

---

### Trigger

User clicks **+ Save Resource**.

---

### Main Flow

```
Paste URL

↓

Validate URL

↓

Fetch Metadata

↓

Show Preview

↓

(Optional) Description

↓

(Optional) Notes

↓

(Optional) Tags

↓

Save

↓

Resource Stored

↓

Generate Embedding

↓

Similarity Search

↓

Cluster Suggestion (If Applicable)

↓

Return to Library
```

---

### Alternative Flow

Metadata unavailable

↓

Display generic preview

↓

Allow saving

---

### Error Flow

Invalid URL

↓

Show validation error

↓

Remain on form

---

### Success

Resource appears in Library.

---

# Flow 3 — AI Processing

## Goal

Understand the newly saved resource.

---

### Trigger

Resource successfully saved.

---

### Background Flow

```
Generate Embedding

↓

Find Similar Resources

↓

Calculate Similarity

↓

Confidence Above Threshold?
├── Yes
│   ├── Suggest Existing Cluster
│   └── Create Proposed Cluster (if appropriate)
↓

Save AI Results
```

---

### Notes

This process happens in the background.

The user should not wait for AI processing.

---

# Flow 4 — Search Resources

## Goal

Help users quickly find saved knowledge.

---

### Trigger

User enters a search query.

---

### Main Flow

```
Enter Query

↓

Keyword Search

+

Semantic Search

↓

Merge Results

↓

Rank by Relevance

↓

Display Results

↓

User Opens Resource
```

---

### Empty State

```
No matching resources found.

Try:
• Different keywords
• Broader terms
• Fewer filters
```

---

### Success

User finds the desired resource.

---

# Flow 5 — Browse Library

## Goal

Explore all saved resources.

---

### Main Flow

```
Open Library

↓

View Resource Grid

↓

Scroll

↓

Filter

↓

Sort

↓

Select Resource

↓

Open Detail Page
```

---

### Available Actions

- Search
- Filter
- Sort
- Open
- Edit
- Delete

---

# Flow 6 — View Resource

## Goal

View complete information about one resource.

---

### Main Flow

```
Open Resource

↓

Display
• Title
• Metadata
• Description
• Notes
• Tags
• Cluster Membership

↓

Display Similar Resources

↓

Open Original Link

OR

Edit Resource
```

---

### System Actions

Automatically:

- Increase opened_count
- Update last_opened_at

---

# Flow 7 — Similar Resources

## Goal

Rediscover related knowledge.

---

### Trigger

User opens Resource Detail.

---

### Main Flow

```
Load Similar Resources

↓

Rank by Similarity

↓

Display Cards

↓

User Opens Another Resource

↓

Repeat
```

---

### Empty State

```
No similar resources available yet.
```

---

# Flow 8 — Browse Clusters

## Goal

Explore semantically related resources.

---

### Main Flow

```
Open Clusters

↓

View Cluster List

↓

Select Cluster

↓

Display Members

↓

Open Resource
```

---

### Available Actions

- Rename Cluster
- Merge Cluster
- Remove Resource

---

# Flow 9 — Edit Resource

## Goal

Update saved information.

---

### Main Flow

```
Open Resource

↓

Click Edit

↓

Modify
• Title
• Description
• Notes
• Tags

↓

Save

↓

Update Resource

↓

Regenerate Embedding (if needed)

↓

Refresh Similarity
```

---

### Success

Changes appear immediately.

---

# Flow 10 — Delete Resource

## Goal

Remove unwanted resources.

---

### Main Flow

```
Click Delete

↓

Confirmation Dialog

↓

Confirm

↓

Delete Resource

↓

Remove Cluster Memberships

↓

Return to Library
```

---

### Success

Resource removed successfully.

---

# Flow 11 — Duplicate Resource

## Goal

Prevent accidental duplicate saves.

---

### Trigger

Duplicate URL detected.

---

### Main Flow

```
Duplicate Found

↓

Show Dialog

↓

"This resource already exists."

↓

Choose
• Open Existing
• Save Anyway
• Cancel
```

---

### Success

User decides how to proceed.

---

# Error Recovery

## Metadata Fetch Failure

```
Fetch Metadata

↓

Failed

↓

Display Generic Information

↓

Continue Saving
```

---

## Embedding Failure

```
Embedding Failed

↓

Save Resource

↓

Retry in Background
```

---

## Search Failure

```
Semantic Search Unavailable

↓

Fallback

↓

Keyword Search
```

---

# Navigation Flow

```
Library
├── Save Resource
├── Search
├── Resource Detail
│   ├── Edit Resource
│   └── Delete Resource
↓
Clusters
↓
Cluster Detail
↓
Settings
```

---

# User Journey Summary

```
Discover Resource

↓

Save URL

↓

(Optional) Description

↓

(Optional) Notes

↓

AI Processing

↓

Library

↓

Search

↓

Similar Resources

↓

Rediscover

↓

Open Original Resource

↓

Repeat
```

---

# UX Principles

Every flow should follow these principles:

- Saving should be fast.
- AI processing should happen in the background.
- Users should never lose control over organization.
- Search should be available from every major screen.
- Important actions should require as few clicks as possible.
- Errors should never block saving when recovery is possible.

---

# Success Criteria

A user should be able to:

- Save a resource in under 30 seconds.
- Find a resource using search or browsing.
- Understand AI suggestions.
- Rediscover forgotten resources.
- Manage their library with minimal effort.

---

# Guiding Principle

Every interaction should reduce the effort required to save, organize, and rediscover knowledge.
