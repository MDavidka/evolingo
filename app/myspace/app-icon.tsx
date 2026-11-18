import {IconNotes,IconListCheck,IconTerminal2,IconChartBar,IconCode,IconBooks,IconAdjustmentsHorizontal} from '@tabler/icons-react'
const icons = {
  notes: IconNotes,
  checklist: IconListCheck,
  terminal: IconTerminal2,
  chart: IconChartBar,
  code: IconCode,
  books: IconBooks,
  sliders: IconAdjustmentsHorizontal,
  'focus-board': IconListCheck,
  'api-inspector': IconBooks,
}
export function AppIcon({name,size=22}:{name?:string;size?:number}){
  const Icon = icons[name as keyof typeof icons] || IconNotes
  return <Icon size={size} stroke={1.85} aria-hidden="true" />
}
