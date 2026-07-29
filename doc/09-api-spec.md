# API Specification

**Product:** Resource Organizer

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the public API contract for Resource Organizer.

It specifies:

- API conventions
- Authentication
- Endpoints
- Request formats
- Response formats
- Error handling
- Pagination
- Filtering
- API versioning

This document is framework-independent and serves as the contract between the frontend and backend.

---

# API Overview

Architecture

REST API

Base URL

```
/api/v1
```

Response Format

JSON

Authentication

Bearer Token (JWT)

Content Type

```
application/json
```

---

# API Design Principles

- Resource-oriented endpoints
- Predictable naming
- Consistent responses
- Stateless requests
- Standard HTTP status codes
- Backward-compatible versioning

---

# Authentication

All protected endpoints require:

```
Authorization: Bearer <access_token>
```

Public endpoints:

- Login
- Register
- Health Check

---

# Standard Response Format

## Success

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully."
}
```

---

## Error

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource does not exist."
  }
}
```

---

# Authentication Endpoints

## Register

POST

```
/auth/register
```

Request

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "********"
}
```

Response

```
201 Created
```

---

## Login

POST

```
/auth/login
```

Request

```json
{
  "email": "john@example.com",
  "password": "********"
}
```

Response

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {}
}
```

---

## Logout

POST

```
/auth/logout
```

---

# User Endpoints

## Get Current User

GET

```
/users/me
```

---

## Update Profile

PATCH

```
/users/me
```

---

# Resource Endpoints

## Get Resources

GET

```
/resources
```

Query Parameters

| Parameter | Description |
|-----------|-------------|
| page | Page number |
| limit | Items per page |
| sort | Sort order |
| search | Search query |
| platform | Filter by platform |
| status | Filter by status |

Response

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 120
}
```

---

## Get Resource

GET

```
/resources/{id}
```

---

## Create Resource

POST

```
/resources
```

Request

```json
{
  "url": "...",
  "description": "...",
  "notes": "...",
  "tags": []
}
```

Response

```
201 Created
```

---

## Update Resource

PATCH

```
/resources/{id}
```

---

## Delete Resource

DELETE

```
/resources/{id}
```

Response

```
204 No Content
```

---

# Similar Resource Endpoints

## Get Similar Resources

GET

```
/resources/{id}/similar
```

Response

```json
{
  "items": [
    {
      "resourceId": "...",
      "similarity": 0.94
    }
  ]
}
```

---

# Search Endpoints

## Search Resources

GET

```
/search
```

Query Parameters

| Parameter | Description |
|-----------|-------------|
| q | Search query |
| page | Page number |
| limit | Page size |

Response

```json
{
  "items": [],
  "query": "react hooks",
  "total": 14
}
```

The backend combines keyword and semantic search before returning ranked results.

---

# Cluster Endpoints

## Get Clusters

GET

```
/clusters
```

---

## Get Cluster

GET

```
/clusters/{id}
```

---

## Rename Cluster

PATCH

```
/clusters/{id}
```

Request

```json
{
  "name": "React Fundamentals"
}
```

---

## Merge Clusters

POST

```
/clusters/merge
```

Request

```json
{
  "sourceClusterId": "...",
  "targetClusterId": "..."
}
```

---

## Remove Resource from Cluster

DELETE

```
/clusters/{clusterId}/resources/{resourceId}
```

---

# Metadata Endpoint

## Refresh Metadata

POST

```
/resources/{id}/refresh-metadata
```

Used when the user wants to update the title, thumbnail, or other metadata from the original URL.

---

# AI Endpoints

## Get AI Suggestions

GET

```
/resources/{id}/suggestions
```

Response

```json
{
  "similarResources": [],
  "suggestedClusters": [],
  "confidence": 0.92
}
```

---

# Health Endpoint

GET

```
/health
```

Response

```json
{
  "status": "healthy"
}
```

---

# Pagination

All paginated endpoints return:

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 156,
  "totalPages": 8
}
```

---

# Filtering

Supported filters include:

- Platform
- Source Type
- Status
- Date Added

Filters may be combined in a single request.

Example

```
GET /resources?platform=GitHub&status=active
```

---

# Sorting

Supported sort fields:

- Created Date
- Updated Date
- Title
- Last Opened
- Open Count

Ascending and descending order should be supported.

Example

```
GET /resources?sort=createdAt:desc
```

---

# Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

# Validation Rules

Examples

Resource

- URL must be valid.
- URL length should not exceed the supported limit.
- Notes are optional.
- Description is optional.

User

- Email must be unique.
- Password must meet security requirements.

---

# Rate Limiting

Recommended limits:

Authentication

- 10 requests/minute

General API

- 100 requests/minute

Search

- 60 requests/minute

These values can be adjusted based on deployment requirements.

---

# API Versioning

Versioning is URL-based.

Example

```
/api/v1/resources
```

Breaking changes require a new version.

---

# Security

- HTTPS only
- JWT authentication
- Password hashing
- Input validation
- Output sanitization
- CORS configuration
- Rate limiting

---

# Future Endpoints

Potential additions:

- Browser Import
- Bulk Import
- Export Library
- AI Chat
- Collections
- Notifications
- Activity History
- Shared Libraries

These should be introduced without breaking existing API contracts.

---

# Guiding Principle

The API should be simple, predictable, secure, and consistent, allowing the frontend to evolve independently while providing reliable access to the user's knowledge library.
