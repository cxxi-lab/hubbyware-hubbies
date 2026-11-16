import { useEffect, useState } from 'react'
import { useBackHandler } from '@cxxi-lab/hubbyware-sdk'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { fetchPrograms, type ProgramSummary } from '../api/programs'

interface Props {
	onClose: () => void
	onPick: (program: ProgramSummary) => void
}

export function ProgramPickerModal({ onClose, onPick }: Props) {
	const [programs, setPrograms] = useState<ProgramSummary[] | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		fetchPrograms()
			.then(setPrograms)
			.catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
	}, [])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [onClose])
	useBackHandler(true, onClose)

	return (
		<div
			className="fixed top-14 inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center sm:p-4"
			onClick={onClose}
		>
			<div
				onClick={e => e.stopPropagation()}
				className="w-full h-full sm:h-auto sm:max-w-md max-h-full bg-steel-900 sm:border sm:border-steel-700 sm:rounded-lg shadow-2xl flex flex-col"
			>
				<header className="flex items-center justify-between px-4 py-3 border-b border-steel-700 shrink-0">
					<h2 className="text-base font-semibold text-white">Pick a program</h2>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 flex items-center justify-center rounded text-steel-300 bg-transparent border-0 hover:bg-steel-700 cursor-pointer"
					>
						<FontAwesomeIcon icon={faXmark} />
					</button>
				</header>
				<div className="p-2 overflow-y-auto">
					{error && <div className="text-sm text-red-400 px-2 py-3">{error}</div>}
					{programs === null && !error && <div className="text-sm text-steel-400 px-2 py-3">Loading…</div>}
					{programs !== null && programs.length === 0 && (
						<div className="text-sm text-steel-400 italic px-2 py-3">
							No programs yet. Create one from the Programs page first.
						</div>
					)}
					{programs !== null && programs.length > 0 && (
						<ul className="flex flex-col">
							{programs.map(p => (
								<li key={p.id}>
									<button
										type="button"
										onClick={() => onPick(p)}
										className="w-full flex items-center justify-between px-3 py-2 rounded text-left text-steel-100 bg-transparent border-0 hover:bg-steel-700 cursor-pointer"
									>
										<span className="text-sm">{p.label}</span>
										<span className="text-[10px] text-steel-500">
											{p.warmupCount}W + {p.trainingCount}T
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	)
}
