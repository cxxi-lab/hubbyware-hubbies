import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { PlannerToolbar } from '../components/PlannerToolbar'
import { PlannerWeekView } from '../components/PlannerWeekView'
import { PlannerMonthView } from '../components/PlannerMonthView'
import { PlannerSidebar } from '../components/PlannerSidebar'
import { EventModal } from '../components/EventModal'
import { fetchEventCategories, type EventCategory } from '../api/eventCategories'
import { fetchEvents, type PlannerEvent } from '../api/events'
import type { PlannerItem } from '../lib/plannerItems'
import { useBackHandler, useMediaQuery, type TimelineItem } from '@cxxi-lab/hubbyware-sdk'
import {
	addDays,
	addMonths,
	dayKey,
	monthGrid,
	monthYearLabel,
	startOfDay,
	startOfWeek,
	weekRangeLabel
} from '../lib/calendar'

export type PlannerView = 'week' | 'month'

interface EventModalState {
	mode: 'create' | 'edit'
	event: PlannerEvent | null
	date: Date | null
}

export function Planner() {
	const navigate = useNavigate()

	const [view, setView] = useState<PlannerView>('month')
	const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
	const today = useMemo(() => startOfDay(new Date()), [])

	const [categories, setCategories] = useState<EventCategory[]>([])
	const [events, setEvents] = useState<PlannerEvent[]>([])
	// the dated items of other hubbies (Workout's sessions…): none while the hubbies run isolated,
	// until they reach each other through their APIs (client docs/plan-isolation.md D2)
	const timelineItems: TimelineItem[] = []
	const [search, setSearch] = useState('')
	const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
	const [includeUncategorized, setIncludeUncategorized] = useState(true)
	const [eventModal, setEventModal] = useState<EventModalState | null>(null)

	const visibleRange = useMemo(() => {
		if (view === 'week') {
			const start = startOfWeek(anchor)
			return { start, end: addDays(start, 7) }
		}
		const cells = monthGrid(anchor)
		return { start: cells[0], end: addDays(cells[41], 1) }
	}, [view, anchor])

	useEffect(() => {
		fetchEventCategories()
			.then(cats => {
				setCategories(cats)
				setSelectedCategoryIds(new Set(cats.map(c => c.id)))
			})
			.catch(err => console.warn('[planner] categories fetch failed', err))
	}, [])

	const reload = useCallback(() => {
		fetchEvents(visibleRange.start, visibleRange.end)
			.then(setEvents)
			.catch(err => console.warn('[planner] events fetch failed', err))
	}, [visibleRange.start, visibleRange.end])

	useEffect(() => { reload() }, [reload])

	const filteredEvents = useMemo(() => {
		const q = search.trim().toLowerCase()
		return events.filter(e => {
			if (q && !e.title.toLowerCase().includes(q)) return false
			if (e.category === null) return includeUncategorized
			return selectedCategoryIds.has(e.category.id)
		})
	}, [events, search, selectedCategoryIds, includeUncategorized])

	const filteredTimeline = useMemo(() => {
		const q = search.trim().toLowerCase()
		if (!q) return timelineItems
		return timelineItems.filter(i => i.title.toLowerCase().includes(q))
	}, [timelineItems, search])

	const itemsByDay = useMemo(() => {
		const map = new Map<string, PlannerItem[]>()
		for (const e of filteredEvents) {
			const date = new Date(e.startsAt)
			const key = dayKey(date)
			const list = map.get(key) ?? []
			list.push({ kind: 'event', event: e, date })
			map.set(key, list)
		}
		for (const item of filteredTimeline) {
			const key = dayKey(item.date)
			const list = map.get(key) ?? []
			list.push({ kind: 'timeline', item, date: item.date })
			map.set(key, list)
		}
		return map
	}, [filteredEvents, filteredTimeline])

	const periodLabel = useMemo(() => {
		if (view === 'week') return weekRangeLabel(anchor)
		return monthYearLabel(anchor)
	}, [view, anchor])

	function step(delta: 1 | -1) {
		if (view === 'week') setAnchor(addDays(anchor, delta * 7))
		else setAnchor(addMonths(anchor, delta))
	}

	function toggleCategory(id: string) {
		setSelectedCategoryIds(prev => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const handleCellClick = (date: Date) => setEventModal({ mode: 'create', event: null, date })
	const handleItemClick = (item: PlannerItem) => {
		if (item.kind === 'event') {
			setEventModal({ mode: 'edit', event: item.event, date: null })
			return
		}
		// another hubby's item: its page
		navigate(item.item.href)
	}

	const phone = useMediaQuery('(width < 40rem)')
	const [filtersOpen, setFiltersOpen] = useState(false)
	useBackHandler(phone && filtersOpen, () => setFiltersOpen(false))

	const sidebar = (
			<PlannerSidebar
				categories={categories}
				search={search}
				onSearchChange={setSearch}
				selectedCategoryIds={selectedCategoryIds}
				onToggleCategory={toggleCategory}
				includeUncategorized={includeUncategorized}
				onToggleUncategorized={() => setIncludeUncategorized(v => !v)}
				onNewEvent={() => { setFiltersOpen(false); setEventModal({ mode: 'create', event: null, date: today }) }}
			/>
	)

	return (
		<div className="relative flex-1 min-h-0 flex bg-steel-950">
			{/* phone: the search and categories in a drawer, opened from the toolbar */}
			{!phone && sidebar}
			{phone && filtersOpen && (
				<div className="absolute inset-0 z-30 flex">
					{sidebar}
					<button type="button" aria-label="Close" onClick={() => setFiltersOpen(false)} className="flex-1 bg-black/60 border-0 cursor-pointer" />
				</div>
			)}

			<div className="flex-1 min-w-0 min-h-0 flex flex-col">
				<PlannerToolbar
					onFilters={phone ? () => setFiltersOpen(true) : undefined}
					onNewEvent={phone ? () => setEventModal({ mode: 'create', event: null, date: today }) : undefined}
					view={view}
					onViewChange={setView}
					periodLabel={periodLabel}
					onPrev={() => step(-1)}
					onNext={() => step(1)}
					onToday={() => setAnchor(today)}
				/>

				{view === 'week' && (
					<PlannerWeekView
						anchor={anchor}
						today={today}
						itemsByDay={itemsByDay}
						onCellClick={handleCellClick}
						onItemClick={handleItemClick}
					/>
				)}
				{view === 'month' && (
					<PlannerMonthView
						anchor={anchor}
						today={today}
						itemsByDay={itemsByDay}
						onCellClick={handleCellClick}
						onItemClick={handleItemClick}
					/>
				)}
			</div>

			{eventModal && (
				<EventModal
					mode={eventModal.mode}
					event={eventModal.event}
					initialDate={eventModal.date}
					categories={categories}
					onClose={() => setEventModal(null)}
					onSaved={reload}
				/>
			)}

		</div>
	)
}
