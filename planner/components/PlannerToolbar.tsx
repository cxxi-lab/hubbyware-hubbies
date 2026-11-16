import { faChevronDown, faChevronLeft, faChevronRight, faPlus, faSliders } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dropdown } from '@cxxi-lab/hubbyware-sdk'
import type { PlannerView } from '../pages/Planner'

interface Props {
	view: PlannerView
	onViewChange: (view: PlannerView) => void
	periodLabel: string
	onPrev: () => void
	onNext: () => void
	onToday: () => void
	/** phone: opens the search and categories (a drawer) */
	onFilters?: () => void
	/** phone: a new event (the sidebar's button is in the drawer) */
	onNewEvent?: () => void
}

const VIEWS: { id: PlannerView; label: string }[] = [
	{ id: 'week', label: 'Week' },
	{ id: 'month', label: 'Month' }
]

const TRIGGER = 'inline-flex items-center justify-between gap-2 h-8 pl-3 pr-2 min-w-[110px] text-sm text-white bg-steel-800 border border-steel-700 rounded-xs outline-none cursor-pointer transition hover:bg-steel-700'
const ITEM = 'block w-full px-3 py-1.5 text-left text-sm whitespace-nowrap cursor-pointer transition text-steel-100 hover:bg-steel-800 hover:text-white bg-transparent border-0'
const ITEM_ACTIVE = 'block w-full px-3 py-1.5 text-left text-sm whitespace-nowrap cursor-pointer transition text-primary-300 bg-primary-700 border-0'

export function PlannerToolbar({ view, onViewChange, periodLabel, onPrev, onNext, onToday, onFilters, onNewEvent }: Props) {
	const activeLabel = VIEWS.find(v => v.id === view)?.label ?? ''

	return (
		<div className="flex items-center gap-4 max-sm:gap-2 px-4 max-sm:px-2 py-3 border-b border-steel-700 bg-steel-900">
			{onFilters && (
				<button type="button" onClick={onFilters} aria-label="Search and categories" className="w-8 h-8 flex items-center justify-center rounded text-steel-100 bg-transparent border-0 hover:bg-steel-700 cursor-pointer">
					<FontAwesomeIcon icon={faSliders} />
				</button>
			)}
			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={onPrev}
					className="w-8 h-8 flex items-center justify-center rounded text-steel-100 bg-transparent border-0 hover:bg-steel-700 cursor-pointer"
					aria-label="Previous"
				>
					<FontAwesomeIcon icon={faChevronLeft} />
				</button>
				<button
					type="button"
					onClick={onToday}
					className="px-3 h-8 text-sm rounded text-steel-100 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer"
				>
					Today
				</button>
				<button
					type="button"
					onClick={onNext}
					className="w-8 h-8 flex items-center justify-center rounded text-steel-100 bg-transparent border-0 hover:bg-steel-700 cursor-pointer"
					aria-label="Next"
				>
					<FontAwesomeIcon icon={faChevronRight} />
				</button>
			</div>

			<div className="min-w-0 truncate text-base max-sm:text-sm font-semibold text-white">{periodLabel}</div>

			<div className="ml-auto flex items-center gap-1">
				{onNewEvent && (
					<button type="button" onClick={onNewEvent} aria-label="New event" className="w-8 h-8 flex items-center justify-center rounded text-steel-950 bg-primary-500 border-0 hover:bg-primary-300 cursor-pointer">
						<FontAwesomeIcon icon={faPlus} />
					</button>
				)}
				<Dropdown
					side="right"
					header={open => (
						<button type="button" className={TRIGGER} aria-haspopup="listbox" aria-expanded={open}>
							<span>{activeLabel}</span>
							<FontAwesomeIcon
								icon={faChevronDown}
								className={`text-steel-300 text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}
							/>
						</button>
					)}
				>
					<ul role="listbox" className="min-w-full">
						{VIEWS.map(v => (
							<li key={v.id}>
								<button
									type="button"
									role="option"
									aria-selected={v.id === view}
									className={v.id === view ? ITEM_ACTIVE : ITEM}
									onClick={() => onViewChange(v.id)}
								>
									{v.label}
								</button>
							</li>
						))}
					</ul>
				</Dropdown>
			</div>
		</div>
	)
}
