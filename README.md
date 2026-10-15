# ReturnDesk

A returns management application for a small online store. It helps support agents create return requests, review cases, decide on resolutions, add notes, and track requests until they are closed.

**Live Application:** https://returndesk-ashy.vercel.app/  
GitHub Repository:(https://github.com/saurabhbhardwaj934/returndesk)
## Overview

ReturnDesk provides a single workspace for managing product returns. Each request has a system-generated reference, customer and order information, a return reason, a status, and a record of its notes.

The application is built with JavaScript and Next.js App Router. Next.js route handlers manage the backend operations, and Supabase PostgreSQL stores the data persistently.

## Features

- Create return requests with customer contact details, order number, product SKU, item name, quantity, and return reason.
- Generate a unique, human-readable return reference on the server.
- Search by customer name, order number, or return reference.
- Filter requests by status and return reason.
- Sort and paginate results on the server.
- View request details and notes in chronological order.
- Add notes without editing or deleting previously written notes.
- Edit requests before a final decision.
- Approve requests with a refund, replacement, or store credit resolution.
- Reject requests and complete approved requests.
- Soft-delete eligible requests while retaining their database records.
- Display dashboard counts by status and return reason.
- Handle loading, empty, and error states, with responsive layouts for smaller screens.

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | React, Next.js App Router |
| Language | JavaScript |
| Styling | Tailwind CSS |
| Backend | Next.js Route Handlers |
| Database | Supabase PostgreSQL |
| Database access | `pg` and raw SQL |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm
- A Supabase project with PostgreSQL access

### 1. Clone the repository

```bash
git clone https://github.com/saurabhbhardwaj934/returndesk
cd returndesk
npm install
```

Replace the repository URL with the actual GitHub clone URL. If Git creates a differently named directory, enter that directory instead.

### 2. Configure the database

Create a Supabase project and open **Project → Settings → Database** to obtain the PostgreSQL connection details.

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Configure the database connection in `.env`:

```env
DATABASE_URL=your_supabase_postgres_connection_string
```

Use the pooled connection URI on port `6543` as configured for this project. Replace the placeholder with your actual connection string.

Keep `.env` private. Never commit database credentials or other secrets to GitHub.

### 3. Run database migrations

```bash
npm run db:migrate
```

This creates the tables and indexes required by the application.

### 4. Load sample data

```bash
npm run db:seed
```

The seed script creates 36 sample return requests distributed across all five statuses, with at least seven records for each return reason. Notes are included on a subset of requests.

**Important:** The seed script uses `TRUNCATE` to reset the relevant tables before inserting sample data. Run it only against a database where resetting those records is acceptable. Do not run it against production data you need to preserve.

### 5. Start the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database and Data Model

PostgreSQL is used as the persistent data store so that requests remain available across application restarts.

The database contains return request records and their associated notes. The schema and indexes are defined in `db/migrate.sql`.

Important implementation details include:

- Database-generated UUIDs identify records.
- Human-readable references make requests easier to locate.
- Integer currency values represent refund amounts to avoid floating-point rounding problems.
- A partial unique index prevents duplicate active requests for the same order and item SKU.
- Soft deletion uses a deletion timestamp instead of physically removing a request.
- SQL queries perform filtering, sorting, and pagination on the server.

## Request Lifecycle

The application enforces the following status transitions:

```text
open → in_review → approved → completed
             └──→ rejected
```

Rejected and completed requests are final states. Other transitions are rejected by the backend.

### Resolution Rules

- A request cannot be approved without a resolution.
- Supported resolutions are `refund`, `replacement`, and `store_credit`.
- A refund requires a positive amount expressed in integer currency units.
- Replacement and store credit cannot include a refund amount.
- Resolution information is retained when an approved request is completed.

### Duplicate Requests

Only one active return request is permitted for the same combination of `order_number` and `item_sku`.

A new request for that combination is allowed after the previous request reaches `rejected` or `completed`.

Both application-level validation and a database constraint provide protection against duplicate active requests.

### Editing and Removal

Customer and item details become locked once a request is approved, rejected, or completed. Notes can still be added after those decisions.

Only requests in `open` or `rejected` status may be removed. Removal hides the request from the normal list and detail endpoints without destroying the database record.

## API Reference

All endpoints are implemented using Next.js Route Handlers.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/returns` | List and search requests |
| POST | `/api/returns` | Create a request |
| GET | `/api/returns/:id` | Fetch a request and its notes |
| PATCH | `/api/returns/:id` | Edit an eligible request |
| POST | `/api/returns/:id/status` | Change status and set resolution |
| POST | `/api/returns/:id/notes` | Add a note |
| DELETE | `/api/returns/:id` | Soft-delete an eligible request |
| GET | `/api/returns/summary` | Get dashboard counts |

The list endpoint supports the following query parameters:

- `search`: customer name, order number, or reference
- `status`: status filter
- `reason`: return reason filter
- `sort`: supported sorting field
- `order`: `asc` or `desc`
- `page`: page number
- `pageSize`: number of records per page, up to 50

Filtering, sorting, and pagination are handled in SQL. The list query uses `ILIKE`, `COUNT(*) OVER()`, `LIMIT`, and `OFFSET`. Search input is debounced by 350 milliseconds in the interface.

### Error Handling

The API uses consistent JSON error responses:

```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "The requested status transition is not allowed"
  }
}
```

The `details` field may be included when additional validation information is available.

Expected validation errors, missing records, and business-rule refusals use appropriate HTTP status codes rather than returning an error inside a successful response.

## Design Decisions

### Next.js Route Handlers

The frontend and backend are deployed as one Next.js application. This avoids maintaining a separate Express service and keeps the deployment straightforward.

### Raw SQL with `pg`

The application uses raw SQL instead of an ORM. This provides direct control over the queries and makes the filtering, counting, sorting, and pagination behavior explicit.

### Centralised Business Rules

`lib/rules.js` contains the shared business rules, while `lib/validate.js` handles input validation.

The frontend uses the rules to control available actions, but the backend independently enforces them. Hiding a button is not treated as a security or validation mechanism.

### Human-Readable References

The server generates references in the `RET-XXXXXX` format. A unique constraint and retry logic handle potential reference collisions.

The detail endpoint accepts either a UUID or a return reference, allowing readable URLs without removing the underlying UUID identifier.

### Refund Amounts in Integer Units

The interface accepts an amount in rupees and converts it to integer paise using `Math.round(amount * 100)`. The database stores the integer amount, avoiding floating-point arithmetic for currency values.

### Soft Deletion

Requests are removed from the desk by setting `deleted_at`. This preserves the underlying record while excluding it from normal list and detail access.

## Assumptions

Some details in the brief required implementation choices:

- **Item identity:** The same item means an exact match of `order_number` and `item_sku`. Item name is not used to determine duplication.
- **Order ownership:** Order numbers are assumed to identify the relevant order uniquely, so customer identity is not separately included in the duplicate check.
- **Status transitions:** An `open` request must first move to `in_review` before it can be rejected. Direct rejection from `open` is not permitted.
- **Resolution on other transitions:** Resolution fields are validated when a request is approved. Resolution information supplied for a non-approval transition is ignored.
- **Authentication:** The current version is a single shared desk and does not include login or role-based access because authentication was not part of the requested scope.
- **Sorting:** Sorting is restricted to an explicit whitelist of six columns. Page size is capped at 50.
- **Completed requests:** A completed request retains the resolution recorded at approval.

These choices keep the implementation consistent and make the behavior predictable for the user.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the production application |
| `npm run start` | Start the production server |
| `npm run lint` | Run the configured lint checks |
| `npm run db:migrate` | Create database tables and indexes |
| `npm run db:seed` | Reload sample data and notes |
| `node scripts/verify.js` | Verify sample-data counts |
| `node scripts/apitest.js [baseUrl]` | Run API tests for business rules |

The API test script changes test data. Run the seed script again afterward if you want to restore the original sample dataset.

## Deployment

The application is deployed on Vercel and uses Supabase PostgreSQL.

To deploy another instance:

1. Import the public GitHub repository into Vercel.
2. Configure `DATABASE_URL` in the deployment environment variables.
3. Run the database migrations against the intended Supabase project.
4. Load sample data if required for the demo.
5. Deploy the application and verify the API and database connection.

The deployed application requires a working PostgreSQL connection. Database credentials must remain server-side and must not be exposed to the browser.

## Current Status and Future Work

The current implementation focuses on the core return-management workflow, database persistence, API validation, and request lifecycle.

Potential improvements include:

- A dashboard showing total refund amounts.
- An audit log for request changes and status transitions.
- Order lookup and autocomplete.
- Authentication and role-based access for multiple agents.
- Additional automated tests for edge cases and concurrent operations.

These enhancements are future work and are not presented as existing features.

## Development Time

Approximately 10–12 hours were spent on planning, implementation, database setup, sample data, interface development, and deployment.

## License

No license has been specified for this repository. Add a license file if you intend to distribute the project under specific reuse terms.
