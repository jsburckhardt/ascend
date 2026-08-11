import { useState } from 'react'
import { type ProjectLoader } from './projects'
import { useProjectList } from './use-project-list'

export interface AppProperties {
  readonly loadProjectList?: ProjectLoader
}

export function App({ loadProjectList }: AppProperties) {
  const { state, retry } = useProjectList(loadProjectList)
  const [deferredProjectId, setDeferredProjectId] = useState<string>()

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12">
      <header className="border-b pb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Project home
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Ascend</h1>
      </header>

      {state.status === 'loading' ? (
        <section
          className="rounded-xl border p-10"
          aria-labelledby="loading-projects"
        >
          <h2 className="text-xl font-semibold" id="loading-projects">
            Registered projects
          </h2>
          <p aria-live="polite" className="mt-2 text-slate-600" role="status">
            Loading registered projects…
          </p>
        </section>
      ) : null}

      {state.status === 'failure' ? (
        <section
          aria-labelledby="project-list-failure"
          className="rounded-xl border border-red-300 p-10"
          role="alert"
        >
          <h2 className="text-xl font-semibold" id="project-list-failure">
            Projects could not be loaded
          </h2>
          <p className="mt-2 max-w-xl text-slate-700">
            Check that the Ascend API is running, then retry the project list.
          </p>
          <button
            className="mt-5 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            onClick={retry}
            type="button"
          >
            Retry
          </button>
        </section>
      ) : null}

      {state.status === 'success' && state.projects.length === 0 ? (
        <section
          aria-labelledby="empty-projects"
          className="rounded-xl border p-10"
        >
          <h2 className="text-xl font-semibold" id="empty-projects">
            No registered projects
          </h2>
          <p className="mt-2 max-w-xl text-slate-600">
            Registered projects will appear here on Project Home.
          </p>
        </section>
      ) : null}

      {state.status === 'success' && state.projects.length > 0 ? (
        <section aria-labelledby="registered-projects">
          <h2 className="text-2xl font-semibold" id="registered-projects">
            Registered projects
          </h2>
          <ul aria-label="Registered projects" className="mt-6 grid gap-4">
            {state.projects.map((project) => (
              <li className="rounded-xl border bg-white p-6" key={project.id}>
                <h3 className="text-lg font-semibold">{project.name}</h3>
                <p
                  className="mt-2 whitespace-pre-wrap text-sm text-slate-600 [overflow-wrap:anywhere]"
                  title={project.canonicalPath}
                >
                  {project.canonicalPath}
                </p>
                <button
                  aria-label={'Open ' + project.name}
                  className="mt-5 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                  data-project-id={project.id}
                  onClick={() => setDeferredProjectId(project.id)}
                  type="button"
                >
                  Open
                </button>
                {deferredProjectId === project.id ? (
                  <p className="mt-3 text-sm text-slate-700" role="status">
                    {project.name}: Opening is not available in BL-007.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
