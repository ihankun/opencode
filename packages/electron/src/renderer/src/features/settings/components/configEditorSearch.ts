import type { SearchMenuItem } from '../settingsSearchCatalog'
import type { DrillEntry } from './configEditorDrillState'
import { KNOWN_ROOT_KEYS, SECTION_IDS, SECTION_META } from './configEditorMeta'
import type { JsonRecord, Lang, SectionID } from './configEditorTypes'
import { isRecord, tx } from './configEditorUtils'

export interface ConfigEditorSearchItem extends SearchMenuItem {
  section: SectionID
  stack: DrillEntry[]
  fieldKey?: string
}

const SENSITIVE_KEY = /(?:api.?key|access.?key|private.?key|auth|cookie|credential|pass(?:word)?|secret|session.?key|token)/i
const SENSITIVE_CONTAINER = /^(?:headers?|environment|env)$/i

const KNOWN_FIELD_PATHS = [
  ['model'], ['small_model'], ['default_agent'], ['subagent_depth'], ['shell'], ['username'], ['logLevel'], ['share'],
  ['autoupdate'], ['snapshot'], ['instructions'], ['disabled_providers'], ['enabled_providers'],
  ['server', 'port'], ['server', 'hostname'], ['server', 'mdns'], ['server', 'mdnsDomain'], ['server', 'cors'],
  ['skills', 'paths'], ['skills', 'urls'], ['attachment', 'image', 'auto_resize'], ['attachment', 'image', 'max_width'],
  ['attachment', 'image', 'max_height'], ['attachment', 'image', 'max_base64_bytes'], ['tool_output', 'max_lines'],
  ['tool_output', 'max_bytes'], ['compaction', 'auto'], ['compaction', 'prune'], ['compaction', 'tail_turns'],
  ['compaction', 'preserve_recent_tokens'], ['compaction', 'reserved'], ['watcher', 'ignore'], ['enterprise', 'url'],
  ['experimental', 'batch_tool'], ['experimental', 'openTelemetry'], ['experimental', 'disable_paste_summary'],
  ['experimental', 'continue_loop_on_deny'], ['experimental', 'mcp_timeout'], ['experimental', 'primary_tools'],
  ['$schema'], ['autoshare'], ['layout'], ['mode'],
]

function sectionFor(segments: string[]): SectionID {
  const root = segments[0]
  if (root === 'server') return 'server'
  if (root === 'command') return 'commands'
  if (root === 'skills' || root === 'references' || root === 'reference') return 'skills'
  if (root === 'plugin') return 'plugins'
  if (root === 'provider') return 'providers'
  if (root === 'agent') return 'agents'
  if (root === 'mcp') return 'mcp'
  if (root === 'permission') return 'permissions'
  if (root === 'formatter') return 'formatters'
  if (root === 'lsp') return 'lsp'
  if (root === 'attachment') return 'attachments'
  if (root === 'tool_output' || root === 'compaction' || root === 'watcher' || root === 'enterprise' || root === 'tools') return 'runtime'
  if (root === 'experimental') return 'experimental'
  if (root === '$schema' || root === 'autoshare' || root === 'layout' || root === 'mode') return 'compatibility'
  if (root && !KNOWN_ROOT_KEYS.has(root)) return 'advanced'
  return 'general'
}

function navigationFor(segments: string[]) {
  const section = sectionFor(segments)
  const stack: DrillEntry[] = []
  const [root, id, third, fourth, fifth, sixth] = segments
  const push = (entryId: string | undefined, title?: string) => {
    if (entryId) stack.push({ id: entryId, title: title ?? entryId })
  }
  let fieldKey: string | undefined
  if (root === 'server') fieldKey = id
  else if (root === 'command') { push(id ? `command:${id}` : undefined, id); fieldKey = third }
  else if (root === 'references' || root === 'reference') { push(id ? `${root === 'references' ? 'reference' : 'legacy-reference'}:${id}` : undefined, id ? `@${id}` : undefined); fieldKey = third }
  else if (root === 'skills') fieldKey = segments.slice(0, 2).join('.')
  else if (root === 'plugin') { push(id ? `plugin:${id}` : undefined, 'plugin'); fieldKey = third === '1' ? 'options' : 'name' }
  else if (root === 'provider') {
    push(id ? `provider:${id}` : undefined, id)
    if (third === 'models') { push('models', 'models'); push(fourth ? `model:${fourth}` : undefined, fourth); fieldKey = fifth }
    else fieldKey = third
  } else if (root === 'agent') { push(id ? `agent:${id}` : undefined, id); if (['permission', 'tools', 'options'].includes(third)) push(third, third); fieldKey = fourth ?? third }
  else if (root === 'mcp') { push(id ? `mcp:${id}` : undefined, id); if (['environment', 'headers', 'oauth'].includes(third)) push(third, third); fieldKey = fourth ?? third }
  else if (root === 'formatter') { push(id ? `formatter:${id}` : undefined, id); fieldKey = third }
  else if (root === 'lsp') { push(id ? `lsp:${id}` : undefined, id); fieldKey = third }
  else if (root === 'attachment') fieldKey = segments[2]
  else if (section === 'runtime') fieldKey = root === 'tools' ? 'tools' : segments.slice(0, 2).join('.')
  else if (root === 'experimental') fieldKey = id
  else if (root === 'mode') { push('mode', 'mode'); push(id ? `mode-agent:${id}` : undefined, id); fieldKey = sixth ?? fifth ?? fourth ?? third ?? 'mode' }
  else fieldKey = root
  return { section, stack, fieldKey }
}

function formatPath(segments: string[]) {
  return segments.reduce((path, segment, index) => {
    if (/^\d+$/.test(segment)) return `${path}[${segment}]`
    if (/^[A-Za-z_$][\w$]*$/.test(segment)) return index === 0 ? segment : `${path}.${segment}`
    return `${path}[${JSON.stringify(segment)}]`
  }, '')
}

function isSensitive(segments: string[]) {
  return segments.some(segment => SENSITIVE_KEY.test(segment) || SENSITIVE_CONTAINER.test(segment))
}

function preview(value: unknown, segments: string[], lang: Lang) {
  if (isSensitive(segments)) return tx('[sensitive value hidden]', '[敏感值已隐藏]', lang)
  if (Array.isArray(value)) return tx(`[${value.length} items]`, `[${value.length} 项]`, lang)
  if (isRecord(value)) return tx(`{${Object.keys(value).length} keys}`, `{${Object.keys(value).length} 个字段}`, lang)
  const serialized = JSON.stringify(value)
  if (serialized === undefined) return String(value)
  return serialized.length > 120 ? `${serialized.slice(0, 117)}...` : serialized
}

export function buildConfigEditorSearchItems(config: JsonRecord, lang: Lang): ConfigEditorSearchItem[] {
  const sectionItems = SECTION_IDS.map(section => ({
    id: `section:${section}`,
    label: tx(SECTION_META[section].en, SECTION_META[section].zh, lang),
    description: tx(SECTION_META[section].descEn, SECTION_META[section].descZh, lang),
    tabLabel: tx('Section', '分区', lang),
    section,
    stack: [],
  }))
  const configured: ConfigEditorSearchItem[] = []
  const pending: { value: unknown; segments: string[] }[] = [{ value: config, segments: [] }]
  while (pending.length > 0) {
    const current = pending.pop()
    if (!current) break
    if (current.segments.length > 0) {
      const navigation = navigationFor(current.segments)
      configured.push({
        id: `json:${JSON.stringify(current.segments)}`,
        label: formatPath(current.segments),
        description: preview(current.value, current.segments, lang),
        searchText: isSensitive(current.segments) ? '' : typeof current.value === 'string' ? current.value : '',
        tabLabel: tx(SECTION_META[navigation.section].en, SECTION_META[navigation.section].zh, lang),
        ...navigation,
      })
    }
    if (Array.isArray(current.value)) {
      current.value.forEach((value, index) => pending.push({ value, segments: [...current.segments, String(index)] }))
    } else if (isRecord(current.value)) {
      Object.entries(current.value).forEach(([key, value]) => pending.push({ value, segments: [...current.segments, key] }))
    }
  }
  const configuredDestinations = new Set(configured.map(item => `${item.section}:${item.stack.map(entry => entry.id).join('/')}:${item.fieldKey ?? ''}`))
  const available = KNOWN_FIELD_PATHS.flatMap(segments => {
    const navigation = navigationFor(segments)
    if (configuredDestinations.has(`${navigation.section}:${navigation.stack.map(entry => entry.id).join('/')}:${navigation.fieldKey ?? ''}`)) return []
    return [{
      id: `field:${formatPath(segments)}`,
      label: formatPath(segments),
      description: tx('Available field', '可配置字段', lang),
      tabLabel: tx(SECTION_META[navigation.section].en, SECTION_META[navigation.section].zh, lang),
      ...navigation,
    }]
  })
  return [...sectionItems, ...configured, ...available]
}
