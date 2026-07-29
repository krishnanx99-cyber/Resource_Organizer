# Database Schema

**Product:** Resource Organizer

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the logical database structure for Resource Organizer.

The database is designed to:

- Store saved resources
- Support semantic search
- Support AI-generated clusters
- Preserve user context
- Scale efficiently as the library grows

The schema follows a relational model while remaining flexible enough for future expansion.

---

# Database Overview

Database

PostgreSQL

Primary Entities

- User
- Resource
- Cluster
- ResourceCluster

Supporting Entities

- SearchHistory

Future Entities

- Collections
- Tags
- ActivityLog
- Notifications
- BrowserImports

---

# Entity Relationship Diagram

```
User
 │
 ├────────────── Resources
 │                    │
 │                    │
 │          ResourceClusters
 │                    │
 │                    │
 ├────────────── Clusters
 │
 └────────────── SearchHistory
```

---

# Table: Users

Purpose

Stores application users.

## Fields

| Field | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | Text | Display name |
| email | Text | Unique email |
| password_hash | Text | Hashed password |
| created_at | Timestamp | Creation time |
| updated_at | Timestamp | Last update |

---

Indexes

- email (unique)

---

# Table: Resources

Purpose

Stores every resource saved by a user.

Resources always belong to the master library.

## Fields

| Field | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner |
| url | Text | Original URL |
| title | Text | Resource title |
| description | Text | User description |
| notes | Text | Personal notes |
| platform | Text | Source platform |
| source_type | Text | Resource category |
| creator | Text | Author or creator |
| thumbnail_url | Text | Preview image |
| metadata | JSON | Platform metadata |
| embedding | Vector | Semantic embedding |
| embedding_model | Text | Embedding model identifier |
| opened_count | Integer | Total opens |
| first_opened_at | Timestamp | First access |
| last_opened_at | Timestamp | Last access |
| status | Text | Active or archived |
| created_at | Timestamp | Created time |
| updated_at | Timestamp | Updated time |

---

Status Values

- active
- archived
- deleted

---

Indexes

- user_id
- created_at
- platform
- source_type
- status
- Vector Index (embedding)

---

# Table: Clusters

Purpose

Stores semantic topic groups.

Clusters organize resources without owning them.

## Fields

| Field | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner |
| name | Text | Cluster name |
| description | Text | Optional description |
| centroid | Vector | Cluster centroid |
| confidence | Decimal | AI confidence |
| status | Text | Cluster state |
| created_at | Timestamp | Created time |
| updated_at | Timestamp | Updated time |

---

Status Values

- proposed
- active
- dismissed
- archived

---

Indexes

- user_id
- status

---

# Table: ResourceClusters

Purpose

Many-to-many relationship between resources and clusters.

A resource may belong to multiple clusters.

A cluster may contain multiple resources.

## Fields

| Field | Type | Description |
|--------|------|-------------|
| resource_id | UUID | Resource |
| cluster_id | UUID | Cluster |
| similarity_score | Decimal | Semantic similarity |
| added_by | Text | AI or user |
| created_at | Timestamp | Membership creation |

---

Added By Values

- ai
- user

---

Primary Key

(resource_id, cluster_id)

---

Indexes

- resource_id
- cluster_id

---

# Table: SearchHistory

Purpose

Stores recent user searches.

Useful for:

- Search suggestions
- Analytics
- UX improvements

## Fields

| Field | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner |
| query | Text | Search text |
| created_at | Timestamp | Search time |

---

# Relationships

```
User

1 ────────────∞ Resources

1 ────────────∞ Clusters

1 ────────────∞ SearchHistory

Resources ∞ ──────── ∞ Clusters

(via ResourceClusters)
```

---

# Resource Lifecycle

```
Create

↓

Save Metadata

↓

Generate Embedding

↓

Suggest Clusters

↓

Searchable

↓

Open

↓

Edit

↓

Archive

↓

Delete
```

---

# Search Strategy

Resources are searchable by:

- Title
- Description
- Notes
- Metadata
- Semantic Embedding

Search combines keyword matching with semantic similarity.

---

# Duplicate Handling

Duplicate URLs are allowed.

When a duplicate is detected:

Application displays a warning.

The user chooses whether to:

- Open existing
- Save another copy
- Cancel

The database does not enforce URL uniqueness.

---

# Delete Behavior

Deleting a resource:

- Removes cluster memberships
- Keeps clusters intact

Deleting a cluster:

- Removes memberships
- Keeps resources intact

This ensures the master library is never affected by cluster operations.

---

# Metadata Storage

Metadata varies between platforms.

Instead of adding dozens of columns, platform-specific data is stored as structured JSON.

Examples include:

- Duration
- Language
- Publisher
- Author
- Repository statistics

This approach keeps the schema flexible.

---

# Future Expansion

Possible future tables:

- Collections
- Tags
- ResourceAttachments
- ActivityLog
- Notifications
- BrowserImports
- AIFeedback
- SharedResources
- Reminders

These additions should not require major schema changes.

---

# Database Design Principles

The schema follows these principles:

1. Every resource belongs to one master library.
2. Clusters are non-destructive overlays.
3. Semantic search is a first-class feature.
4. AI enhances organization but never owns data.
5. The schema should remain extensible and easy to evolve.

---

# Guiding Principle

The database should prioritize fast retrieval, reliable relationships, and long-term maintainability while keeping the user's knowledge library organized and future-proof.
