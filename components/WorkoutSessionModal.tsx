import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useBackHandler } from '@cxxi-lab/hub-sdk'
import { faPlus, faRotateLeft, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	createSession,
	deleteSession,
	fetchSession,
	updateSession,
	type WorkoutSession,
	type WorkoutSessionExerciseInput,
	type WorkoutSessionSummary,
	type WorkoutSessionUpdateInput
} from '../api/workoutSessions'
import type { ProgramExerciseType } from '../api/programs'

interface CreateProps {
	mode: 'create'
	session: null
	programId: string
	onClose: () => void
	onSaved: () => void
}
interface EditProps {
	mode: 'edit'
	session: WorkoutSessionSummary
	programId?: undefined
	onClose: () => void
	onSaved: () => void
}
type Props = CreateProps | EditProps

interface ExerciseRow extends WorkoutSessionExerciseInput {
	key: string
}

let rowSeq = 0
const toRow = (input: WorkoutSessionExerciseInput): ExerciseRow => ({
	key: `row-${++rowSeq}`,
	...input
})
const newExtraRow = (type: ProgramExerciseType): ExerciseRow => ({
	key: `row-${++rowSeq}`,
	type,
	label: '',
	plannedSeries: '',
	plannedReps: '',
	plannedTempo: null,
	plannedNote: null,
	actualSeries: '',
	actualReps: '',
	actualTempo: null,
	actualNote: null,
	isExtra: true,
	skipped: false
})

function dateInputValue(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}
function toIso(date: string): string | null {
	if (!date) return null
	return new Date(`${date}T00:00`).toISOString()
}
function fromIso(iso: string | null): string {
	if (!iso) return ''
	return dateInputValue(new Date(iso))
}

export function WorkoutSessionModal(props: Props) {
	const { mode, onClose, onSaved } = props

	const [programLabel, setProgramLabel] = useState('')
	const [scheduled, setScheduled] = useState('')
	const [performed, setPerformed] = useState(dateInputValue(new Date()))
	const [note, setNote] = useState('')
	const [rows, setRows] = useState<ExerciseRow[]>([])
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [creating, setCreating] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [sessionId, setSessionId] = useState<string | null>(null)
	// the session is created once per opening (StrictMode runs effects twice in dev)
	const created = useRef(false)

	useEffect(() => {
		setError(null)
		if (mode === 'edit') {
			setLoading(true)
			setSessionId(props.session.id)
			fetchSession(props.session.id)
				.then((s: WorkoutSession) => {
					setProgramLabel(s.programLabel)
					setScheduled(fromIso(s.scheduledAt))
					setPerformed(fromIso(s.performedAt))
					setNote(s.note ?? '')
					setRows(s.exercises.map(toRow))
				})
				.catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
				.finally(() => setLoading(false))
		} else {
			// create: hit the create endpoint to get the snapshot, then we manage it from there
			if (created.current) return
			created.current = true
			setCreating(true)
			createSession({
				programId: props.programId,
				performedAt: new Date().toISOString()
			})
				.then((s: WorkoutSession) => {
					setSessionId(s.id)
					setProgramLabel(s.programLabel)
					setScheduled(fromIso(s.scheduledAt))
					setPerformed(fromIso(s.performedAt))
					setNote(s.note ?? '')
					setRows(s.exercises.map(toRow))
					onSaved()
				})
				.catch(err => setError(err instanceof Error ? err.message : 'Failed to create'))
				.finally(() => setCreating(false))
		}
	}, [mode])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [onClose])
	useBackHandler(true, onClose)

	function updateRow(key: string, patch: Partial<WorkoutSessionExerciseInput>) {
		setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r))
	}
	function resetActual(key: string) {
		setRows(rs => rs.map(r => r.key === key ? {
			...r,
			actualSeries: r.plannedSeries,
			actualReps: r.plannedReps,
			actualTempo: r.plannedTempo,
			actualNote: r.plannedNote,
			skipped: false
		} : r))
	}
	function addExtra(type: ProgramExerciseType) {
		setRows(rs => [...rs, newExtraRow(type)])
	}
	function removeRow(key: string) {
		setRows(rs => rs.filter(r => r.key !== key))
	}

	async function handleSave(e: FormEvent) {
		e.preventDefault()
		if (sessionId === null) return
		const payload: WorkoutSessionUpdateInput = {
			scheduledAt: toIso(scheduled),
			performedAt: toIso(performed),
			note: note.trim() || null,
			exercises: rows
				.filter(r => r.label.trim())
				.map<WorkoutSessionExerciseInput>(r => ({
					type: r.type,
					label: r.label.trim(),
					plannedSeries: r.plannedSeries,
					plannedReps: r.plannedReps,
					plannedTempo: r.plannedTempo,
					plannedNote: r.plannedNote,
					actualSeries: r.actualSeries,
					actualReps: r.actualReps,
					actualTempo: r.actualTempo,
					actualNote: r.actualNote,
					isExtra: r.isExtra,
					skipped: r.skipped
				}))
		}
		setSaving(true)
		setError(null)
		try {
			await updateSession(sessionId, payload)
			onSaved()
			onClose()
		} catch (err) {
			console.warn('[session-modal] save failed', err)
			setError(err instanceof Error ? err.message : 'Failed to save')
		} finally {
			setSaving(false)
		}
	}

	async function handleDelete() {
		if (sessionId === null) return
		setDeleting(true)
		try {
			await deleteSession(sessionId)
			onSaved()
			onClose()
		} catch (err) {
			console.warn('[session-modal] delete failed', err)
			setError(err instanceof Error ? err.message : 'Failed to delete')
		} finally {
			setDeleting(false)
		}
	}

	const warmupRows = rows.filter(r => r.type === 'warmup')
	const trainingRows = rows.filter(r => r.type === 'training')
	const isLoading = loading || creating

	return (
		<div
			className="fixed top-14 inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center sm:p-4"
			onClick={onClose}
		>
			<form
				onSubmit={handleSave}
				onClick={e => e.stopPropagation()}
				className="w-full h-full sm:h-auto sm:max-w-5xl max-h-full bg-steel-900 sm:border sm:border-steel-700 sm:rounded-lg shadow-2xl flex flex-col"
			>
				<header className="flex items-center justify-between px-4 py-3 border-b border-steel-700 shrink-0">
					<div className="flex flex-col">
						<h2 className="text-base font-semibold text-white">
							{mode === 'edit' ? 'Edit session' : 'New session'}
						</h2>
						<div className="text-xs text-steel-400">{programLabel || (isLoading ? 'Loading…' : '')}</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 flex items-center justify-center rounded text-steel-300 bg-transparent border-0 hover:bg-steel-700 cursor-pointer"
					>
						<FontAwesomeIcon icon={faXmark} />
					</button>
				</header>

				<div className="p-4 flex flex-col gap-4 overflow-y-auto">
					{isLoading ? (
						<div className="text-sm text-steel-400">Loading…</div>
					) : (
						<>
							<div className="grid grid-cols-2 gap-3">
								<div className="flex flex-col gap-1">
									<label className="text-xs uppercase tracking-wide text-steel-400">Performed at</label>
									<input
										type="date"
										value={performed}
										onChange={e => setPerformed(e.target.value)}
										className="h-9 px-2 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 focus:outline-none focus:border-primary-500"
									/>
								</div>
								<div className="flex flex-col gap-1">
									<label className="text-xs uppercase tracking-wide text-steel-400">Scheduled (planned date)</label>
									<input
										type="date"
										value={scheduled}
										onChange={e => setScheduled(e.target.value)}
										className="h-9 px-2 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 focus:outline-none focus:border-primary-500"
									/>
								</div>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-xs uppercase tracking-wide text-steel-400">Session note</label>
								<textarea
									value={note}
									onChange={e => setNote(e.target.value)}
									rows={2}
									placeholder="Optional"
									className="px-2 py-2 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 focus:outline-none focus:border-primary-500 resize-none"
								/>
							</div>

							<SessionSection
								title="Warmup"
								type="warmup"
								rows={warmupRows}
								onUpdate={updateRow}
								onReset={resetActual}
								onRemove={removeRow}
								onAddExtra={() => addExtra('warmup')}
							/>
							<SessionSection
								title="Training"
								type="training"
								rows={trainingRows}
								onUpdate={updateRow}
								onReset={resetActual}
								onRemove={removeRow}
								onAddExtra={() => addExtra('training')}
							/>

							{error && <div className="text-sm text-red-400">{error}</div>}
						</>
					)}
				</div>

				<footer className="flex items-center justify-between px-4 py-3 border-t border-steel-700 shrink-0">
					{sessionId !== null ? (
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
							disabled={saving || deleting || isLoading || sessionId === null}
							className="px-3 h-8 rounded bg-primary-500 hover:bg-primary-300 text-steel-950 font-semibold border-0 cursor-pointer text-sm disabled:opacity-50"
						>
							{saving ? 'Saving…' : 'Save'}
						</button>
					</div>
				</footer>
			</form>
		</div>
	)
}

interface SessionSectionProps {
	title: string
	type: ProgramExerciseType
	rows: ExerciseRow[]
	onUpdate: (key: string, patch: Partial<WorkoutSessionExerciseInput>) => void
	onReset: (key: string) => void
	onRemove: (key: string) => void
	onAddExtra: () => void
}

function SessionSection({ title, rows, onUpdate, onReset, onRemove, onAddExtra }: SessionSectionProps) {
	return (
		<section className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<h3 className="text-[10px] uppercase tracking-[1.5px] text-steel-500">{title}</h3>
				<button
					type="button"
					onClick={onAddExtra}
					className="flex items-center gap-2 px-2 h-7 rounded text-steel-100 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer text-xs"
				>
					<FontAwesomeIcon icon={faPlus} />
					Add extra exercise
				</button>
			</div>

			{rows.length === 0 ? (
				<div className="text-xs text-steel-500 italic px-2 py-3 border border-dashed border-steel-800 rounded">
					No {title.toLowerCase()} exercises.
				</div>
			) : (
				<div className="overflow-x-auto -mx-1 px-1 pretty-scrollbar">
				<div className="min-w-[560px] flex flex-col gap-2">
					<div className="grid grid-cols-[160px_1fr_1fr_60px] gap-2 px-1">
						<div className="text-[10px] uppercase tracking-[1.5px] text-steel-600">Exercise</div>
						<div className="text-[10px] uppercase tracking-[1.5px] text-steel-600">Planned</div>
						<div className="text-[10px] uppercase tracking-[1.5px] text-steel-600">Actual</div>
						<div />
					</div>
					{rows.map(row => (
						<SessionRow
							key={row.key}
							row={row}
							onUpdate={p => onUpdate(row.key, p)}
							onReset={() => onReset(row.key)}
							onRemove={() => onRemove(row.key)}
						/>
					))}
				</div>
				</div>
			)}
		</section>
	)
}

interface SessionRowProps {
	row: ExerciseRow
	onUpdate: (patch: Partial<WorkoutSessionExerciseInput>) => void
	onReset: () => void
	onRemove: () => void
}

function SessionRow({ row, onUpdate, onReset, onRemove }: SessionRowProps) {
	const plannedTone = 'text-steel-500'
	const actualClass = `h-7 px-2 bg-steel-950 border border-steel-700 rounded text-xs text-steel-100 focus:outline-none focus:border-primary-500 ${row.skipped ? 'opacity-40 line-through' : ''}`
	return (
		<div className="grid grid-cols-[160px_1fr_1fr_60px] gap-2 items-start bg-steel-900/60 border border-steel-800 rounded p-2">
			{/* Label column */}
			<div className="flex flex-col gap-1">
				{row.isExtra ? (
					<input
						type="text"
						value={row.label}
						onChange={e => onUpdate({ label: e.target.value })}
						placeholder="Extra exercise"
						className="h-7 px-2 bg-steel-950 border border-steel-700 rounded text-xs text-steel-100 focus:outline-none focus:border-primary-500"
					/>
				) : (
					<div className="text-xs text-steel-100 break-words">{row.label}</div>
				)}
				<label className="flex items-center gap-1.5 text-[10px] text-steel-500 cursor-pointer">
					<input
						type="checkbox"
						checked={row.skipped}
						onChange={e => onUpdate({ skipped: e.target.checked })}
						className="cursor-pointer accent-steel-500"
					/>
					Skipped
				</label>
				{row.isExtra && (
					<span className="text-[9px] text-amber-400/80 uppercase tracking-wider">Extra</span>
				)}
			</div>

			{/* Planned column (readonly, desaturated) */}
			<div className={`flex flex-col gap-1 ${plannedTone}`}>
				{row.isExtra ? (
					<div className="text-xs italic text-steel-600">— not in original program —</div>
				) : (
					<>
						<div className="grid grid-cols-3 gap-1 text-xs">
							<div><span className="text-[9px] uppercase text-steel-600">Sets</span><div>{row.plannedSeries || '—'}</div></div>
							<div><span className="text-[9px] uppercase text-steel-600">Reps</span><div>{row.plannedReps || '—'}</div></div>
							<div><span className="text-[9px] uppercase text-steel-600">Tempo</span><div className="break-words">{row.plannedTempo || '—'}</div></div>
						</div>
						{row.plannedNote && (
							<div className="text-xs italic break-words">{row.plannedNote}</div>
						)}
					</>
				)}
			</div>

			{/* Actual column (editable) */}
			<div className="flex flex-col gap-1">
				<div className="grid grid-cols-3 gap-1">
					<input
						type="text"
						value={row.actualSeries}
						onChange={e => onUpdate({ actualSeries: e.target.value })}
						placeholder="Sets"
						className={actualClass}
					/>
					<input
						type="text"
						value={row.actualReps}
						onChange={e => onUpdate({ actualReps: e.target.value })}
						placeholder="Reps"
						className={actualClass}
					/>
					<input
						type="text"
						value={row.actualTempo ?? ''}
						onChange={e => onUpdate({ actualTempo: e.target.value })}
						placeholder="Tempo"
						className={actualClass}
					/>
				</div>
				<input
					type="text"
					value={row.actualNote ?? ''}
					onChange={e => onUpdate({ actualNote: e.target.value })}
					placeholder="Note"
					className={actualClass}
				/>
			</div>

			{/* Actions */}
			<div className="flex flex-col items-end gap-1">
				{!row.isExtra && (
					<button
						type="button"
						onClick={onReset}
						title="Reset actual to planned"
						className="w-7 h-7 flex items-center justify-center rounded text-steel-300 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer"
					>
						<FontAwesomeIcon icon={faRotateLeft} className="text-xs" />
					</button>
				)}
				{row.isExtra && (
					<button
						type="button"
						onClick={onRemove}
						title="Remove"
						className="w-7 h-7 flex items-center justify-center rounded text-red-400 bg-transparent border border-red-400/40 hover:bg-red-400/10 cursor-pointer"
					>
						<FontAwesomeIcon icon={faTrash} className="text-xs" />
					</button>
				)}
			</div>
		</div>
	)
}
