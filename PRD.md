# Product Requirements Document: Ascend

**Status:** Draft
**Version:** 0.2
**Product stage:** Prototype-led discovery
**Delivery model:** Incremental prototypes followed by production hardening
**Primary audience:** Engineering agents, story-generation agents, contributors, and maintainers
**Product name:** Ascend

---

## 1. Executive Summary

Ascend is a local-first web application that provides one central place to open, close, switch between, and resume development projects that already exist on the host filesystem.

Ascend must not rebuild an IDE.

Instead of implementing another file explorer, source editor, terminal, Git interface, diff viewer, Markdown renderer, and file-preview system, Ascend should host an existing browser-based VS Code experience, initially using `code-server`.

The core user experience is:

```text
Open Ascend
    ↓
Select Open Project
    ↓
Provide or select a filesystem path on the Ascend host
    ↓
Ascend starts or reconnects to a dedicated editor session
    ↓
Use VS Code's explorer, editor, terminal, Git and previews
    ↓
Switch to another open project from the Ascend project list
    ↓
Return later and resume the project's editor state
```

Ascend manages a deliberately curated collection of open projects.

It does not scan the entire machine.

It does not import, clone, move, copy, or own project files.

Closing a project in Ascend must never delete or modify the underlying project directory.

---

## 2. Background

The original DevDeck implementation began providing capabilities such as:

- project navigation
- worktree navigation
- file exploration
- file previews
- terminals
- application previews
- issue context
- project lifecycle actions

This demonstrated the value of a central development dashboard, but it also exposed a major cost: many of these capabilities already exist in VS Code and require significant effort to reproduce well.

Reimplementing them creates continuing overhead around:

- file-tree interactions
- keyboard navigation
- syntax highlighting
- language support
- editor tabs
- terminal emulation
- terminal process management
- Git decorations
- diff rendering
- file-type previews
- code search
- extension support
- editor-state restoration
- accessibility
- browser compatibility
- mobile and tablet behaviour

Ascend explores a different product boundary:

```text
Ascend owns:
- the curated list of open projects
- opening and closing projects
- active-project selection
- editor lifecycle
- runtime lifecycle
- cross-project navigation
- future AI and delivery context
- future worktree orchestration
- future observability

VS Code owns:
- file exploration
- source editing
- tabs and split panes
- search
- terminals
- Git interactions
- diffs
- file previews
- debugging
- language tooling
- extensions
```

Ascend should surround and orchestrate the IDE rather than attempting to replace it.

---

## 3. Product Vision

> Ascend is the central place where a developer opens, manages, and switches between local development projects, while VS Code provides the development environment inside each project.

The long-term product may become a control plane for multiple AI-assisted development workspaces.

The first objective is deliberately narrower:

> Validate that Ascend can provide a substantially better multi-project experience by orchestrating browser-hosted VS Code sessions instead of rebuilding IDE capabilities.

Ascend should eventually become the place developers open first when they want to continue working across several repositories, folders, branches, or worktrees.

---

## 4. Product Hypothesis

The primary hypothesis is:

> A persistent Ascend shell containing a curated project list and a browser-hosted VS Code session will provide a better project-switching experience than multiple VS Code windows, multiple browser tabs, or a custom partially implemented IDE.

Supporting hypotheses:

1. A separate editor session per project can preserve the context of each project.
2. Users can switch projects without losing editor tabs, terminals, Git state, layout, or extension state.
3. Embedding `code-server` inside Ascend can provide an acceptable keyboard, focus, clipboard, terminal, and extension experience.
4. When embedding is unsuitable, a full-page editor route with persistent Ascend navigation can still provide a cohesive experience.
5. The runtime and memory overhead of several project sessions can be controlled through lifecycle management.
6. A thin Ascend shell provides enough unique value without recreating IDE functionality.
7. Projects can remain in their existing filesystem locations without being imported, copied, or moved.
8. A server-side project-path selector can provide a usable experience when Ascend is accessed from another device.
9. Users will prefer a curated list of explicitly opened projects over automatic indexing of every repository on the machine.
10. Open and close are understandable project-management operations when they are clearly separated from filesystem creation and deletion.

These hypotheses must be validated through prototypes before committing to a complete product implementation.

---

## 5. Product Principles

### 5.1 Do not rebuild VS Code

Ascend must not implement custom versions of capabilities already adequately provided by the hosted editor.

Ascend must not build:

- a source-code editor
- an editor tab system
- a file explorer
- a terminal emulator
- a Git client
- a diff viewer
- source-code search
- a Markdown previewer
- image or PDF viewers
- debugger interfaces
- language-server integrations
- an extension marketplace
- IDE keyboard-shortcut handling

When a requested capability already exists in VS Code, the preferred solutions are:

- configure VS Code
- launch VS Code with the appropriate arguments
- install or create a VS Code extension
- invoke a VS Code command
- deep-link to a file or location
- expose the capability through the editor provider

Ascend should only implement the capability directly when it is fundamentally cross-project orchestration.

---

### 5.2 The filesystem remains the source of truth

Project files already exist on the Ascend host filesystem.

Ascend:

- references the project path
- validates the path
- opens the folder in an editor runtime
- stores Ascend-specific metadata separately
- detects optional Git metadata
- watches enough state to maintain an accurate project library

Ascend must not:

- copy the project
- move the project
- rename the project directory
- delete project files
- reset the repository
- clean the repository
- take ownership of the repository
- require a repository import operation

---

### 5.3 Projects are explicitly opened

Ascend does not automatically index every folder or Git repository on the machine.

A project appears in Ascend only when the user explicitly opens it by:

- entering a host filesystem path
- selecting a folder through the host filesystem browser
- selecting a recently opened path
- later, selecting a Git worktree from an already-open project

The project list is curated by the user.

---

### 5.4 Closing is not deleting

Closing a project means:

- stop its editor runtime, when running
- remove it from the Ascend project list
- remove or retain Ascend-owned session data according to product policy
- leave all project files untouched

The interface must never use ambiguous language such as `Delete Project` when the operation only removes the project from Ascend.

---

### 5.5 Start with prototypes

The project must not begin with a large platform implementation.

Each prototype must answer a specific product or technical question.

Prototype code may be discarded.

The project should prefer:

- evidence over assumptions
- small spikes over generic frameworks
- measured behaviour over architectural speculation
- reversible decisions over premature commitments

---

### 5.6 Local-first and single-user first

The initial product assumes:

- one Ascend installation
- one trusted user
- projects available on the Ascend host filesystem
- editor runtimes running on the same host
- no cloud dependency
- no multi-tenant isolation
- no team collaboration
- access primarily from the local machine or trusted local network

Security boundaries must still be respected.

Local-first does not mean unsecured-by-default for public-network access.

---

### 5.7 Keep provider-specific logic isolated

The first editor provider is `code-server`.

The core project model should not depend directly on:

- code-server command-line arguments
- code-server ports
- code-server configuration formats
- Docker-specific implementation details
- iframe-specific assumptions

A future editor provider should be possible without rewriting:

- project persistence
- project opening
- project closing
- the project sidebar
- project activation
- runtime status
- cross-project navigation

---

### 5.8 One active project, several resumable projects

Ascend should display one active editor project at a time.

Other projects may remain:

- running
- stopped
- sleeping
- failed

The user should be able to return to a project and resume its previous context.

Ascend is not intended to tile several complete VS Code instances on one screen.

---

## 6. Terminology

### Project

A folder explicitly opened in Ascend.

A project may be:

- a Git repository
- a Git worktree
- a non-Git folder
- a nested folder intentionally selected by the user

A project is identified internally by its canonical filesystem path.

---

### Open Project

The user action that adds an existing filesystem folder to the Ascend project list.

Opening a project does not mean:

- cloning a repository
- creating a folder
- copying files
- importing project contents
- changing the repository

---

### Open Project List

The curated collection of projects currently registered in Ascend.

This list persists across Ascend restarts.

A project can remain in this list while its editor runtime is stopped.

---

### Active Project

The project currently displayed in the main Ascend editor area.

Only one project is active in the main editor area at a time.

---

### Close Project

The user action that removes a project from the Ascend project list without deleting or changing the underlying folder.

---

### Editor Session

The browser-hosted editor environment associated with a project.

Initially, this is a `code-server` instance configured to open the project's filesystem path.

---

### Runtime

The local process or container that hosts an editor session.

---

### Editor Provider

The integration responsible for configuring and exposing an editor.

The initial provider is `code-server`.

---

### Runtime Provider

The integration responsible for starting, stopping, inspecting, and recovering editor runtimes.

Initial candidates are:

- host child processes
- Docker containers

---

### Warm Project

A project whose editor runtime is already running and available.

---

### Cold Project

A project registered in Ascend whose editor runtime is not currently running.

---

### Sleep or Suspend

Stop the editor runtime while retaining enough Ascend-owned editor-session data to resume the project later.

Automatic sleeping is not required for the earliest prototypes.

---

### Worktree

A Git worktree represented by a filesystem path.

For early prototypes, a worktree can be opened exactly like any other project.

First-class worktree discovery and management are deferred.

---

### Ascend Host

The machine on which Ascend and the project files are running.

When Ascend is accessed from another device, project paths always refer to the Ascend host, not the browser device.

---

## 7. Primary User

The initial user is a developer who:

- works across several local repositories or worktrees
- accesses development tools through a browser
- wants one persistent place to switch between projects
- wants each project to retain its editor context
- does not want to manage editor ports or processes manually
- may access Ascend from another computer or tablet on a trusted network
- increasingly works with parallel AI-assisted development tasks
- prefers choosing which projects are open rather than indexing the entire machine

---

## 8. User Needs

The primary user needs to:

1. Open an existing folder from the Ascend host filesystem.
2. See a curated list of currently open projects.
3. Start working in a project without managing `code-server` manually.
4. Switch to another project without losing the first project's context.
5. Return to a project with its tabs, terminals, layout, and editor state intact.
6. Stop an editor runtime without closing the project.
7. Restart an unhealthy editor runtime.
8. Close a project without deleting its files.
9. Understand whether a project is running, stopped, starting, or failed.
10. Access the same experience from another trusted device.
11. Avoid using separate VS Code windows or browser tabs for every project.
12. Avoid relying on custom versions of features VS Code already provides.

---

## 9. Core User Journeys

### 9.1 Open a project

```text
User selects Open Project
    ↓
Ascend displays a host-side path selector or path input
    ↓
User selects an existing folder on the Ascend host
    ↓
Ascend validates the folder
    ↓
Ascend canonicalises the path
    ↓
Ascend checks whether it is already open
    ↓
Ascend detects optional Git metadata
    ↓
Ascend adds the project to the open-project list
    ↓
Ascend starts the editor session or offers an Open action
    ↓
The project appears in the main editor area
```

---

### 9.2 Switch between projects

```text
Project A is active
    ↓
User selects Project B in the Ascend sidebar
    ↓
Ascend checks Project B's runtime
    ↓
If stopped, Ascend starts it
    ↓
If running, Ascend reconnects to it
    ↓
Ascend displays Project B's editor session
    ↓
Project A retains its editor state
    ↓
User returns to Project A later
    ↓
Project A resumes where it was left
```

---

### 9.3 Stop a project editor

```text
Project remains open in Ascend
    ↓
User selects Stop Editor
    ↓
Ascend stops the project runtime
    ↓
The project remains in the sidebar
    ↓
The project status becomes Stopped
    ↓
Selecting the project later starts the editor again
```

Stopping an editor is not the same as closing a project.

---

### 9.4 Close a project

```text
User opens the project actions menu
    ↓
User selects Close Project
    ↓
Ascend explains that files will not be deleted
    ↓
Ascend stops the project's runtime
    ↓
Ascend removes the project from the open-project list
    ↓
The underlying filesystem folder remains unchanged
```

---

### 9.5 Restart an editor session

```text
Editor becomes unhealthy
    ↓
Ascend displays a runtime or connection error
    ↓
User selects Restart Editor
    ↓
Ascend stops the runtime
    ↓
Ascend starts it again using the same project path
    ↓
The editor reconnects
```

---

### 9.6 Access Ascend from another device

```text
Ascend runs on a development host
    ↓
User opens Ascend from a laptop or tablet
    ↓
User selects Open Project
    ↓
Ascend shows folders from the host filesystem
    ↓
User selects a host-side project folder
    ↓
Ascend starts the editor on the host
    ↓
The browser interacts with the hosted editor
```

---

### 9.7 Reopen Ascend after a restart

```text
Ascend restarts
    ↓
Ascend loads the persisted open-project list
    ↓
Ascend reconciles recorded runtime state with actual runtimes
    ↓
The last active project is restored when configured
    ↓
Stopped projects remain visible
    ↓
Running projects reconnect where possible
```

---

## 10. Important Filesystem Constraint

The Ascend web interface may be opened from a device that does not contain the project files.

A normal browser folder picker selects files from the client device.

It therefore cannot be the primary project-selection mechanism.

Ascend requires a server-side filesystem selection experience.

The initial implementation may provide:

1. an absolute path text field
2. a server-side directory browser
3. configurable allowed parent directories
4. recently opened paths
5. home-directory expansion
6. copy-and-paste support for host paths

The interface must clearly state that paths refer to the Ascend host filesystem.

Example:

```text
Open project on Ascend host

Host:
development-box

Path:
[/home/juan/code/ascend_______________________]

[Browse Host Filesystem] [Open Project]
```

The path browser must browse directories visible to the Ascend server process, not the browser device.

---

## 11. Product Scope

### 11.1 Prototype and MVP scope

The initial product includes:

- opening a project by host filesystem path
- validating the folder on the server
- maintaining a curated list of open projects
- persisting the open-project list
- closing projects without affecting the filesystem
- displaying one active project at a time
- running a browser-hosted VS Code environment
- switching between multiple project editor sessions
- preserving editor state per project
- starting editor runtimes
- stopping editor runtimes
- restarting editor runtimes
- hiding runtime ports behind Ascend routes
- basic runtime health
- runtime loading and error states
- basic project metadata
- optional basic Git metadata
- local persistence
- desktop-browser validation
- tablet-browser validation where relevant

---

### 11.2 Later scope

The following are intentionally deferred:

- first-class Git worktree discovery
- creating worktrees
- deleting worktrees
- issue-tracker integrations
- AI-agent status
- agent launching
- application preview orchestration
- OpenTelemetry export
- resource dashboards
- automatic idle sleeping
- multiple editor providers
- remote runtime hosts
- multiple users
- enterprise authentication
- team collaboration
- cloud deployment
- plugin marketplace
- project cloning
- repository templates

---

## 12. Non-Goals

The initial product must not:

- scan the entire machine for projects
- automatically add every Git repository
- require workspace roots to be indexed
- clone repositories
- move repositories
- create a source-code editor
- create a custom terminal
- create a custom file explorer
- replace VS Code source control
- replace GitHub or another issue tracker
- provide multi-user isolation
- manage remote cloud workspaces
- modify project files merely because a project was opened or closed
- require projects to be Git repositories
- require Docker when a simpler process-based prototype is sufficient
- prematurely implement a generic plugin framework
- display several complete editor sessions simultaneously
- reproduce the original DevDeck explorer, terminal, or file-preview system

---

## 13. Experience Design

### 13.1 Primary layout

```text
+------------------------------------------------------------------------+
| Ascend                                          Host: development-box  |
+----------------------+-------------------------------------------------+
| Open Project         | Active project toolbar                          |
|                      | Project name | Path | Status | Actions           |
| OPEN PROJECTS        +-------------------------------------------------+
|                      |                                                 |
| ● ascend             |                                                 |
| ○ soft-factory       |          Hosted VS Code / code-server           |
| ○ customer-api       |                                                 |
| ○ feature-auth       |                                                 |
|                      |                                                 |
|                      |                                                 |
|                      |                                                 |
+----------------------+-------------------------------------------------+
```

---

### 13.2 Ascend sidebar responsibilities

The sidebar may contain:

- Open Project
- project search
- open-project list
- active-project indicator
- runtime status
- recently active ordering
- project actions
- Ascend settings
- later, project grouping

The sidebar must not reproduce the editor's internal file explorer.

---

### 13.3 Project list item

A project item should initially show:

- display name
- runtime state
- active state
- optional Git branch
- optional path tooltip
- failure indicator

Example:

```text
● ascend
  main · Running

○ soft-factory
  feature/plugins · Stopped

○ customer-api
  Failed to start
```

---

### 13.4 Project actions

Each project may expose:

```text
Open
Restart Editor
Stop Editor
Reveal Path
Copy Path
Close Project
```

Later actions may include:

```text
Open Worktree
Open Application Preview
View Agent Status
View Project Activity
```

---

### 13.5 Active-project toolbar

The toolbar should remain thin.

It may show:

- project display name
- canonical path
- Git branch, when available
- runtime state
- reconnect action
- restart action
- full-screen editor action
- close-project action

The toolbar must not compete with VS Code's own interface.

---

### 13.6 Editor presentation modes

The prototypes must evaluate at least two modes.

#### Embedded mode

The editor appears in the main Ascend content area, likely through an iframe.

Advantages:

- persistent Ascend project switcher
- cohesive product experience
- fast navigation among projects
- Ascend remains visible as the control plane

Risks:

- keyboard and focus conflicts
- clipboard behaviour
- iframe security headers
- extension webviews
- service workers
- browser navigation
- tablet behaviour
- screen-space reduction
- full-screen editor limitations

---

#### Full-page editor mode

Ascend navigates to a dedicated editor route while retaining a minimal project switcher, top bar, drawer, or return control.

Advantages:

- fewer iframe constraints
- editor receives more screen space
- potentially better keyboard compatibility
- potentially better extension compatibility
- potentially better tablet behaviour

Risks:

- weaker feeling of a unified application
- more complex navigation back to the project library
- potentially slower perceived project switching

The product must validate both modes before making iframe embedding a permanent architectural assumption.

---

### 13.7 Loading experience

When a stopped project is activated:

```text
Starting editor for soft-factory…

Preparing runtime
Connecting to editor
Restoring session
```

The UI should distinguish:

- runtime starting
- editor starting
- proxy connecting
- editor loading
- runtime failed
- connection lost

A generic spinner is insufficient for long startup operations.

---

### 13.8 Error experience

Example:

```text
Could not start the editor

The project folder exists, but code-server exited before becoming healthy.

Project:
/home/juan/code/soft-factory

Actions:
[Retry] [View Runtime Details] [Stop Project]
```

Errors should be actionable and associated with one project.

---

## 14. Architecture Hypothesis

The preferred initial architecture is:

```text
Browser
    |
    v
Ascend Web Application
    |
    +-- Project Library
    +-- Host Filesystem Browser
    +-- Runtime Manager
    +-- Editor Provider
    +-- Reverse Proxy
    +-- Persistence
    |
    v
One editor runtime per running project
    |
    v
Existing project folder on host filesystem
```

Example:

```text
/home/juan/code/ascend
    ↓
code-server runtime A
    ↓
/projects/{projectId}/editor/

/home/juan/code/soft-factory
    ↓
code-server runtime B
    ↓
/projects/{projectId}/editor/
```

---

### 14.1 One session per project

The initial hypothesis is that every running project should have its own editor runtime.

This provides independent:

- open files
- editor tabs
- terminals
- extension-host state
- workspace settings
- Git context
- UI layout
- error boundary
- restart lifecycle

The prototype must measure the resource cost before this becomes a firm architectural requirement.

---

### 14.2 Runtime implementation options

Two runtime implementations should be considered during prototypes.

#### Host process runtime

Launch `code-server` directly as a child process.

Advantages:

- simple access to the host filesystem
- lower startup overhead
- simpler local development
- fewer volume-permission issues
- no mandatory Docker dependency

Risks:

- weaker process isolation
- process cleanup
- port allocation
- permission inheritance
- dependency installation
- environment collisions

---

#### Container runtime

Launch one container per project and bind-mount the project path.

Advantages:

- reproducible runtime
- stronger process isolation
- easier dependency packaging
- explicit lifecycle
- potential resource controls

Risks:

- filesystem ownership
- bind-mount permissions
- Windows and macOS filesystem behaviour
- startup cost
- Docker dependency
- extension persistence
- access to host tooling
- access to SSH and Git credentials

Prototype work should use the simplest approach that can answer the immediate hypothesis.

The implementation should expose a small runtime interface rather than spreading process-specific or Docker-specific logic throughout Ascend.

---

### 14.3 Reverse proxy

The browser should access stable Ascend routes.

Example:

```text
/projects/ascend/editor/
/projects/soft-factory/editor/
/projects/customer-api/editor/
```

The browser should not need to know:

```text
localhost:8124
localhost:8125
localhost:8126
```

The proxy must support:

- HTTP
- WebSockets
- streaming responses
- editor asset paths
- connection upgrades
- long-lived sessions
- project-specific route isolation

Path-based routing should be tested against host-based or subdomain-based routing if editor behaviour is unreliable.

---

## 15. Suggested Internal Interfaces

These interfaces are conceptual.

Exact language, naming, and syntax are implementation decisions.

### 15.1 Project repository

```typescript
interface ProjectRepository {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  findByCanonicalPath(path: string): Promise<Project | null>;
  open(input: OpenProjectInput): Promise<Project>;
  update(id: string, patch: Partial<Project>): Promise<Project>;
  close(id: string): Promise<void>;
}
```

---

### 15.2 Runtime provider

```typescript
interface RuntimeProvider {
  start(project: Project): Promise<RuntimeHandle>;
  stop(projectId: string): Promise<void>;
  restart(project: Project): Promise<RuntimeHandle>;
  status(projectId: string): Promise<RuntimeStatus>;
  health(projectId: string): Promise<RuntimeHealth>;
  reconcile(): Promise<RuntimeReconciliationResult>;
}
```

---

### 15.3 Editor provider

```typescript
interface EditorProvider {
  providerId: string;

  createLaunchConfiguration(
    project: Project
  ): Promise<EditorLaunchConfiguration>;

  getEditorRoute(projectId: string): string;

  getHealth(projectId: string): Promise<EditorHealth>;
}
```

---

### 15.4 Host filesystem service

```typescript
interface HostFilesystemService {
  listDirectory(path: string): Promise<DirectoryEntry[]>;

  validateDirectory(
    path: string
  ): Promise<DirectoryValidation>;

  canonicalisePath(path: string): Promise<string>;

  isAllowedPath(path: string): Promise<boolean>;
}
```

These interfaces should remain small until prototype evidence justifies expansion.

---

## 16. Data Model

### 16.1 Project

```typescript
type Project = {
  id: string;

  displayName: string;

  filesystemPath: string;
  canonicalPath: string;

  projectType: "git" | "folder";

  gitRootPath?: string;
  gitBranch?: string;
  gitRemote?: string;

  editorProvider: string;

  runtimeState:
    | "stopped"
    | "starting"
    | "running"
    | "stopping"
    | "failed";

  lastOpenedAt?: string;
  lastActivatedAt?: string;

  createdAt: string;
  updatedAt: string;
};
```

---

### 16.2 Runtime record

```typescript
type RuntimeRecord = {
  projectId: string;

  provider: string;

  processId?: number;
  containerId?: string;

  internalPort?: number;
  proxyRoute?: string;

  status:
    | "stopped"
    | "starting"
    | "running"
    | "stopping"
    | "failed";

  startedAt?: string;
  lastHealthCheckAt?: string;
  lastError?: string;
};
```

---

### 16.3 Ascend settings

```typescript
type AscendSettings = {
  allowedFilesystemRoots?: string[];

  defaultEditorProvider: string;

  startEditorWhenProjectOpened: boolean;

  restoreLastActiveProject: boolean;

  runtimeMode: "process" | "container";

  confirmBeforeClosingProject: boolean;
};
```

---

### 16.4 Path identity

Project uniqueness must be based on the canonical path, not the display name.

The implementation must account for:

- absolute paths
- relative paths
- `~` expansion
- `.` and `..`
- symbolic links
- junctions where relevant
- path case sensitivity
- trailing separators
- duplicate paths entered in different forms

Opening the same canonical path twice must not create duplicate projects.

Ascend should instead activate the existing project.

---

## 17. API Shape

The exact URL structure can evolve.

The API should initially support the following behaviours.

### 17.1 Projects

```http
GET /api/projects
```

Returns all explicitly opened projects.

---

```http
POST /api/projects/open
Content-Type: application/json

{
  "path": "/home/juan/code/ascend"
}
```

Validates and opens an existing project folder.

---

```http
GET /api/projects/{projectId}
```

Returns project metadata and runtime state.

---

```http
POST /api/projects/{projectId}/activate
```

Makes the project active and starts its editor when required.

---

```http
POST /api/projects/{projectId}/close
```

Stops the runtime and removes the project from Ascend.

This operation must not delete, move, rename, reset, clean, or otherwise modify project files.

---

### 17.2 Runtime

```http
POST /api/projects/{projectId}/runtime/start
POST /api/projects/{projectId}/runtime/stop
POST /api/projects/{projectId}/runtime/restart
GET  /api/projects/{projectId}/runtime/status
GET  /api/projects/{projectId}/runtime/health
```

---

### 17.3 Host filesystem

```http
GET /api/host-filesystem/directories?path=/home/juan/code
```

Returns child directories visible to the Ascend host process.

---

```http
POST /api/host-filesystem/validate
Content-Type: application/json

{
  "path": "/home/juan/code/ascend"
}
```

Example response:

```json
{
  "exists": true,
  "isDirectory": true,
  "isReadable": true,
  "isAllowed": true,
  "canonicalPath": "/home/juan/code/ascend",
  "projectType": "git"
}
```

---

### 17.4 Editor

```http
GET /projects/{projectId}/editor/
```

Proxies the browser-hosted editor for the project.

The browser must not require knowledge of:

- an internal port
- a process identifier
- a container identifier
- editor-provider credentials

---

### 17.5 Settings

```http
GET /api/settings
PATCH /api/settings
```

Initial settings may include:

- allowed filesystem roots
- runtime provider
- start editor automatically
- restore last project
- close-project confirmation

---

## 18. Prototype Strategy

Ascend should evolve through small prototypes.

Each prototype must have:

- a specific question
- deliberately limited scope
- measurable evidence
- explicit exit criteria
- a review decision
- a recommendation to continue, change direction, or stop

Prototype completion does not imply production quality.

A prototype may be replaced rather than hardened.

---

# Prototype 0: Baseline and Spike Repository

## Objective

Create the smallest possible greenfield repository for testing Ascend concepts without migrating the original DevDeck implementation.

## Questions

- Can Ascend be developed independently?
- Can `code-server` be launched reliably against an arbitrary local path?
- What is the minimum environment required?
- Does editing through `code-server` modify the existing project files directly and safely?

## Scope

- repository setup
- basic web shell
- health endpoint
- development commands
- validation commands
- script to launch one `code-server` instance against a configured path
- no persistence
- no project library
- no polished UI
- no multi-project switching

## Demonstration

```text
Configure PROJECT_PATH
    ↓
Start Ascend development environment
    ↓
Open one browser URL
    ↓
See code-server running against that path
    ↓
Edit a file
    ↓
Verify the original filesystem file changed
```

## Evidence to capture

- startup command
- startup duration
- memory use
- CPU at idle
- filesystem permissions
- editor version
- extension storage location
- workspace-state location
- behaviour after restart
- behaviour when the path is invalid
- behaviour when the editor process crashes

## Exit criteria

- one local folder can be opened in `code-server`
- the terminal works
- files can be edited
- changes appear directly in the original filesystem path
- stopping the editor does not affect project files
- initial resource measurements are documented

## Non-goals

- iframe embedding
- multiple projects
- reverse proxy
- project persistence
- authentication
- Docker abstraction
- polished navigation

---

# Prototype 1: Host One Project Inside Ascend

## Objective

Validate whether a browser-hosted VS Code instance can provide the primary development experience inside an Ascend shell.

## Primary question

> Does the hosted editor feel usable enough to replace the custom explorer, file preview, source viewer, and terminal?

## Scope

- thin Ascend shell
- static project entry
- one `code-server` runtime
- editor routed through Ascend
- embedded editor experiment
- full-page editor fallback
- basic runtime status
- no dynamic project opening
- no project persistence

## Required desktop-browser tests

- typing
- editor shortcuts
- terminal shortcuts
- copy and paste
- drag selection
- context menus
- file explorer
- source control
- Markdown preview
- image preview
- extension webviews
- terminal resize
- browser refresh
- reconnect after editor restart
- opening links
- downloading files where supported
- browser back and forward navigation

## Required tablet-browser tests

Where tablet access is a product requirement:

- touch scrolling
- virtual keyboard
- terminal interaction
- focus changes
- copy and paste
- text selection
- context menus
- full-screen behaviour
- switching between Ascend navigation and editor
- orientation changes

## Risks to investigate

- iframe `Content-Security-Policy`
- `frame-ancestors`
- `X-Frame-Options`
- WebSocket proxying
- cookie scope
- service workers
- nested routing
- keyboard shortcut interception
- browser history
- extension webviews
- clipboard permissions
- authentication redirects

## Exit criteria

Proceed with embedded mode when:

- core editing and terminal workflows work reliably
- there are no blocking keyboard or focus failures
- reconnect is understandable
- required editor webviews function adequately
- the user can navigate back to Ascend predictably

Use full-page mode when:

- embedding creates unacceptable browser or extension limitations
- a thin persistent Ascend navigation layer can still be retained
- project switching remains materially better than separate browser tabs

Stop or reconsider the approach when:

- neither embedded nor full-page mode produces a usable experience

---

# Prototype 2: Open and Close Projects by Filesystem Path

## Objective

Validate the explicit project-library model.

## Primary question

> Can Ascend provide a clear and safe workflow for opening and closing projects that already exist on the host filesystem?

## Scope

- Open Project action
- absolute path input
- server-side path validation
- optional basic server-side directory browser
- project-list persistence
- Close Project action
- duplicate-path prevention
- project display name
- project-type detection
- optional Git metadata
- no multiple editor runtimes yet

## Functional requirements

### Open Project

The user provides a path.

Ascend must:

1. expand supported aliases such as `~`
2. resolve the canonical path
3. confirm the path exists
4. confirm the path is a directory
5. confirm the path is readable
6. confirm the path is within the allowed filesystem policy
7. check whether the project is already open
8. detect basic Git metadata when available
9. add the project to the open-project list
10. leave the directory unchanged

If the project is already open, Ascend should activate or focus it instead of creating a duplicate.

### Close Project

Ascend must:

1. confirm the user intends to close the project
2. clearly state that files will not be deleted
3. stop the editor runtime when running
4. remove the project from the Ascend project list
5. leave the project directory unchanged
6. never invoke recursive filesystem deletion

## Demonstration

```text
Open /home/juan/code/ascend

Open /home/juan/code/soft-factory

Close ascend

Verify /home/juan/code/ascend remains unchanged

Restart Ascend

Verify soft-factory remains in the project list
```

## Exit criteria

- projects can be explicitly opened by path
- the project list persists across Ascend restarts
- duplicate paths are rejected or focused
- non-Git folders can be opened
- Git folders expose basic metadata
- closing a project never modifies project files
- error messages identify invalid or inaccessible paths
- the UI clearly distinguishes the host filesystem from the client device

---

# Prototype 3: Multiple Independent Project Sessions

## Objective

Validate whether one independent editor session per project provides the desired project-switching experience.

## Primary question

> Can a user switch among several projects while preserving the context of each editor session?

## Scope

- two or more open projects
- one editor runtime per running project
- stable project routes
- project activation
- project switching
- runtime start on activation
- editor-state persistence
- per-project runtime status
- no automatic sleeping

## Required scenario

Project A:

- open two files
- create a terminal
- navigate to a nested folder
- select a source-control file

Project B:

- open different files
- create a different terminal
- change the editor layout
- open a Markdown preview

Project C:

- open a non-Git folder
- open an image or text file
- create another terminal

Switch repeatedly among A, B, and C.

Returning to each project should restore its independent context.

## Measurements

Capture:

- cold editor startup time
- warm project-switch time
- memory per editor runtime
- idle CPU
- browser memory
- behaviour with 2 running projects
- behaviour with 3 running projects
- behaviour with 5 running projects
- behaviour with 10 running projects
- runtime failure isolation
- reconnect time after Ascend restart
- editor-state retention after runtime restart

## Initial experience targets

These are evaluation targets, not contractual guarantees:

- a warm project switch feels immediate or takes less than approximately two seconds
- a cold editor startup takes less than approximately fifteen seconds on the target machine
- one failed editor runtime does not break other projects
- switching does not lose open-file or terminal state
- the user never needs to know the runtime port

## Exit criteria

- at least three projects can be opened
- each project has independent editor state
- project switching is usable
- runtime URLs and ports remain hidden
- resource usage is measured and documented
- the team has enough evidence to choose one of:
  - keep all recently active runtimes running
  - stop inactive runtimes manually
  - introduce automatic sleeping
  - reconsider the one-runtime-per-project model

---

# Prototype 4: Runtime Lifecycle and Recovery

## Objective

Make editor sessions manageable and recoverable without turning Ascend into a full infrastructure platform.

## Scope

- start
- stop
- restart
- runtime health
- editor health
- failure state
- reconnect
- stale-runtime cleanup
- optional manual sleep
- startup reconciliation after Ascend restarts

## Required behaviours

- activating a stopped project starts its editor
- stopping an editor keeps the project in Ascend
- restarting an editor retains persistent editor data where possible
- an unhealthy runtime is visibly identified
- users can retry failed startup
- Ascend detects runtimes left behind after a crash
- Ascend does not attach a project to another project's runtime
- repeated Start requests do not create duplicate runtimes
- repeated Stop requests are safe

## Exit criteria

- runtime state is accurate enough for the UI
- common failures produce actionable messages
- runtimes can be restarted without modifying project files
- Ascend startup reconciles persisted state with actual processes or containers
- stale runtimes can be detected and handled
- lifecycle integration tests are passing

---

# Prototype 5: Refined Ascend Shell

## Objective

Validate that Ascend provides meaningful value while remaining substantially thinner than an IDE.

## Scope

- polished project sidebar
- active-project toolbar
- search open projects
- keyboard project navigation
- recent-project ordering
- runtime indicators
- full-screen editor mode
- responsive layout
- loading states
- failure states
- host identity
- accessible close-project flow

## Required product constraint

The Ascend shell must not introduce custom implementations of:

- file trees
- source-file tabs
- terminals
- Git panels
- source-code previews
- diff viewers
- language tooling

## Exit criteria

A user can:

1. open Ascend
2. open a project by path
3. open additional projects
4. switch among them
5. resume editor state
6. stop an editor
7. restart an editor
8. close a project
9. understand runtime states without consulting server logs
10. use the application comfortably on the primary target browser

At the end of this prototype, decide whether the product hypothesis has been validated strongly enough to build an MVP.

---

## 19. MVP Definition

The MVP begins only after the prototype sequence validates the core approach.

The MVP consists of production hardening for capabilities that were proven through prototypes.

### MVP functional requirements

- explicit Open Project workflow
- server-side filesystem path selection
- persistent open-project list
- Close Project without filesystem changes
- one active project in the Ascend main area
- independent editor session per running project, when validated
- project switching
- runtime start
- runtime stop
- runtime restart
- stable reverse-proxy routes
- editor health
- reconnect handling
- basic Git metadata
- persistent editor configuration
- reliable project-path identity
- basic settings
- basic automated tests
- installation documentation
- operations documentation

### MVP experience requirements

- Ascend opens to the last active project when configured
- stopped projects remain in the sidebar
- selecting a stopped project starts it
- selecting a running project reconnects to it
- users are not exposed to runtime ports
- users can always return to the Ascend project list
- Close Project language clearly states that files are not deleted
- startup failures are actionable
- an Ascend restart does not lose the project library
- project switching preserves independent editor context
- the user does not need to use separate editor windows for normal operation

---

## 20. Future Capabilities

These capabilities must not block the MVP.

### 20.1 Git worktrees

Potential later experience:

```text
soft-factory
├── main
├── feature/plugin-marketplace
└── feature/observability
```

Possible capabilities:

- discover existing worktrees
- display worktrees under a project
- open a worktree as a project
- create a worktree
- close a worktree in Ascend
- remove a worktree safely
- associate worktrees with issues
- display branch status

Until then, a worktree can be opened directly by its filesystem path.

---

### 20.2 Application previews

Ascend may later provide a way for a project to register running web applications.

Example:

```yaml
previews:
  - name: Web App
    port: 3000

  - name: Storybook
    port: 6006

  - name: API Documentation
    port: 8080
    path: /swagger
```

This must remain separate from source-file previews already provided by VS Code.

---

### 20.3 AI-agent context

Ascend may later display:

- active agent
- current task
- linked issue
- last activity
- lifecycle phase
- tests running
- completion status
- friction events
- recent agent actions

This information should surround the editor rather than replace it.

---

### 20.4 Agent orchestration

Potential later capabilities:

- launch an agent in a project
- associate an agent with a worktree
- stop an agent
- inspect agent status
- jump from an agent task to the relevant editor session
- compare several active development streams

This functionality should not be introduced until the project and runtime model is stable.

---

### 20.5 Observability

Potential future telemetry:

- editor startup time
- editor failures
- project-switch latency
- runtime CPU and memory
- project idle time
- agent activity
- tests and build duration
- runtime restart count
- session duration

Telemetry must be transparent and privacy-conscious.

---

### 20.6 Editor providers

Possible future providers:

- code-server
- OpenVSCode Server
- local VS Code handoff
- SSH terminal
- remote desktop
- JetBrains remote tooling

Do not implement broad provider extensibility beyond what is necessary to keep `code-server` logic isolated.

---

## 21. Security and Safety Requirements

Even though the MVP is local-first and single-user, filesystem and runtime operations are sensitive.

### 21.1 Filesystem access

Ascend must:

- canonicalise paths
- prevent path traversal in filesystem APIs
- handle symbolic links deliberately
- reject inaccessible paths
- optionally restrict paths to configured allowed roots
- avoid arbitrary file-content APIs unless explicitly required
- use the editor for normal project-file access
- avoid logging secrets
- avoid logging file contents
- avoid returning directories outside the configured policy

---

### 21.2 Project closing

The Close Project operation must not call:

- recursive delete
- filesystem remove
- Git clean
- Git reset
- Git checkout
- worktree remove
- repository deletion
- volume deletion when the volume contains project files

Any future destructive filesystem operation must be designed as a separate feature.

It must never be implied by Close Project.

---

### 21.3 Runtime routing

Ascend must:

- avoid exposing internal runtime ports directly when possible
- route only to the runtime associated with the requested project
- support WebSockets
- validate project identifiers
- avoid open-proxy behaviour
- terminate stale routes when runtimes stop
- prevent one project route from reaching another project runtime

---

### 21.4 Authentication

For the first local prototype, authentication may be deferred.

Before exposing Ascend beyond a trusted local network, the product must provide:

- authenticated Ascend access
- protected editor routes
- no publicly exposed unauthenticated editor instance
- secure cookie configuration
- secure reverse-proxy configuration
- protection against cross-project route access

---

### 21.5 Process and container permissions

The editor runtime should use the minimum permissions required to:

- read and write the selected project
- persist editor configuration
- run project commands
- access configured developer credentials

Ascend must not automatically grant access to unrelated host directories.

---

## 22. Reliability Requirements

- Opening one invalid project must not affect existing projects.
- A failure in one editor runtime must not terminate other runtimes.
- Ascend must recover from its own restart.
- Runtime state must be reconciled rather than blindly trusted from persisted data.
- Project records must not be corrupted by interrupted startup.
- Closing a project must be idempotent.
- Starting a running project must be idempotent.
- Stopping a stopped project must be safe.
- Duplicate runtime creation for one project must be prevented.
- Proxy routing must not send a user to the wrong project.
- Invalid filesystem paths must produce clear errors.
- A removed or renamed project directory must not crash the project library.
- Ascend must represent missing project directories explicitly.

---

## 23. Observability for Development

The prototypes should record enough information to diagnose failures and evaluate hypotheses.

Minimum structured events:

```text
project.open.requested
project.open.succeeded
project.open.failed

project.closed
project.activated

runtime.start.requested
runtime.start.succeeded
runtime.start.failed

runtime.stop.requested
runtime.stop.succeeded
runtime.stop.failed

runtime.restart.requested
runtime.restart.succeeded
runtime.restart.failed

runtime.health.changed

editor.proxy.connected
editor.proxy.failed

project.switch.started
project.switch.completed
project.switch.failed
```

Useful attributes:

```text
projectId
runtimeProvider
editorProvider
durationMs
failureCategory
runtimeState
previousRuntimeState
projectType
```

Do not record:

- source-file contents
- terminal contents
- editor text
- secrets
- environment-variable values
- clipboard contents
- user prompts
- complete command output

---

## 24. Testing Strategy

### 24.1 Unit tests

Prioritise:

- path canonicalisation
- duplicate-path detection
- allowed-root checks
- path alias expansion
- project state transitions
- runtime state transitions
- route generation
- error mapping
- close-project safety
- runtime reconciliation logic

---

### 24.2 Integration tests

Cover:

- open an existing folder
- reject a missing folder
- reject a file path
- reject an inaccessible folder
- open a non-Git folder
- open a Git repository
- detect duplicate paths
- close a project
- verify files remain on disk
- start an editor runtime
- stop an editor runtime
- restart an editor runtime
- recover after an Ascend restart
- proxy HTTP traffic
- proxy WebSockets
- detect runtime failure
- prevent duplicate runtime creation

---

### 24.3 End-to-end tests

Cover:

- open the first project
- open a second project
- switch projects
- reload the browser
- reconnect to the active project
- stop and reactivate a project
- restart a project runtime
- close a project
- verify the project remains on disk
- handle editor startup failure
- handle a missing project directory
- restore the persisted project list

---

### 24.4 Manual exploratory tests

Manual testing is required for:

- keyboard shortcuts
- terminal behaviour
- browser clipboard
- iframe focus
- tablet behaviour
- extension webviews
- full-screen mode
- long-running editor sessions
- multiple simultaneous runtimes
- browser refresh during startup
- network interruption
- editor runtime restart
- switching projects quickly
- project closing while an editor is loading

---

## 25. Key Risks and Decision Points

### Risk 1: Embedded VS Code may not feel native

Mitigation:

- prototype iframe mode
- prototype full-page mode
- retain a routing architecture that supports either result

Decision options:

- embedded editor
- full-page editor with thin Ascend navigation
- abandon the hosted-editor approach

---

### Risk 2: Resource usage may be too high

Mitigation:

- measure process memory
- measure browser memory
- start runtimes lazily
- support manual stop
- later add idle sleeping
- limit warm runtimes if required

Decision options:

- one runtime per open project
- one runtime per recently active project
- one runtime only, switching folders
- hybrid runtime strategy

The single-runtime model should only be selected if separate sessions prove impractical because it weakens per-project state isolation.

---

### Risk 3: Filesystem selection may be confusing remotely

Mitigation:

- explicitly show the Ascend host name
- provide a host-side directory browser
- provide recent paths
- allow configured roots
- show canonical paths clearly
- avoid using a client-side folder picker

---

### Risk 4: Reverse proxying may break editor features

Mitigation:

- test WebSockets early
- compare path-based and host-based routing
- test extension webviews
- test service workers
- keep a direct diagnostic route during development

---

### Risk 5: Provider differences and extension compatibility

Mitigation:

- validate required extensions
- document unsupported extensions
- do not assume desktop VS Code and browser-hosted VS Code behave identically
- isolate provider-specific behaviour

---

### Risk 6: Ascend may become another IDE

Mitigation:

Apply this feature test:

> Is this capability fundamentally cross-project orchestration, or is it an IDE capability?

If it is primarily an IDE capability, prefer:

- editor configuration
- a VS Code extension
- a launch argument
- a command
- a deep link
- an editor-provider capability

Do not rebuild it in Ascend.

---

### Risk 7: The name Ascend may imply broader orchestration too early

Mitigation:

Keep the initial product proposition concrete:

> Open, switch between, and resume local projects from one browser-based control surface.

Do not let the product name drive premature AI, cloud, or platform features.

---

## 26. Success Measures

### 26.1 Prototype success

The concept is validated when:

- the user prefers opening Ascend over opening several editor windows
- Ascend can open arbitrary approved host-filesystem project paths
- at least three projects can retain independent editor contexts
- switching projects is materially easier than switching browser tabs or windows
- VS Code replaces the need for the custom explorer, terminal, and file preview
- closing a project is safe and understandable
- resource usage is acceptable or manageable through lifecycle controls
- the hosted editor works adequately on the target devices

---

### 26.2 Product success

The product succeeds when the normal workflow becomes:

```text
I need to work on a project
    ↓
I open Ascend
    ↓
I select an existing open project
or open a new filesystem path
    ↓
I work inside the hosted editor
    ↓
I switch projects without losing context
```

The intended user perception is:

> Ascend is where I manage and open my development projects.

Not:

> Ascend is trying to replace VS Code.

---

## 27. MVP Definition of Done

The MVP is complete when all of the following are true:

- [ ] A user can open an existing host-filesystem directory by path.
- [ ] A server-side folder-selection experience is available.
- [ ] Paths are validated and canonicalised.
- [ ] Duplicate projects are prevented.
- [ ] Git repositories and non-Git folders are supported.
- [ ] The open-project list persists across Ascend restarts.
- [ ] A project can be activated.
- [ ] A project can start a dedicated hosted editor session.
- [ ] The editor is accessible through a stable Ascend route.
- [ ] Internal runtime ports are not part of the user experience.
- [ ] At least three project sessions can be managed.
- [ ] Editor state remains independent between project sessions.
- [ ] A running editor can be stopped.
- [ ] A stopped editor can be restarted.
- [ ] A failed editor displays an actionable error.
- [ ] A project can be closed.
- [ ] Closing a project leaves its filesystem directory untouched.
- [ ] Ascend recovers coherently after a restart.
- [ ] Core operations have automated integration tests.
- [ ] Installation and local-operation instructions are documented.
- [ ] Prototype findings and architecture decisions are documented.
- [ ] The implementation does not include a custom explorer.
- [ ] The implementation does not include a custom terminal.
- [ ] The implementation does not include a custom source editor.
- [ ] The implementation does not include a custom diff viewer.

---

## 28. Instructions for Story-Generation Agents

An agent converting this PRD into implementation stories must follow these rules.

### 28.1 Generate stories by prototype

Do not generate the entire future roadmap as one implementation backlog.

Create stories in this order:

1. Prototype 0
2. Prototype 1
3. Prototype 2
4. Prototype 3
5. Prototype 4
6. Prototype 5
7. MVP hardening only after a prototype-review decision

---

### 28.2 Every prototype requires a decision story

Each prototype must end with a story titled similarly to:

```text
Review Prototype N Evidence and Record Decision
```

The story must produce:

- findings
- measurements
- screenshots or demo notes
- problems encountered
- assumptions disproved
- architecture decisions
- next-step recommendation
- explicit continue, change, or stop decision

---

### 28.3 Story format

Every generated story must include:

```markdown
## Summary

## User or System Outcome

## Scope

## Out of Scope

## Acceptance Criteria

## Technical Notes

## Tests

## Demo Steps

## Dependencies

## Risks

## Observability

## Documentation Changes
```

---

### 28.4 Story sizing

Stories should normally be deliverable in one focused pull request.

Split stories when they combine multiple concerns such as:

- filesystem validation and UI design
- runtime lifecycle and reverse proxying
- persistence and runtime recovery
- embedded-mode research and production implementation
- host process and container support
- project persistence and Git metadata

---

### 28.5 Research spikes

Unknowns must become explicit research spikes.

Examples:

- Validate code-server iframe compatibility
- Compare host-process and container runtimes
- Validate path-based reverse proxying
- Test editor behaviour on tablet browsers
- Measure memory consumption across five sessions
- Validate editor-state persistence after restart
- Test code-server extension compatibility
- Validate WebSocket behaviour through the Ascend proxy

A spike must produce evidence and a decision, not only code.

---

### 28.6 Safety acceptance criteria

Every story touching project lifecycle must include:

```text
The operation must not delete, move, rename, reset, clean, or otherwise
modify the project directory unless that filesystem mutation is the
explicit purpose of the story.
```

Every Close Project story must include:

```text
Closing a project removes it from Ascend and stops Ascend-owned runtime
resources. It must not delete or modify the underlying project files.
```

---

### 28.7 Avoid speculative frameworks

Do not create:

- a generic plugin SDK
- a Kubernetes abstraction
- cloud runtime providers
- multi-user permissions
- event-sourcing infrastructure
- distributed queues
- a custom IDE component framework
- an agent orchestration framework
- a preview platform

unless a validated prototype creates a concrete requirement.

---

### 28.8 Preserve the product boundary

When proposing a story, the agent must ask:

```text
Is this feature part of cross-project orchestration,
or does VS Code already own it?
```

If VS Code already owns it, prefer:

- configuration
- an editor extension
- a launch argument
- a command
- a deep link
- an editor-provider capability

Do not rebuild it in Ascend.

---

## 29. Suggested Initial Story Sequence

This is a suggested sequence, not a final backlog.

### Prototype 0

1. Bootstrap the Ascend repository.
2. Add local development and validation commands.
3. Add a minimal Ascend health endpoint and application shell.
4. Launch one code-server process against a configured path.
5. Verify direct filesystem editing.
6. Capture startup and resource measurements.
7. Review Prototype 0 evidence and record the decision.

---

### Prototype 1

1. Add a static project page with editor-runtime status.
2. Reverse proxy one code-server instance through Ascend.
3. Support WebSocket proxying.
4. Embed the editor in the Ascend shell.
5. Add a full-page editor fallback.
6. Test keyboard, terminal, clipboard, webviews, and browser refresh.
7. Test the target tablet and browser experience.
8. Review Prototype 1 evidence and select the editor presentation mode.

---

### Prototype 2

1. Define the Project persistence model.
2. Implement server-side path canonicalisation.
3. Implement server-side path validation.
4. Implement the Open Project API.
5. Implement the Open Project path-input experience.
6. Implement a minimal host-side directory browser.
7. Prevent duplicate project paths.
8. Detect basic Git metadata.
9. Persist the curated project list.
10. Implement Close Project without filesystem deletion.
11. Add project-open and project-close integration tests.
12. Review Prototype 2 evidence and record the decision.

---

### Prototype 3

1. Define runtime-provider and editor-provider boundaries.
2. Add per-project runtime creation.
3. Add stable per-project editor routes.
4. Add project activation.
5. Add project switching.
6. Preserve independent editor state.
7. Add loading and reconnect states.
8. Measure two, three, five, and ten running sessions.
9. Test runtime failure isolation.
10. Review Prototype 3 evidence and choose the session strategy.

---

### Prototype 4

1. Implement runtime start.
2. Implement runtime stop.
3. Implement runtime restart.
4. Add runtime-health monitoring.
5. Add editor-health monitoring.
6. Add runtime failure details and retry.
7. Reconcile runtime state after an Ascend restart.
8. Clean up stale runtime records.
9. Add lifecycle integration tests.
10. Review Prototype 4 evidence and record the decision.

---

### Prototype 5

1. Refine the project sidebar.
2. Add open-project search.
3. Add recent-project ordering.
4. Add project-status indicators.
5. Add keyboard project switching.
6. Add full-screen editor mode.
7. Improve responsive and tablet layout.
8. Improve loading, reconnect, and failure states.
9. Run an end-to-end usability evaluation.
10. Review Prototype 5 and approve or reject MVP investment.

---

## 30. Final Product Boundary

Ascend should remain a thin but valuable orchestration layer.

```text
Ascend
├── Open filesystem projects
├── Close projects safely
├── Remember the curated project list
├── Start editor sessions
├── Stop editor sessions
├── Restart editor sessions
├── Switch among project contexts
├── Route editor traffic
├── Monitor editor health
├── Show cross-project information
└── Later coordinate worktrees, agents and previews

VS Code / code-server
├── Browse files
├── Edit files
├── Manage editor tabs
├── Run terminals
├── Search code
├── Show Git changes
├── Render diffs
├── Preview supported files
├── Run extensions
├── Debug applications
└── Provide the core development experience
```

The first release should prove that this boundary works before Ascend expands into:

- agent orchestration
- observability
- issue tracking
- delivery status
- worktree management
- application previews
- multiple editor providers

---

## 31. Product Statement

> Ascend is a local-first control surface for opening, switching between, and resuming development projects that already exist on the host filesystem.

Ascend does not replace the IDE.

Ascend makes several isolated IDE sessions feel like one coherent development environment.
