export type WorkbenchNavigator = (url: string) => void

export const stableWorkbenchUrl = (stableId: string): string =>
  '/projects/' + encodeURIComponent(stableId) + '/workbench/'

export const browserWorkbenchNavigator: WorkbenchNavigator = (url) => {
  window.location.assign(url)
}
