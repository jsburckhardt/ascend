/// <reference types='node' />
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BL014_FIXTURES,
  BL014_OPEN_REENTRY_ORDER,
} from '../../api/src/session-switching-contract'
import { App } from './App'

const projects = BL014_FIXTURES.map((fixture, index) => ({
  id: fixture.id,
  name: fixture.name,
  canonicalPath: '/fixture/' + fixture.key,
  createdAt: index + 1,
}))

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('BL-014 keyboard Home and history matrix', () => {
  it('lists A/B/C once, exposes Open/Close only, and executes five keyboard Opens', async () => {
    const urls: string[] = []
    const focus: string[] = []
    for (const key of BL014_OPEN_REENTRY_ORDER) {
      cleanup()
      render(
        <App
          loadProjectList={async () => projects}
          navigateToWorkbench={(url) => urls.push(url)}
        />
      )
      const fixture = BL014_FIXTURES.find((row) => row.key === key)!
      const open = await screen.findByRole('button', {
        name: 'Open ' + fixture.name,
      })
      open.focus()
      focus.push(open.getAttribute('aria-label') ?? open.textContent ?? '')
      await userEvent.setup().keyboard('{Enter}')
    }
    expect(urls).toEqual(
      BL014_OPEN_REENTRY_ORDER.map(
        (key) =>
          '/projects/' +
          BL014_FIXTURES.find((fixture) => fixture.key === key)!.id +
          '/workbench/'
      )
    )
    expect(focus).toEqual(
      BL014_OPEN_REENTRY_ORDER.map(
        (key) =>
          'Open ' + BL014_FIXTURES.find((fixture) => fixture.key === key)!.name
      )
    )

    cleanup()
    render(<App loadProjectList={async () => projects} />)
    for (const project of projects) {
      expect(await screen.findAllByText(project.name)).toHaveLength(1)
      expect(
        screen.getByRole('button', { name: 'Open ' + project.name })
      ).toBeVisible()
      expect(
        screen.getByRole('button', { name: 'Close ' + project.name })
      ).toBeVisible()
    }
    expect(
      screen.queryByRole('button', { name: /Stop|Restart/u })
    ).not.toBeInTheDocument()
  }, 15_000)

  it('keeps one native Back/Forward pair separate from Open counts', () => {
    const listener = vi.fn()
    window.addEventListener('popstate', listener)
    window.history.pushState(null, '', '/projects/bl014-a/workbench/')
    window.history.pushState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.history.replaceState(null, '', '/projects/bl014-a/workbench/')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(listener).toHaveBeenCalledTimes(2)
    expect(window.location.pathname).toBe('/projects/bl014-a/workbench/')
    window.removeEventListener('popstate', listener)
  })
})
