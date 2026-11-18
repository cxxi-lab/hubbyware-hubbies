import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { faCalendarDay, faClock, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { fetchSessions, type WorkoutSessionSummary } from '../api/workoutSessions'
import type { ProgramSummary } from '../api/programs'
import { ProgramPickerModal } from '../components/ProgramPickerModal'
import { WorkoutSessionModal } from '../components/WorkoutSessionModal'

type ModalState =
	| { kind: 'picker' }
	| { kind: 'create'; programId: string }
	| { kind: 'edit'; session: WorkoutSessionSummary }

function effectiveDate(s: WorkoutSessionSummary): Date | null {
	const iso = s.performedAt ?? s.scheduledAt
	return iso ? new Date(iso) : null
}

function formatDate(d: Date): string {
	return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function WorkoutsHistory() {
	const [sessions, setSessions] = useState<WorkoutSessionSummary[]>([])
	const [loading, setLoading] = useState(true)
	const [modal, setModal] = useState<ModalState | null>(null)
	const [error, setError] = useState<string | null>(null)

	const reload = useCallback(() => {
		setLoading(true)
		fetchSessions()
			.then(list => {
				const sorted = [...list].sort((a, b) => {
					const da = effectiveDate(a)?.getTime() ?? 0
					const db = effectiveDate(b)?.getTime() ?? 0
					return db - da
				})
				setSessions(sorted)
			})
			.catch(err => {
				console.warn('[history] fetch failed', err)
				setError(err instanceof Error ? err.message : 'Failed to load')
			})
			.finally(() => setLoading(false))
	}, [])

	useEffect(() => { reload() }, [reload])

	// a link to one of its sessions (`?session=<id>`: Planner's calendar): opened once they are read
	const [params] = useSearchParams()
	const navigate = useNavigate()
	const linked = params.get('session')
	useEffect(() => {
		if (!linked || loading) return
		const session = sessions.find(s => s.id === linked)
		if (session) setModal({ kind: 'edit', session })
		else navigate('/workout/history', { replace: true })
	}, [linked, loading, sessions])
	const closeModal = () => {
		setModal(null)
		if (linked) navigate('/workout/history', { replace: true })
	}

	function handlePick(p: ProgramSummary) {
		setModal({ kind: 'create', programId: p.id })
	}

	return (
		<div className="flex-1 min-h-0 flex flex-col bg-steel-950">
			<header className="flex items-center justify-between gap-3 px-6 max-sm:px-4 py-4 border-b border-steel-800">
				<h1 className="text-lg font-semibold text-white">History</h1>
				<button
					type="button"
					onClick={() => setModal({ kind: 'picker' })}
					className="shrink-0 whitespace-nowrap flex items-center gap-2 px-3 h-8 rounded bg-primary-500 hover:bg-primary-300 text-steel-950 font-semibold border-0 cursor-pointer text-sm"
				>
					<FontAwesomeIcon icon={faPlus} />
					New session
				</button>
			</header>

			<div className="flex-1 min-h-0 overflow-y-auto p-6">
				{loading ? (
					<div className="text-sm text-steel-400">Loading…</div>
				) : error ? (
					<div className="text-sm text-red-400">{error}</div>
				) : sessions.length === 0 ? (
					<div className="text-sm text-steel-400 italic">No sessions yet.</div>
				) : (
					<ul className="flex flex-col gap-2 max-w-3xl">
						{sessions.map(s => {
							const date = effectiveDate(s)
							const isFuture = s.performedAt === null && s.scheduledAt !== null
							return (
								<li key={s.id}>
									<button
										type="button"
										onClick={() => setModal({ kind: 'edit', session: s })}
										className="w-full flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-steel-900 border border-steel-800 text-left hover:border-steel-700 cursor-pointer"
									>
										<div className="flex flex-col gap-1 min-w-0">
											<div className="text-sm text-steel-100 font-medium truncate">{s.programLabel}</div>
											{s.note && <div className="text-xs text-steel-400 italic truncate">{s.note}</div>}
										</div>
										<div className="flex items-center gap-4 text-xs text-steel-400 shrink-0">
											<div className="flex items-center gap-1.5">
												<FontAwesomeIcon icon={isFuture ? faClock : faCalendarDay} className={isFuture ? 'text-amber-400' : ''} />
												<span>{date ? formatDate(date) : '—'}</span>
											</div>
											<div className="text-[10px] text-steel-500">{s.exerciseCount} exo</div>
										</div>
									</button>
								</li>
							)
						})}
					</ul>
				)}
			</div>

			{modal?.kind === 'picker' && (
				<ProgramPickerModal
					onClose={() => setModal(null)}
					onPick={handlePick}
				/>
			)}
			{modal?.kind === 'create' && (
				<WorkoutSessionModal
					mode="create"
					session={null}
					programId={modal.programId}
					onClose={() => setModal(null)}
					onSaved={reload}
				/>
			)}
			{modal?.kind === 'edit' && (
				<WorkoutSessionModal
					mode="edit"
					session={modal.session}
					onClose={closeModal}
					onSaved={reload}
				/>
			)}
		</div>
	)
}
