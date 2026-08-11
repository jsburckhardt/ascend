import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import {
  REGISTRATION_FAILURE_MESSAGES,
  type Project,
  type ProjectLoader,
  type RegistrationTransport,
  type RegistrationTransportResult,
} from './projects'

const alpha: Project = {
  id: 'project-alpha',
  name: 'Alpha Project',
  canonicalPath: '/projects/alpha',
  createdAt: 2,
}
const beta: Project = {
  id: 'project-beta',
  name: 'Beta <script> Project',
  canonicalPath: '  /projects/<script>/beta  ',
  createdAt: 1,
}

interface Deferred<T> {
  promise: Promise<T>
  resolve(value: T): void
}
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
})
afterEach(() => cleanup())

async function ready(
  register?: RegistrationTransport,
  projects: Project[] = [alpha]
) {
  const loader = vi.fn<ProjectLoader>().mockResolvedValue(projects)
  render(<App loadProjectList={loader} registerProject={register} />)
  await screen.findByRole('textbox', { name: 'Host path' })
  return loader
}

async function submitPath(path: string): Promise<void> {
  const user = userEvent.setup()
  const input = screen.getByRole('textbox', { name: 'Host path' })
  await user.clear(input)
  await user.type(input, path)
  await user.click(screen.getByRole('button', { name: 'Open Project' }))
}

describe('Project Home open interaction', () => {
  it('loads once and renders a persistent semantic host-path form and empty guidance', async () => {
    const loader = vi.fn<ProjectLoader>().mockResolvedValue([])
    render(<App loadProjectList={loader} />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading registered projects'
    )
    const input = await screen.findByRole('textbox', { name: 'Host path' })
    expect(input).toHaveAccessibleDescription(
      'Enter an absolute host directory, ~, or a path beginning with ~/.'
    )
    expect(
      screen.getByRole('heading', { name: 'No registered projects' })
    ).toBeVisible()
    expect(
      screen.getByText('Open an existing host directory to register it.')
    ).toBeVisible()
    expect(loader).toHaveBeenCalledOnce()
  })

  it.each(['', '   '])(
    'keeps blank input, associates its error, focuses correction, and sends nothing: %j',
    async (path) => {
      const register = vi.fn<RegistrationTransport>()
      await ready(register, [])
      const input = screen.getByRole('textbox', { name: 'Host path' })
      fireEvent.change(input, { target: { value: path } })
      fireEvent.submit(input.closest('form')!)
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('Enter a host path')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute(
        'aria-describedby',
        expect.stringContaining('host-path-error')
      )
      expect(input).toHaveValue(path)
      expect(input).toHaveFocus()
      expect(register).not.toHaveBeenCalled()
    }
  )

  it.each(Object.entries(REGISTRATION_FAILURE_MESSAGES))(
    'renders typed %s as a preserved associated correction',
    async (category, message) => {
      const register = vi.fn<RegistrationTransport>().mockResolvedValue({
        kind: 'failure',
        category: category as keyof typeof REGISTRATION_FAILURE_MESSAGES,
      })
      await ready(register)
      await submitPath('/exact host path')
      const input = screen.getByRole('textbox', { name: 'Host path' })
      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      expect(input).toHaveValue('/exact host path')
      expect(input).toHaveFocus()
      expect(screen.getAllByRole('listitem')).toHaveLength(1)
    }
  )

  it.each(['created', 'existing'] as const)(
    'upserts, sorts, scrolls, focuses, and announces %s by stable ID',
    async (disposition) => {
      const register = vi
        .fn<RegistrationTransport>()
        .mockResolvedValue({ kind: 'success', disposition, project: beta })
      await ready(register)
      await submitPath('/projects/beta')
      const list = await screen.findByRole('list', {
        name: 'Registered projects',
      })
      const buttons = within(list).getAllByRole('button')
      expect(buttons.map((button) => button.dataset.projectId)).toEqual([
        'project-beta',
        'project-alpha',
      ])
      const betaButton = within(list).getByRole('button', {
        name: 'Open Beta <script> Project',
      })
      await waitFor(() => expect(betaButton).toHaveFocus())
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
        block: 'nearest',
      })
      expect(screen.getByRole('status')).toHaveTextContent(
        disposition === 'created'
          ? 'Project created'
          : 'Project already registered'
      )
      expect(register).toHaveBeenCalledOnce()
    }
  )

  it('offers active Cancel, blocks repeated submission, and ignores late ordinary success', async () => {
    const request = deferred<RegistrationTransportResult>()
    const register = vi.fn<RegistrationTransport>(() => request.promise)
    await ready(register)
    await submitPath('/pending')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: 'Open Project' })
    ).not.toBeInTheDocument()
    fireEvent.submit(
      screen.getByRole('textbox', { name: 'Host path' }).closest('form')!
    )
    expect(register).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await act(async () =>
      request.resolve({
        kind: 'success',
        disposition: 'created',
        project: beta,
      })
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('textbox', { name: 'Host path' })).toHaveValue(
      '/pending'
    )
  })

  it('locks and exposes exact unknown payload with only retry and refresh recovery actions', async () => {
    const register = vi
      .fn<RegistrationTransport>()
      .mockResolvedValue({ kind: 'unknown' })
    await ready(register)
    await submitPath('  ~/unknown <script>  ')
    const input = screen.getByRole('textbox', { name: 'Host path' })
    await waitFor(() => expect(input).toHaveAttribute('readonly'))
    const payload = JSON.stringify({ path: '  ~/unknown <script>  ' })
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'CODE' && element.textContent === payload
      )
    ).toBeVisible()
    const group = screen.getByRole('group', {
      name: 'Submission outcome unknown recovery',
    })
    expect(
      within(group)
        .getAllByRole('button')
        .map(({ textContent }) => textContent)
    ).toEqual(['Retry same submission', 'Refresh projects'])
    expect(
      screen.queryByRole('button', { name: 'Open Project' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Submission outcome unknown'
    )
  })

  it('renders path and project metacharacters as inert text and keeps Open deferred', async () => {
    const initialUrl = window.location.href
    const { container } = render(<App loadProjectList={async () => [beta]} />)
    const open = await screen.findByRole('button', {
      name: 'Open Beta <script> Project',
    })
    expect(open).toHaveAttribute('data-project-id', 'project-beta')
    expect(container.querySelector('script')).toBeNull()
    expect(open.closest('li')?.querySelector('p[title]')?.textContent).toBe(
      beta.canonicalPath
    )
    open.focus()
    await userEvent.setup().keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Opening the workbench is not available yet'
    )
    expect(window.location.href).toBe(initialUrl)
  })

  it('aborts ownership on unmount and ignores late completion', async () => {
    const list = deferred<Project[]>()
    let signal: AbortSignal | undefined
    const loader: ProjectLoader = (ownedSignal) => {
      signal = ownedSignal
      return list.promise
    }
    const view = render(<App loadProjectList={loader} />)
    view.unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => list.resolve([alpha]))
    expect(view.container).toBeEmptyDOMElement()
  })
})
