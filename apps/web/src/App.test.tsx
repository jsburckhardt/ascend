import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import type { Project, ProjectLoader } from './projects'

const projects: Project[] = [
  {
    id: 'project-alpha',
    name: 'Alpha Project',
    canonicalPath: '/projects/alpha',
    createdAt: 1,
  },
  {
    id: 'project-special',
    name: 'Markup <script> Project',
    canonicalPath:
      '  /very long/project path/with  internal spaces/<script>alert(1)</script>/and trailing  ',
    createdAt: 2,
  },
]

afterEach(() => cleanup())

describe('Project Home', () => {
  it('announces loading and starts exactly one request per mount', () => {
    const loader = vi.fn(() => new Promise<Project[]>(() => undefined))
    render(<App loadProjectList={loader} />)
    expect(loader).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading registered projects'
    )
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('explains the empty state without a registration control', async () => {
    render(<App loadProjectList={async () => []} />)
    expect(
      await screen.findByRole('heading', { name: 'No registered projects' })
    ).toBeVisible()
    expect(
      screen.getByText('Registered projects will appear here on Project Home.')
    ).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows one actionable failure and retries with one new bounded request', async () => {
    const loader = vi
      .fn<ProjectLoader>()
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce([projects[0]!])
    render(<App loadProjectList={loader} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveAccessibleName('Projects could not be loaded')
    expect(
      within(alert).getByText(/Check that the Ascend API is running/)
    ).toBeVisible()
    const retry = within(alert).getByRole('button', { name: 'Retry' })
    fireEvent.click(retry)

    expect(
      await screen.findByRole('heading', { name: 'Alpha Project' })
    ).toBeVisible()
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('renders every project identity and exact path as inert text', async () => {
    const { container } = render(<App loadProjectList={async () => projects} />)
    const list = await screen.findByRole('list', {
      name: 'Registered projects',
    })
    const cards = within(list).getAllByRole('listitem')
    expect(cards).toHaveLength(projects.length)

    const buttons = within(list).getAllByRole('button')
    expect(buttons.map((button) => button.dataset.projectId)).toEqual(
      projects.map(({ id }) => id)
    )
    for (const [index, project] of projects.entries()) {
      expect(
        within(list).getByRole('heading', { name: project.name })
      ).toBeVisible()
      const pathText = cards[index]?.querySelector('p[title]')
      expect(pathText?.textContent).toBe(project.canonicalPath)
      expect(pathText).toHaveAttribute('title', project.canonicalPath)
    }
    expect(container.querySelector('script')).toBeNull()
  })

  it('keeps Open keyboard-focusable, identified, idempotent, and effect-free', async () => {
    const loader = vi.fn(async () => projects)
    const initialUrl = window.location.href
    render(<App loadProjectList={loader} />)
    const open = await screen.findByRole('button', {
      name: 'Open Alpha Project',
    })
    expect(open).toHaveAttribute('data-project-id', 'project-alpha')
    expect(open.tabIndex).toBe(0)
    open.focus()
    expect(open).toHaveFocus()

    fireEvent.click(open)
    fireEvent.click(open)
    fireEvent.click(open)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(
      'Alpha Project: Opening is not available in BL-007.'
    )
    expect(within(open.closest('li')!).getByRole('status')).toBe(status)
    expect(loader).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe(initialUrl)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /register|close|search|sort/i })
    ).not.toBeInTheDocument()
  })

  it('does not update after unmount', async () => {
    let resolve!: (value: Project[]) => void
    let signal: AbortSignal | undefined
    const loader = vi.fn<ProjectLoader>(
      (ownedSignal) =>
        new Promise<Project[]>((resolvePromise) => {
          signal = ownedSignal
          resolve = resolvePromise
        })
    )
    const view = render(<App loadProjectList={loader} />)
    view.unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => resolve(projects))
    await waitFor(() => expect(view.container).toBeEmptyDOMElement())
  })
})
