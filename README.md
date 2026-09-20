# Lockyt

A YouTrack app created with TypeScript

This app uses the Enhanced DX template with TypeScript support, type-safe APIs, and file-based routing.

For comprehensive documentation, see [@jetbrains/youtrack-apps-tools](https://github.com/JetBrains/youtrack-apps/tree/main/packages/apps-tools).

## What the App Does

The app locks two kinds of entity:

- A **issue** locks when the issue becomes resolved. See [Issues](#issues).
- An **article** locks when a user freezes it. See [Articles](#articles).

A locked issue or a frozen article is read-only. The rule rejects each change and shows a
message.

### Issues

The app locks an issue when the issue becomes resolved. A locked issue is read-only. The rule
rejects each change to a locked issue and shows a message. The user keeps no change.

The one permitted change is to reopen the issue. Reopen the issue alone. Do not send another
change in the same save.

A project admin sets the behaviour for each project. Open the settings of the project, then open
the **Lock** tab, section **Issues**. These settings are available:

| Setting | Default | Description |
| --- | --- | --- |
| Lock a resolved issue | On | Turns the lock on or off for the project. |
| Who can reopen a locked issue | Anyone with update access | Select `Anyone with update access`, `The reporter`, `The user who resolved the issue`, `The reporter or the user who resolved the issue`, or `Project admins only`. A project admin can always reopen an issue. |
| Comments | Permitted | Lets a user add, edit, or remove a comment on a locked issue. |
| Links | Permitted | Lets a user add or remove a link on a locked issue. |
| Work items | Permitted | Lets a user log time on a locked issue. |
| Attachments | Not permitted | Lets a user add or remove an attachment on a locked issue. |
| Tags | Not permitted | Lets a user add or remove a tag on a locked issue. |

The app rejects each change that is not in the list above. This includes a custom field, the
summary, the description, and the visibility.

A resolved issue shows a **Lock status** line at the end of its field panel: a lock icon and
"Issue resolved and locked by <user> <time>.", or "Issue locks are disabled in this project."
when the lock for issues is off. The line reads "Issue resolved and locked." when the app does
not know who resolved the issue. Click the information icon to see what the settings permit on the issue, and who
can reopen it. An unresolved issue does not show the line.

The app keeps the settings of each project as one JSON string in the `settings` extension property
of the project. The string has the shape `{ "version": 1, "issue": { ... }, "article": { ... } }`.
The backend checks the settings before it keeps them. In the stored settings the values of
`issue.unlockRestriction` are `anyone`, `reporter`, `resolver`, `reporterOrResolver` and
`projectAdmins`. A project that an admin configured with an earlier version shows the default
issue settings until the admin saves the **Lock** tab again. The article settings are not affected.

YouTrack does not record who resolved an issue, so the app does. The rule **Record who resolved an
issue** sets two extension properties of the issue when it becomes resolved: `resolvedBy` (the
user) and `resolvedAt` (milliseconds since 1970-01-01T00:00Z). The rule runs also when the lock for
issues is off, so that the data exists if an admin turns the lock on later.

### Notes on the Behaviour

- A change from one resolved state to a different resolved state (for example, `Fixed` to
  `Won't fix`) keeps the issue resolved. The issue stays locked, so the rule rejects the change.
  Reopen the issue, then resolve it again.
- A project admin has no special permission to edit a locked issue. A project admin must also
  reopen the issue first.
- A reopen can also carry a change that the settings permit, for example a comment. It cannot
  carry a change to a field, the summary, or the description.
- An issue that became resolved before the app was installed has no recorded resolver. Under
  `The user who resolved the issue` only a project admin can reopen it. Under `The reporter or the
  user who resolved the issue` the reporter or a project admin can.
- A reopen does not clear `resolvedBy` and `resolvedAt`. The next resolution overwrites them.
- An issue that a user creates directly in a resolved state is not locked. A draft is not locked.

### Articles

A user **freezes** an article to lock it. Freeze = lock. A frozen article is read-only. A user
**unfreezes** the article to edit it again. Unfreeze = unlock. An article that is not frozen is
**editable**.

The **author** is the user who created the article. **The user who froze the article** is the user
who last made it frozen.

A status line above the activity stream of the article shows the state: "Editable. Freeze
article.", or "Frozen by <user> <time>. Unfreeze to update.". Click "Freeze article", "Unfreeze",
or the state icon to freeze or unfreeze. The widget asks you to confirm. Click the information icon to see what the settings permit on the article, and who can unfreeze it.

A project admin sets the behaviour for each project. Open the settings of the project, then open
the **Lock** tab, section **Articles**. These settings are available:

| Setting | Default | Description |
| --- | --- | --- |
| Make a frozen article read-only | On | Turns the lock for articles on or off for the project. |
| Who can unfreeze a frozen article | Anyone with edit access | See the table below. |
| Comments | Permitted | Lets a user add, edit, or remove a comment on a frozen article. |
| Child articles | Permitted | Lets a user add or remove a child article of a frozen article. |
| Tags | Permitted | Lets a user add or remove a tag on a frozen article. |
| Attachments | Not permitted | Lets a user add or remove an attachment on a frozen article. |

The app rejects each other change to a frozen article: the title, the content and the visibility.
A user can always move a frozen article to a different parent article.

**A user can freeze an article only if the same user can also unfreeze it.** Nobody can lock
themselves out. A project admin can always freeze and unfreeze.

**Edit access** means what YouTrack means by it: a project admin, a user with the Update Article
permission in the project, or the author of the article with the Create Article permission. An
author who can edit only their own articles can freeze and unfreeze those articles.

| Who can unfreeze | Project admin | Author | Other editor |
| --- | --- | --- | --- |
| Anyone with edit access | Freeze and unfreeze | Freeze and unfreeze | Freeze and unfreeze |
| The author | Freeze and unfreeze | Freeze and unfreeze | Neither |
| The user who froze the article | Freeze and unfreeze | Freeze. Unfreeze only as the user who froze it | Freeze. Unfreeze only as the user who froze it |
| The author or the user who froze the article | Freeze and unfreeze | Freeze and unfreeze | Freeze. Unfreeze only as the user who froze it |
| Project admins only | Freeze and unfreeze | Neither | Neither |

In the stored settings the values of `article.unlockRestriction` are `anyone`, `author`,
`lockedBy`, `authorOrLockedBy` and `projectAdmins`.

The app keeps the freeze state in four extension properties of the article: `isLocked`,
`lockedBy`, `lockedAt` (milliseconds since 1970-01-01T00:00Z) and `version`. The `version`
counter starts at 0 and goes up by one each time a user freezes the article. Unfreeze clears
`lockedBy` and `lockedAt`.

#### Notes on the Behaviour for Articles

- **An edit survives a block.** You edit a frozen article in an editor that saves at the end. The
  rule runs at that save. The message appears then, and your text stays in the editor. Unfreeze
  the article, then save again.
- **A block on a frozen parent cancels the operation on the child.** If child articles are not
  permitted, the app rejects the creation, the move, or the deletion of a child article. The
  message names the parent article.
- **The handler checks the project permission, not the article visibility.** A user who can
  update articles in the project, but who cannot see this article, can still freeze it through the
  endpoint if the user knows the ID. The endpoint itself requires only the Read Article permission,
  because YouTrack cannot express "the author of this article" as a static permission. The handler
  refuses a user without edit access before it writes anything.
- **The lock off leaves a frozen article frozen.** Unfreeze still works. Nothing else does.
- **Two admins who save two settings sections at the same moment** write the same string. The
  window is milliseconds.
- Deletion, a move to a different project, the order of the rules, a bulk operation and an
  integration account: the same limits as for issues.

### Known Limits

- **The app does not stop a user from deleting an issue.** The rule does not run on removal. The
  `DELETE_ISSUE` permission controls this.
- **The app does not control a move to a different project.** The rule ignores a save that changes
  the project. YouTrack uses the rules of the destination project for a move. That project can have
  no lock, so the app cannot stop a move out of a locked project. The app therefore also permits a
  move into a locked project. Use the project permissions to control a move.
- **The order of the rules is not defined.** If a different rule changes the same issue in the
  same save, its changes can appear as changes of the user. This can cause a wrong block, or let a
  change through. A test on a live instance showed this: a template rule changed the description in
  the same save, and the lock then also listed the description.
- **A block in a bulk command stops the full batch**, not one issue.
- **A link change goes to the two issues.** If a user links an open issue to a locked issue, the
  rule runs on the locked issue. A block then stops the save of the open issue. Links stay
  permitted by default, which prevents this.
- **The spent time field is an exception.** YouTrack calculates the spent time from the work items.
  When the settings permit a work item, the rule also permits each period field in that same save.
  A project that has a second period field, for example an estimation, can thus get a change to that
  field together with a work item.
- **An integration account has no exemption.** A VCS commit command, a helpdesk email answer, or a
  chat integration that writes to a locked issue gets the same block. To stop the lock, turn off
  **Lock a resolved issue** for the project.

## Table of Contents

- [What the App Does](#what-the-app-does)
  - [Issues](#issues)
  - [Articles](#articles)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Development Workflows](#development-workflows)
- [Deployment](#deployment)
- [Learn More](#learn-more)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file in project root:

```bash
YOUTRACK_HOST=https://your-youtrack.url
YOUTRACK_TOKEN=perm:your-permanent-token
```

Get a permanent token: YouTrack profile → Account Security → New token. See [token management](https://www.jetbrains.com/help/youtrack/server/manage-permanent-token.html).

3. Start development with watch mode:

```bash
npm run watch
```

This watches for changes and automatically uploads to YouTrack. No auto-reload, requires manual refresh.
## Project Structure

```
src/
├── api/                          # Generated API client and types
│   ├── index.ts                  # Type-safe API client
│   ├── youtrack-types.d.ts       # YouTrack entity type shortcuts
│   ├── api.d.ts                  # Generated route types (auto-generated)
│   ├── api.zod.ts                # Generated Zod schemas (auto-generated)
│   ├── app.d.ts                  # Generated app settings types (auto-generated)
│   └── extended-entities.d.ts    # Generated extension property types (auto-generated)
├── backend/
│   ├── router/                   # File-based API routes
│   │   ├── project/issueSettings/   # Reads and keeps the issue settings of a project
│   │   ├── project/articleSettings/  # Reads and keeps the article settings of a project
│   │   ├── article/lock/         # Reads the freeze state; freezes and unfreezes
│   │   └── issue/lock/           # Reads the lock state of an issue
│   ├── shared/
│   │   ├── lock-settings.ts      # The settings model, the checks and the defaults
│   │   ├── permissions.ts        # Who is a project admin; who can freeze, unfreeze, reopen
│   │   ├── article-lock.ts       # The freeze state and the freeze and unfreeze operations
│   │   └── issue-lock.ts        # The lock state of an issue; who resolved it; who can reopen
│   ├── types/                    # Backend type definitions
│   │   ├── backend.global.d.ts   # Global backend types and context types
│   │   └── utility.d.ts          # Utility types for RPC extraction
│   └── requirements.ts           # YouTrack fields and values that your app needs
├── workflows/
│   ├── lock-resolved-issue.ts   # The rule that locks a resolved issue
│   ├── record-issue-resolver.ts # The rule that records who resolved an issue, and when
│   └── lock-frozen-article.ts    # The rule that locks a frozen article
├── common/
│   └── utils/
│       └── logger.ts             # Logger utility for frontend components
├── widgets/
│   ├── project-lock-config/      # The Lock tab in the settings of the project
│   ├── article-status/           # The status line above the activity stream of an article
│   ├── issue-status/            # The status line in the field panel of a resolved issue
│   └── shared/                   # The dialog and the frame logic that the status lines share
├── entity-extensions.json        # Declares the extension properties of a project, an issue and an article
└── app-id.ts                     # App identifier
```

## Available Scripts

### Development

- `npm run hmr` - Start Vite dev server for hot reload (frontend only, port 9000)
- `npm run watch` - Watch mode with automatic rebuild and upload (recommended)
- `npm run dev` - Watch mode with hot reload enabled (fastest for frontend development)

### Building

- `npm run build` - Full production build (backend → lint → frontend → validate)
- `npm run build:nolint` - Build without linting (faster for testing)
- `npm run build:backend` - Build backend only (generates API types)
- `npm run build:frontend` - Build frontend only (requires backend types)
- `npm run clean` - Remove generated API files

### Deployment

- `npm run upload-local` - Upload using `.env` credentials
- `npm run update` - Quick build + upload
- `npm run dev:upload` - Build and upload dev-mode bundle (for hot reload setup)

### Scaffolding

- `npm run g -- http-handler add --scope <scope> --path <path>` - Generate a new HTTP handler (e.g. `npm run g -- http-handler add --scope project --path settings`)
- `npm run g -- extension-property add --entity <Entity> --name <field>` - Generate a new entity extension property (e.g. `npm run g -- extension-property add --entity Issue --name myField`)
- `npm run g -- settings add --name <key> --type <type>` - Add an app settings field

### Maintenance

- `npm run lint` - Run ESLint
- `npm run pack` - Create distributable ZIP file

## Development Workflows

### Creating API Endpoints

Create files in `src/backend/router/{scope}/{path}/{METHOD}.ts`:

```typescript
/**
 * @zod-to-schema
 */
export type ProjectSettingsReq = {
    projectId: string;
};

/**
 * @zod-to-schema
 */
export type ProjectSettingsRes = {
    projectId: string;
    projectName: string;
};

export default function handle(ctx: CtxGet<ProjectSettingsRes, ProjectSettingsReq, "project">): void {
    const { projectId } = ctx.request.query;

    ctx.response.json({
        projectId,
        projectName: ctx.project.name
    });
}

export type Handle = typeof handle;
```

See [HTTP Handler Development](https://github.com/JetBrains/youtrack-apps/tree/main/packages/apps-tools#http-handler-development) for complete documentation.

### Using the API Client

In widgets:

```typescript
import { createApi } from '../api';
import type { ApiRouter } from '../api/api';

const api = createApi<ApiRouter>(host);
const settings = await api.project.settings.GET({ projectId: 'ABC-123' });
```

See [API Client](https://github.com/JetBrains/youtrack-apps/tree/main/packages/apps-tools#api-client) documentation.

### Watch Mode

Automatically rebuilds and uploads on file changes:

```bash
npm run watch
```

**What it does:**
- Watches both backend and frontend files
- Rebuilds on changes (backend generates types first if needed)
- Auto-uploads to YouTrack after each successful build
- Frontend builds as static bundles

**Scenarios:**
- Frontend-only changes
- Backend implementation
- Backend type changes: rebuilds frontend too

See [Watch Mode with Auto-Upload](https://github.com/JetBrains/youtrack-apps/tree/main/packages/apps-tools#watch-mode-with-auto-upload) for details.

### Hot Reload (HMR)

For instant frontend updates via Vite dev server:

```bash
npm run dev
```

**What it does:**
- One-time upload of dev-mode bundle (HTML points to localhost:9000)
- Starts Vite dev server on port 9000
- Watches backend with auto-upload
- Frontend changes hot reload instantly (<1s) without rebuilding or uploading

**Use when:** Iterating on frontend UI/components AND backend.

See [Hot Reload Setup](https://github.com/JetBrains/youtrack-apps/tree/main/packages/apps-tools#hot-reload-setup) for complete guide.

### Logger Usage

**In frontend components:**

```typescript
import { createComponentLogger } from '../common/utils/logger';

const logger = createComponentLogger('MyComponent');

function MyComponent() {
  logger.info('Component mounted');
  logger.debug('Rendering with props', {}, props);
  logger.error('Failed to load data', {}, error);
}
```

**In backend handlers:**

Backend handlers use standard `console` for logging:

```typescript
export default function handle(ctx: CtxGet<Response>) {
  console.log('Processing request');
  console.warn('Warning message');
  console.error('Error occurred', error);
}
```

View backend logs in: YouTrack → Administration → Apps → [Your App] → Technical Details → Open in editor / Download logs

### Type Naming Convention

Only types ending with `Req` and `Res` are exported to the API client:

```typescript
// Exported
export type CreateProjectReq = { name: string };
export type CreateProjectRes = { id: string };

// NOT exported (missing suffix)
export type ProjectData = { id: string };
```

## Deployment

### Development

```bash
npm run update
```

### Production

```bash
# Build and upload
npm run build
npm run upload-local

# Or upload with explicit credentials
npm run upload -- --host https://your-youtrack.url --token perm:your-token

# Or create ZIP for manual upload
npm run pack
```

## Common Issues

### `Cannot find module './api/api'`

Types not generated. Run:

```bash
npm run build:backend
```

### Upload fails with "401 Unauthorized"

- Check `.env` file exists with correct `YOUTRACK_HOST` and `YOUTRACK_TOKEN`
- Verify token has not expired
- Ensure token has app upload permissions

### Changes not detected in watch mode

- Save the file (Ctrl+S / Cmd+S)
- Check file is in `src/` directory
- Restart watch mode if needed

### Hot reload shows blank page

- Check Vite dev server is running (should start automatically with `npm run dev`)
- Verify dev server on port 9000: `curl http://localhost:9000`
- Check browser console for errors

### ESLint / ts-to-zod "skipped" or "failed"

- ESLint: `npm install -D eslint`
- ts-to-zod: `npm install -D ts-to-zod`

For more (env vars, port conflicts, upload errors), see [Troubleshooting Guide](https://github.com/JetBrains/youtrack-apps/tree/main/packages/apps-tools#troubleshooting).

## Learn More

- [Enhanced DX Tools Documentation](https://github.com/JetBrains/youtrack-apps/tree/main/packages/apps-tools) - Complete guide to the library
- [YouTrack App Development Guide](https://www.jetbrains.com/help/youtrack/devportal/apps-quick-start-guide.html) - Official YouTrack documentation
- [YouTrack Scripting API](https://www.jetbrains.com/help/youtrack/devportal/YouTrack-Api-Documentation.html) - API reference
