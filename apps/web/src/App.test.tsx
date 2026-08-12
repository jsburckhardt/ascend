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
const gamma: Project = {
  id: 'project-gamma',
  name: 'Gamma Project',
  canonicalPath: '/projects/gamma',
  createdAt: 3,
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
      const buttons = within(list).getAllByRole('button', { name: /^Open /u })
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

  it('renders inert identity and navigates by stable ID for keyboard activation', async () => {
    const navigate = vi.fn()
    const { container } = render(
      <App
        loadProjectList={async () => [beta]}
        navigateToWorkbench={navigate}
      />
    )
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
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/projects/project-beta/workbench/')
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Beta <script> Project: Opening workbench.'
    )
  })

  it('tabs from the focused Home heading to a maximum inert identity Open action', async () => {
    const stableId = 'p' + 'x'.repeat(127)
    const quote = String.fromCharCode(34)
    const metacharacter =
      '<img src=x onerror=alert(1)> & ' + quote + 'quoted' + quote
    const longProject: Project = {
      id: stableId,
      name: (metacharacter + 'N'.repeat(4_096)).slice(0, 4_096),
      canonicalPath: ('/' + metacharacter + 'P'.repeat(4_096)).slice(0, 4_096),
      createdAt: 4,
    }
    const navigate = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <App
        loadProjectList={async () => [longProject]}
        navigateToWorkbench={navigate}
      />
    )
    const heading = await screen.findByRole('heading', { name: 'Ascend' })
    await waitFor(() => expect(heading).toHaveFocus())
    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Host path' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Open Project' })).toHaveFocus()
    await user.tab()
    const open = screen.getByRole('button', {
      name: 'Open ' + longProject.name,
    })
    expect(open).toHaveFocus()
    expect(open.className).toContain('focus-visible:outline')
    expect(container.querySelector('img')).toBeNull()
    expect(open.closest('li')).toHaveTextContent(longProject.name)
    expect(open.closest('li')).toHaveTextContent(longProject.canonicalPath)
    await user.keyboard('{Enter}')
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        '/projects/' + encodeURIComponent(stableId) + '/workbench/'
      )
    )
  })

  it('joins exactly eight repeated activations into one navigation generation', async () => {
    const navigate = vi.fn()
    render(
      <App
        loadProjectList={async () => [alpha]}
        navigateToWorkbench={navigate}
      />
    )
    const open = await screen.findByRole('button', {
      name: 'Open Alpha Project',
    })
    open.focus()
    for (let index = 0; index < 8; index += 1) fireEvent.click(open)
    expect(open).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Alpha Project: Opening workbench.'
    )
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce())
    expect(navigate).toHaveBeenCalledWith('/projects/project-alpha/workbench/')
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

  it.each(['created', 'existing'] as const)(
    'completes exact %s retry reconciliation with card focus and request counts',
    async (disposition) => {
      const register = vi
        .fn<RegistrationTransport>()
        .mockResolvedValueOnce({ kind: 'unknown' })
        .mockResolvedValueOnce({ kind: 'success', disposition, project: beta })
      const loader = await ready(register)
      await submitPath('/retry exact')
      await userEvent
        .setup()
        .click(
          await screen.findByRole('button', { name: 'Retry same submission' })
        )
      const betaOpen = await screen.findByRole('button', {
        name: 'Open Beta <script> Project',
      })
      await waitFor(() => expect(betaOpen).toHaveFocus())
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
      expect(screen.getByRole('textbox', { name: 'Host path' })).toHaveValue(
        '/retry exact'
      )
      expect(screen.getByRole('status')).toHaveTextContent(
        disposition === 'created'
          ? 'Project created'
          : 'Project already registered'
      )
      expect(register).toHaveBeenCalledTimes(2)
      expect(register.mock.calls[0]?.[0]).toBe(register.mock.calls[1]?.[0])
      expect(loader).toHaveBeenCalledOnce()
    }
  )

  it('cancels a retry to the same locked recovery state and ignores its stale focused-card success', async () => {
    const retry = deferred<RegistrationTransportResult>()
    const register = vi
      .fn<RegistrationTransport>()
      .mockResolvedValueOnce({ kind: 'unknown' })
      .mockImplementationOnce(() => retry.promise)
    const loader = await ready(register)
    await submitPath('/retry cancel')
    await userEvent
      .setup()
      .click(
        await screen.findByRole('button', { name: 'Retry same submission' })
      )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    const input = screen.getByRole('textbox', { name: 'Host path' })
    expect(input).toHaveValue('/retry cancel')
    expect(input).toHaveAttribute('readonly')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Retry cancelled')
    const recovery = screen.getByRole('group', {
      name: 'Submission outcome unknown recovery',
    })
    expect(within(recovery).getAllByRole('button')).toHaveLength(2)
    await act(async () =>
      retry.resolve({ kind: 'success', disposition: 'created', project: beta })
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(input).toHaveValue('/retry cancel')
    expect(screen.getByRole('status')).toHaveTextContent('Retry cancelled')
    expect(
      screen.queryByRole('button', { name: 'Open Beta <script> Project' })
    ).not.toBeInTheDocument()
    expect(register).toHaveBeenCalledTimes(2)
    expect(loader).toHaveBeenCalledOnce()
  })

  it.each([
    ['zero', [alpha], 'No new project was observed'],
    ['one', [alpha, beta], 'Project reconciled'],
    ['many', [alpha, beta, gamma], 'reconciliation is ambiguous'],
  ] as const)(
    'renders exact %s-addition refresh cards, input, focus, announcement, and counts',
    async (kind, refreshed, announcement) => {
      const loader = vi
        .fn<ProjectLoader>()
        .mockResolvedValueOnce([alpha])
        .mockResolvedValueOnce([...refreshed])
      const register = vi
        .fn<RegistrationTransport>()
        .mockResolvedValue({ kind: 'unknown' })
      render(<App loadProjectList={loader} registerProject={register} />)
      await screen.findByRole('textbox', { name: 'Host path' })
      await submitPath('/refresh exact')
      await userEvent
        .setup()
        .click(await screen.findByRole('button', { name: 'Refresh projects' }))
      await waitFor(() => expect(loader).toHaveBeenCalledTimes(2))
      expect(screen.getAllByRole('listitem')).toHaveLength(refreshed.length)
      const input = screen.getByRole('textbox', { name: 'Host path' })
      expect(input).toHaveValue('/refresh exact')
      expect(screen.getByRole('status')).toHaveTextContent(announcement)
      expect(register).toHaveBeenCalledOnce()
      if (kind === 'zero') {
        expect(input).not.toHaveAttribute('readonly')
        await waitFor(() => expect(input).toHaveFocus())
      } else if (kind === 'one') {
        await waitFor(() =>
          expect(
            screen.getByRole('button', {
              name: 'Open Beta <script> Project',
            })
          ).toHaveFocus()
        )
      } else {
        expect(input).toHaveAttribute('readonly')
        expect(
          screen.getByRole('button', { name: 'Reset recovery' })
        ).toBeEnabled()
        expect(
          screen
            .getAllByRole('button', { name: /^Open /u })
            .some((button) => button === document.activeElement)
        ).toBe(false)
      }
    }
  )

  it('preserves locked input, cards, focus, announcement, and request counts after failed refresh', async () => {
    const loader = vi
      .fn<ProjectLoader>()
      .mockResolvedValueOnce([alpha])
      .mockRejectedValueOnce(new Error('invalid or failed list'))
    const register = vi
      .fn<RegistrationTransport>()
      .mockResolvedValue({ kind: 'unknown' })
    render(<App loadProjectList={loader} registerProject={register} />)
    await screen.findByRole('textbox', { name: 'Host path' })
    await submitPath('/refresh failure')
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Refresh projects' }))
    await screen.findByRole('group', {
      name: 'Submission outcome unknown recovery',
    })
    const input = screen.getByRole('textbox', { name: 'Host path' })
    expect(input).toHaveValue('/refresh failure')
    expect(input).toHaveAttribute('readonly')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Refresh failed')
    expect(
      screen.getByRole('button', { name: 'Open Alpha Project' })
    ).not.toHaveFocus()
    expect(register).toHaveBeenCalledOnce()
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
