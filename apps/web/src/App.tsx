import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  type CloseTransport,
  type ProjectLoader,
  type RegistrationTransport,
} from './projects'
import {
  PUBLIC_RUNTIME_STATES,
  RUNTIME_FAILURE_NOTICES,
  reconcileRuntimeReports,
  type RuntimeStateLoader,
} from './runtime-state'
import {
  RUNTIME_RESTART_NOTICES,
  type RuntimeRestartTransport,
} from './runtime-restart'
import { RUNTIME_STOP_NOTICES, type RuntimeStopTransport } from './runtime-stop'
import { useProjectHome } from './use-project-home'
import {
  useRuntimeState,
  type ProjectListRevision,
  type RuntimeStateView,
} from './use-runtime-state'
import {
  browserWorkbenchNavigator,
  stableWorkbenchUrl,
  type WorkbenchNavigator,
} from './workbench-navigation'

export interface AppProperties {
  readonly loadProjectList?: ProjectLoader
  readonly registerProject?: RegistrationTransport
  readonly closeProject?: CloseTransport
  readonly stopRuntime?: RuntimeStopTransport
  readonly restartRuntime?: RuntimeRestartTransport
  readonly loadRuntimeStates?: RuntimeStateLoader
  readonly runtimeStateTimeoutMs?: number
  readonly navigateToWorkbench?: WorkbenchNavigator
}

export const CLOSE_DIALOG_BODY =
  'Closing removes this project registration from Ascend. The filesystem directory and files will not be deleted.'

function runtimeUnavailableMessage(view: RuntimeStateView): string {
  if (view.kind === 'idle') {
    return 'Runtime states are unavailable until the project list is ready.'
  }
  if (view.kind === 'loading') {
    return 'Runtime states are loading and temporarily unavailable.'
  }
  if (view.kind === 'failure' && view.reason === 'timeout') {
    return 'Runtime states did not load in time and are unavailable.'
  }
  if (view.kind === 'failure' && view.reason === 'mismatch') {
    return 'Runtime states did not match the project list and are unavailable.'
  }
  return 'Runtime states could not be loaded and are unavailable.'
}

export function App({
  loadProjectList,
  registerProject,
  closeProject,
  stopRuntime,
  restartRuntime,
  loadRuntimeStates,
  runtimeStateTimeoutMs,
  navigateToWorkbench = browserWorkbenchNavigator,
}: AppProperties) {
  const home = useProjectHome({
    load: loadProjectList,
    register: registerProject,
    close: closeProject,
    stop: stopRuntime,
    restart: restartRuntime,
  })
  const { state } = home
  const [projectListRevision, setProjectListRevision] =
    useState<ProjectListRevision>()
  const runtime = useRuntimeState(projectListRevision, {
    loader: loadRuntimeStates,
    timeoutMs: runtimeStateTimeoutMs,
  })
  const [openAnnouncement, setOpenAnnouncement] = useState('')
  const [openingProjectId, setOpeningProjectId] = useState<string>()
  const activationGeneration = useRef(0)
  const pendingActivation = useRef<
    { id: string; generation: number } | undefined
  >(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const projectActions = useRef(new Map<string, HTMLButtonElement>())
  const closeActions = useRef(new Map<string, HTMLButtonElement>())
  const stopActions = useRef(new Map<string, HTMLButtonElement>())
  const restartActions = useRef(new Map<string, HTMLButtonElement>())
  const refreshedStopSettlement = useRef(0)
  const refreshedRestartSettlement = useRef(0)
  const pendingRestartFocus = useRef<
    | {
        version: number
        projectId: string
        observedLoading: boolean
      }
    | undefined
  >(undefined)

  useEffect(() => {
    if (state.listStatus !== 'success') return
    setProjectListRevision((current) =>
      Object.freeze({
        id: (current?.id ?? 0) + 1,
        projectIds: Object.freeze(state.projects.map(({ id }) => id)),
      })
    )
  }, [state.listStatus, state.projects])

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    if (state.focusTarget === 'heading') {
      headingRef.current?.focus()
      return
    }
    if (state.focusProjectId === undefined) return
    const action =
      state.focusTarget === 'close'
        ? closeActions.current.get(state.focusProjectId)
        : state.focusTarget === 'stop'
          ? stopActions.current.get(state.focusProjectId)
          : state.focusTarget === 'restart'
            ? restartActions.current.get(state.focusProjectId)
            : projectActions.current.get(state.focusProjectId)
    action?.scrollIntoView({ block: 'nearest' })
    action?.focus()
  }, [state.focusProjectId, state.focusTarget, state.focusVersion])

  useEffect(() => {
    if (state.inputFocusVersion > 0) inputRef.current?.focus()
  }, [state.inputFocusVersion])

  useEffect(() => {
    if (
      state.stopSettlementVersion === 0 ||
      refreshedStopSettlement.current === state.stopSettlementVersion
    ) {
      return
    }
    refreshedStopSettlement.current = state.stopSettlementVersion
    runtime.refresh()
  }, [runtime, state.stopSettlementVersion])

  useEffect(() => {
    if (
      state.restartSettlementVersion === 0 ||
      refreshedRestartSettlement.current === state.restartSettlementVersion
    ) {
      return
    }
    refreshedRestartSettlement.current = state.restartSettlementVersion
    if (state.focusTarget === 'restart' && state.focusProjectId !== undefined) {
      pendingRestartFocus.current = {
        version: state.restartSettlementVersion,
        projectId: state.focusProjectId,
        observedLoading: false,
      }
    }
    runtime.refresh()
  }, [
    runtime,
    state.focusProjectId,
    state.focusTarget,
    state.restartSettlementVersion,
  ])

  useEffect(() => {
    const pending = pendingRestartFocus.current
    if (pending === undefined) return
    if (runtime.view.kind === 'loading') {
      pending.observedLoading = true
      return
    }
    if (runtime.view.kind !== 'success' || !pending.observedLoading) return
    const action = restartActions.current.get(pending.projectId)
    action?.scrollIntoView({ block: 'nearest' })
    action?.focus()
    pendingRestartFocus.current = undefined
  }, [runtime.view])

  const closeCanCancel =
    state.close?.phase === 'confirming' ||
    (state.close?.phase === 'pending' && !state.close.transmitted)

  useEffect(() => {
    if (state.close === undefined) return
    const dialog = dialogRef.current
    const firstControl = dialog?.querySelector<HTMLButtonElement>(
      'button:not(:disabled)'
    )
    ;(firstControl ?? dialog)?.focus()
  }, [state.close])

  const trapDialogFocus = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' && closeCanCancel) {
      event.preventDefault()
      home.cancelClose()
      return
    }
    if (event.key !== 'Tab') return
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        'button:not(:disabled)'
      )
    )
    if (controls.length === 0) {
      event.preventDefault()
      event.currentTarget.focus()
      return
    }
    const first = controls[0]!
    const last = controls[controls.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    setOpenAnnouncement('')
    home.submit()
  }

  const openWorkbench = (projectId: string, projectName: string): void => {
    if (pendingActivation.current !== undefined) return
    const generation = ++activationGeneration.current
    pendingActivation.current = { id: projectId, generation }
    setOpeningProjectId(projectId)
    setOpenAnnouncement(projectName + ': Opening workbench.')
    queueMicrotask(() => {
      if (pendingActivation.current?.generation !== generation) return
      navigateToWorkbench(stableWorkbenchUrl(projectId))
    })
  }

  const pendingRegistration = state.activeKind === 'ordinary'
  const recoveryIdle = state.mode === 'unknown'
  const recoveryPending = state.mode === 'recovery-pending'
  const inputDescription = [
    'host-path-guidance',
    state.validation === undefined ? undefined : 'host-path-error',
  ]
    .filter(Boolean)
    .join(' ')
  const currentRuntimeReconciliation =
    runtime.view.kind === 'success'
      ? reconcileRuntimeReports(
          runtime.view.reports,
          state.projects.map(({ id }) => id)
        )
      : undefined
  const currentRuntimeReports =
    currentRuntimeReconciliation?.kind === 'reconciled'
      ? currentRuntimeReconciliation.reports
      : undefined
  const runtimeSummary =
    currentRuntimeReports === undefined
      ? undefined
      : PUBLIC_RUNTIME_STATES.map(
          (runtimeState) =>
            `${currentRuntimeReports.filter(({ state: value }) => value === runtimeState).length} ${runtimeState}`
        ).join(', ')

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12">
      <header className="border-b pb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Project home
        </p>
        <h1
          className={'mt-2 text-4xl font-semibold tracking-tight'}
          ref={headingRef}
          tabIndex={-1}
        >
          Ascend
        </h1>
      </header>

      <p
        aria-live="polite"
        className="sr-only"
        id="workbench-opening-status"
        role="status"
      >
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
          <p className="sr-only" id="stop-workbench-description">
            Stopping releases the workbench and keeps the project registered.
          </p>
          <p className="sr-only" id="restart-workbench-description">
            Restarting replaces the current workbench session and keeps the
            project registered.
          </p>
          {runtimeSummary === undefined ? null : (
            <p
              aria-label="Runtime state summary"
              aria-live="polite"
              className="mt-3 text-sm text-slate-600"
            >
              Runtime state summary: {runtimeSummary}
            </p>
          )}
          <ul aria-label="Registered projects" className="mt-6 grid gap-4">
            {state.projects.map((project, index) => (
              <li
                aria-busy={
                  (state.stop?.id === project.id &&
                    state.stop.phase === 'pending') ||
                  state.restarts.get(project.id)?.phase === 'pending'
                    ? true
                    : undefined
                }
                className="rounded-xl border bg-white p-6"
                key={project.id}
              >
                <h3 className="text-lg font-semibold">{project.name}</h3>
                <p
                  className="mt-2 whitespace-pre-wrap text-sm text-slate-600 [overflow-wrap:anywhere]"
                  title={project.canonicalPath}
                >
                  {project.canonicalPath}
                </p>
                {currentRuntimeReports === undefined ? (
                  <p
                    className="mt-3 text-sm text-slate-700"
                    data-runtime-unavailable="true"
                  >
                    Runtime state unavailable
                  </p>
                ) : (
                  <div
                    className="mt-3"
                    data-runtime-project-id={project.id}
                    data-runtime-state={currentRuntimeReports[index]!.state}
                  >
                    <p>
                      <span className="font-medium">Runtime state: </span>
                      <span>{currentRuntimeReports[index]!.state}</span>
                    </p>
                    {currentRuntimeReports[index]!.state === 'Failed' ? (
                      <p
                        className="mt-1 text-sm text-red-800"
                        data-runtime-failure={
                          currentRuntimeReports[index]!.failureCategory
                        }
                      >
                        {
                          RUNTIME_FAILURE_NOTICES[
                            currentRuntimeReports[index]!.failureCategory!
                          ]
                        }
                      </p>
                    ) : null}
                  </div>
                )}
                <button
                  aria-label={'Open ' + project.name}
                  className="mt-5 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-600"
                  data-project-id={project.id}
                  aria-describedby={
                    openingProjectId === project.id
                      ? 'workbench-opening-status'
                      : undefined
                  }
                  disabled={
                    (openingProjectId !== undefined &&
                      openingProjectId !== project.id) ||
                    state.restarts.get(project.id)?.phase === 'pending'
                  }
                  onClick={() => openWorkbench(project.id, project.name)}
                  ref={(element) => {
                    if (element === null)
                      projectActions.current.delete(project.id)
                    else projectActions.current.set(project.id, element)
                  }}
                  type="button"
                >
                  Open
                </button>
                <button
                  aria-describedby="stop-workbench-description"
                  aria-label={'Stop ' + project.name + ' workbench'}
                  className="ml-3 mt-5 rounded-md border px-4 py-2 text-sm font-medium"
                  data-stop-project-id={project.id}
                  disabled={
                    state.stop?.phase === 'pending' ||
                    state.restarts.get(project.id)?.phase === 'pending'
                  }
                  onClick={() => {
                    setOpenAnnouncement('')
                    home.stop(project.id)
                  }}
                  ref={(element) => {
                    if (element === null) stopActions.current.delete(project.id)
                    else stopActions.current.set(project.id, element)
                  }}
                  type="button"
                >
                  Stop
                </button>
                {currentRuntimeReports !== undefined &&
                (currentRuntimeReports[index]!.state === 'Running' ||
                  currentRuntimeReports[index]!.state === 'Failed') ? (
                  <button
                    aria-describedby="restart-workbench-description"
                    aria-label={'Restart ' + project.name + ' workbench'}
                    className="ml-3 mt-5 rounded-md border px-4 py-2 text-sm font-medium"
                    data-restart-project-id={project.id}
                    disabled={
                      state.restarts.get(project.id)?.phase === 'pending'
                    }
                    onClick={() => {
                      setOpenAnnouncement('')
                      home.restart(project.id)
                    }}
                    ref={(element) => {
                      if (element === null)
                        restartActions.current.delete(project.id)
                      else restartActions.current.set(project.id, element)
                    }}
                    type="button"
                  >
                    Restart
                  </button>
                ) : null}
                <button
                  aria-label={'Close ' + project.name}
                  className={
                    'ml-3 mt-5 rounded-md border border-red-700 px-4 py-2 text-sm font-medium text-red-800'
                  }
                  data-close-project-id={project.id}
                  disabled={state.restarts.get(project.id)?.phase === 'pending'}
                  onClick={() => {
                    setOpenAnnouncement('')
                    home.openClose(project.id)
                  }}
                  ref={(element) => {
                    if (element === null)
                      closeActions.current.delete(project.id)
                    else closeActions.current.set(project.id, element)
                  }}
                  type={'button'}
                >
                  Close
                </button>
                {state.stop?.id === project.id &&
                state.stop.phase === 'retry' &&
                state.stop.category !== undefined ? (
                  <div className="mt-4" role="alert">
                    <p>{RUNTIME_STOP_NOTICES[state.stop.category]}</p>
                    <button
                      className="mt-2 rounded-md border px-3 py-1 text-sm font-medium"
                      onClick={() => home.stop(project.id)}
                      type="button"
                    >
                      Retry stop
                    </button>
                  </div>
                ) : null}
                {state.restarts.get(project.id)?.phase === 'retry' &&
                state.restarts.get(project.id)?.category !== undefined ? (
                  <div className="mt-4" role="alert">
                    <p>
                      {
                        RUNTIME_RESTART_NOTICES[
                          state.restarts.get(project.id)!.category!
                        ]
                      }
                    </p>
                    <button
                      className="mt-2 rounded-md border px-3 py-1 text-sm font-medium"
                      onClick={() => home.restart(project.id)}
                      type="button"
                    >
                      Retry restart
                    </button>
                  </div>
                ) : null}
                {state.restarts.get(project.id)?.phase === 'unknown' ? (
                  <div className="mt-4">
                    <p>Restart outcome unknown. Refresh the runtime state.</p>
                    <button
                      className="mt-2 rounded-md border px-3 py-1 text-sm font-medium"
                      onClick={runtime.refresh}
                      type="button"
                    >
                      Refresh runtime state
                    </button>
                  </div>
                ) : null}
                {state.stop?.id === project.id &&
                state.stop.phase === 'unknown' ? (
                  <div className="mt-4">
                    <p>Stop outcome unknown. Refresh the runtime state.</p>
                    <button
                      className="mt-2 rounded-md border px-3 py-1 text-sm font-medium"
                      onClick={runtime.refresh}
                      type="button"
                    >
                      Refresh runtime state
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {runtimeSummary === undefined ? (
            <div
              aria-labelledby="runtime-state-unavailable"
              className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4"
            >
              <h3 className="font-semibold" id="runtime-state-unavailable">
                Runtime states unavailable
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                {runtime.view.kind === 'success'
                  ? 'Runtime states did not match the project list and are unavailable.'
                  : runtimeUnavailableMessage(runtime.view)}
              </p>
              <button
                className="mt-3 rounded-md border px-3 py-1 text-sm font-medium"
                onClick={runtime.retry}
                type="button"
              >
                Retry runtime states
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
      {state.close === undefined ? null : (
        <div
          className={
            'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6'
          }
        >
          <div
            aria-busy={
              state.close.phase === 'pending' ||
              state.close.phase === 'refreshing'
                ? true
                : undefined
            }
            aria-describedby={'close-project-description'}
            aria-labelledby={'close-project-title'}
            aria-modal={true}
            className={'w-full max-w-lg rounded-xl bg-white p-6 shadow-xl'}
            onKeyDown={trapDialogFocus}
            ref={dialogRef}
            role={'dialog'}
            tabIndex={-1}
          >
            <h2 className={'text-xl font-semibold'} id={'close-project-title'}>
              {'Close ' + state.close.name + '?'}
            </h2>
            <p
              className={'mt-3 text-slate-700'}
              id={'close-project-description'}
            >
              {CLOSE_DIALOG_BODY}
            </p>
            {state.close.message === undefined ? null : (
              <p className={'mt-4 text-red-800'}>{state.close.message}</p>
            )}
            {state.close.phase === 'pending' ? (
              <p className={'mt-4'}>
                {state.close.transmitted
                  ? 'Close request sent. Waiting for a safe result…'
                  : 'Preparing the close request…'}
              </p>
            ) : null}
            {state.close.phase === 'refreshing' ? (
              <p className={'mt-4'}>
                Refreshing the authoritative project list…
              </p>
            ) : null}
            <div className={'mt-6 flex justify-end gap-3'}>
              {closeCanCancel ? (
                <button onClick={home.cancelClose} type={'button'}>
                  Cancel
                </button>
              ) : null}
              {state.close.phase === 'confirming' ? (
                <button
                  className={
                    'rounded-md bg-red-700 px-4 py-2 font-medium text-white'
                  }
                  data-variant={'destructive'}
                  onClick={home.confirmClose}
                  type={'button'}
                >
                  Confirm
                </button>
              ) : null}
              {state.close.phase === 'pending' && !state.close.transmitted ? (
                <button disabled type={'button'}>
                  Confirm
                </button>
              ) : null}
              {state.close.phase === 'retry' ? (
                <button onClick={home.retryClose} type={'button'}>
                  Retry
                </button>
              ) : null}
              {state.close.phase === 'unknown' ? (
                <button onClick={home.refreshClose} type={'button'}>
                  Refresh projects
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
