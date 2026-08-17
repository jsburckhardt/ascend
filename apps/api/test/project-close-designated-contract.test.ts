/// <reference types="node" />
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  BL020_DECLARED_COUNTS,
  BL020_EPISODES,
  BL020_EPISODE_PHASES,
  BL020_EPISODE_TEARDOWN_ACTIONS,
  classifyCloseEpisodeArtifact,
  deriveCloseEpisodeReceipt,
  deriveCloseTeardownReceipt,
  serializeProjectCloseEpisode,
  validateProjectCloseEpisode,
  type CloseEpisodeRecord,
  type ProjectCloseEpisodeArtifact,
} from '../src/project-close-evidence.js'

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
)

const RETAINED_EPISODE_PATH = path.join(
  REPOSITORY_ROOT,
  'project/work-items/45-bl-020-close-a-running-or-failed-project/implementation/evidence/designated-episode.json'
)

const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

const committed = (): ProjectCloseEpisodeArtifact =>
  JSON.parse(
    readFileSync(RETAINED_EPISODE_PATH, 'utf8')
  ) as ProjectCloseEpisodeArtifact

/**
 * A negative control needs to place a value the contract refuses, which the
 * artifact's own types make unrepresentable. Writing through this one helper
 * keeps every control honest about that while the rest of the file stays typed.
 */
const writeInvalid = (target: object, key: string, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  })
}

/** Re-derives an episode's receipts so a control proves only its own defect. */
const reseal = (
  artifact: ProjectCloseEpisodeArtifact,
  episode: CloseEpisodeRecord
): void => {
  for (const action of episode.teardownActions) {
    const { receipt: _receipt, ...material } = action
    writeInvalid(
      action,
      'receipt',
      deriveCloseTeardownReceipt(
        episode.execution.executionId,
        material,
        digest
      )
    )
  }
  writeInvalid(
    episode.execution,
    'receipt',
    deriveCloseEpisodeReceipt(artifact.runId, episode, digest)
  )
}

const episodeOf = (
  artifact: ProjectCloseEpisodeArtifact,
  id: string
): CloseEpisodeRecord => {
  const episode = artifact.episodes.find((candidate) => candidate.id === id)
  if (episode === undefined)
    throw new Error('the committed artifact is missing episode ' + id)
  return episode
}

/** Applies one defect to a private copy of the committed artifact. */
const corrupt = (
  mutate: (artifact: ProjectCloseEpisodeArtifact) => void,
  options: { readonly reseal?: string } = {}
): ProjectCloseEpisodeArtifact => {
  const artifact = committed()
  mutate(artifact)
  if (options.reseal !== undefined)
    reseal(artifact, episodeOf(artifact, options.reseal))
  return artifact
}

describe('BL-020 designated episode contract', () => {
  it('accepts the committed designated artifact', () => {
    const artifact = committed()
    expect(validateProjectCloseEpisode(artifact, digest)).toEqual([])
    expect(classifyCloseEpisodeArtifact(artifact, digest)).toBe('usable')
    expect(artifact.episodes.map((episode) => episode.id)).toEqual([
      ...BL020_EPISODES,
    ])
    expect(artifact.episodesDeclared).toBe(BL020_DECLARED_COUNTS.episodes)
    expect(artifact.designatedEpisodesExecuted).toBe(
      BL020_DECLARED_COUNTS.episodes
    )
    expect(artifact.sources).toHaveLength(
      BL020_DECLARED_COUNTS.selectedSources +
        BL020_DECLARED_COUNTS.evidenceWriters
    )
    expect(artifact.phaseOrder).toEqual([...BL020_EPISODE_PHASES])
  })

  it('preserves the artifact through its own serializer', () => {
    const artifact = committed()
    const round = JSON.parse(
      serializeProjectCloseEpisode(artifact)
    ) as ProjectCloseEpisodeArtifact
    expect(validateProjectCloseEpisode(round, digest)).toEqual([])
  })

  it('refuses a static execution receipt', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(
        episodeOf(draft, 'E-1').execution,
        'receipt',
        'receipt-' + '0'.repeat(32)
      )
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-execution-receipt-not-derived'
    )
  })

  it('refuses a hand-assigned execution identifier', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(
        episodeOf(draft, 'E-2').execution,
        'executionId',
        'exec-' + '1'.repeat(16)
      )
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-execution-identifier-not-derived'
    )
  })

  it('refuses a malformed execution receipt', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(episodeOf(draft, 'E-3').execution, 'receipt', 'receipt-abc')
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-execution-receipt-invalid'
    )
  })

  it('refuses a fabricated teardown receipt', () => {
    const artifact = corrupt((draft) => {
      const action = episodeOf(draft, 'E-1').teardownActions[0]
      if (action === undefined) throw new Error('missing teardown action')
      writeInvalid(action, 'receipt', 'receipt-' + 'f'.repeat(32))
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-teardown-receipt-not-derived'
    )
  })

  it('refuses an execution receipt reused across episodes', () => {
    const artifact = corrupt((draft) => {
      const first = episodeOf(draft, 'E-1')
      writeInvalid(
        episodeOf(draft, 'E-2').execution,
        'receipt',
        first.execution.receipt
      )
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-execution-receipt-reused'
    )
  })

  it('refuses phases recorded out of the declared order', () => {
    const artifact = corrupt(
      (draft) => {
        const episode = episodeOf(draft, 'E-4')
        const phases = [...episode.phases]
        const fourth = phases[3]
        const fifth = phases[4]
        if (fourth === undefined || fifth === undefined)
          throw new Error('missing phases')
        phases[3] = fifth
        phases[4] = fourth
        writeInvalid(episode, 'phases', phases)
      },
      { reseal: 'E-4' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-phase-order-invalid'
    )
  })

  it('refuses a truncated phase record', () => {
    const artifact = corrupt(
      (draft) => {
        const episode = episodeOf(draft, 'E-5')
        writeInvalid(episode, 'phases', episode.phases.slice(0, 12))
      },
      { reseal: 'E-5' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-phase-order-invalid'
    )
  })

  it('refuses an unfinished phase', () => {
    const artifact = corrupt(
      (draft) => {
        const episode = episodeOf(draft, 'E-5')
        const phase = episode.phases[9]
        if (phase === undefined) throw new Error('missing phase')
        writeInvalid(phase, 'completed', false)
      },
      { reseal: 'E-5' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-phase-incomplete'
    )
  })

  it('refuses teardown performed before live resource evidence', () => {
    const artifact = corrupt(
      (draft) => {
        const episode = episodeOf(draft, 'E-1')
        const action = episode.teardownActions[0]
        if (action === undefined) throw new Error('missing teardown action')
        writeInvalid(action, 'startedAtMs', episode.live.startedAtMs - 1)
      },
      { reseal: 'E-1' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-teardown-precedes-live-evidence'
    )
  })

  it('refuses live evidence that was not captured before teardown', () => {
    const artifact = corrupt(
      (draft) => {
        writeInvalid(
          episodeOf(draft, 'E-2').live,
          'capturedBeforeTeardown',
          false
        )
      },
      { reseal: 'E-2' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-live-evidence-missing'
    )
  })

  it('refuses an inexact teardown action set', () => {
    const artifact = corrupt(
      (draft) => {
        const episode = episodeOf(draft, 'E-3')
        writeInvalid(
          episode,
          'teardownActions',
          episode.teardownActions.slice(
            0,
            BL020_EPISODE_TEARDOWN_ACTIONS.length - 1
          )
        )
      },
      { reseal: 'E-3' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-teardown-actions-inexact'
    )
  })

  it('refuses a teardown action with an empty target set', () => {
    const artifact = corrupt(
      (draft) => {
        const action = episodeOf(draft, 'E-3').teardownActions[1]
        if (action === undefined) throw new Error('missing teardown action')
        writeInvalid(action, 'targets', [])
      },
      { reseal: 'E-3' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-teardown-actions-inexact'
    )
  })

  it('refuses re-observation that is not independent of the executor', () => {
    const artifact = corrupt(
      (draft) => {
        writeInvalid(
          episodeOf(draft, 'E-6').reobservation,
          'distinctFromExecutor',
          false
        )
      },
      { reseal: 'E-6' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-reobservation-not-independent'
    )
  })

  it('refuses re-observation performed inside the executing process', () => {
    const artifact = corrupt(
      (draft) => {
        writeInvalid(
          episodeOf(draft, 'E-6').reobservation,
          'observer',
          'same-process'
        )
      },
      { reseal: 'E-6' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-reobservation-not-independent'
    )
  })

  it('refuses a re-observed residual', () => {
    const artifact = corrupt(
      (draft) => {
        const classes = episodeOf(draft, 'E-1').reobservation.classes
        writeInvalid(classes, 'listeners', {
          probeCompleted: true,
          residual: 1,
        })
      },
      { reseal: 'E-1' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-reobservation-not-clear'
    )
  })

  it('refuses an incomplete re-observation probe', () => {
    const artifact = corrupt(
      (draft) => {
        const classes = episodeOf(draft, 'E-1').reobservation.classes
        writeInvalid(classes, 'apiProcesses', {
          probeCompleted: false,
          residual: 0,
        })
      },
      { reseal: 'E-1' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-reobservation-not-clear'
    )
  })

  it('refuses a final residual the episode left behind', () => {
    const artifact = corrupt(
      (draft) => {
        writeInvalid(episodeOf(draft, 'E-4').residual, 'closeClaims', 1)
      },
      { reseal: 'E-4' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-residual-not-clear'
    )
  })

  it('refuses a collection whose observation disagrees with its expectation', () => {
    const artifact = corrupt(
      (draft) => {
        const collections = episodeOf(draft, 'E-1').collections
        writeInvalid(collections, 'listener', {
          collected: true,
          collectedBy: 'loopback-socket-probe',
          observed: 9,
          expected: 0,
          agrees: false,
          detail: 'disagreement injected by a negative control',
        })
      },
      { reseal: 'E-1' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-collection-incomplete'
    )
  })

  it('refuses a missing collection class', () => {
    const artifact = corrupt(
      (draft) => {
        const episode = episodeOf(draft, 'E-1')
        const collections = { ...episode.collections }
        writeInvalid(episode, 'collections', collections)
        delete (collections as Record<string, unknown>)['peerSurvival']
      },
      { reseal: 'E-1' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-collection-incomplete'
    )
  })

  it('refuses an unknown replacement branch in the interrupted-close episode', () => {
    const artifact = corrupt(
      (draft) => {
        const interruption = episodeOf(draft, 'E-6').interruption
        if (interruption === null) throw new Error('missing interruption')
        writeInvalid(interruption, 'branch', 'guessed')
      },
      { reseal: 'E-6' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-replacement-branch-unknown'
    )
  })

  it('refuses an adopted branch without a healthy attributable survivor', () => {
    const artifact = corrupt(
      (draft) => {
        const interruption = episodeOf(draft, 'E-6').interruption
        if (interruption === null) throw new Error('missing interruption')
        writeInvalid(interruption, 'survivorHealthyAfterInterruption', false)
      },
      { reseal: 'E-6' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-adoption-unproven'
    )
  })

  it('refuses an adopted survivor that was never published Running', () => {
    const artifact = corrupt(
      (draft) => {
        const interruption = episodeOf(draft, 'E-6').interruption
        if (interruption === null) throw new Error('missing interruption')
        writeInvalid(interruption, 'replacementPublishedState', 'Stopped')
      },
      { reseal: 'E-6' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-adoption-unproven'
    )
  })

  it('refuses a replacement that reported a live runtime absent', () => {
    const artifact = corrupt(
      (draft) => {
        const interruption = episodeOf(draft, 'E-6').interruption
        if (interruption === null) throw new Error('missing interruption')
        writeInvalid(interruption, 'replacementReportedAbsent', true)
      },
      { reseal: 'E-6' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-replacement-reported-absent'
    )
  })

  it('refuses a retained state that was not Failed before replacement', () => {
    const artifact = corrupt(
      (draft) => {
        const interruption = episodeOf(draft, 'E-6').interruption
        if (interruption === null) throw new Error('missing interruption')
        writeInvalid(interruption, 'retainedStateBeforeReplacement', 'Running')
      },
      { reseal: 'E-6' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-interruption-unproven'
    )
  })

  it('refuses missing separate signal accounts', () => {
    const artifact = corrupt(
      (draft) => {
        const interruption = episodeOf(draft, 'E-6').interruption
        if (interruption === null) throw new Error('missing interruption')
        const accounts = { ...interruption.signalAccounts }
        writeInvalid(interruption, 'signalAccounts', accounts)
        delete (accounts as Record<string, unknown>)['replacementReconcile']
      },
      { reseal: 'E-6' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-interruption-accounts-missing'
    )
  })

  it('refuses signals delivered by the interrupted close itself', () => {
    const artifact = corrupt(
      (draft) => {
        const interruption = episodeOf(draft, 'E-6').interruption
        if (interruption === null) throw new Error('missing interruption')
        writeInvalid(interruption.signalAccounts, 'interruptedClose', 1)
      },
      { reseal: 'E-6' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-interruption-accounts-missing'
    )
  })

  it('refuses a safe retry that never closed the adopted survivor', () => {
    const artifact = corrupt(
      (draft) => {
        const interruption = episodeOf(draft, 'E-6').interruption
        if (interruption === null) throw new Error('missing interruption')
        writeInvalid(interruption, 'safeRetryClosedAdoptedSurvivor', false)
      },
      { reseal: 'E-6' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-adoption-unproven'
    )
  })

  it('refuses a repeated-close episode that did not repeat exactly three times', () => {
    const artifact = corrupt(
      (draft) => {
        const episode = episodeOf(draft, 'E-7')
        const repeats = episode.repeats
        if (repeats === null) throw new Error('missing repeats')
        writeInvalid(repeats, 'repeatCount', 2)
        writeInvalid(repeats, 'repeatStatuses', [404, 404])
        writeInvalid(repeats, 'repeatCategories', [
          'project_not_found',
          'project_not_found',
        ])
        writeInvalid(episode, 'statuses', [200, 404, 404])
      },
      { reseal: 'E-7' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-repeat-unproven'
    )
  })

  it('refuses a repeated close that was not answered as already absent', () => {
    const artifact = corrupt(
      (draft) => {
        const repeats = episodeOf(draft, 'E-7').repeats
        if (repeats === null) throw new Error('missing repeats')
        writeInvalid(repeats, 'repeatStatuses', [404, 200, 404])
      },
      { reseal: 'E-7' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-repeat-unproven'
    )
  })

  it('refuses additional signals raised by a repeated close', () => {
    const artifact = corrupt(
      (draft) => {
        const repeats = episodeOf(draft, 'E-7').repeats
        if (repeats === null) throw new Error('missing repeats')
        writeInvalid(repeats, 'signalsAfterSuccess', 1)
      },
      { reseal: 'E-7' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-repeat-unproven'
    )
  })

  it('refuses a duplicated close side effect', () => {
    const artifact = corrupt(
      (draft) => {
        writeInvalid(episodeOf(draft, 'E-1'), 'projectClosedEmissions', 2)
      },
      { reseal: 'E-1' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-duplicate-side-effect'
    )
  })

  it('refuses a disclosed absolute host path', () => {
    const artifact = corrupt(
      (draft) => {
        const episode = episodeOf(draft, 'E-1')
        writeInvalid(episode, 'observations', [
          ...episode.observations,
          'the workbench started from /workspaces/ascend/apps/api',
        ])
      },
      { reseal: 'E-1' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-protected-value-disclosed'
    )
  })

  it('refuses a disclosed loopback host and port', () => {
    const artifact = corrupt(
      (draft) => {
        const episode = episodeOf(draft, 'E-2')
        writeInvalid(episode, 'observations', [
          ...episode.observations,
          'the generation listened on 127.0.0.1:43127',
        ])
      },
      { reseal: 'E-2' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-protected-value-disclosed'
    )
  })

  it('refuses a disclosed raw exception stack', () => {
    const artifact = corrupt(
      (draft) => {
        const episode = episodeOf(draft, 'E-4')
        writeInvalid(episode, 'observations', [
          ...episode.observations,
          'Error: close failed\n    at closeProject (project-close.js:12:3)',
        ])
      },
      { reseal: 'E-4' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-protected-value-disclosed'
    )
  })

  it('refuses a recorded redaction match', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(draft.redaction, 'matches', ['workbench pid 4242'])
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-protected-value-disclosed'
    )
  })

  it('refuses a raw identity in place of an opaque alias', () => {
    const artifact = corrupt(
      (draft) => {
        const episode = episodeOf(draft, 'E-1')
        writeInvalid(episode, 'boundIdentities', [
          ...episode.boundIdentities,
          '4242',
        ])
      },
      { reseal: 'E-1' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-expectations-unbound'
    )
  })

  it('refuses a missing compiled asset hash', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(
        draft,
        'compiledAssets',
        draft.compiledAssets.filter((asset) => asset.role !== 'web-asset')
      )
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-compiled-hashes-missing'
    )
  })

  it('refuses a compiled asset that no build produced', () => {
    const artifact = corrupt((draft) => {
      const asset = draft.compiledAssets[0]
      if (asset === undefined) throw new Error('missing compiled asset')
      writeInvalid(asset, 'builtBy', [])
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-compiled-hashes-missing'
    )
  })

  it('refuses an incomplete source set', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(draft, 'sources', draft.sources.slice(1))
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-source-hashes-missing'
    )
  })

  it('refuses an unhashed source member', () => {
    const artifact = corrupt((draft) => {
      const source = draft.sources[0]
      if (source === undefined) throw new Error('missing source')
      writeInvalid(source, 'sha256', 'not-a-digest')
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-source-hashes-missing'
    )
  })

  it('refuses a generation that did not execute the compiled entry point', () => {
    const artifact = corrupt(
      (draft) => {
        const generation = episodeOf(draft, 'E-1').generations[0]
        if (generation === undefined) throw new Error('missing generation')
        writeInvalid(generation, 'authenticity', 'in-process-app')
      },
      { reseal: 'E-1' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'generation-not-authentic'
    )
  })

  it('refuses a generation that never served a request', () => {
    const artifact = corrupt(
      (draft) => {
        const generation = episodeOf(draft, 'E-2').generations[0]
        if (generation === undefined) throw new Error('missing generation')
        writeInvalid(generation, 'servedRequests', 0)
      },
      { reseal: 'E-2' }
    )
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'generation-not-authentic'
    )
  })

  it('refuses a non-atomic finalization', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(draft.finalization, 'atomic', false)
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-finalization-not-atomic'
    )
  })

  it('refuses destinations that did not receive identical bytes', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(draft.finalization, 'identicalBytes', false)
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-finalization-not-atomic'
    )
  })

  it('refuses a finalization that left a staged file behind', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(draft.finalization, 'stagedLeftovers', 1)
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-finalization-not-atomic'
    )
  })

  it('refuses an artifact that was never finalized', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(draft, 'finalized', false)
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-not-finalized'
    )
    expect(classifyCloseEpisodeArtifact(artifact, digest)).toBe('unfinalized')
  })

  it('refuses an artifact that does not claim every episode passed', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(draft, 'allPassed', false)
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-not-all-passed'
    )
  })

  it('refuses an episode catalog that is short of the declared count', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(draft, 'episodes', draft.episodes.slice(0, 6))
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-catalog-mismatch'
    )
  })

  it('refuses an execution count that overstates what ran', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(draft, 'designatedEpisodesExecuted', 6)
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-catalog-mismatch'
    )
  })

  it('refuses a run whose timing origin is not the declared one', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(draft, 'timingOrigin', 'wall-clock')
    })
    expect(validateProjectCloseEpisode(artifact, digest)).toContain(
      'episode-run-identity-unproven'
    )
  })

  it('classifies a value that is not a designated artifact as malformed', () => {
    expect(classifyCloseEpisodeArtifact({ evidenceId: 'other' }, digest)).toBe(
      'malformed'
    )
  })

  it('classifies a defective artifact as not clear', () => {
    const artifact = corrupt((draft) => {
      writeInvalid(draft.finalization, 'atomic', false)
    })
    expect(classifyCloseEpisodeArtifact(artifact, digest)).toBe('not-clear')
  })
})
