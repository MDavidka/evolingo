export type ArlenComponentTopic =
  // Layout & Structure (10)
  | 'AppShell'
  | 'Stack'
  | 'Row'
  | 'Grid'
  | 'Container'
  | 'Section'
  | 'Divider'
  | 'Spacer'
  | 'ScrollArea'
  | 'SplitPanel'
  // Buttons & Actions (6)
  | 'Button'
  | 'IconButton'
  | 'ActionGroup'
  | 'FloatingActionButton'
  | 'SegmentedControl'
  | 'ChipButton'
  // Inputs & Forms (16)
  | 'TextField'
  | 'TextArea'
  | 'SearchField'
  | 'PasswordField'
  | 'NumberStepper'
  | 'Select'
  | 'Checkbox'
  | 'RadioGroup'
  | 'Toggle'
  | 'Slider'
  | 'DatePicker'
  | 'TimePicker'
  | 'TagInput'
  | 'FileDropzone'
  | 'OTPInput'
  | 'RatingInput'
  // Cards & Surfaces (7)
  | 'Card'
  | 'InfoCard'
  | 'ActionCard'
  | 'MetricCard'
  | 'MediaCard'
  | 'ExpandableCard'
  | 'BannerCard'
  // Profiles & Identity (6)
  | 'ProfileHeader'
  | 'Avatar'
  | 'AvatarGroup'
  | 'UserRow'
  | 'ProfileStats'
  | 'AccountBadge'
  // Navigation & Chrome (6)
  | 'TopBar'
  | 'TabBar'
  | 'Breadcrumb'
  | 'Pagination'
  | 'SidebarNav'
  | 'StepIndicator'
  // Data Display & Lists (10)
  | 'ListItem'
  | 'KeyValueRow'
  | 'Badge'
  | 'Tag'
  | 'Pill'
  | 'Timeline'
  | 'Accordion'
  | 'Table'
  | 'StatTile'
  | 'SparklineBar'
  | 'CalendarStrip'
  // Feedback & Overlays (9)
  | 'Alert'
  | 'Toast'
  | 'ModalSheet'
  | 'ConfirmDialog'
  | 'LoadingIndicator'
  | 'Skeleton'
  | 'ProgressBar'
  | 'EmptyState'
  | 'ErrorState'
  // Content & Utilities (6)
  | 'Heading'
  | 'Text'
  | 'CodeBlock'
  | 'JSONViewer'
  | 'MarkdownBlock'
  | 'StatusIndicator'
  | 'CountdownTimer'
  | 'AudioPlayerBar'

export const ARLEN_COMPONENT_CATALOG: Record<
  ArlenComponentTopic,
  {category: string; variants: string[]; description: string}
> = {
  AppShell: {category: 'Layout', variants: ['default', 'padded', 'compact'], description: 'Root mini-app container'},
  Stack: {category: 'Layout', variants: ['default', 'tight', 'relaxed'], description: 'Vertical stack layout'},
  Row: {category: 'Layout', variants: ['default', 'between', 'center', 'wrap'], description: 'Horizontal flex row'},
  Grid: {category: 'Layout', variants: ['2col', '3col', 'auto'], description: 'Responsive grid layout'},
  Container: {category: 'Layout', variants: ['narrow', 'default', 'wide'], description: 'Centered content width'},
  Section: {category: 'Layout', variants: ['plain', 'grouped', 'inset'], description: 'Titled content section'},
  Divider: {category: 'Layout', variants: ['hairline', 'dashed', 'inset'], description: 'Horizontal separator'},
  Spacer: {category: 'Layout', variants: ['sm', 'md', 'lg'], description: 'Flexible spacing gap'},
  ScrollArea: {category: 'Layout', variants: ['vertical', 'horizontal'], description: 'Scrollable viewport'},
  SplitPanel: {category: 'Layout', variants: ['equal', 'sidebar'], description: 'Two-pane layout'},

  Button: {category: 'Buttons', variants: ['primary', 'secondary', 'ghost', 'destructive', 'pill', 'glass', 'outline'], description: 'Interactive action button'},
  IconButton: {category: 'Buttons', variants: ['circle', 'square', 'glass', 'ghost'], description: '44pt icon-only button'},
  ActionGroup: {category: 'Buttons', variants: ['horizontal', 'vertical', 'attached'], description: 'Grouped action buttons'},
  FloatingActionButton: {category: 'Buttons', variants: ['dark', 'light', 'pill'], description: 'Floating primary action'},
  SegmentedControl: {category: 'Buttons', variants: ['pill', 'underline', 'compact'], description: 'Tab/mode switcher'},
  ChipButton: {category: 'Buttons', variants: ['default', 'selected', 'outline'], description: 'Selectable filter chip'},

  TextField: {category: 'Inputs', variants: ['default', 'filled', 'underlined', 'pill'], description: 'Single-line text input'},
  TextArea: {category: 'Inputs', variants: ['default', 'filled', 'bordered'], description: 'Multi-line text input'},
  SearchField: {category: 'Inputs', variants: ['pill', 'subtle', 'floating'], description: 'Search input with icon'},
  PasswordField: {category: 'Inputs', variants: ['default', 'filled'], description: 'Masked password input'},
  NumberStepper: {category: 'Inputs', variants: ['default', 'compact', 'pill'], description: 'Increment/decrement stepper'},
  Select: {category: 'Inputs', variants: ['default', 'pill', 'inline'], description: 'Option picker'},
  Checkbox: {category: 'Inputs', variants: ['default', 'card', 'circle'], description: 'Boolean checkbox'},
  RadioGroup: {category: 'Inputs', variants: ['list', 'cards', 'inline'], description: 'Single-choice radio group'},
  Toggle: {category: 'Inputs', variants: ['switch', 'pill', 'row'], description: 'On/off switch'},
  Slider: {category: 'Inputs', variants: ['continuous', 'stepped', 'minimal'], description: 'Range value slider'},
  DatePicker: {category: 'Inputs', variants: ['default', 'compact'], description: 'Date selector'},
  TimePicker: {category: 'Inputs', variants: ['default', 'compact'], description: 'Time selector'},
  TagInput: {category: 'Inputs', variants: ['default', 'pill'], description: 'Multi-tag entry input'},
  FileDropzone: {category: 'Inputs', variants: ['dashed', 'compact'], description: 'File upload drop area'},
  OTPInput: {category: 'Inputs', variants: ['boxes', 'underline'], description: 'Verification code input'},
  RatingInput: {category: 'Inputs', variants: ['stars', 'hearts', 'numeric'], description: 'Interactive rating selector'},

  Card: {category: 'Cards', variants: ['flat', 'elevated', 'outlined', 'glass', 'interactive'], description: 'Versatile content card'},
  InfoCard: {category: 'Cards', variants: ['subtle', 'bordered', 'accent'], description: 'Informational callout card'},
  ActionCard: {category: 'Cards', variants: ['default', 'compact', 'tile'], description: 'Tappable action tile'},
  MetricCard: {category: 'Cards', variants: ['default', 'trend', 'compact'], description: 'KPI / metric readout card'},
  MediaCard: {category: 'Cards', variants: ['horizontal', 'vertical', 'cover'], description: 'Visual media preview card'},
  ExpandableCard: {category: 'Cards', variants: ['default', 'minimal'], description: 'Collapsible detail card'},
  BannerCard: {category: 'Cards', variants: ['subtle', 'dark', 'blue'], description: 'Full-width highlight banner'},

  ProfileHeader: {category: 'Profiles', variants: ['centered', 'compact', 'horizontal'], description: 'User profile hero block'},
  Avatar: {category: 'Profiles', variants: ['xs', 'sm', 'md', 'lg', 'xl', 'ring'], description: 'User avatar circle'},
  AvatarGroup: {category: 'Profiles', variants: ['stacked', 'spaced'], description: 'Overlapping member avatars'},
  UserRow: {category: 'Profiles', variants: ['default', 'selectable', 'action'], description: 'Person list row'},
  ProfileStats: {category: 'Profiles', variants: ['3col', '2col', 'inline'], description: 'Followers/metrics bar'},
  AccountBadge: {category: 'Profiles', variants: ['verified', 'pro', 'guest'], description: 'Account tier pill'},

  TopBar: {category: 'Navigation', variants: ['default', 'large', 'minimal'], description: 'Screen header bar'},
  TabBar: {category: 'Navigation', variants: ['pill', 'underline', 'floating'], description: 'Tab switcher bar'},
  Breadcrumb: {category: 'Navigation', variants: ['slash', 'chevron'], description: 'Hierarchical path trail'},
  Pagination: {category: 'Navigation', variants: ['numbers', 'compact', 'dots'], description: 'Page navigation controls'},
  SidebarNav: {category: 'Navigation', variants: ['default', 'compact'], description: 'Vertical nav list'},
  StepIndicator: {category: 'Navigation', variants: ['linear', 'numbered', 'dots'], description: 'Multi-step progress'},

  ListItem: {category: 'Data', variants: ['default', 'subtitle', 'chevron', 'card'], description: 'Structured list row'},
  KeyValueRow: {category: 'Data', variants: ['default', 'bordered', 'mono'], description: 'Label-value pair row'},
  Badge: {category: 'Data', variants: ['neutral', 'accent', 'success', 'warning', 'danger', 'outline'], description: 'Small status badge'},
  Tag: {category: 'Data', variants: ['subtle', 'solid', 'outline'], description: 'Category tag'},
  Pill: {category: 'Data', variants: ['light', 'dark', 'blue'], description: 'Rounded capsule label'},
  Timeline: {category: 'Data', variants: ['vertical', 'compact'], description: 'Chronological event feed'},
  Accordion: {category: 'Data', variants: ['default', 'bordered', 'flush'], description: 'Expandable FAQ/section'},
  Table: {category: 'Data', variants: ['clean', 'striped', 'compact'], description: 'Structured data table'},
  StatTile: {category: 'Data', variants: ['default', 'minimal', 'bordered'], description: 'Compact stat block'},
  SparklineBar: {category: 'Data', variants: ['bars', 'accent', 'minimal'], description: 'Mini bar chart'},
  CalendarStrip: {category: 'Data', variants: ['week', 'compact'], description: '7-day date strip'},

  Alert: {category: 'Feedback', variants: ['info', 'success', 'warning', 'danger'], description: 'Inline status alert'},
  Toast: {category: 'Feedback', variants: ['dark', 'light', 'success'], description: 'Ephemeral toast banner'},
  ModalSheet: {category: 'Feedback', variants: ['sheet', 'card'], description: 'Inline modal container'},
  ConfirmDialog: {category: 'Feedback', variants: ['default', 'destructive'], description: 'Confirmation prompt'},
  LoadingIndicator: {category: 'Feedback', variants: ['spinner', 'dots', 'shimmer'], description: 'Loading state indicator'},
  Skeleton: {category: 'Feedback', variants: ['text', 'card', 'avatar'], description: 'Content placeholder shimmer'},
  ProgressBar: {category: 'Feedback', variants: ['linear', 'pill', 'labeled'], description: 'Completion progress bar'},
  EmptyState: {category: 'Feedback', variants: ['default', 'compact', 'bordered'], description: 'Empty collection placeholder'},
  ErrorState: {category: 'Feedback', variants: ['default', 'inline'], description: 'Error recovery block'},

  Heading: {category: 'Content', variants: ['h1', 'h2', 'h3', 'subtitle'], description: 'Typography heading'},
  Text: {category: 'Content', variants: ['body', 'muted', 'caption', 'mono'], description: 'Typography paragraph'},
  CodeBlock: {category: 'Content', variants: ['light', 'dark'], description: 'Formatted code snippet'},
  JSONViewer: {category: 'Content', variants: ['compact', 'expanded'], description: 'Formatted JSON inspector'},
  MarkdownBlock: {category: 'Content', variants: ['default', 'compact'], description: 'Rich text block'},
  StatusIndicator: {category: 'Content', variants: ['online', 'idle', 'busy', 'offline'], description: 'Live dot + status text'},
  CountdownTimer: {category: 'Content', variants: ['default', 'pill', 'large'], description: 'Interactive timer widget'},
  AudioPlayerBar: {category: 'Content', variants: ['compact', 'card'], description: 'Mini audio control bar'},
}

export type ArlenUIAction =
  | {type: 'set'; key: string; value: string | number | boolean}
  | {type: 'toggle'; key: string}
  | {type: 'increment'; key: string; by?: number; max?: number}
  | {type: 'decrement'; key: string; by?: number; min?: number}
  | {type: 'append'; listKey: string; fromKey?: string; value?: string; template?: Record<string, unknown>}
  | {type: 'remove'; listKey: string; index?: number; id?: string}
  | {type: 'toggleListItem'; listKey: string; index?: number; id?: string; field?: string}
  | {type: 'reset'}

export type ArlenUINode = {
  id?: string
  type: ArlenComponentTopic | string
  variant?: string
  label?: string
  title?: string
  subtitle?: string
  text?: string
  placeholder?: string
  value?: string | number | boolean
  stateKey?: string
  listKey?: string
  options?: string[]
  min?: number
  max?: number
  step?: number
  icon?: string
  badge?: string
  progress?: number
  data?: number[]
  columns?: string[]
  rows?: Array<Record<string, string | number | boolean>>
  items?: Array<{id?: string; title: string; subtitle?: string; value?: string; done?: boolean; badge?: string}>
  action?: ArlenUIAction
  children?: ArlenUINode[]
}

export type ArlenAppManifest = {
  schema: 'arlen-app/v1'
  title: string
  subtitle?: string
  initialState?: Record<string, unknown>
  nodes: ArlenUINode[]
}

export function componentCatalogSummaryForPrompt(): string {
  const entries = Object.entries(ARLEN_COMPONENT_CATALOG).map(
    ([name, info]) => `${name}(${info.variants.join('|')})`,
  )
  return entries.join(', ')
}

export function parseAppManifest(files: Record<string, string>, fallbackTitle: string, fallbackDesc?: string): ArlenAppManifest {
  const rawJson = files['src/app.ui.json']
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as Partial<ArlenAppManifest>
      if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
        return {
          schema: 'arlen-app/v1',
          title: parsed.title || fallbackTitle,
          subtitle: parsed.subtitle || fallbackDesc,
          initialState: parsed.initialState || {},
          nodes: parsed.nodes,
        }
      }
    } catch {
      // fall through to TSX parser
    }
  }
  return parseTsxToManifest(files['src/App.tsx'] || '', fallbackTitle, fallbackDesc)
}

export function parseTsxToManifest(source: string, fallbackTitle: string, fallbackDesc?: string): ArlenAppManifest {
  const nodes: ArlenUINode[] = []
  const h1Match = source.match(/<h1>([^<{]+)<\/h1>/)
  const title = (h1Match && h1Match[1].trim()) || fallbackTitle || 'Mini App'

  nodes.push({
    type: 'Heading',
    variant: 'h1',
    text: title,
  })

  const pMatches = [...source.matchAll(/<p>([^<{]{2,200})<\/p>/g)]
  if (pMatches.length > 0) {
    nodes.push({type: 'Text', variant: 'muted', text: pMatches[0][1].trim()})
  } else if (fallbackDesc) {
    nodes.push({type: 'Text', variant: 'muted', text: fallbackDesc})
  }

  // Extract common @myspace/ui tags from legacy TSX
  const tagRegex = /<(TextField|TextArea|SearchField|Button|Toggle|Checkbox|Slider|ProgressBar|Badge|Alert|Card|MetricCard|ProfileHeader|StatusIndicator)\b([^>]*)(?:\/>|>([^<]*)<\/\1>)/g
  let idx = 0
  for (const match of source.matchAll(tagRegex)) {
    const [, tag, attrs, inner] = match
    const labelMatch = attrs.match(/label="([^"]+)"/)
    const titleMatch = attrs.match(/title="([^"]+)"/)
    const variantMatch = attrs.match(/variant="([^"]+)"/)
    const stateKey = `field_${idx++}`
    if (tag === 'TextField' || tag === 'TextArea' || tag === 'SearchField') {
      nodes.push({
        type: tag,
        variant: variantMatch?.[1] || 'default',
        label: labelMatch?.[1] || 'Input',
        placeholder: `Enter ${(labelMatch?.[1] || 'text').toLowerCase()}…`,
        stateKey,
      })
    } else if (tag === 'Toggle' || tag === 'Checkbox') {
      nodes.push({
        type: tag,
        variant: variantMatch?.[1] || 'default',
        label: labelMatch?.[1] || inner?.trim() || 'Option',
        stateKey,
      })
    } else if (tag === 'Slider') {
      nodes.push({
        type: 'Slider',
        label: labelMatch?.[1] || 'Value',
        min: 0,
        max: 100,
        stateKey,
      })
    } else if (tag === 'Button') {
      const btnText = inner?.trim()
      if (btnText && !btnText.includes('{')) {
        nodes.push({
          type: 'Button',
          variant: variantMatch?.[1] || 'primary',
          label: btnText,
          action: {type: 'increment', key: 'clicks', by: 1},
        })
      }
    } else if (tag === 'Badge' || tag === 'Alert' || tag === 'StatusIndicator') {
      const text = inner?.trim()
      if (text && !text.includes('{')) {
        nodes.push({type: tag, variant: variantMatch?.[1] || 'neutral', text})
      }
    } else if (tag === 'MetricCard' || tag === 'ProfileHeader') {
      nodes.push({
        type: tag,
        title: titleMatch?.[1] || title,
        subtitle: labelMatch?.[1] || fallbackDesc || '',
      })
    }
  }

  return {
    schema: 'arlen-app/v1',
    title,
    subtitle: fallbackDesc,
    initialState: {clicks: 0},
    nodes,
  }
}
