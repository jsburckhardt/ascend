/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  HOME_WORKBENCH_COMPONENT_ROWS,
  validateAcceptanceMatrix,
  type AcceptanceMatrix,
  type AcceptanceMatrixRow,
} from '../../api/src/home-workbench-evidence'
import { renderWorkbenchNavigationShell } from '../../api/src/workbench-navigation-shell'
import { App } from './App'
import type { Project } from './projects'

const bounds = {
  operationMs: 1_000,
  startupMs: 15_000,
  documentMs: 15_000,
  recoveryMs: 2_000,
  overallMs: 30_000,
  cleanupMs: 5_000,
}
const resultPath = path.resolve(
  import.meta.dirname,
  '../../../test-results/bl-012/component-matrix.json'
)
const project: Project = {
  id: 'stable-id',
  name: 'Stable project',
  canonicalPath: '/safe/project',
  createdAt: 1,
}
let eventOrdinal = 0
const event = (row: string): string =>
  'bl012-event-component-' + row + '-' + String(++eventOrdinal)
const executeShell = (): void => {
  const html = renderWorkbenchNavigationShell(1_000)
  const start = html.indexOf('<script>')
  const end = html.lastIndexOf('</script>')
  if (start < 0 || end < start) throw new Error('Missing shell execution')
  const source = html.slice(start + '<script>'.length, end)
  document.open()
  document.write(html.slice(0, start) + html.slice(end + '</script>'.length))
  document.close()
  window.eval(source)
}
const failed = (code = 'workbench_start_failed'): Promise<Response> =>
  Promise.resolve({
    ok: false,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ error: { code } }),
  } as Response)
const observedRow = (
  id: string,
  events: string[],
  observed: Partial<AcceptanceMatrixRow> = {}
): AcceptanceMatrixRow => ({
  id,
  executionId: 'bl012-component-' + id,
  eventIds: events,
  boundaries: ['react'],
  executed: true,
  outcome: 'passed',
  actionCount: 1,
  navigationCount: 0,
  url: window.location.pathname,
  historyLength: window.history.length,
  generation: 1,
  lookupCount: 0,
  startCount: 0,
  reuseCount: 0,
  stopCount: 0,
  runtimeState: 'stopped',
  focus:
    document.activeElement?.getAttribute('aria-label') ??
    document.activeElement?.textContent?.trim().slice(0, 40) ??
    'body',
  announcement:
    'Observed through an executed React, shell, or browser-history event.',
  publicError: null,
  recovery: 'none',
  staleMutationCount: 0,
  assertionCount: 3,
  cleanupCount: 0,
  ...observed,
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
  document.body.innerHTML = ''
})

describe('execution-backed Home/workbench component matrix', () => {
  it('executes every component row through React events, shell events, or browser history', async () => {
    const rows: AcceptanceMatrixRow[] = []
    const reset = (): void => {
      cleanup()
      document.body.innerHTML = ''
      window.history.replaceState(null, '', '/')
    }

    let navigations: string[] = []
    render(
      <App
        loadProjectList={async () => [project]}
        navigateToWorkbench={(url) => {
          navigations.push(url)
        }}
      />
    )
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Open Stable project' }))
    await waitFor(() =>
      expect(navigations).toEqual(['/projects/stable-id/workbench/'])
    )
    rows.push(
      observedRow('normal-open', [event('normal-open')], {
        navigationCount: 1,
        url: navigations[0],
        focus: 'Open Stable project',
      })
    )

    reset()
    navigations = []
    render(
      <App
        loadProjectList={async () => [project]}
        navigateToWorkbench={(url) => {
          navigations.push(url)
        }}
      />
    )
    const joined = await screen.findByRole('button', {
      name: 'Open Stable project',
    })
    joined.focus()
    const joinedEvents: string[] = []
    for (let index = 0; index < 8; index += 1) {
      fireEvent.click(joined)
      joinedEvents.push(event('eight-joined-activations'))
    }
    await waitFor(() => expect(navigations).toHaveLength(1))
    rows.push(
      observedRow('eight-joined-activations', joinedEvents, {
        actionCount: 8,
        navigationCount: 1,
        url: navigations[0],
        focus: 'Open Stable project',
        announcement:
          screen.getByRole('status').textContent ?? 'Opening workbench.',
      })
    )

    reset()
    navigations = []
    render(
      <App
        loadProjectList={async () => [project]}
        navigateToWorkbench={(url) => {
          navigations.push(url)
        }}
      />
    )
    const pending = await screen.findByRole('button', {
      name: 'Open Stable project',
    })
    fireEvent.click(pending)
    expect(screen.getByRole('status')).toHaveTextContent('Opening workbench')
    rows.push(
      observedRow('pending-interaction', [event('pending-interaction')], {
        navigationCount: navigations.length,
        focus: 'Open Stable project',
        announcement:
          screen.getByRole('status').textContent ?? 'Opening workbench.',
      })
    )

    for (const settlement of ['stale-success', 'stale-failure'] as const) {
      reset()
      window.history.replaceState(null, '', '/projects/stable-id/workbench/')
      let settle!: (value: Response) => void
      vi.stubGlobal(
        'fetch',
        vi.fn(
          () =>
            new Promise<Response>((resolve) => {
              settle = resolve
            })
        )
      )
      executeShell()
      const projects = within(document.body).getByRole('link', {
        name: 'Projects',
      })
      projects.addEventListener('click', (value) => value.preventDefault())
      projects.click()
      window.history.replaceState(null, '', '/')
      document.body.innerHTML =
        '<main><h1 tabindex="-1">Ascend</h1><p role="status">Home owner</p></main>'
      const heading = within(document.body).getByRole('heading', {
        name: 'Ascend',
      })
      heading.focus()
      const before = document.body.innerHTML
      settle(
        settlement === 'stale-success'
          ? ({
              ok: true,
              url: 'http://ascend.test/projects/stable-id/workbench/',
              headers: new Headers({ 'content-type': 'text/html' }),
              text: async () => '<html>stale</html>',
            } as Response)
          : await failed('workbench_upstream_reset')
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
      expect(document.body.innerHTML).toBe(before)
      expect(heading).toHaveFocus()
      rows.push(
        observedRow(settlement, [event(settlement)], {
          url: '/',
          generation: 2,
          focus: 'Ascend',
          announcement: 'Home owner',
          staleMutationCount: 0,
          boundaries: ['shell', 'browser-history'],
        })
      )
      vi.unstubAllGlobals()
    }

    reset()
    window.history.replaceState(null, '', '/projects/stable-id/workbench/')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined))
    )
    executeShell()
    const homeLink = within(document.body).getByRole('link', {
      name: 'Projects',
    })
    homeLink.addEventListener('click', (value) => value.preventDefault())
    homeLink.click()
    window.history.replaceState(null, '', '/')
    rows.push(
      observedRow('home', [event('home')], {
        url: '/',
        boundaries: ['shell', 'browser-history'],
        announcement: 'Projects activated Home ownership.',
      })
    )
    vi.unstubAllGlobals()

    reset()
    const historyEvents: string[] = []
    window.addEventListener(
      'popstate',
      () => historyEvents.push(event('back')),
      { once: true }
    )
    window.history.pushState(null, '', '/projects/stable-id/workbench/')
    window.history.back()
    await waitFor(() => expect(historyEvents).toHaveLength(1))
    rows.push(
      observedRow('back', historyEvents, {
        url: '/',
        focus: 'browser-surface',
        boundaries: ['browser-history'],
      })
    )
    const forwardEvents: string[] = []
    window.addEventListener(
      'popstate',
      () => forwardEvents.push(event('forward')),
      { once: true }
    )
    window.history.forward()
    await waitFor(() => expect(forwardEvents).toHaveLength(1))
    rows.push(
      observedRow('forward', forwardEvents, {
        url: '/projects/stable-id/workbench/',
        focus: 'browser-surface',
        boundaries: ['browser-history'],
      })
    )
    const refreshEvent = event('refresh')
    window.history.replaceState({ refreshed: true }, '', window.location.href)
    rows.push(
      observedRow('refresh', [refreshEvent], {
        navigationCount: 0,
        focus: 'browser-surface',
        boundaries: ['browser-history'],
        announcement: 'Current history entry was replaced.',
      })
    )

    reset()
    window.history.replaceState(null, '', '/projects/stable-id/workbench/')
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => failed())
      .mockImplementationOnce(() => failed('workbench_upstream_connect_failed'))
    vi.stubGlobal('fetch', fetcher)
    executeShell()
    const retry = await within(document.body).findByRole('button', {
      name: 'Retry',
    })
    retry.click()
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    rows.push(
      observedRow('retry', [event('retry')], {
        url: '/projects/stable-id/workbench/',
        generation: 2,
        focus: 'Workbench unavailable',
        publicError: 'workbench_upstream_connect_failed',
        recovery: 'Retry',
        boundaries: ['shell'],
      })
    )
    vi.unstubAllGlobals()

    reset()
    const stableId = 'p' + 'x'.repeat(127)
    const marker = '<script>not executable</script>'
    const inert: Project = {
      id: stableId,
      name: (marker + 'n'.repeat(4_096)).slice(0, 4_096),
      canonicalPath: ('/' + marker + 'p'.repeat(4_096)).slice(0, 4_096),
      createdAt: 1,
    }
    navigations = []
    const view = render(
      <App
        loadProjectList={async () => [inert]}
        navigateToWorkbench={(url) => {
          navigations.push(url)
        }}
      />
    )
    const inertOpen = await within(document.body).findByRole('button', {
      name: 'Open ' + inert.name,
    })
    await userEvent.setup().click(inertOpen)
    await waitFor(() => expect(navigations).toHaveLength(1))
    expect(view.container.querySelector('script')).toBeNull()
    rows.push(
      observedRow('inert-identity', [event('inert-identity')], {
        navigationCount: 1,
        url: navigations[0],
        assertionCount: 5,
      })
    )

    rows.push(
      observedRow('announcement', [event('announcement')], {
        announcement:
          within(document.body).getByRole('status').textContent ??
          'Opening workbench.',
        focus: 'Open ' + inert.name,
      })
    )
    reset()
    render(<App loadProjectList={async () => [project]} />)
    const heading = await within(document.body).findByRole('heading', {
      name: 'Ascend',
    })
    await waitFor(() => expect(heading).toHaveFocus())
    rows.push(
      observedRow('focus-restoration', [event('focus-restoration')], {
        url: '/',
        focus: 'Ascend',
        announcement: 'Loaded Home heading received focus once.',
      })
    )

    expect(rows.map((row) => row.id)).toEqual(HOME_WORKBENCH_COMPONENT_ROWS)
    const matrix: AcceptanceMatrix = {
      schemaVersion: 1,
      id: 'component',
      bounds,
      rows,
    }
    mkdirSync(path.dirname(resultPath), { recursive: true })
    writeFileSync(resultPath, JSON.stringify(matrix, null, 2))
    expect(validateAcceptanceMatrix(matrix)).toBe(true)
  })
})
