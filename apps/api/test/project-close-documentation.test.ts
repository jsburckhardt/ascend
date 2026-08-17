import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLOSE_DIALOG_BODY } from '../../web/src/App.js'
import {
  CLOSE_FAILURE_MESSAGES,
  CLOSE_FAILURE_STATUS,
  PROJECT_CLOSE_TIMEOUT_MS,
  PROJECT_LIST_TIMEOUT_MS,
} from '../../web/src/projects.js'
import {
  PROJECT_RUNTIME_DEFAULTS,
  RUNTIME_CLOSE_OUTCOMES,
  RUNTIME_CLOSE_REJECTION_CATEGORIES,
  createProjectRuntimeConfig,
  runtimeCloseOverallBoundMs,
} from '../src/project-runtime-contract.js'
import {
  INVALID_PROJECT_ID,
  PROJECT_CLOSED_EVENT,
  PROJECT_CLOSE_FAILED,
  PROJECT_CLOSE_FAILED_EVENT,
  PROJECT_CLOSE_ROUTE_ERROR_CATEGORIES,
  PROJECT_NOT_FOUND,
} from '../src/routes/projects.js'
import { RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES } from '../src/routes/project-runtime-restart.js'
import { RUNTIME_STOP_ROUTE_ERROR_CATEGORIES } from '../src/routes/project-runtime-stop.js'
import {
  BL020_PRESERVED_EVIDENCE,
  BL020_PROXY_FAILURE_TABLE_ROWS,
  BL020_REGENERATED_TABLE_BASE_SHA256,
} from '../src/project-close-evidence.js'
import {
  WORKBENCH_FAILURE_TABLE,
  WORKBENCH_FAILURE_TABLE_SHA256,
} from '../src/workbench-proxy-contract.js'
import {
  REQUEST_URL_REDACTION_CENSOR,
  REQUEST_URL_REDACTION_PATH,
} from '../src/request-logging.js'
import { REPOSITORY_ROOT } from './project-database-test-helper.js'

async function text(relative: string): Promise<string> {
  return readFile(path.join(REPOSITORY_ROOT, relative), 'utf8')
}

describe('BL-009 close documentation contract', () => {
  it('synchronizes API, persistence, redaction, and stopped scope', async () => {
    const files = await Promise.all(
      ['README.md', 'docs/README.md', 'apps/api/README.md'].map(text)
    )
    const combined = files.join(' ')
    for (const token of [
      'DELETE /api/projects/{id}',
      '200',
      '400',
      '404',
      '500',
      'closed',
      INVALID_PROJECT_ID,
      PROJECT_NOT_FOUND,
      PROJECT_CLOSE_FAILED,
      PROJECT_CLOSED_EVENT,
      PROJECT_CLOSE_FAILED_EVENT,
      'one explicit SQLite transaction',
      'roll back',
      'exactly eight concurrent',
      'one 200',
      'seven 404',
      'no project-filesystem API',
      REQUEST_URL_REDACTION_PATH,
      REQUEST_URL_REDACTION_CENSOR,
      'encoded or decoded',
      'no migration',
      'stopped',
      'BL-020',
      'the close of a running or failed project',
    ])
      expect(combined.toLowerCase()).toContain(token.toLowerCase())
  })

  it('synchronizes modal, focus, recovery, evidence, cleanup, and commands', async () => {
    const files = await Promise.all(
      [
        'README.md',
        'docs/README.md',
        'apps/web/README.md',
        '.harness/engineering-harness.md',
        'justfile',
      ].map(text)
    )
    const combined = files.join(' ')
    for (const token of [
      CLOSE_DIALOG_BODY,
      'Close <project name>?',
      'aria-modal',
      'Tab',
      'Shift+Tab',
      'Escape',
      'Cancel',
      'Confirm',
      'destructive',
      'next Close',
      'previous Close',
      'Ascend heading',
      'No registered projects',
      'same-ID Retry',
      'Refresh projects',
      'presence',
      'absence',
      'failed or invalid',
      'stale',
      'unmounted',
      PROJECT_CLOSE_TIMEOUT_MS.toLocaleString('en-US'),
      PROJECT_LIST_TIMEOUT_MS.toLocaleString('en-US'),
      'manifest-matrix.json',
      'close-fault-episode.json',
      'persistence failure',
      'transport ambiguity',
      'already absent',
      'before/after membership',
      'combined eight',
      'one-character',
      '4,096-character',
      'byte 4,097',
      'integrity',
      'process groups',
      'listeners',
      'sidecars',
      'just verify-close-project',
      'just verify-focused',
      'just verify',
      'non-persistent',
    ])
      expect(combined.toLowerCase()).toContain(token.toLowerCase())
    for (const message of Object.values(CLOSE_FAILURE_MESSAGES)) {
      expect(combined).toContain(message)
    }
    expect(files[4]!.match(/^verify-close-project:/gmu)).toHaveLength(1)
    expect(files[4]!.match(/^verify-focused /gmu)).toHaveLength(1)
  })
})

const PLAN_TASK_BREAKDOWN =
  'project/work-items/45-bl-020-close-a-running-or-failed-project/plan/02-task-breakdown.md'
const CLOSE_EVIDENCE_DIRECTORY =
  'project/work-items/45-bl-020-close-a-running-or-failed-project/implementation/evidence'
const CLOSE_EVIDENCE_ARTIFACTS = [
  `${CLOSE_EVIDENCE_DIRECTORY}/close-matrix.json`,
  `${CLOSE_EVIDENCE_DIRECTORY}/designated-episode.json`,
  `${CLOSE_EVIDENCE_DIRECTORY}/residual-audit.json`,
] as const

/** Every application document a BL-020 category dispositions. */
const CLOSE_DOCUMENTS = [
  'README.md',
  'docs/README.md',
  'docs/project-runtime.md',
  'docs/stable-workbench-routing.md',
  'docs/api-restart-reconciliation.md',
  'docs/session-switching.md',
  'docs/workbench-proof.md',
  'docs/mvp-performance.md',
  'apps/api/README.md',
  'apps/api/src/routes/README.md',
  'apps/web/README.md',
] as const

/** The close-owned section of each surface, used for the redaction scan. */
const CLOSE_SECTIONS = [
  ['README.md', '## Close a running or failed project (BL-020)'],
  ['docs/README.md', '## Close a running or failed project (BL-020)'],
  ['docs/project-runtime.md', '## Selected-project close state machine'],
  ['docs/project-runtime.md', '## Close configuration, bounds, and settlement'],
  ['docs/project-runtime.md', '## Close recovery and interruption'],
  ['docs/stable-workbench-routing.md', '## Per-project close drain'],
  ['docs/api-restart-reconciliation.md', '## Close across an API restart'],
  ['docs/workbench-proof.md', '## BL-020 designated close proof'],
  ['apps/api/README.md', '## Selected project close (BL-020)'],
  ['apps/api/src/routes/README.md', '### Selected project close'],
  ['apps/web/README.md', '## Close a running or failed project (BL-020)'],
] as const

type DocumentedPhrases = readonly (readonly [string, readonly string[]])[]

async function expectDocumented(
  expectations: DocumentedPhrases
): Promise<void> {
  const results = await Promise.all(
    expectations.map(async ([document, phrases]) => {
      const content = await text(document)
      return {
        document,
        missing: phrases.filter((phrase) => !content.includes(phrase)),
      }
    })
  )
  expect(results.filter((result) => result.missing.length > 0)).toEqual([])
}

function sectionOf(content: string, heading: string): string {
  const start = content.indexOf(`\n${heading}\n`)
  if (start < 0) throw new Error(`Missing documentation section: ${heading}`)
  const level = (/^#+/u.exec(heading) as RegExpExecArray)[0].length
  const body = content.slice(start + heading.length + 1)
  const next = body.search(new RegExp(`^#{1,${level}} `, 'mu'))
  return next < 0 ? body : body.slice(0, next)
}

/** The first column of the T-15 documentation disposition table. */
function dispositionCategories(plan: string): readonly string[] {
  const header = '| Category | Surface | Disposition |'
  const start = plan.indexOf(header)
  if (start < 0) throw new Error('Missing T-15 disposition table')
  const lines = plan.slice(start).split('\n').slice(2)
  const end = lines.findIndex((line) => !line.startsWith('|'))
  return (end < 0 ? lines : lines.slice(0, end)).map((line) =>
    (line.split('|')[1] as string).trim()
  )
}

interface CategoryDisposition {
  readonly category: string
  readonly evidence: DocumentedPhrases
}

/** One entry per row of the T-15 disposition table, in table order. */
const CATEGORY_DISPOSITIONS: readonly CategoryDisposition[] = [
  {
    category: 'README / overview',
    evidence: [
      [
        'README.md',
        [
          '## Close a running or failed project (BL-020)',
          'Close now accepts a project whose authoritative workbench state is `Running` or `Failed`',
          'A project with no owned runtime keeps the delivered stopped-project path exactly',
          'Exactly eleven bounded results exist',
          'Close is non-destructive to the filesystem.',
          'A rejected close leaves the registration and all four persisted fields byte-identical.',
        ],
      ],
      [
        'docs/README.md',
        [
          '## Close a running or failed project (BL-020)',
          'Issue #45 extends the same `DELETE /api/projects/{id}` request to a project whose workbench is `Running` or `Failed`.',
          'The close settles into eleven bounded results and nothing else',
          'A rejected close leaves the registration and all four persisted fields exactly as they were.',
        ],
      ],
    ],
  },
  {
    category: 'API reference',
    evidence: [
      [
        'apps/api/README.md',
        [
          '## Selected project close (BL-020)',
          'The success body is unchanged from BL-009: exactly `{"id":"stable-id","disposition":"closed"}`.',
          'its cardinality is exactly one record per completed close',
        ],
      ],
      [
        'apps/api/src/routes/README.md',
        [
          '### Selected project close',
          '`DELETE /api/projects/{id}` accepts one decoded nonempty stable ID and closes a project in any authoritative state, including `Running` and `Failed`.',
          'The eleven-category close vocabulary is fixed',
        ],
      ],
    ],
  },
  {
    category: 'Configuration',
    evidence: [
      [
        'docs/project-runtime.md',
        [
          '## Close configuration, bounds, and settlement',
          'They are internal manager settings with fixed defaults: they are not environment variables, deployment settings, feature flags, or persisted values, and no operator action is required.',
          'all validated as positive safe integers',
        ],
      ],
    ],
  },
  {
    category: 'Usage / UI',
    evidence: [
      [
        'apps/web/README.md',
        [
          '## Close a running or failed project (BL-020)',
          'The dialog is **exclusive and pre-transmission only**',
          'it is dismissed the moment the request is transmitted',
          "A peer's pending close never disables another card's `Open`, `Stop`, `Restart`, or `Close`",
        ],
      ],
    ],
  },
  {
    category: 'Migration',
    evidence: [
      [
        'README.md',
        [
          'no data, schema, SQLite, or API-payload migration: the same four persisted project fields are stored, and no new value is persisted, so there is nothing to migrate',
        ],
      ],
      [
        'apps/api/README.md',
        [
          'No migration is required and none is possible to require: the same four persisted project fields are written by the same statements, no schema, index, trigger, column, or table changes, no new value is persisted',
        ],
      ],
    ],
  },
  {
    category: 'Architecture',
    evidence: [
      [
        'docs/project-runtime.md',
        [
          '## Selected-project close state machine',
          'An admitted close runs seven phases under one overall deadline armed from the trusted deadline scheduler',
          'Removal is invoked only when all eight confirmation clauses hold, read in one uninterrupted synchronous region',
          'the claim is re-evaluated after every await on the acquisition and join seams',
          'After a confirmed removal the project is retired.',
          'Two derived bounds are cardinality-aware.',
          '`runtime-closing` is an acquisition failure only.',
        ],
      ],
    ],
  },
  {
    category: 'Operational / recovery',
    evidence: [
      [
        'docs/project-runtime.md',
        [
          '## Close recovery and interruption',
          'A close is safe to interrupt at any point because the durable removal is last and is dominated by the confirmation region.',
        ],
      ],
      [
        'docs/api-restart-reconciliation.md',
        [
          '## Close across an API restart',
          'Reconciliation itself is unchanged by BL-020',
          '| Close | 409 `runtime_reconcile_in_progress` | 409 `runtime_reconcile_unresolved` |',
          'during release and sweep, strictly before confirmation',
        ],
      ],
    ],
  },
  {
    category: 'Routing',
    evidence: [
      [
        'docs/stable-workbench-routing.md',
        [
          '## Per-project close drain',
          '`503 workbench_closing`',
          '`503 workbench_release_unconfirmed`',
        ],
      ],
    ],
  },
  {
    category: 'Privacy / evidence',
    evidence: [
      ['README.md', ['opaque project tokens and bounded classifications only']],
      [
        'docs/README.md',
        [
          'Every artifact carries opaque project tokens and bounded classifications only',
        ],
      ],
      [
        'apps/api/README.md',
        [
          'Every retained row carries opaque project tokens and bounded classifications',
        ],
      ],
    ],
  },
  {
    category: 'Validation',
    evidence: [
      [
        'README.md',
        ['Run `just verify-close-project` for the extended deterministic gate'],
      ],
      [
        'docs/README.md',
        [
          'which keeps its delivered name and now also runs the BL-020 unit, manager, route, evidence, matrix, component, and documentation suites',
        ],
      ],
    ],
  },
  {
    category: 'Deployment topology',
    evidence: [
      [
        'docs/api-restart-reconciliation.md',
        [
          'Deployment topology is unchanged by close as it is by reconciliation: one local host, one API process, loopback-only runtimes, no new process, port, service, or host requirement',
        ],
      ],
      [
        'docs/mvp-performance.md',
        [
          '**BL-020 close has no deployment-topology impact on these measurements.**',
          'it introduces no new process, port, service, or host requirement',
        ],
      ],
    ],
  },
  {
    category: 'Session switching',
    evidence: [
      [
        'docs/session-switching.md',
        [
          "**BL-020 close has no impact on this document's claims.**",
          'Closing a running or failed project removes that project from Ascend rather than switching among retained ones, so no continuity claim, workflow, socket inventory, or reuse measurement here changes.',
        ],
      ],
    ],
  },
  {
    category: 'Workbench proof',
    evidence: [
      [
        'docs/workbench-proof.md',
        [
          '## BL-020 designated close proof',
          'Seven episodes are executed and retained',
          `${CLOSE_EVIDENCE_DIRECTORY}/designated-episode.json`,
        ],
      ],
    ],
  },
]

describe('BL-020 close documentation contract', () => {
  it('dispositions every one of the thirteen categories in the plan table', async () => {
    const categories = dispositionCategories(await text(PLAN_TASK_BREAKDOWN))

    expect(categories).toHaveLength(13)
    expect(CATEGORY_DISPOSITIONS.map(({ category }) => category)).toEqual([
      ...categories,
    ])

    await expectDocumented(
      CATEGORY_DISPOSITIONS.flatMap(({ evidence }) => evidence)
    )
  })

  it('publishes every close outcome, route category, and status', async () => {
    expect(RUNTIME_CLOSE_OUTCOMES).toHaveLength(3)
    expect(RUNTIME_CLOSE_REJECTION_CATEGORIES).toHaveLength(9)
    expect(PROJECT_CLOSE_ROUTE_ERROR_CATEGORIES).toHaveLength(11)

    const [readme, docsIndex, apiReadme, routeReadme] = await Promise.all([
      text('README.md'),
      text('docs/README.md'),
      text('apps/api/README.md'),
      text('apps/api/src/routes/README.md'),
    ])
    const surfaces = [readme, docsIndex, apiReadme, routeReadme]

    for (const category of RUNTIME_CLOSE_REJECTION_CATEGORIES) {
      expect(await text('docs/project-runtime.md')).toContain(`\`${category}\``)
      expect(surfaces.some((surface) => surface.includes(category))).toBe(true)
    }
    for (const category of PROJECT_CLOSE_ROUTE_ERROR_CATEGORIES) {
      for (const surface of [readme, apiReadme, routeReadme]) {
        expect(surface).toContain(`\`${category}\``)
      }
      expect(docsIndex).toContain(category)
    }

    // Every published status row, on the two route surfaces that carry tables.
    const rows: readonly (readonly [number, string])[] = [
      [400, 'invalid_project_id'],
      [404, 'project_not_found'],
      [500, 'project_close_failed'],
      [409, 'runtime_start_in_progress'],
      [409, 'runtime_stop_in_progress'],
      [409, 'runtime_restart_in_progress'],
      [409, 'runtime_reconcile_in_progress'],
      [409, 'runtime_reconcile_unresolved'],
      [500, 'runtime_release_unconfirmed'],
      [500, 'runtime_close_ownership_unresolved'],
      [503, 'runtime_manager_shutdown'],
    ]
    expect(rows.map(([, category]) => category)).toEqual([
      ...PROJECT_CLOSE_ROUTE_ERROR_CATEGORIES,
    ])
    for (const [status, category] of rows) {
      expect(routeReadme).toMatch(
        new RegExp(`^\\| [^|]+ \\| ${status} \\| \`${category}\` \\|$`, 'mu')
      )
      expect(apiReadme).toMatch(
        new RegExp(`^\\| [^|]+ \\| ${status} \\| \`${category}\` \\|$`, 'mu')
      )
    }
    expect(readme).toContain(
      '| completed close | 200 | success body `{"id":"stable-id","disposition":"closed"}` |'
    )
    expect(apiReadme).toContain(
      '| `closed` | 200 | success body, no category |'
    )

    // The two close-in-progress rejections published by the peer routes.
    expect(RUNTIME_STOP_ROUTE_ERROR_CATEGORIES).toContain(
      'runtime_close_in_progress'
    )
    expect(RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES).toContain(
      'runtime_close_in_progress'
    )
    expect(routeReadme).toContain(
      '| a close is in progress | 409 | `runtime_close_in_progress` |'
    )
    await expectDocumented([
      [
        'apps/api/README.md',
        [
          'Since BL-020 a thirteenth stop route category exists: 409 `runtime_close_in_progress`',
          'Since BL-020 a thirteenth restart route category exists: 409 `runtime_close_in_progress`',
        ],
      ],
      [
        'apps/api/src/routes/README.md',
        [
          'Since BL-020 the table above carries a thirteenth row, `runtime_close_in_progress`',
          'Since BL-020 a thirteenth restart category exists, HTTP 409 `runtime_close_in_progress`',
        ],
      ],
    ])
  })

  it('publishes the configuration allowances, the bound arithmetic, and the two new failure categories', async () => {
    const runbook = await text('docs/project-runtime.md')
    const config = createProjectRuntimeConfig()

    for (const [member, value] of [
      ['closeDrainAllowanceMs', PROJECT_RUNTIME_DEFAULTS.closeDrainAllowanceMs],
      [
        'closeSettlementAllowanceMs',
        PROJECT_RUNTIME_DEFAULTS.closeSettlementAllowanceMs,
      ],
      [
        'closeOwnershipSweepCap',
        PROJECT_RUNTIME_DEFAULTS.closeOwnershipSweepCap,
      ],
    ] as const) {
      expect(runbook).toContain(`\`${member}\``)
      expect(runbook).toContain(value.toLocaleString('en-US'))
    }

    const ceiling = runtimeCloseOverallBoundMs(
      config,
      true,
      config.closeOwnershipSweepCap
    )
    expect(runbook).toContain(
      `${runtimeCloseOverallBoundMs(config, false, 1).toLocaleString('en-US')} ms for one record without quarantine resolution`
    )
    expect(runbook).toContain(
      `${ceiling.toLocaleString('en-US')} ms at the sweep cap with it`
    )
    expect(runbook).toContain(
      `That ${ceiling.toLocaleString('en-US')} ms value is the caller-visible ceiling, and the browser close transport bound of ${PROJECT_CLOSE_TIMEOUT_MS.toLocaleString('en-US')} ms strictly exceeds it.`
    )
    expect(PROJECT_CLOSE_TIMEOUT_MS).toBeGreaterThan(ceiling)

    for (const category of ['runtime-closing', 'close-release-unconfirmed']) {
      expect(runbook).toContain(`\`${category}\``)
    }
    expect(runbook).toContain(
      '`runtime-closing` is an acquisition failure only. No site installs it as an entry failure category and the public projection maps it nowhere'
    )
    expect(await text('apps/api/src/routes/README.md')).toContain(
      'it is never stored on an entry and therefore never appears in this projection'
    )
  })

  it('publishes the commands and the retained and disposable artifact paths', async () => {
    const [readme, docsIndex, runbook, apiReadme] = await Promise.all([
      text('README.md'),
      text('docs/README.md'),
      text('docs/project-runtime.md'),
      text('apps/api/README.md'),
    ])

    for (const command of [
      'just verify-close-project',
      'just verify-runtime-close',
      'just proof-runtime-close',
      'just proof-runtime-close-residual-audit',
      'just verify-focused',
      'just verify',
    ]) {
      for (const surface of [readme, docsIndex]) {
        expect(surface).toContain(command)
      }
    }
    expect(runbook).toContain('just verify-runtime-close')
    expect(apiReadme).toContain('just proof-runtime-close-residual-audit')

    for (const artifact of CLOSE_EVIDENCE_ARTIFACTS) {
      await expect(text(artifact)).resolves.toContain('{')
    }
    for (const surface of [readme, docsIndex, apiReadme]) {
      expect(surface).toContain(CLOSE_EVIDENCE_DIRECTORY)
      expect(surface).toContain('close-matrix.json')
      expect(surface).toContain('designated-episode.json')
      expect(surface).toContain('residual-audit.json')
      expect(surface).toContain('test-results/bl-020/')
    }
    for (const surface of [readme, docsIndex]) {
      expect(surface).toContain('close-non-mutation.json')
    }
    expect(await text('.gitignore')).toContain('test-results/')
  })

  it('documents the delivered per-project close lane on Project Home', async () => {
    const web = await text('apps/web/README.md')

    for (const message of Object.values(CLOSE_FAILURE_MESSAGES)) {
      expect(web).toContain(message)
    }
    for (const [category, status] of Object.entries(CLOSE_FAILURE_STATUS)) {
      expect(web).toContain(`\`${category}\``)
      expect(PROJECT_CLOSE_ROUTE_ERROR_CATEGORIES).toContain(category)
      expect([400, 404, 409, 500, 503]).toContain(status)
    }
    expect(web).toContain(CLOSE_DIALOG_BODY)
    for (const detail of [
      'Close status for <project name>',
      'Retry close <project name>',
      'Refresh close result for <project name>',
      '`<name>: Close request sent.`',
      '`<name>: Project closed.`',
      '`<name>: Close outcome unknown. Refresh projects to determine the result.`',
      '`<name>: Close cancelled.`',
      'a project with a close owner refuses a second transmission, and a record already marked transmitted refuses a second send within that record',
      "Cancel or `Escape` returns to that card's `Close`",
      "transmission moves to that card's close status region",
      "a settled failure moves to that card's `Retry close`",
      "a settled unknown moves to that card's `Refresh close result`",
      "else the previous card's `Close`, else the Ascend heading",
      'the phase is `unknown`, nothing repeats automatically',
      "is filtered through this page's closed-project set, so a closed card can never reappear because a refresh was already in flight",
      'joins the single list-bearing lane and is disabled while that lane is busy',
      `${PROJECT_CLOSE_TIMEOUT_MS.toLocaleString('en-US')} ms`,
      `${PROJECT_LIST_TIMEOUT_MS.toLocaleString('en-US')} ms`,
    ]) {
      expect(web).toContain(detail)
    }
  })

  it('documents the safe recovery of every retained-registration outcome', async () => {
    const runbook = await text('docs/project-runtime.md')

    for (const rejection of [
      'release-unconfirmed',
      'removal-failed',
      'ownership-cardinality-exceeded',
    ]) {
      expect(runbook).toMatch(
        new RegExp(`^\\| \`${rejection}\` \\(\`500 [a-z_]+\`\\) \\| `, 'mu')
      )
    }
    for (const phrase of [
      'retry Close after the workbench settles',
      'retry Close; no runtime work remains, so the retry removes the registration alone',
      'resolve the retained ownership first with Stop or Restart, then retry Close',
      'a repeated close of a removed project is a bounded `404 project_not_found` with no side effect',
    ]) {
      expect(runbook).toContain(phrase)
    }
    for (const surface of [
      await text('README.md'),
      await text('docs/README.md'),
    ]) {
      expect(surface).toContain('`ownership-cardinality-exceeded`')
      expect(surface).toContain('`removal-failed`')
      expect(surface).toContain('`release-unconfirmed`')
    }
  })

  it('retains no claim that the close of a running or failed project is deferred', async () => {
    const documents = await Promise.all(
      CLOSE_DOCUMENTS.map(
        async (document) => [document, await text(document)] as const
      )
    )
    const stale = [
      /\bclos\w*[^.]{0,120}\b(?:remains?|are|is|stays?) (?:still )?(?:deferred|excluded|unavailable|out of scope|later scope|BL-020 or later|later)\b/iu,
      /\bBL-020\b[^.]{0,80}\b(?:retains|defers|will deliver|is deferred|remains? (?:deferred|out of scope|later|unimplemented))\b/iu,
      /\b(?:running|failed)[^.]{0,60}\bclose\b[^.]{0,80}\b(?:BL-020 or later|not (?:yet )?(?:delivered|implemented|supported))\b/iu,
      /\bstop(?:\/restart| or restart)?\b[^.]{0,140}\b(?:remains?|are|is) (?:still )?(?:deferred|excluded|unavailable|out of scope|later scope|BL-020|later)\b/iu,
      /\b(?:public |broader )?lifecycle controls?\b[^.]{0,140}\b(?:remains?|are|is) (?:still )?(?:deferred|excluded|unavailable|out of scope|later scope|BL-020|later)\b/iu,
    ]
    const violations = documents.flatMap(([document, content]) =>
      content
        .split('\n')
        .flatMap((paragraph, index) =>
          paragraph
            .split(/(?<=[.!?])\s+/u)
            .map((sentence) => ({ line: index + 1, text: sentence.trim() }))
        )
        .filter(({ text: sentence }) =>
          stale.some((pattern) => pattern.test(sentence))
        )
        .map(({ line, text: sentence }) => `${document}:${line} ${sentence}`)
    )

    expect(violations).toEqual([])

    // The harness signal index states the delivered close rather than a deferral.
    const harness = await text('.harness/engineering-harness.md')
    expect(harness).toContain(
      'BL-020 delivers the close of a running or failed project through the runtime manager'
    )
    expect(harness).not.toContain(
      'BL-020 retains running or failed workbench close'
    )

    // The genuinely undelivered scopes keep their deferral.
    await expectDocumented([
      ['docs/api-restart-reconciliation.md', ['BL-021', 'BL-022']],
      [
        'README.md',
        [
          'BL-021 automatic lifecycle policy and BL-022 durable or distributed recovery remain separate.',
        ],
      ],
    ])
  })

  it('publishes no protected raw value in a close section or a committed artifact', async () => {
    const protectedValues: readonly (readonly [string, RegExp])[] = [
      [
        'absolute host path',
        /(?:^|[\s"'`(])\/(?:home|root|usr|etc|var|tmp)\//u,
      ],
      ['loopback authority', /\b(?:127\.0\.0\.1|localhost|0\.0\.0\.0)\b/u],
      ['explicit port', /:\d{4,5}\b/u],
      ['process identity', /\b(?:pid|PID)\s*[#=:]?\s*\d+/u],
      ['process start time', /\bstart[- ]time\s*[=:]\s*\d+/iu],
      ['socket inode', /\binode\s*[=:]?\s*\d+/iu],
      [
        'argument vector',
        /--(?:bind-addr|user-data-dir|extensions-dir|auth)\b/u,
      ],
      ['stack frame', /(?:^|\n)\s+at\s+\S+\s*\(/u],
      ['raw database file', /\b[\w-]+\.sqlite\d?\b/u],
      ['credential', /\b(?:password|secret|token)\s*[=:]\s*\S+/iu],
    ]

    const scanned = await Promise.all([
      ...CLOSE_SECTIONS.map(async ([document, heading]) => ({
        subject: `${document} ${heading}`,
        content: sectionOf(await text(document), heading),
      })),
      ...CLOSE_EVIDENCE_ARTIFACTS.map(async (artifact) => ({
        subject: artifact,
        content: await text(artifact),
      })),
    ])

    const leaks = scanned.flatMap(({ subject, content }) =>
      protectedValues
        .filter(([, pattern]) => pattern.test(content))
        .map(([label]) => `${subject} [${label}]`)
    )
    expect(leaks).toEqual([])

    // Every documented close example uses the placeholder identifier.
    const examples = scanned.flatMap(({ subject, content }) =>
      [...content.matchAll(/\{"id":"([^"]*)"/gu)].map(
        (match) => `${subject} ${match[1] as string}`
      )
    )
    expect(examples.length).toBeGreaterThan(0)
    expect(
      examples.filter((example) => !example.endsWith(' stable-id'))
    ).toEqual([])

    // Bounded classifications are deliberately retained, never denied.
    await expectDocumented([
      [
        'README.md',
        [
          'Bounded outcome, category, residual-class, and confirmation-clause names are recorded on purpose, so committed evidence does contain classifications by design.',
        ],
      ],
      [
        'docs/README.md',
        [
          'so a claim that classifications are absent from committed evidence would be false',
        ],
      ],
    ])
  })
})

// ---------------------------------------------------------------------------
// T-16: the command interface contract
// ---------------------------------------------------------------------------

/** The BL-020 suites `verify-runtime-close` executes, in declared order. */
const CLOSE_ACCEPTANCE_SUITES = [
  'apps/api/test/project-runtime-contract.test.ts',
  'apps/api/test/workbench-proxy-contract.test.ts',
  'apps/api/test/project-close-manager.test.ts',
  'apps/api/test/project-close-service.test.ts',
  'apps/api/test/project-close-route.test.ts',
  'apps/api/test/project-close-evidence.test.ts',
  'apps/api/test/project-close-matrix-core.test.ts',
  'apps/api/test/project-close-matrix-lifecycle.test.ts',
  'apps/api/test/project-close-matrix-edge.test.ts',
  'apps/api/test/project-close-matrix-web.test.ts',
  'apps/api/test/project-close-mutations.test.ts',
  'apps/api/test/project-close-matrix.test.ts',
  'apps/api/test/project-close-non-mutation.test.ts',
  'apps/api/test/project-close-residual-audit.test.ts',
  'apps/api/test/project-close-designated-contract.test.ts',
  'apps/api/test/project-close-documentation.test.ts',
  'apps/web/src/project-close-client.test.ts',
  'apps/web/src/use-project-close.test.tsx',
  'apps/web/src/App.close.test.tsx',
  'apps/web/src/project-close-component-matrix.test.tsx',
] as const

/** The BL-020 suites the delivered BL-009 gate keeps its name and gains. */
const CLOSE_PROJECT_ADDED_SUITES = [
  'apps/api/test/project-close-manager.test.ts',
  'apps/api/test/project-close-evidence.test.ts',
  'apps/api/test/project-close-matrix.test.ts',
  'apps/web/src/project-close-component-matrix.test.tsx',
] as const

/**
 * The one removal a BL-020 gate performs: the empty scaffolding its own
 * disposable fixture root is left holding once every world removed the trees
 * it created. It can remove no file, no artifact, and no compiled output,
 * because it deletes only empty directories under one named root.
 */
const CLOSE_FIXTURE_PRUNE =
  'if [[ -d test-results/bl-020/fixtures ]]; then find test-results/bl-020/fixtures -depth -type d -empty -delete; fi'

/** The same bounded prune, for the browser proof's own disposable root. */
const CLOSE_BROWSER_PRUNE =
  'if [[ -d test-results/bl-020/browser ]]; then find test-results/bl-020/browser -depth -type d -empty -delete; fi'

const CLOSE_BROWSER_PROOF =
  'pnpm exec playwright test tests/e2e/project-close.spec.ts --project=chromium --workers=1 --retries=0'

const API_BUILD_LINE = 'pnpm --filter @ascend/api build:ts'

const DESIGNATED_PROOF_LINE =
  'BL020_DESIGNATED=1 pnpm exec vitest run apps/api/test/project-close-designated.test.ts --reporter=verbose'

/** The four recipes this backlog item adds or extends. */
const CLOSE_RECIPES = [
  'verify-close-project',
  'verify-runtime-close',
  'proof-runtime-close',
  'proof-runtime-close-residual-audit',
] as const

/**
 * The prior committed evidence section 21 preserves, each recorded under the
 * disposable path its gate writes and the work-item path it is committed at.
 * Both must carry the digest `BL020_PRESERVED_EVIDENCE` declares.
 */
const PRIOR_EVIDENCE_COPIES: readonly (readonly [string, string])[] = [
  [
    'test-results/bl-017/runtime-stop-matrix.json',
    'project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/implementation/evidence/runtime-stop-matrix.json',
  ],
  [
    'test-results/bl-018/runtime-restart-matrix.json',
    'project/work-items/41-bl-018-restart-a-running-or-failed-workbench/implementation/evidence/runtime-restart-matrix.json',
  ],
  [
    'test-results/bl-019/runtime-reconcile-matrix.json',
    'project/work-items/43-bl-019-reconcile-workbench-runtimes-after-api-restart/implementation/evidence/runtime-reconcile-matrix.json',
  ],
]

/** Every recipe header the `justfile` declares, in file order. */
function recipeNames(justfile: string): readonly string[] {
  return [...justfile.matchAll(/^([a-z][a-z0-9-]*)(?: [^:\n]*)?:$/gmu)].map(
    (match) => match[1] as string
  )
}

/** Each recipe's body lines, with the four-space recipe indent removed. */
function recipeBodies(
  justfile: string
): ReadonlyMap<string, readonly string[]> {
  const bodies = new Map<string, string[]>()
  let current: string[] | null = null
  for (const line of justfile.split('\n')) {
    const header = /^([a-z][a-z0-9-]*)(?: [^:\n]*)?:$/u.exec(line)
    if (header !== null) {
      current = []
      bodies.set(header[1] as string, current)
      continue
    }
    if (current !== null && line.startsWith('    ')) current.push(line.slice(4))
    else if (line.trim() !== '') current = null
  }
  return bodies
}

describe('BL-020 command interface contract', () => {
  it('declares the delivered and new close recipes exactly once each', async () => {
    const justfile = await text('justfile')
    const names = recipeNames(justfile)

    for (const recipe of [
      'verify-focused',
      'verify',
      ...CLOSE_RECIPES,
      'proof-runtime-reconcile-residual-audit',
      'verify-mvp-performance',
    ]) {
      expect(names.filter((name) => name === recipe)).toHaveLength(1)
    }

    // The two delivered entry points keep their names and their signatures.
    expect(justfile.match(/^verify-focused \*args:$/gmu)).toHaveLength(1)
    expect(justfile.match(/^verify:$/gmu)).toHaveLength(1)

    // No name is a word-order permutation of another, over every recipe.
    const permutations = new Map<string, string[]>()
    for (const name of names) {
      const key = name.split('-').sort().join(' ')
      permutations.set(key, [...(permutations.get(key) ?? []), name])
    }
    expect(
      [...permutations.values()]
        .filter((group) => new Set(group).size > 1)
        .map((group) => group.join(' vs '))
    ).toEqual([])
  })

  it('wires the three new gates into verify in the declared order', async () => {
    const justfile = await text('justfile')
    const verify = recipeBodies(justfile).get('verify')
    expect(verify).toBeDefined()
    if (verify === undefined) return

    const anchor = verify.indexOf('just proof-runtime-reconcile-residual-audit')
    expect(anchor).toBeGreaterThan(-1)
    expect(verify.slice(anchor, anchor + 5)).toEqual([
      'just proof-runtime-reconcile-residual-audit',
      'just verify-runtime-close',
      'just proof-runtime-close',
      'just proof-runtime-close-residual-audit',
      'just verify-mvp-performance',
    ])

    for (const invocation of [
      'just verify-runtime-close',
      'just proof-runtime-close',
      'just proof-runtime-close-residual-audit',
    ]) {
      expect(verify.filter((line) => line === invocation)).toHaveLength(1)
    }

    // The canonical gate provisions nothing: `setup` is the only recipe that
    // installs, and `verify` never calls it.
    expect(verify.some((line) => line.includes('just setup'))).toBe(false)
  })

  it('builds the compiled entry point before it proves it', async () => {
    const bodies = recipeBodies(await text('justfile'))
    const proof = bodies.get('proof-runtime-close')
    const delivered = bodies.get('proof-runtime-reconcile')

    // Two lines, build first, mirroring the delivered reconcile proof: the
    // designated suite therefore runs against a rebuilt `dist/server.js` and
    // succeeds on a tree that has no `apps/api/dist` at all.
    expect(proof).toEqual([API_BUILD_LINE, DESIGNATED_PROOF_LINE])
    expect(delivered?.[0]).toBe(API_BUILD_LINE)

    expect(bodies.get('proof-runtime-close-residual-audit')).toEqual([
      'pnpm --filter @ascend/api exec tsx src/cli/project-close-residual-audit.ts',
    ])
  })

  it('runs every acceptance suite and the browser proof in one gate', async () => {
    const bodies = recipeBodies(await text('justfile'))
    const gate = bodies.get('verify-runtime-close')
    expect(gate).toHaveLength(4)
    if (gate === undefined) return

    const [suites, browser, cleanup, browserCleanup] = gate as [
      string,
      string,
      string,
      string,
    ]
    expect(suites.startsWith('pnpm exec vitest run ')).toBe(true)
    expect(suites.endsWith(' --reporter=verbose')).toBe(true)
    expect(
      suites
        .slice('pnpm exec vitest run '.length, -' --reporter=verbose'.length)
        .split(' ')
    ).toEqual([...CLOSE_ACCEPTANCE_SUITES])
    expect(browser).toBe(CLOSE_BROWSER_PROOF)
    expect(cleanup).toBe(CLOSE_FIXTURE_PRUNE)
    expect(browserCleanup).toBe(CLOSE_BROWSER_PRUNE)

    // The delivered BL-009 gate keeps its name and gains the BL-020 suites.
    const close = bodies.get('verify-close-project')
    expect(close).toHaveLength(3)
    for (const suite of CLOSE_PROJECT_ADDED_SUITES) {
      expect(close?.[0]).toContain(suite)
    }
    expect(close?.[1]).toBe(
      'pnpm exec playwright test tests/e2e/project-home.spec.ts --project=chromium --workers=1 --retries=0'
    )
    expect(close?.[2]).toBe(CLOSE_FIXTURE_PRUNE)
  })

  it('cleans only what it created and needs no unavailable prerequisite', async () => {
    const bodies = recipeBodies(await text('justfile'))

    for (const recipe of CLOSE_RECIPES) {
      const body = bodies.get(recipe) ?? []
      expect(body.length).toBeGreaterThan(0)
      const script = body.join('\n')

      // Every removal a close recipe performs is the bounded fixture prune,
      // so no shared compiled output, retained artifact, or repository path
      // can be deleted by a gate.
      for (const line of body) {
        if (!/\b(?:rm|rmdir|unlink|-delete|git clean)\b/u.test(line)) continue
        expect([CLOSE_FIXTURE_PRUNE, CLOSE_BROWSER_PRUNE]).toContain(line)
      }
      expect(script).not.toContain('apps/api/dist')
      expect(script).not.toContain('apps/web/dist')

      // No network, credential, hosted service, elevation, interactive
      // judgment, or unbounded wait is reachable from a close gate.
      for (const prohibited of [
        /\bcurl\b/u,
        /\bwget\b/u,
        /\bssh\b/u,
        /\bscp\b/u,
        /\bsudo\b/u,
        /\bdocker\b/u,
        /\bgh\b/u,
        /\bnpx\b/u,
        /\bpnpm (?:install|add|publish)\b/u,
        /playwright install/u,
        /https?:\/\//u,
        /\b(?:password|secret|token)\s*=/iu,
        /\bread -[pr]\b/u,
        /\bsleep\b/u,
        /\bwhile true\b/u,
        /\bpkill\b|\bkillall\b/u,
      ]) {
        expect(script).not.toMatch(prohibited)
      }
    }
  })

  it('preserves prior committed evidence with one declared regeneration', async () => {
    expect(Object.keys(BL020_PRESERVED_EVIDENCE)).toEqual(
      PRIOR_EVIDENCE_COPIES.map(([disposable]) => disposable)
    )

    for (const [disposable, committed] of PRIOR_EVIDENCE_COPIES) {
      const expected =
        BL020_PRESERVED_EVIDENCE[
          disposable as keyof typeof BL020_PRESERVED_EVIDENCE
        ]
      const bytes = await readFile(path.join(REPOSITORY_ROOT, committed))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(expected)
    }

    // The one regeneration section 21 declares in advance: the published
    // failure table gained the two close rows, so its digest moved off the
    // base-SHA value and the BL-011 matrix is re-executed rather than edited.
    expect(WORKBENCH_FAILURE_TABLE).toHaveLength(BL020_PROXY_FAILURE_TABLE_ROWS)
    expect(WORKBENCH_FAILURE_TABLE_SHA256).not.toBe(
      BL020_REGENERATED_TABLE_BASE_SHA256
    )
  })
})
