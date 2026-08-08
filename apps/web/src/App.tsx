import { FolderOpen } from 'lucide-react'

export function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12">
      <header className="flex items-center justify-between border-b pb-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Project home
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Ascend</h1>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          type="button"
        >
          <FolderOpen aria-hidden="true" className="size-4" />
          Open Project
        </button>
      </header>

      <section
        aria-labelledby="empty-projects"
        className="rounded-xl border p-10"
      >
        <h2 className="text-xl font-semibold" id="empty-projects">
          Your workbenches will appear here
        </h2>
        <p className="mt-2 max-w-xl text-slate-600">
          Open an existing filesystem project to create a persistent,
          host-native development workbench.
        </p>
      </section>
    </main>
  )
}
