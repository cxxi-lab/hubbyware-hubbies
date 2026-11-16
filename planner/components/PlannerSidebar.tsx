import { faMagnifyingGlass, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { EventCategory } from '../api/eventCategories'

interface Props {
	categories: EventCategory[]
	search: string
	onSearchChange: (s: string) => void
	selectedCategoryIds: Set<string>
	onToggleCategory: (id: string) => void
	includeUncategorized: boolean
	onToggleUncategorized: () => void
	onNewEvent: () => void
}

const UNCATEGORIZED_COLOR = '#525252'

export function PlannerSidebar({
	categories,
	search,
	onSearchChange,
	selectedCategoryIds,
	onToggleCategory,
	includeUncategorized,
	onToggleUncategorized,
	onNewEvent
}: Props) {
	return (
		<aside className="w-72 shrink-0 flex flex-col gap-6 p-3 bg-steel-900 border-r border-steel-700">
			<div className="flex flex-col">
				<div className="relative">
					<FontAwesomeIcon
						icon={faMagnifyingGlass}
						className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel-400 text-xs"
					/>
					<input
						type="text"
						value={search}
						onChange={e => onSearchChange(e.target.value)}
						placeholder="Search events"
						className="w-full h-9 pl-8 pr-2 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 placeholder:text-steel-500 focus:outline-none focus:border-primary-500"
					/>
				</div>
			</div>

			<div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto">
				<div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-steel-500">Categories</div>
				{categories.map(c => {
					const checked = selectedCategoryIds.has(c.id)
					return (
						<label
							key={c.id}
							className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-steel-800 cursor-pointer text-sm text-steel-100"
						>
							<span
								className="inline-block size-3 rounded-sm shrink-0"
								style={{ background: c.color }}
							/>
							<span className="flex-1 truncate">{c.name}</span>
							<input
								type="checkbox"
								checked={checked}
								onChange={() => onToggleCategory(c.id)}
								className="cursor-pointer accent-primary-500"
							/>
						</label>
					)
				})}

				<label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-steel-800 cursor-pointer text-sm text-steel-100">
					<span
						className="inline-block size-3 rounded-sm shrink-0"
						style={{ background: UNCATEGORIZED_COLOR }}
					/>
					<span className="flex-1 truncate">Uncategorized</span>
					<input
						type="checkbox"
						checked={includeUncategorized}
						onChange={onToggleUncategorized}
						className="cursor-pointer accent-primary-500"
					/>
				</label>
			</div>

			<button
				type="button"
				onClick={onNewEvent}
				className="flex items-center justify-center gap-2 px-3 h-9 rounded bg-primary-500 hover:bg-primary-300 text-steel-950 text-sm font-semibold cursor-pointer border-0 transition"
			>
				<FontAwesomeIcon icon={faPlus} />
				New event
			</button>
		</aside>
	)
}
