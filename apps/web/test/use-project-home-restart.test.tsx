import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Project, ProjectLoader } from '../src/projects'
import {
  RUNTIME_RESTART_NOTICES,
  type RuntimeRestartTransport,
  type RuntimeRestartTransportResult,
} from '../src/runtime-restart'
import { useProjectHome } from '../src/use-project-home'

const projects: Project[] = [
  { id: 'a', name: 'Alpha', canonicalPath: '/fixtures/a', createdAt: 1 },
  { id: 'b', name: 'Beta', canonicalPath: '/fixtures/b', createdAt: 2 },
]
const loadProjects: ProjectLoader = async () => projects

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

function Harness({ transport }: { transport: RuntimeRestartTransport }) {
  const home = useProjectHome({
    load: loadProjects,
    restart: transport,
  })
  return (
    <div>
      <output data-testid="restart-a">
        {home.state.restarts.get('a')?.phase}
      </output>
      <output data-testid="restart-b">
        {home.state.restarts.get('b')?.phase}
      </output>
      <output data-testid="restart-category">
        {home.state.restarts.get('a')?.category}
      </output>
      <output data-testid="settlement">
        {home.state.restartSettlementVersion}
      </output>
      <output data-testid="announcement">{home.state.announcement}</output>
      <output data-testid="focus">
        {home.state.focusProjectId}:{home.state.focusTarget}
      </output>
      <output data-testid="close">{home.state.close?.id}</output>
      <button onClick={() => home.restart('a')}>restart-a</button>
      <button onClick={() => home.restart('b')}>restart-b</button>
      <button onClick={() => home.openClose('b')}>close-b</button>
    </div>
  )
}

async function ready(transport: RuntimeRestartTransport) {
  const view = render(<Harness transport={transport} />)
  await act(async () => undefined)
  return view
}

afterEach(() => cleanup())

describe('Project Home per-project restart lane', () => {
  it('joins one project while another project remains independently usable', async () => {
    const requests = new Map<
      string,
      ReturnType<typeof deferred<RuntimeRestartTransportResult>>
    >()
    const transport = vi.fn<RuntimeRestartTransport>((id) => {
      const request = deferred<RuntimeRestartTransportResult>()
      requests.set(id, request)
      return request.promise
    })
    await ready(transport)

    fireEvent.click(screen.getByText('restart-a'))
    fireEvent.click(screen.getByText('restart-a'))
    fireEvent.click(screen.getByText('restart-b'))
    expect(transport).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('restart-a')).toHaveTextContent('pending')
    expect(screen.getByTestId('restart-b')).toHaveTextContent('pending')

    await act(async () =>
      requests
        .get('a')
        ?.resolve({ kind: 'success', id: 'a', outcome: 'restarted' })
    )
    expect(screen.getByTestId('restart-a')).toBeEmptyDOMElement()
    expect(screen.getByTestId('restart-b')).toHaveTextContent('pending')
    expect(screen.getByTestId('settlement')).toHaveTextContent('1')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'Alpha: Workbench restarted.'
    )
    expect(screen.getByTestId('focus')).toHaveTextContent('a:restart')
  })

  it('allows another project to enter its ordinary Close flow', async () => {
    const transport = vi.fn<RuntimeRestartTransport>(
      () => new Promise(() => undefined)
    )
    await ready(transport)
    fireEvent.click(screen.getByText('restart-a'))
    fireEvent.click(screen.getByText('close-b'))
    expect(screen.getByTestId('restart-a')).toHaveTextContent('pending')
    expect(screen.getByTestId('close')).toHaveTextContent('b')
  })

  it('keeps a typed rejection retryable', async () => {
    const transport = vi
      .fn<RuntimeRestartTransport>()
      .mockResolvedValueOnce({
        kind: 'failure',
        category: 'runtime_replacement_failed',
      })
      .mockResolvedValueOnce({
        kind: 'success',
        id: 'a',
        outcome: 'restarted',
      })
    await ready(transport)

    fireEvent.click(screen.getByText('restart-a'))
    await act(async () => undefined)
    expect(screen.getByTestId('restart-a')).toHaveTextContent('retry')
    expect(screen.getByTestId('restart-category')).toHaveTextContent(
      'runtime_replacement_failed'
    )
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      RUNTIME_RESTART_NOTICES.runtime_replacement_failed
    )

    fireEvent.click(screen.getByText('restart-a'))
    await act(async () => undefined)
    expect(transport).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('settlement')).toHaveTextContent('1')
  })

  it('keeps an indeterminate outcome explicit', async () => {
    const transport = vi
      .fn<RuntimeRestartTransport>()
      .mockResolvedValue({ kind: 'unknown' })
    await ready(transport)
    fireEvent.click(screen.getByText('restart-a'))
    await act(async () => undefined)
    expect(screen.getByTestId('restart-a')).toHaveTextContent('unknown')
    expect(screen.getByTestId('settlement')).toHaveTextContent('0')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'Alpha: Restart outcome unknown. Refresh runtime state.'
    )
  })

  it('aborts every active project lane on unmount', async () => {
    const signals: AbortSignal[] = []
    const transport = vi.fn<RuntimeRestartTransport>((_id, signal) => {
      signals.push(signal)
      return new Promise(() => undefined)
    })
    const view = await ready(transport)
    fireEvent.click(screen.getByText('restart-a'))
    fireEvent.click(screen.getByText('restart-b'))
    view.unmount()
    expect(signals).toHaveLength(2)
    expect(signals.every(({ aborted }) => aborted)).toBe(true)
  })
})
