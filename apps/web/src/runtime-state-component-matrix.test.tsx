import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  BL016_SCENARIOS,
  type Bl016Scenario,
} from '../../api/src/runtime-state-evidence'
import { App } from './App'
import type { Project } from './projects'
import type { PublicRuntimeState, RuntimeReport } from './runtime-state'

const project: Project = {
  id: 'matrix-project',
  name: 'Matrix project',
  canonicalPath: '/matrix/project',
  createdAt: 1,
}

/**
 * The first render of a coverage-instrumented file under parallel workers can
 * be starved past Testing Library's 1,000 ms default while the projection
 * settles. Both bounds stay finite: each wait fails inside SETTLED_WAIT_MS and
 * every scenario still fails inside SCENARIO_TIMEOUT_MS.
 */
const SETTLED_WAIT_MS = 5_000
const SCENARIO_TIMEOUT_MS = 15_000

const expectedStates: Readonly<Record<Bl016Scenario, PublicRuntimeState>> = {
  'stopped-registered': 'Stopped',
  'starting-delayed-readiness': 'Starting',
  'running-observed-readiness': 'Running',
  'failed-start-before-readiness': 'Failed',
  'failed-post-readiness-exit': 'Failed',
  'failed-health-observation': 'Failed',
  'failed-false-liveness': 'Failed',
  'failed-transition-race': 'Failed',
  'cross-project-isolation': 'Failed',
  'event-consistency': 'Running',
}

function reportFor(scenario: Bl016Scenario): RuntimeReport {
  const state = expectedStates[scenario]
  return state === 'Failed'
    ? {
        id: project.id,
        state,
        failureCategory:
          scenario === 'failed-health-observation' ||
          scenario === 'failed-transition-race'
            ? 'health-status-unexpected'
            : scenario === 'cross-project-isolation'
              ? 'early-exit-signal'
              : scenario === 'failed-start-before-readiness'
                ? 'spawn-error'
                : 'early-exit-code',
      }
    : { id: project.id, state }
}

afterEach(() => cleanup())

describe('BL-016 Project Home surface matrix', () => {
  it.each(BL016_SCENARIOS)(
    'renders reconciled home state for %s',
    async (scenario) => {
      const report = reportFor(scenario)
      render(
        <App
          loadProjectList={async () => [project]}
          loadRuntimeStates={async () => [report]}
        />
      )

      await screen.findByLabelText('Runtime state summary', undefined, {
        timeout: SETTLED_WAIT_MS,
      })
      const stateElement = document.querySelector(
        `[data-runtime-state="${report.state}"]`
      )
      expect(stateElement).not.toBeNull()
      expect(stateElement).toHaveTextContent('Runtime state: ' + report.state)
      expect(document.querySelectorAll('[data-runtime-state]')).toHaveLength(1)
      expect(document.querySelector('[data-runtime-unavailable]')).toBeNull()
      if (report.state === 'Failed') {
        expect(
          document.querySelector('[data-runtime-failure]')
        ).toHaveAttribute('data-runtime-failure', report.failureCategory)
      } else {
        expect(document.querySelector('[data-runtime-failure]')).toBeNull()
      }
      expect(
        screen.getByRole('button', {
          name: 'Stop Matrix project workbench',
        })
      ).toBeVisible()
      const restart = screen.queryByRole('button', {
        name: 'Restart Matrix project workbench',
      })
      if (report.state === 'Running' || report.state === 'Failed') {
        expect(restart).toBeVisible()
      } else {
        expect(restart).toBeNull()
      }
    },
    SCENARIO_TIMEOUT_MS
  )

  it(
    'preserves an independently Running peer when the matrix project is Failed',
    async () => {
      const peer: Project = {
        id: 'peer-project',
        name: 'Peer project',
        canonicalPath: '/matrix/peer',
        createdAt: 2,
      }
      render(
        <App
          loadProjectList={async () => [project, peer]}
          loadRuntimeStates={async () => [
            reportFor('failed-post-readiness-exit'),
            { id: peer.id, state: 'Running' },
          ]}
        />
      )

      await screen.findByLabelText('Runtime state summary', undefined, {
        timeout: SETTLED_WAIT_MS,
      })
      const peerCard = screen
        .getByRole('button', { name: 'Open Peer project' })
        .closest('li')!
      expect(
        peerCard.querySelector('[data-runtime-state="Running"]')
      ).not.toBeNull()
      expect(peerCard.querySelector('[data-runtime-failure]')).toBeNull()
    },
    SCENARIO_TIMEOUT_MS
  )
})
