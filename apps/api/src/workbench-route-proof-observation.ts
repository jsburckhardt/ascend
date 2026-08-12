import { createHash } from 'node:crypto'

export interface ResourceInventory {
  readonly kind: string
  readonly opened: readonly string[]
  readonly closed: readonly string[]
  readonly pending: readonly string[]
}

export interface ResourceTracker {
  open(id: string): void
  close(id: string): void
  inventory(): ResourceInventory
}

export function createResourceTracker(kind: string): ResourceTracker {
  const opened = new Set<string>()
  const closed = new Set<string>()
  return {
    open(id) {
      if (opened.has(id)) throw new Error(`Duplicate ${kind} resource: ${id}`)
      opened.add(id)
    },
    close(id) {
      if (!opened.has(id)) throw new Error(`Unknown ${kind} resource: ${id}`)
      closed.add(id)
    },
    inventory() {
      return Object.freeze({
        kind,
        opened: Object.freeze([...opened]),
        closed: Object.freeze([...closed]),
        pending: Object.freeze([...opened].filter((id) => !closed.has(id))),
      })
    },
  }
}

export interface SentinelScan {
  readonly id: string
  readonly literalMatches: number
  readonly encodedMatches: number
}

const countMatches = (capture: string, value: string): number =>
  value.length === 0 ? 0 : capture.split(value).length - 1

export function scanSentinels(
  capture: string,
  sentinels: Readonly<Record<string, string>>
): readonly SentinelScan[] {
  return Object.freeze(
    Object.entries(sentinels).map(([id, sentinel]) => ({
      id,
      literalMatches: countMatches(capture, sentinel),
      encodedMatches: countMatches(capture, encodeURIComponent(sentinel)),
    }))
  )
}

export function observedDigest(chunks: readonly Buffer[]): string {
  return createHash('sha256').update(Buffer.concat(chunks)).digest('hex')
}

export function assertObservedInventoryEmpty(
  inventory: ResourceInventory
): void {
  if (inventory.opened.length === 0)
    throw new Error(`No ${inventory.kind} resources were observed`)
  if (inventory.pending.length !== 0)
    throw new Error(`${inventory.kind} resources remain pending`)
}

export type BrowserRequestClass =
  | 'ascend-owned'
  | 'trusted-markdown-webview'
  | 'browser-local'
  | 'marketplace'
  | 'forbidden-external'

export interface SafeBrowserRequestObservation {
  readonly classification: BrowserRequestClass
  readonly schemeClass:
    'ascend-http' | 'browser-local' | 'https' | 'http' | 'websocket' | 'other'
  readonly hostClass:
    | 'ascend-origin'
    | 'vscode-markdown-resource'
    | 'browser-local'
    | 'extension-marketplace'
    | 'forbidden-external'
  readonly credentialClass: 'absent' | 'present'
  readonly portClass: 'absent' | 'explicit'
  readonly authorityLeakClass: 'absent' | 'present'
  readonly pathnameClass:
    | 'stable-workbench-prefix'
    | 'webview-out-resource'
    | 'webview-resource'
    | 'browser-generated-resource'
    | 'external-resource'
  readonly queryKeyClass: 'none' | 'present'
  readonly resourceType:
    | 'document'
    | 'stylesheet'
    | 'script'
    | 'image'
    | 'font'
    | 'xhr'
    | 'fetch'
    | 'webview-frame'
    | 'other'
}

const MARKDOWN_WEBVIEW_HOST =
  /^vscode-remote\+(?:[a-z0-9]|-[0-9a-f]{4})+\.vscode-resource\.vscode-cdn\.net$/u
const MARKDOWN_WEBVIEW_HOST_TOKEN =
  /^vscode-remote\+((?:[a-z0-9]|-[0-9a-f]{4})+)\.vscode-resource\.vscode-cdn\.net$/u

export const WORKBENCH_MARKDOWN_WEBVIEW_HOST_GRAMMAR =
  MARKDOWN_WEBVIEW_HOST.source

export interface WorkbenchBrowserClassifierVector {
  readonly id: string
  readonly url: string
  readonly expected: BrowserRequestClass
}

export const WORKBENCH_BROWSER_CLASSIFIER_VECTORS: readonly WorkbenchBrowserClassifierVector[] =
  Object.freeze([
    {
      id: 'trusted-retained-hostname',
      url: 'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'trusted-markdown-webview',
    },
    {
      id: 'bare-suffix',
      url: 'https://vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'empty-token',
      url: 'https://vscode-remote+.vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'arbitrary-plus-prefix',
      url: 'https://abc+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'free-hyphen',
      url: 'https://vscode-remote+fixture-raw.vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'short-escape',
      url: 'https://vscode-remote+fixture-03a.vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'nonhex-escape',
      url: 'https://vscode-remote+fixture-00zz43210.vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'extra-sublabel',
      url: 'https://vscode-remote+fixture-003a43210.extra.vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'suffix-confusion',
      url: 'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net.evil.test/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'username',
      url: 'https://user@vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'password',
      url: 'https://user:pass@vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'alternate-port',
      url: 'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net:444/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'explicit-default-port',
      url: 'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net:443/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'http',
      url: 'http://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'ws',
      url: 'ws://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'wss',
      url: 'wss://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'unrelated-external',
      url: 'https://arbitrary.example/out/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'raw-authority-path',
      url: 'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/fixture:43210/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'raw-authority-query',
      url: 'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css?authority=fixture:43210',
      expected: 'forbidden-external',
    },
    {
      id: 'percent-authority-path',
      url: 'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/fixture%3A43210/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'percent-authority-query',
      url: 'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css?authority=fixture%3A43210',
      expected: 'forbidden-external',
    },
    {
      id: 'label-authority-path',
      url: 'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/fixture-003a43210/file.css',
      expected: 'forbidden-external',
    },
    {
      id: 'label-authority-query',
      url: 'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css?authority=fixture-003a43210',
      expected: 'forbidden-external',
    },
  ])

const marketplaceHost = (hostname: string): boolean =>
  hostname === 'open-vsx.org' ||
  hostname.endsWith('.open-vsx.org') ||
  hostname === 'marketplace.visualstudio.com' ||
  hostname.endsWith('.marketplace.visualstudio.com') ||
  hostname === 'vsassets.io' ||
  hostname.endsWith('.vsassets.io')

const boundedResourceType = (
  resourceType: string
): SafeBrowserRequestObservation['resourceType'] =>
  [
    'document',
    'stylesheet',
    'script',
    'image',
    'font',
    'xhr',
    'fetch',
    'webview-frame',
  ].includes(resourceType)
    ? (resourceType as SafeBrowserRequestObservation['resourceType'])
    : 'other'

const rawAuthoritySyntax = (rawUrl: string): string =>
  /^[A-Za-z][A-Za-z0-9+.-]*:\/\/([^/?#]*)/u.exec(rawUrl)?.[1] ?? ''

const decodeVscodeAuthorityToken = (token: string): string => {
  let decoded = ''
  for (let index = 0; index < token.length; index += 1) {
    if (token[index] !== '-') {
      decoded += token[index]
      continue
    }
    decoded += String.fromCodePoint(
      Number.parseInt(token.slice(index + 1, index + 5), 16)
    )
    index += 4
  }
  return decoded
}

const authorityCopiedIntoPathOrQuery = (
  url: URL,
  encodedAuthority: string
): boolean => {
  const pathAndQuery = url.pathname + url.search
  let decodedPathAndQuery = pathAndQuery
  try {
    decodedPathAndQuery = decodeURIComponent(pathAndQuery)
  } catch {
    return true
  }
  const authority = decodeVscodeAuthorityToken(encodedAuthority)
  const candidates = [
    authority,
    encodeURIComponent(authority),
    encodedAuthority,
  ].map((value) => value.toLowerCase())
  const surfaces = [pathAndQuery, decodedPathAndQuery].map((value) =>
    value.toLowerCase()
  )
  return candidates.some((candidate) =>
    surfaces.some((surface) => surface.includes(candidate))
  )
}

const schemeClass = (
  url: URL,
  stableOrigin: string
): SafeBrowserRequestObservation['schemeClass'] => {
  if (url.protocol === 'blob:' && url.origin === stableOrigin)
    return 'browser-local'
  if (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.origin === stableOrigin
  )
    return 'ascend-http'
  if (url.protocol === 'https:') return 'https'
  if (url.protocol === 'http:') return 'http'
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return 'websocket'
  return 'other'
}

export function classifyWorkbenchBrowserRequest(
  rawUrl: string,
  stableOrigin: string,
  stablePrefix: string,
  resourceType: string
): SafeBrowserRequestObservation {
  const url = new URL(rawUrl)
  const stable =
    url.origin === stableOrigin && url.pathname.startsWith(stablePrefix)
  const browserLocal = url.protocol === 'blob:' && url.origin === stableOrigin
  const authoritySyntax = rawAuthoritySyntax(rawUrl)
  const credentialsPresent =
    authoritySyntax.includes('@') || url.username !== '' || url.password !== ''
  const hostSyntax = authoritySyntax.slice(authoritySyntax.lastIndexOf('@') + 1)
  const explicitPort = hostSyntax.includes(':')
  const markdownHostMatches = MARKDOWN_WEBVIEW_HOST.test(url.hostname)
  const encodedAuthority = MARKDOWN_WEBVIEW_HOST_TOKEN.exec(url.hostname)?.[1]
  const authorityLeak =
    encodedAuthority === undefined
      ? false
      : authorityCopiedIntoPathOrQuery(url, encodedAuthority)
  const trustedWebview =
    url.protocol === 'https:' &&
    markdownHostMatches &&
    encodedAuthority !== undefined &&
    !credentialsPresent &&
    !explicitPort &&
    url.port === '' &&
    !authorityLeak
  const classification: BrowserRequestClass = stable
    ? 'ascend-owned'
    : browserLocal
      ? 'browser-local'
      : marketplaceHost(url.hostname)
        ? 'marketplace'
        : trustedWebview
          ? 'trusted-markdown-webview'
          : 'forbidden-external'
  return Object.freeze({
    classification,
    schemeClass: schemeClass(url, stableOrigin),
    hostClass:
      classification === 'ascend-owned'
        ? 'ascend-origin'
        : classification === 'trusted-markdown-webview'
          ? 'vscode-markdown-resource'
          : classification === 'browser-local'
            ? 'browser-local'
            : classification === 'marketplace'
              ? 'extension-marketplace'
              : 'forbidden-external',
    credentialClass: credentialsPresent ? 'present' : 'absent',
    portClass: explicitPort || url.port !== '' ? 'explicit' : 'absent',
    authorityLeakClass: authorityLeak ? 'present' : 'absent',
    pathnameClass:
      classification === 'ascend-owned'
        ? 'stable-workbench-prefix'
        : classification === 'browser-local'
          ? 'browser-generated-resource'
          : markdownHostMatches && url.pathname.startsWith('/out/')
            ? 'webview-out-resource'
            : markdownHostMatches
              ? 'webview-resource'
              : 'external-resource',
    queryKeyClass: url.search === '' ? 'none' : 'present',
    resourceType: boundedResourceType(resourceType),
  })
}

export interface SafeWebSocketObservation {
  readonly sameOrigin: boolean
  readonly stablePrefix: boolean
  readonly internalPortAbsent: boolean
  readonly reconnection: string | null
  readonly queryKeys: readonly string[]
  readonly pathnameClass: 'stable-runtime-socket' | 'unknown'
}

export function classifyWorkbenchWebSocketUrl(
  rawUrl: string,
  stableWebSocketOrigin: string,
  stablePrefix: string,
  internalPort: number
): SafeWebSocketObservation {
  const url = new URL(rawUrl)
  const suffix = url.pathname.startsWith(stablePrefix)
    ? url.pathname.slice(stablePrefix.length)
    : ''
  return Object.freeze({
    sameOrigin: url.origin === stableWebSocketOrigin,
    stablePrefix: url.pathname.startsWith(stablePrefix),
    internalPortAbsent: !rawUrl.includes(':' + String(internalPort)),
    reconnection: url.searchParams.get('reconnection'),
    queryKeys: Object.freeze([...new Set(url.searchParams.keys())].sort()),
    pathnameClass: /^stable-[a-f0-9]{40}$/u.test(suffix)
      ? 'stable-runtime-socket'
      : 'unknown',
  })
}
