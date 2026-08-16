import { createProjectLibrary } from '../src/project-library.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import {
  createProjectRuntimeConfig,
  type ReconcileRefusalReason,
} from '../src/project-runtime-contract.js'
import {
  defaultRuntimeAttributionPrimitives,
  defaultRuntimeProcessDependencies,
} from '../src/project-runtime-process.js'

export interface ControlRefusalWitness {
  readonly projectId: string
  readonly refusalReason: ReconcileRefusalReason | null
}

export async function observeControlRefusalReasons(input: {
  readonly databasePath: string
  readonly executablePath: string
}): Promise<readonly ControlRefusalWitness[]> {
  const library = await createProjectLibrary(input.databasePath)
  const manager = createProjectRuntimeManager({
    findProjectById: (id) => library.findById(id),
    listProjects: () => library.list(),
    config: createProjectRuntimeConfig({
      executablePath: input.executablePath,
    }),
    processDependencies: {
      ...defaultRuntimeProcessDependencies,
      attribution: defaultRuntimeAttributionPrimitives,
    },
  })
  try {
    await manager.beginReconciliation()
    for (let attempt = 0; attempt < 1_000; attempt += 1) {
      const inspection = manager.inspectReconciliation!()
      if (inspection.phase === 'settled') {
        const projects = await library.list()
        return projects.map((project) => {
          const observed = inspection.projects.find(
            ({ projectToken }) =>
              projectToken ===
              manager
                .inspectEntries()
                .find(({ projectId }) => projectId === project.id)?.projectToken
          )
          return {
            projectId: project.id,
            refusalReason: observed?.refusalReason ?? null,
          }
        })
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 10))
    }
    throw new Error('Control reconciliation did not settle within its bound')
  } finally {
    await manager.shutdown()
    library.close()
  }
}
