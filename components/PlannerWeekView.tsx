import { dayKey, dayLabel, isSameDay, weekDays } from '../lib/calendar'
import type { PlannerItem } from '../lib/plannerItems'

interface Props {
	anchor: Date
	today: Date
	itemsByDay: Map<string, PlannerItem[]>
	onCellClick: (date: Date) => void
	onItemClick: (item: PlannerItem) => void
}

export function PlannerWeekView({ anchor, today, itemsByDay, onCellClick, onItemClick }: Props) {
	const days = weekDays(anchor)

	return (
		<div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-[auto_1fr] divide-x divide-steel-800">
			{days.map((d, i) => {
				const isToday = isSameDay(d, today)
				return (
					<div
						key={`hdr-${d.toISOString()}`}
						className="flex flex-col items-center justify-center py-2 border-b border-steel-800 bg-steel-900"
					>
						<div className="text-xs uppercase tracking-wide text-steel-300">{dayLabel(i, 'short')}</div>
						<div className={[
							'mt-1 size-8 flex items-center justify-center rounded-full text-sm',
							isToday ? 'bg-primary-500 text-steel-950 font-semibold' : 'text-steel-100'
						].join(' ')}>
							{d.getDate()}
						</div>
					</div>
				)
			})}
			{days.map(d => {
				const dayItems = itemsByDay.get(dayKey(d)) ?? []
				return (
					<div
						key={`body-${d.toISOString()}`}
						onClick={() => onCellClick(d)}
						className="bg-steel-950 hover:bg-steel-900/50 p-2 flex flex-col gap-1 overflow-y-auto cursor-pointer"
					>
						{dayItems.map(item => (
							<ChipButton key={chipKey(item)} item={item} onClick={() => onItemClick(item)} />
						))}
					</div>
				)
			})}
		</div>
	)
}

function chipKey(item: PlannerItem): string {
	return item.kind === 'event' ? `e-${item.event.id}` : `t-${item.item.id}`
}

function ChipButton({ item, onClick }: { item: PlannerItem; onClick: () => void }) {
	if (item.kind === 'event') {
		const ev = item.event
		return (
			<button
				type="button"
				onClick={e => { e.stopPropagation(); onClick() }}
				className="text-left text-xs px-2 py-1 rounded truncate border-0 cursor-pointer text-white hover:brightness-110"
				style={{ background: ev.category?.color ?? '#525252' }}
				title={ev.title}
			>
				{ev.title}
			</button>
		)
	}
	const t = item.item
	return (
		<button
			type="button"
			onClick={e => { e.stopPropagation(); onClick() }}
			className="text-left text-xs px-2 py-1 rounded truncate border-0 cursor-pointer text-white hover:brightness-110"
			style={{ background: t.color ?? '#525252' }}
			title={t.title}
		>
			{t.title}
		</button>
	)
}
