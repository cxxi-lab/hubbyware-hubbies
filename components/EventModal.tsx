import { useEffect, useState, type FormEvent } from 'react'
import { useBackHandler } from '@cxxi-lab/hub-sdk'
import { faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createEvent, deleteEvent, updateEvent, type EventWriteInput, type PlannerEvent } from '../api/events'
import type { EventCategory } from '../api/eventCategories'

interface Props {
	mode: 'create' | 'edit'
	event: PlannerEvent | null
	initialDate: Date | null
	categories: EventCategory[]
	onClose: () => void
	onSaved: () => void
}

// "YYYY-MM-DD" / "HH:MM" — what native date/time inputs expect/return.
function dateInputValue(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}
function timeInputValue(d: Date): string {
	const h = String(d.getHours()).padStart(2, '0')
	const m = String(d.getMinutes()).padStart(2, '0')
	return `${h}:${m}`
}

function combine(date: string, time: string | null, allDay: boolean): string {
	// Returns an ISO string in local time for the server. Browser's Date
	// constructor handles the local→UTC conversion via toISOString().
	const t = allDay ? '00:00' : (time ?? '00:00')
	return new Date(`${date}T${t}`).toISOString()
}

export function EventModal({ mode, event, initialDate, categories, onClose, onSaved }: Props) {
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [allDay, setAllDay] = useState(true)
	const [startDate, setStartDate] = useState('')
	const [startTime, setStartTime] = useState('09:00')
	const [endDate, setEndDate] = useState('')
	const [endTime, setEndTime] = useState('10:00')
	const [hasEnd, setHasEnd] = useState(false)
	const [categoryId, setCategoryId] = useState<string>('')
	const [saving, setSaving] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (mode === 'edit' && event) {
			const start = new Date(event.startsAt)
			const end = event.endsAt ? new Date(event.endsAt) : null
			setTitle(event.title)
			setDescription(event.description ?? '')
			setAllDay(event.allDay)
			setStartDate(dateInputValue(start))
			setStartTime(timeInputValue(start))
			setHasEnd(end !== null)
			setEndDate(end ? dateInputValue(end) : dateInputValue(start))
			setEndTime(end ? timeInputValue(end) : timeInputValue(start))
			setCategoryId(event.category?.id ?? '')
		}
		else if (mode === 'create') {
			const anchor = initialDate ?? new Date()
			setTitle('')
			setDescription('')
			setAllDay(true)
			setStartDate(dateInputValue(anchor))
			setStartTime('09:00')
			setHasEnd(false)
			setEndDate(dateInputValue(anchor))
			setEndTime('10:00')
			setCategoryId('')
		}
		setError(null)
	}, [mode, event, initialDate])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [onClose])
	useBackHandler(true, onClose)

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		if (!title.trim()) {
			setError('Title is required')
			return
		}

		const payload: EventWriteInput = {
			title: title.trim(),
			description: description.trim() || null,
			categoryId: categoryId === '' ? null : categoryId,
			allDay,
			startsAt: combine(startDate, allDay ? null : startTime, allDay),
			endsAt: hasEnd ? combine(endDate, allDay ? null : endTime, allDay) : null
		}

		setSaving(true)
		setError(null)
		try {
			if (mode === 'edit' && event) await updateEvent(event.id, payload)
			else await createEvent(payload)
			onSaved()
			onClose()
		}
		catch (err) {
			console.warn('[event-modal] save failed', err)
			setError(err instanceof Error ? err.message : 'Failed to save')
		}
		finally {
			setSaving(false)
		}
	}

	async function handleDelete() {
		if (mode !== 'edit' || !event) return
		setDeleting(true)
		try {
			await deleteEvent(event.id)
			onSaved()
			onClose()
		}
		catch (err) {
			console.warn('[event-modal] delete failed', err)
			setError(err instanceof Error ? err.message : 'Failed to delete')
		}
		finally {
			setDeleting(false)
		}
	}

	const labelClass = 'text-xs uppercase tracking-wide text-steel-400'
	const inputClass = 'w-full h-9 px-2 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 focus:outline-none focus:border-primary-500'

	return (
		<div
			className="fixed top-14 inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center sm:p-4"
			onClick={onClose}
		>
			<form
				onSubmit={handleSubmit}
				onClick={e => e.stopPropagation()}
				className="w-full h-full sm:h-auto sm:max-w-lg max-h-full bg-steel-900 sm:border sm:border-steel-700 sm:rounded-lg shadow-2xl flex flex-col"
			>
				<header className="flex items-center justify-between px-4 py-3 border-b border-steel-700">
					<h2 className="text-base font-semibold text-white">
						{mode === 'edit' ? 'Edit event' : 'New event'}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 flex items-center justify-center rounded text-steel-300 bg-transparent border-0 hover:bg-steel-700 cursor-pointer"
					>
						<FontAwesomeIcon icon={faXmark} />
					</button>
				</header>

				<div className="p-4 flex flex-col gap-3">
					<div className="flex flex-col gap-1">
						<label className={labelClass}>Title</label>
						<input
							type="text"
							value={title}
							onChange={e => setTitle(e.target.value)}
							autoFocus
							className={inputClass}
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label className={labelClass}>Description</label>
						<textarea
							value={description}
							onChange={e => setDescription(e.target.value)}
							rows={3}
							className={`${inputClass} h-auto py-2 resize-none`}
						/>
					</div>

					<div className="flex items-center gap-2">
						<input
							id="all-day"
							type="checkbox"
							checked={allDay}
							onChange={e => setAllDay(e.target.checked)}
							className="cursor-pointer accent-primary-500"
						/>
						<label htmlFor="all-day" className="text-sm text-steel-100 cursor-pointer">All day</label>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1">
							<label className={labelClass}>Start date</label>
							<input
								type="date"
								value={startDate}
								onChange={e => setStartDate(e.target.value)}
								className={inputClass}
							/>
						</div>
						{!allDay && (
							<div className="flex flex-col gap-1">
								<label className={labelClass}>Start time</label>
								<input
									type="time"
									value={startTime}
									onChange={e => setStartTime(e.target.value)}
									className={inputClass}
								/>
							</div>
						)}
					</div>

					<div className="flex items-center gap-2">
						<input
							id="has-end"
							type="checkbox"
							checked={hasEnd}
							onChange={e => setHasEnd(e.target.checked)}
							className="cursor-pointer accent-primary-500"
						/>
						<label htmlFor="has-end" className="text-sm text-steel-100 cursor-pointer">Has end</label>
					</div>

					{hasEnd && (
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1">
								<label className={labelClass}>End date</label>
								<input
									type="date"
									value={endDate}
									onChange={e => setEndDate(e.target.value)}
									className={inputClass}
								/>
							</div>
							{!allDay && (
								<div className="flex flex-col gap-1">
									<label className={labelClass}>End time</label>
									<input
										type="time"
										value={endTime}
										onChange={e => setEndTime(e.target.value)}
										className={inputClass}
									/>
								</div>
							)}
						</div>
					)}

					<div className="flex flex-col gap-1">
						<label className={labelClass}>Category</label>
						<select
							value={categoryId}
							onChange={e => setCategoryId(e.target.value)}
							className={inputClass}
						>
							<option value="">— None —</option>
							{categories.map(c => (
								<option key={c.id} value={c.id}>{c.name}</option>
							))}
						</select>
					</div>

					{error && <div className="text-sm text-red-400">{error}</div>}
				</div>

				<footer className="flex items-center justify-between px-4 py-3 border-t border-steel-700">
					{mode === 'edit' ? (
						<button
							type="button"
							onClick={handleDelete}
							disabled={deleting || saving}
							className="flex items-center gap-2 px-3 h-8 rounded text-red-400 bg-transparent border border-red-400/40 hover:bg-red-400/10 cursor-pointer text-sm disabled:opacity-50"
						>
							<FontAwesomeIcon icon={faTrash} />
							{deleting ? 'Deleting…' : 'Delete'}
						</button>
					) : <div />}

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							disabled={saving || deleting}
							className="px-3 h-8 rounded text-steel-100 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer text-sm"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={saving || deleting}
							className="px-3 h-8 rounded bg-primary-700 hover:bg-primary-700/80 text-white border-0 cursor-pointer text-sm disabled:opacity-50"
						>
							{saving ? 'Saving…' : 'Save'}
						</button>
					</div>
				</footer>
			</form>
		</div>
	)
}
