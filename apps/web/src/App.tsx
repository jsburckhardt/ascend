import { useEffect, useRef, useState, type FormEvent } from 'react'
import { type ProjectLoader, type RegistrationTransport } from './projects'
import { useProjectHome } from './use-project-home'

export interface AppProperties {
  readonly loadProjectList?: ProjectLoader
  readonly registerProject?: RegistrationTransport
}

export function App({ loadProjectList, registerProject }: AppProperties) {
  const home = useProjectHome({
    load: loadProjectList,
    register: registerProject,
  })
  const { state } = home
  const [openAnnouncement, setOpenAnnouncement] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const projectActions = useRef(new Map<string, HTMLButtonElement>())

  useEffect(() => {
    if (state.focusProjectId === undefined) return
    const action = projectActions.current.get(state.focusProjectId)
    action?.scrollIntoView({ block: 'nearest' })
    action?.focus()
  }, [state.focusProjectId, state.focusVersion])

  useEffect(() => {
    if (state.inputFocusVersion > 0) inputRef.current?.focus()
  }, [state.inputFocusVersion])

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    setOpenAnnouncement('')
    home.submit()
  }

  const pendingRegistration =
    state.activeKind === 'ordinary' || state.activeKind === 'retry'
  const recoveryIdle = state.mode === 'unknown'
  const recoveryPending = state.mode === 'recovery-pending'
  const inputDescription = [
    'host-path-guidance',
    state.validation === undefined ? undefined : 'host-path-error',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12">
      <header className="border-b pb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Project home
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Ascend</h1>
      </header>

      <p aria-live="polite" className="sr-only" role="status">
        {openAnnouncement || state.announcement}
      </p>

      {state.listStatus === 'loading' ? (
        <section
          className="rounded-xl border p-10"
          aria-labelledby="loading-projects"
        >
          <h2 className="text-xl font-semibold" id="loading-projects">
            Registered projects
          </h2>
          <p className="mt-2 text-slate-600">Loading registered projects…</p>
        </section>
      ) : null}

      {state.listStatus === 'failure' ? (
        <section
          aria-labelledby="project-list-failure"
          className="rounded-xl border border-red-300 p-10"
          role="alert"
        >
          <h2 className="text-xl font-semibold" id="project-list-failure">
            Projects could not be loaded
          </h2>
          <p className="mt-2 max-w-xl text-slate-700">
            Check that the Ascend API is running, then retry the project list.
          </p>
          <button
            className="mt-5 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            onClick={home.retryList}
            type="button"
          >
            Retry
          </button>
        </section>
      ) : null}

      {state.listStatus === 'success' ? (
        <section
          aria-labelledby="open-project-heading"
          className="rounded-xl border p-6"
        >
          <h2 className="text-2xl font-semibold" id="open-project-heading">
            Open Project
          </h2>
          <form className="mt-5 flex flex-col gap-3" onSubmit={submit}>
            <label className="font-medium" htmlFor="host-path">
              Host path
            </label>
            <p className="text-sm text-slate-600" id="host-path-guidance">
              Enter an absolute host directory, ~, or a path beginning with ~/.
            </p>
            <input
              aria-describedby={inputDescription}
              aria-invalid={state.validation === undefined ? undefined : true}
              className="rounded-md border px-3 py-2 font-mono"
              id="host-path"
              onChange={(event) => home.setInput(event.target.value)}
              readOnly={state.mode !== 'editing'}
              ref={inputRef}
              type="text"
              value={state.input}
            />
            {state.validation === undefined ? null : (
              <p
                className="text-sm text-red-700"
                id="host-path-error"
                role="alert"
              >
                {state.validation}
              </p>
            )}
            {state.mode === 'editing' ? (
              <button
                className="self-start rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                type="submit"
              >
                Open Project
              </button>
            ) : null}
          </form>

          {state.lockedPayload === undefined ? null : (
            <p className="mt-4 whitespace-pre-wrap break-words font-mono text-sm">
              Locked submission: <code>{state.lockedPayload}</code>
            </p>
          )}
          {pendingRegistration ? (
            <div aria-busy="true" className="mt-4">
              <button onClick={home.cancel} type="button">
                Cancel
              </button>
            </div>
          ) : null}
          {recoveryIdle ? (
            <div
              className="mt-4 flex gap-3"
              role="group"
              aria-label="Submission outcome unknown recovery"
            >
              <button onClick={home.retrySameSubmission} type="button">
                Retry same submission
              </button>
              <button onClick={home.refreshProjects} type="button">
                Refresh projects
              </button>
            </div>
          ) : null}
          {recoveryPending ? (
            <div aria-busy="true" className="mt-4">
              <button onClick={home.cancel} type="button">
                Cancel
              </button>
            </div>
          ) : null}
          {state.mode === 'ambiguous' ? (
            <button className="mt-4" onClick={home.resetRecovery} type="button">
              Reset recovery
            </button>
          ) : null}
        </section>
      ) : null}

      {state.listStatus === 'success' && state.projects.length === 0 ? (
        <section
          aria-labelledby="empty-projects"
          className="rounded-xl border p-10"
        >
          <h2 className="text-xl font-semibold" id="empty-projects">
            No registered projects
          </h2>
          <p className="mt-2 max-w-xl text-slate-600">
            Open an existing host directory to register it.
          </p>
        </section>
      ) : null}

      {state.listStatus === 'success' && state.projects.length > 0 ? (
        <section aria-labelledby="registered-projects">
          <h2 className="text-2xl font-semibold" id="registered-projects">
            Registered projects
          </h2>
          <ul aria-label="Registered projects" className="mt-6 grid gap-4">
            {state.projects.map((project) => (
              <li className="rounded-xl border bg-white p-6" key={project.id}>
                <h3 className="text-lg font-semibold">{project.name}</h3>
                <p
                  className="mt-2 whitespace-pre-wrap text-sm text-slate-600 [overflow-wrap:anywhere]"
                  title={project.canonicalPath}
                >
                  {project.canonicalPath}
                </p>
                <button
                  aria-label={'Open ' + project.name}
                  className="mt-5 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                  data-project-id={project.id}
                  onClick={() =>
                    setOpenAnnouncement(
                      project.name +
                        ': Opening the workbench is not available yet.'
                    )
                  }
                  ref={(element) => {
                    if (element === null)
                      projectActions.current.delete(project.id)
                    else projectActions.current.set(project.id, element)
                  }}
                  type="button"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
