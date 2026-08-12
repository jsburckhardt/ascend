/// <reference types="node" />
import { cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWorkbenchNavigationShell } from '../../api/src/workbench-navigation-shell'

const response = (code: string) =>
  Promise.resolve({
    ok: false,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ error: { code } }),
  } as Response)

const executeShell = (): void => {
  const html = renderWorkbenchNavigationShell()
  const match = /<script>([\s\S]+)<\/script>/u.exec(html)
  if (match?.[1] === undefined)
    throw new Error('Missing workbench shell script')
  document.open()
  document.write(html.replace(/<script>[\s\S]+<\/script>/u, ''))
  document.close()
  if (
    document.body === null ||
    !document.body.textContent?.includes('Opening workbench')
  )
    throw new Error(
      'Shell document setup failed: ' + document.documentElement.outerHTML
    )
  window.eval(match[1])
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
  document.documentElement.innerHTML = '<head></head><body></body>'
})

describe('workbench shell browser behavior', () => {
  it('renders unknown identity at the unchanged URL with Projects and no Retry', async () => {
    window.history.replaceState(null, '', '/projects/unknown/workbench/')
    const fetcher = vi.fn(() => response('project_not_found'))
    vi.stubGlobal('fetch', fetcher)
    executeShell()
    const heading = await within(document.body).findByRole('heading', {
      name: 'Workbench unavailable',
    })
    expect(window.location.pathname).toBe('/projects/unknown/workbench/')
    expect(
      within(document.body).getByText('Project is not registered.')
    ).toBeVisible()
    expect(
      within(document.body).getByRole('link', { name: 'Projects' })
    ).toHaveAttribute('href', '/')
    expect(
      within(document.body).queryByRole('button', { name: 'Retry' })
    ).toBeNull()
    expect(heading).toHaveFocus()
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('retries one newer generation without adding history', async () => {
    window.history.replaceState(null, '', '/projects/stable/workbench/')
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => response('workbench_start_failed'))
      .mockImplementationOnce(() =>
        response('workbench_upstream_connect_failed')
      )
    vi.stubGlobal('fetch', fetcher)
    const historyLength = window.history.length
    executeShell()
    const retry = await within(document.body).findByRole('button', {
      name: 'Retry',
    })
    retry.click()
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    expect(
      await within(document.body).findByText(
        'Workbench upstream connection failed.'
      )
    ).toBeVisible()
    expect(window.location.pathname).toBe('/projects/stable/workbench/')
    expect(window.history.length).toBe(historyLength)
    expect(
      within(document.body).getByRole('heading', {
        name: 'Workbench unavailable',
      })
    ).toHaveFocus()
    within(document.body).getByRole('button', { name: 'Retry' }).focus()
    await userEvent.setup({ document }).tab()
    expect(
      within(document.body).getByRole('link', { name: 'Projects' })
    ).toHaveFocus()
  })

  it('keeps pending status accessible and suppresses stale success and failure generations', async () => {
    window.history.replaceState(null, '', '/projects/stable/workbench/')
    let resolveSuccess!: (value: Response) => void
    let resolveFailure!: (value: Response) => void
    const staleSuccess = new Promise<Response>((resolve) => {
      resolveSuccess = resolve
    })
    const staleFailure = new Promise<Response>((resolve) => {
      resolveFailure = resolve
    })
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => response('workbench_start_failed'))
      .mockImplementationOnce(() => staleSuccess)
      .mockImplementationOnce(() => staleFailure)
      .mockImplementationOnce(() =>
        response('workbench_upstream_connect_failed')
      )
    vi.stubGlobal('fetch', fetcher)

    executeShell()
    const retry = await within(document.body).findByRole('button', {
      name: 'Retry',
    })
    retry.click()
    expect(within(document.body).getByRole('status')).toHaveTextContent(
      'The selected project workbench is loading.'
    )
    retry.click()
    retry.click()
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4))
    await within(document.body).findByText(
      'Workbench upstream connection failed.'
    )

    resolveSuccess({
      ok: true,
      url: 'http://ascend.test/projects/stable/workbench/',
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html><body>Stale success</body></html>',
    } as Response)
    resolveFailure(await response('workbench_upstream_reset'))
    await new Promise((resolve) => window.setTimeout(resolve, 0))

    expect(document.body).toHaveTextContent(
      'Workbench upstream connection failed.'
    )
    expect(document.body).not.toHaveTextContent('Stale success')
    expect(window.location.pathname).toBe('/projects/stable/workbench/')
    expect(
      within(document.body).getByRole('heading', {
        name: 'Workbench unavailable',
      })
    ).toHaveFocus()
  })

  it('preserves the acquired folder and CSP without adding its query to the stable URL', async () => {
    window.history.replaceState(null, '', '/projects/stable/workbench/')
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            url: 'http://ascend.test/projects/stable/workbench/?folder=%2Fsafe%2Fproject',
            headers: new Headers({
              'content-type': 'text/html; charset=utf-8',
              'content-security-policy':
                "default-src 'self'; style-src 'unsafe-inline'",
            }),
            text: async () =>
              '<!doctype html><html><head><meta id="vscode-workbench-web-configuration" data-settings="{&quot;remoteAuthority&quot;:&quot;remote&quot;}"></head><body><main>Native workbench</main></body></html>',
          }) as Response
      )
    )

    executeShell()
    await waitFor(() =>
      expect(document.body).toHaveTextContent('Native workbench')
    )

    expect(window.location.pathname).toBe('/projects/stable/workbench/')
    expect(window.location.search).toBe('')
    expect(
      within(document.body).getByRole('link', { name: 'Projects' })
    ).toHaveAttribute('href', '/')
    const settings = JSON.parse(
      document
        .querySelector('#vscode-workbench-web-configuration')
        ?.getAttribute('data-settings') ?? '{}'
    ) as { folderUri?: Record<string, string> }
    expect(settings.folderUri).toEqual({
      scheme: 'vscode-remote',
      authority: 'remote',
      path: '/safe/project',
      query: '',
      fragment: '',
    })
    expect(
      document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    ).toHaveAttribute(
      'content',
      "default-src 'self'; style-src 'unsafe-inline'"
    )
  })

  it('revisits retained failure state without an implicit acquisition', async () => {
    window.history.replaceState(
      {
        ascendWorkbenchFailure: {
          message: 'Workbench could not start.',
          retry: true,
        },
      },
      '',
      '/projects/stable/workbench/'
    )
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    executeShell()
    expect(
      await within(document.body).findByText('Workbench could not start.')
    ).toBeVisible()
    expect(fetcher).not.toHaveBeenCalled()
    expect(
      within(document.body).getByRole('button', { name: 'Retry' })
    ).toBeVisible()
  })

  it.each(['success', 'failure'] as const)(
    'invalidates stale %s settlement after newer Home ownership',
    async (settlement) => {
      window.history.replaceState(null, '', '/projects/stable/workbench/')
      let settle!: (value: Response) => void
      const pending = new Promise<Response>((resolve) => {
        settle = resolve
      })
      vi.stubGlobal(
        'fetch',
        vi.fn(() => pending)
      )
      executeShell()
      expect(
        within(document.body).getByRole('heading', {
          name: 'Opening workbench',
        })
      ).toHaveFocus()
      const projects = within(document.body).getByRole('link', {
        name: 'Projects',
      })
      projects.addEventListener('click', (event) => event.preventDefault())
      projects.click()
      window.history.replaceState(null, '', '/')
      document.body.innerHTML =
        '<main><h1 tabindex="-1">Ascend</h1><article>Stable project card</article><p role="status">Home owns this surface.</p></main>'
      const homeHeading = within(document.body).getByRole('heading', {
        name: 'Ascend',
      })
      homeHeading.focus()
      const before = document.body.innerHTML
      settle(
        settlement === 'success'
          ? ({
              ok: true,
              url: 'http://ascend.test/projects/stable/workbench/',
              headers: new Headers({ 'content-type': 'text/html' }),
              text: async () => '<html><body>Stale success</body></html>',
            } as Response)
          : await response('workbench_upstream_reset')
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
      expect(window.location.pathname).toBe('/')
      expect(document.body.innerHTML).toBe(before)
      expect(homeHeading).toHaveFocus()
      expect(within(document.body).getByRole('status')).toHaveTextContent(
        'Home owns this surface.'
      )
      expect(document.body).not.toHaveTextContent('Stale success')
      expect(
        within(document.body).getByText('Stable project card')
      ).toBeVisible()
    }
  )
})
