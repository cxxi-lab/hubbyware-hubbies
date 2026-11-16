import { useCallback, useEffect, useState } from 'react'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { fetchGreasingGroove, type GreasingGrooveExercise } from '../api/greasingGroove'
import { GreasingGrooveModal } from '../components/GreasingGrooveModal'

interface ModalState {
	mode: 'create' | 'edit'
	exercise: GreasingGrooveExercise | null
}

export function WorkoutsGreasingGroove() {
	const [items, setItems] = useState<GreasingGrooveExercise[]>([])
	const [loading, setLoading] = useState(true)
	const [modal, setModal] = useState<ModalState | null>(null)
	const [error, setError] = useState<string | null>(null)

	const reload = useCallback(() => {
		setLoading(true)
		fetchGreasingGroove()
			.then(setItems)
			.catch(err => {
				console.warn('[greasing] fetch failed', err)
				setError(err instanceof Error ? err.message : 'Failed to load')
			})
			.finally(() => setLoading(false))
	}, [])

	useEffect(() => { reload() }, [reload])

	return (
		<div className="flex-1 min-h-0 flex flex-col bg-steel-950">
			<header className="flex items-center justify-between gap-3 px-6 max-sm:px-4 py-4 border-b border-steel-800">
				<div className="flex flex-col">
					<h1 className="text-lg font-semibold text-white">Greasing Groove</h1>
					<div className="text-xs text-steel-500">A loose pool of short-rep ideas to sprinkle between sessions.</div>
				</div>
				<button
					type="button"
					onClick={() => setModal({ mode: 'create', exercise: null })}
					className="shrink-0 whitespace-nowrap flex items-center gap-2 px-3 h-8 rounded bg-primary-500 hover:bg-primary-300 text-steel-950 font-semibold border-0 cursor-pointer text-sm"
				>
					<FontAwesomeIcon icon={faPlus} />
					New idea
				</button>
			</header>

			<div className="flex-1 min-h-0 overflow-y-auto p-6">
				{loading ? (
					<div className="text-sm text-steel-400">Loading…</div>
				) : error ? (
					<div className="text-sm text-red-400">{error}</div>
				) : items.length === 0 ? (
					<div className="text-sm text-steel-400 italic">No ideas yet.</div>
				) : (
					<ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
						{items.map(item => (
							<li key={item.id}>
								<button
									type="button"
									onClick={() => setModal({ mode: 'edit', exercise: item })}
									className="w-full text-left bg-steel-900 border border-steel-800 rounded-lg p-4 flex flex-col gap-2 hover:border-steel-700 cursor-pointer"
								>
									<div className="text-sm font-medium text-steel-100 break-words">{item.label}</div>
									{item.note && (
										<div className="text-xs text-steel-400 italic break-words whitespace-pre-line">{item.note}</div>
									)}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			{modal && (
				<GreasingGrooveModal
					mode={modal.mode}
					exercise={modal.exercise}
					onClose={() => setModal(null)}
					onSaved={reload}
				/>
			)}
		</div>
	)
}
