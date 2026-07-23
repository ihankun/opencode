import vscodeIcon from '../../../../../assets/app-vscode.png'
import finderIcon from '../../../../../assets/app-finder.png'
import terminalIcon from '../../../../../assets/app-terminal.png'
import intellijIdeaIcon from '../../../../../assets/app-intellij-idea.png'
import cursorIcon from '../../../../../assets/app-cursor.png'

export type LocationApp = { id: string; name: string; icon?: string }

const locationAppIcons: Record<string, string> = {
  vscode: vscodeIcon,
  intellij: intellijIdeaIcon,
  cursor: cursorIcon,
  terminal: terminalIcon,
  default: finderIcon,
}

export function LocationAppIcon({ app, className }: { app: LocationApp; className: string }) {
  const icon = locationAppIcons[app.id] ?? app.icon
  if (!icon) return null
  return <img src={icon} alt="" aria-hidden="true" className={className} />
}
