/// <reference lib="dom" />
import {
  WORKBENCH_FAILURE_TABLE,
  type WorkbenchPublicFailure,
} from './workbench-proxy-contract.js'

export const WORKBENCH_DOCUMENT_HEADER = 'x-ascend-workbench-document'
export const WORKBENCH_DOCUMENT_HEADER_VALUE = '1'
export const WORKBENCH_DOCUMENT_TIMEOUT_MS = 15_000

const shellStyles =
  'html,body{margin:0;min-height:100%;font-family:system-ui,sans-serif;color:#0f172a;background:#f8fafc}' +
  '.ascend-shell{min-height:100vh;display:grid;place-items:center;padding:2rem;box-sizing:border-box}' +
  '.ascend-card{max-width:42rem;border:1px solid #cbd5e1;border-radius:.75rem;background:white;padding:2rem}' +
  '.ascend-actions{display:flex;gap:1rem;margin-top:1.5rem}.ascend-action{color:#fff;background:#0f172a;padding:.65rem 1rem;border:0;border-radius:.4rem;text-decoration:none;font:inherit;cursor:pointer}' +
  '.ascend-action:focus-visible{outline:3px solid #2563eb;outline-offset:3px}' +
  '.ascend-workbench-header{position:fixed;inset:0 0 auto 0;height:2.5rem;z-index:2147483647;display:flex;align-items:center;gap:1rem;padding:0 .75rem;background:#0f172a;color:white;font:600 14px system-ui,sans-serif}' +
  '.ascend-workbench-header a{color:white;text-decoration:none;padding:.35rem .55rem;border-radius:.25rem}.ascend-workbench-header a:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}'

function retryableFailure(failure: WorkbenchPublicFailure): boolean {
  return !['invalid_project_id', 'project_not_found'].includes(failure.code)
}

interface BrowserShellConfiguration {
  readonly timeoutMs: number
  readonly header: string
  readonly headerValue: string
  readonly styles: string
  readonly failures: Record<string, { message: string; retry: boolean }>
}

function browserShell(configuration: BrowserShellConfiguration): void {
  let generation = 0
  let active: AbortController | undefined

  const show = (
    title: string,
    message: string,
    retry: boolean,
    persist = false
  ): void => {
    const loading = title === 'Opening workbench'
    document.body.innerHTML =
      '<main class="ascend-shell"><section class="ascend-card" role="' +
      (loading ? 'status' : 'alert') +
      '" aria-live="' +
      (loading ? 'polite' : 'assertive') +
      '"><h1 tabindex="-1"></h1><p></p><div class="ascend-actions"><a class="ascend-action" href="/">Projects</a></div></section></main>'
    if (persist)
      window.history.replaceState(
        { ascendWorkbenchFailure: { message, retry } },
        '',
        window.location.href
      )
    const heading = document.querySelector<HTMLHeadingElement>('h1')
    const paragraph = document.querySelector<HTMLParagraphElement>('p')
    if (heading !== null) heading.textContent = title
    if (paragraph !== null) paragraph.textContent = message
    if (retry) {
      const button = document.createElement('button')
      button.className = 'ascend-action'
      button.id = 'ascend-retry'
      button.type = 'button'
      button.textContent = 'Retry'
      button.addEventListener('click', () => {
        window.history.replaceState(null, '', window.location.href)
        void load()
      })
      document.querySelector('.ascend-actions')?.append(button)
    }
    heading?.focus()
  }

  const escapeAttribute = (value: string): string =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')

  const preserveWorkspace = (html: string, acquiredUrl: string): string => {
    const folder = new URL(acquiredUrl).searchParams.get('folder')
    if (folder === null) return html
    return html.replace(
      /(<meta\s+id=["']vscode-workbench-web-configuration["'][^>]*\sdata-settings=["'])([^"']*)(["'])/iu,
      (_match, start: string, encoded: string, end: string) => {
        const decoder = document.createElement('textarea')
        decoder.innerHTML = encoded
        const settings = JSON.parse(decoder.value) as {
          remoteAuthority?: unknown
          folderUri?: unknown
        }
        if (typeof settings.remoteAuthority !== 'string') return _match
        settings.folderUri = {
          scheme: 'vscode-remote',
          authority: settings.remoteAuthority,
          path: folder,
          query: '',
          fragment: '',
        }
        return start + escapeAttribute(JSON.stringify(settings)) + end
      }
    )
  }

  const decorate = (
    source: string,
    acquiredUrl: string,
    contentSecurityPolicy: string | null
  ): string => {
    const html = preserveWorkspace(source, acquiredUrl)
    const csp =
      contentSecurityPolicy === null
        ? ''
        : '<meta http-equiv="Content-Security-Policy" content="' +
          escapeAttribute(contentSecurityPolicy) +
          '">'
    const style = csp + '<style>' + configuration.styles + '</style>'
    const header =
      '<header class="ascend-workbench-header" aria-label="Ascend workbench"><span>Ascend</span><a href="/">Projects</a></header>'
    const withStyle = /<\/head>/iu.test(html)
      ? html.replace(/<\/head>/iu, style + '</head>')
      : style + html
    return /<body(?:\s[^>]*)?>/iu.test(withStyle)
      ? withStyle.replace(/<body(?:\s[^>]*)?>/iu, (match) => match + header)
      : header + withStyle
  }

  async function load(): Promise<void> {
    const mine = ++generation
    active?.abort()
    const controller = new AbortController()
    active = controller
    show(
      'Opening workbench',
      'The selected project workbench is loading.',
      false
    )
    const timer = window.setTimeout(
      () => controller.abort(),
      configuration.timeoutMs
    )
    try {
      const response = await fetch(window.location.href, {
        headers: { [configuration.header]: configuration.headerValue },
        cache: 'no-store',
        signal: controller.signal,
      })
      if (mine !== generation) return
      if (
        response.ok &&
        String(response.headers.get('content-type') ?? '')
          .toLowerCase()
          .includes('text/html')
      ) {
        const html = decorate(
          await response.text(),
          response.url,
          response.headers.get('content-security-policy')
        )
        if (mine !== generation) return
        window.history.replaceState(null, '', window.location.href)
        document.open()
        document.write(html)
        document.close()
        return
      }
      let code = ''
      try {
        const payload = (await response.json()) as { error?: { code?: string } }
        code = payload.error?.code ?? ''
      } catch {
        code = ''
      }
      if (mine !== generation) return
      const failure = configuration.failures[code] ?? {
        message: 'Workbench could not be loaded.',
        retry: true,
      }
      show('Workbench unavailable', failure.message, failure.retry, true)
    } catch (error) {
      if (mine !== generation) return
      show(
        'Workbench unavailable',
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Workbench document load timed out.'
          : 'Workbench could not be loaded.',
        true,
        true
      )
    } finally {
      window.clearTimeout(timer)
    }
  }

  const retained = window.history.state?.ascendWorkbenchFailure as
    { message?: unknown; retry?: unknown } | undefined
  if (
    retained !== undefined &&
    typeof retained.message === 'string' &&
    typeof retained.retry === 'boolean'
  )
    show('Workbench unavailable', retained.message, retained.retry)
  else void load()
}

const browserConfiguration = (
  timeoutMs: number
): BrowserShellConfiguration => ({
  timeoutMs,
  header: WORKBENCH_DOCUMENT_HEADER,
  headerValue: WORKBENCH_DOCUMENT_HEADER_VALUE,
  styles: shellStyles,
  failures: Object.fromEntries(
    WORKBENCH_FAILURE_TABLE.map((failure) => [
      failure.code,
      { message: failure.message, retry: retryableFailure(failure) },
    ])
  ),
})

const shellScript = (timeoutMs: number): string =>
  '(' +
  browserShell.toString() +
  ')(' +
  JSON.stringify(browserConfiguration(timeoutMs)).replaceAll('<', '\u003c') +
  ');'

export const renderWorkbenchNavigationShell = (
  timeoutMs = WORKBENCH_DOCUMENT_TIMEOUT_MS
): string => {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)
    throw new Error('Workbench document timeout must be a positive integer')
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ascend workbench</title><style>' +
    shellStyles +
    '</style></head><body><main class="ascend-shell"><section class="ascend-card" role="status" aria-live="polite"><h1 tabindex="-1">Opening workbench</h1><p>The selected project workbench is loading.</p></section></main><script>' +
    shellScript(timeoutMs) +
    '</script></body></html>'
  )
}

export const renderWorkbenchRouteError = (): string =>
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Project route unavailable</title><style>' +
  shellStyles +
  '</style></head><body><main class="ascend-shell"><section class="ascend-card" role="alert" aria-live="assertive"><h1 tabindex="-1">Project route unavailable</h1><p>Project ID is invalid.</p><div class="ascend-actions"><a class="ascend-action" href="/">Projects</a></div></section></main><script>document.querySelector("h1")?.focus()</script></body></html>'

export const isWorkbenchDocumentRequest = (
  headers: Record<string, unknown>
): boolean =>
  headers[WORKBENCH_DOCUMENT_HEADER] === WORKBENCH_DOCUMENT_HEADER_VALUE

export const isTopLevelBrowserDocument = (
  headers: Record<string, unknown>
): boolean =>
  String(headers['sec-fetch-dest'] ?? '') === 'document' ||
  String(headers.accept ?? '')
    .toLowerCase()
    .includes('text/html')
