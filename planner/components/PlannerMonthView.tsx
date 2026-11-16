import { dayKey, dayLabel, isSameDay, monthGrid } from '../lib/calendar'
import type { PlannerItem } from '../lib/plannerItems'

interface Props {
	anchor: Date
	today: Date
	itemsByDay: Map<string, PlannerItem[]>
	onCellClick: (date: Date) => void
	onItemClick: (item: PlannerItem) => void
}

export function PlannerMonthView({ anchor, today, itemsByDay, onCellClick, onItemClick }: Props) {
	const cells = monthGrid(anchor)
	const month = anchor.getMonth()

	return (
		<div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-[auto_repeat(6,1fr)] bg-steel-950">
			{Array.from({ length: 7 }, (_, i) => (
				<div
					key={`hdr-${i}`}
					className="py-2 text-center text-xs uppercase tracking-wide text-steel-300 bg-steel-900 border-b border-steel-800"
				>
					{dayLabel(i, 'short')}
				</div>
			))}
			{cells.map(d => {
				const inMonth = d.getMonth() === month
				const isToday = isSameDay(d, today)
				const dayItems = itemsByDay.get(dayKey(d)) ?? []
				return (
					<div
						key={d.toISOString()}
						onClick={() => onCellClick(d)}
						className={[
							'group border-r border-b border-steel-800 p-1.5 min-h-0 flex flex-col gap-1 overflow-hidden cursor-pointer',
							inMonth ? 'bg-steel-950 hover:bg-steel-900/50' : 'bg-steel-900/60 hover:bg-steel-900'
						].join(' ')}
					>
						<div className={[
							'size-7 flex items-center justify-center rounded-full text-sm shrink-0',
							isToday
								? 'bg-primary-500 text-steel-950 font-semibold'
								: inMonth ? 'text-steel-100' : 'text-steel-500'
						].join(' ')}>
							{d.getDate()}
						</div>
						<div className="flex flex-col gap-0.5 min-h-0 overflow-hidden">
							{dayItems.map(item => (
								<ChipButton key={chipKey(item)} item={item} onClick={() => onItemClick(item)} />
							))}
						</div>
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
				className="text-left text-xs px-1.5 py-0.5 rounded truncate border-0 cursor-pointer text-on-accent hover:brightness-110"
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
			className="text-left text-xs px-1.5 py-0.5 rounded truncate border-0 cursor-pointer text-on-accent hover:brightness-110"
			style={{ background: t.color ?? '#525252' }}
			title={t.title}
		>
			{t.title}
		</button>
	)
}
