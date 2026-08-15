import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Project, ProjectLoader } from '../src/projects'
import {
  RUNTIME_STOP_ERROR_CATEGORIES,
  RUNTIME_STOP_NOTICES,
  type RuntimeStopTransport,
  type RuntimeStopTransportResult,
} from '../src/runtime-stop'
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

function Harness({
  transport,
  close = vi.fn(),
}: {
  transport: RuntimeStopTransport
  close?: ReturnType<typeof vi.fn>
}) {
  const home = useProjectHome({
    load: loadProjects,
    stop: transport,
    close,
  })
  return (
    <div>
      <output data-testid="stop-phase">{home.state.stop?.phase}</output>
      <output data-testid="stop-category">{home.state.stop?.category}</output>
      <output data-testid="settlement">
        {home.state.stopSettlementVersion}
      </output>
      <output data-testid="announcement">{home.state.announcement}</output>
      <output data-testid="focus">{home.state.focusProjectId}</output>
      <output data-testid="focus-target">{home.state.focusTarget}</output>
      <output data-testid="projects">
        {home.state.projects
          .map(
            ({ id, name, canonicalPath, createdAt }) =>
              `${id}:${name}:${canonicalPath}:${createdAt}`
          )
          .join('|')}
      </output>
      <button onClick={() => home.stop('a')}>stop-a</button>
      <button onClick={() => home.stop('b')}>stop-b</button>
      <button onClick={() => home.openClose('b')}>close-b</button>
    </div>
  )
}

async function ready(
  transport: RuntimeStopTransport,
  close?: ReturnType<typeof vi.fn>
) {
  const view = render(<Harness transport={transport} close={close} />)
  await act(async () => undefined)
  return view
}

afterEach(() => cleanup())

describe('Project Home stop owner', () => {
  it('serializes one selected stop and applies its success once', async () => {
    const request = deferred<RuntimeStopTransportResult>()
    const transport = vi.fn<RuntimeStopTransport>(() => request.promise)
    await ready(transport)
    fireEvent.click(screen.getByText('stop-a'))
    fireEvent.click(screen.getByText('stop-a'))
    fireEvent.click(screen.getByText('stop-b'))
    expect(transport).toHaveBeenCalledOnce()
    expect(transport.mock.calls[0]?.[0]).toBe('a')
    expect(screen.getByTestId('stop-phase')).toHaveTextContent('pending')
    await act(async () =>
      request.resolve({ kind: 'success', id: 'a', outcome: 'stopped' })
    )
    expect(screen.getByTestId('stop-phase')).toBeEmptyDOMElement()
    expect(screen.getByTestId('settlement')).toHaveTextContent('1')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'Alpha: Workbench stopped. The project remains registered.'
    )
    expect(screen.getByTestId('focus')).toHaveTextContent('a')
    expect(screen.getByTestId('focus-target')).toHaveTextContent('stop')
    expect(screen.getByTestId('projects')).toHaveTextContent(
      'a:Alpha:/fixtures/a:1|b:Beta:/fixtures/b:2'
    )
  })

  it('treats already-stopped as a successful settlement', async () => {
    const transport = vi.fn<RuntimeStopTransport>().mockResolvedValue({
      kind: 'success',
      id: 'a',
      outcome: 'already-stopped',
    })
    await ready(transport)
    fireEvent.click(screen.getByText('stop-a'))
    await act(async () => undefined)
    expect(screen.getByTestId('settlement')).toHaveTextContent('1')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'Alpha: Workbench was already stopped.'
    )
  })

  it.each(RUNTIME_STOP_ERROR_CATEGORIES)(
    'keeps metadata and makes %s retryable',
    async (category) => {
      const transport = vi
        .fn<RuntimeStopTransport>()
        .mockResolvedValue({ kind: 'failure', category })
      await ready(transport)
      fireEvent.click(screen.getByText('stop-a'))
      await act(async () => undefined)
      expect(screen.getByTestId('stop-phase')).toHaveTextContent('retry')
      expect(screen.getByTestId('stop-category')).toHaveTextContent(category)
      expect(screen.getByTestId('announcement')).toHaveTextContent(
        RUNTIME_STOP_NOTICES[category]
      )
      expect(screen.getByTestId('settlement')).toHaveTextContent('0')
      expect(screen.getByTestId('projects')).toHaveTextContent(
        'a:Alpha:/fixtures/a:1|b:Beta:/fixtures/b:2'
      )
    }
  )

  it('enters explicit unknown without assuming success', async () => {
    const transport = vi
      .fn<RuntimeStopTransport>()
      .mockResolvedValue({ kind: 'unknown' })
    await ready(transport)
    fireEvent.click(screen.getByText('stop-a'))
    await act(async () => undefined)
    expect(screen.getByTestId('stop-phase')).toHaveTextContent('unknown')
    expect(screen.getByTestId('settlement')).toHaveTextContent('0')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'Stop outcome unknown'
    )
  })

  it('refuses Close while a stop owns the Home request slot', async () => {
    const request = deferred<RuntimeStopTransportResult>()
    const transport = vi.fn<RuntimeStopTransport>(() => request.promise)
    const close = vi.fn()
    await ready(transport, close)
    fireEvent.click(screen.getByText('stop-a'))
    fireEvent.click(screen.getByText('close-b'))
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByTestId('stop-phase')).toHaveTextContent('pending')
  })

  it('discards a settlement after unmount and aborts its owner', async () => {
    const request = deferred<RuntimeStopTransportResult>()
    let signal: AbortSignal | undefined
    const transport = vi.fn<RuntimeStopTransport>((_id, ownerSignal) => {
      signal = ownerSignal
      return request.promise
    })
    const view = await ready(transport)
    fireEvent.click(screen.getByText('stop-a'))
    view.unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () =>
      request.resolve({ kind: 'success', id: 'a', outcome: 'stopped' })
    )
    expect(view.container).toBeEmptyDOMElement()
  })
})
