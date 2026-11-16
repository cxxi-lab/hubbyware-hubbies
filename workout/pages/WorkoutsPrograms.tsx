import { useCallback, useEffect, useState } from 'react'
import { faCopy, faPenToSquare, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { duplicateProgram, fetchPrograms, type ProgramSummary } from '../api/programs'
import { ProgramModal } from '../components/ProgramModal'

interface ModalState {
	mode: 'create' | 'edit'
	program: ProgramSummary | null
}

export function WorkoutsPrograms() {
	const [programs, setPrograms] = useState<ProgramSummary[]>([])
	const [loading, setLoading] = useState(true)
	const [modal, setModal] = useState<ModalState | null>(null)
	const [error, setError] = useState<string | null>(null)

	const reload = useCallback(() => {
		setLoading(true)
		fetchPrograms()
			.then(setPrograms)
			.catch(err => {
				console.warn('[programs] fetch failed', err)
				setError(err instanceof Error ? err.message : 'Failed to load')
			})
			.finally(() => setLoading(false))
	}, [])

	useEffect(() => { reload() }, [reload])

	async function handleDuplicate(p: ProgramSummary) {
		try {
			await duplicateProgram(p.id)
			reload()
		} catch (err) {
			console.warn('[programs] duplicate failed', err)
		}
	}

	return (
		<div className="flex-1 min-h-0 flex flex-col bg-steel-950">
			<header className="flex items-center justify-between gap-3 px-6 max-sm:px-4 py-4 border-b border-steel-800">
				<h1 className="text-lg font-semibold text-white">Programs</h1>
				<button
					type="button"
					onClick={() => setModal({ mode: 'create', program: null })}
					className="shrink-0 whitespace-nowrap flex items-center gap-2 px-3 h-8 rounded bg-primary-500 hover:bg-primary-300 text-steel-950 font-semibold border-0 cursor-pointer text-sm"
				>
					<FontAwesomeIcon icon={faPlus} />
					New program
				</button>
			</header>

			<div className="flex-1 min-h-0 overflow-y-auto p-6">
				{loading ? (
					<div className="text-sm text-steel-400">Loading…</div>
				) : error ? (
					<div className="text-sm text-red-400">{error}</div>
				) : programs.length === 0 ? (
					<div className="text-sm text-steel-400 italic">No programs yet. Create your first one.</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
						{programs.map(p => (
							<article
								key={p.id}
								className="bg-steel-900 border border-steel-800 rounded-lg p-4 flex flex-col gap-3"
							>
								<header className="flex items-start justify-between gap-2">
									<h2 className="text-sm font-semibold text-steel-100 break-words">{p.label}</h2>
								</header>
								<dl className="flex items-center gap-4 text-xs text-steel-400">
									<div><span className="text-steel-500">Warmup</span> {p.warmupCount}</div>
									<div><span className="text-steel-500">Training</span> {p.trainingCount}</div>
								</dl>
								<div className="text-[10px] text-steel-500">
									Updated {new Date(p.updatedAt).toLocaleDateString()}
								</div>
								<div className="flex items-center gap-2 mt-auto pt-2 border-t border-steel-800">
									<button
										type="button"
										onClick={() => setModal({ mode: 'edit', program: p })}
										className="flex items-center gap-2 px-2 h-7 rounded text-steel-100 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer text-xs"
									>
										<FontAwesomeIcon icon={faPenToSquare} />
										Edit
									</button>
									<button
										type="button"
										onClick={() => handleDuplicate(p)}
										className="flex items-center gap-2 px-2 h-7 rounded text-steel-100 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer text-xs"
									>
										<FontAwesomeIcon icon={faCopy} />
										Duplicate
									</button>
								</div>
							</article>
						))}
					</div>
				)}
			</div>

			{modal && (
				<ProgramModal
					mode={modal.mode}
					program={modal.program}
					onClose={() => setModal(null)}
					onSaved={reload}
				/>
			)}
		</div>
	)
}
