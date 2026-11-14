import { useEffect, useState, type FormEvent } from 'react'
import { useBackHandler } from '@cxxi-lab/hub-sdk'
import { faArrowDown, faArrowUp, faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	createProgram,
	deleteProgram,
	fetchProgram,
	updateProgram,
	type Program,
	type ProgramExerciseInput,
	type ProgramExerciseType,
	type ProgramSummary,
	type ProgramWriteInput
} from '../api/programs'

interface Props {
	mode: 'create' | 'edit'
	program: ProgramSummary | null
	onClose: () => void
	onSaved: () => void
}

interface ExerciseRow extends ProgramExerciseInput {
	key: string
}

let rowSeq = 0
const newRow = (type: ProgramExerciseType): ExerciseRow => ({
	key: `row-${++rowSeq}`,
	type,
	label: '',
	series: '',
	reps: '',
	tempo: null,
	note: null
})

function toRow(input: ProgramExerciseInput): ExerciseRow {
	return { key: `row-${++rowSeq}`, ...input }
}

export function ProgramModal({ mode, program, onClose, onSaved }: Props) {
	const [label, setLabel] = useState('')
	const [warmup, setWarmup] = useState<ExerciseRow[]>([])
	const [training, setTraining] = useState<ExerciseRow[]>([])
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		setError(null)
		if (mode === 'edit' && program) {
			setLoading(true)
			fetchProgram(program.id)
				.then((p: Program) => {
					setLabel(p.label)
					setWarmup(p.exercises.filter(e => e.type === 'warmup').map(toRow))
					setTraining(p.exercises.filter(e => e.type === 'training').map(toRow))
				})
				.catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
				.finally(() => setLoading(false))
		} else {
			setLabel('')
			setWarmup([])
			setTraining([newRow('training')])
		}
	}, [mode, program])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [onClose])
	useBackHandler(true, onClose)

	function updateRow(type: ProgramExerciseType, key: string, patch: Partial<ProgramExerciseInput>) {
		const setter = type === 'warmup' ? setWarmup : setTraining
		setter(rows => rows.map(r => r.key === key ? { ...r, ...patch } : r))
	}
	function addRow(type: ProgramExerciseType) {
		const setter = type === 'warmup' ? setWarmup : setTraining
		setter(rows => [...rows, newRow(type)])
	}
	function removeRow(type: ProgramExerciseType, key: string) {
		const setter = type === 'warmup' ? setWarmup : setTraining
		setter(rows => rows.filter(r => r.key !== key))
	}
	function moveRow(type: ProgramExerciseType, key: string, delta: -1 | 1) {
		const setter = type === 'warmup' ? setWarmup : setTraining
		setter(rows => {
			const i = rows.findIndex(r => r.key === key)
			const j = i + delta
			if (i < 0 || j < 0 || j >= rows.length) return rows
			const next = [...rows]
			;[next[i], next[j]] = [next[j], next[i]]
			return next
		})
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		if (!label.trim()) {
			setError('Label is required')
			return
		}
		const exercises = [...warmup, ...training]
			.filter(r => r.label.trim())
			.map<ProgramExerciseInput>(r => ({
				type: r.type,
				label: r.label.trim(),
				series: r.series.trim(),
				reps: r.reps.trim(),
				tempo: r.tempo?.trim() || null,
				note: r.note?.trim() || null
			}))

		const payload: ProgramWriteInput = { label: label.trim(), exercises }

		setSaving(true)
		setError(null)
		try {
			if (mode === 'edit' && program) await updateProgram(program.id, payload)
			else await createProgram(payload)
			onSaved()
			onClose()
		} catch (err) {
			console.warn('[program-modal] save failed', err)
			setError(err instanceof Error ? err.message : 'Failed to save')
		} finally {
			setSaving(false)
		}
	}

	async function handleDelete() {
		if (mode !== 'edit' || !program) return
		setDeleting(true)
		try {
			await deleteProgram(program.id)
			onSaved()
			onClose()
		} catch (err) {
			console.warn('[program-modal] delete failed', err)
			setError(err instanceof Error ? err.message : 'Failed to delete')
		} finally {
			setDeleting(false)
		}
	}

	return (
		<div
			className="fixed top-14 inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center sm:p-4"
			onClick={onClose}
		>
			<form
				onSubmit={handleSubmit}
				onClick={e => e.stopPropagation()}
				className="w-full h-full sm:h-auto sm:max-w-3xl max-h-full bg-steel-900 sm:border sm:border-steel-700 sm:rounded-lg shadow-2xl flex flex-col"
			>
				<header className="flex items-center justify-between px-4 py-3 border-b border-steel-700 shrink-0">
					<h2 className="text-base font-semibold text-white">
						{mode === 'edit' ? 'Edit program' : 'New program'}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 flex items-center justify-center rounded text-steel-300 bg-transparent border-0 hover:bg-steel-700 cursor-pointer"
					>
						<FontAwesomeIcon icon={faXmark} />
					</button>
				</header>

				<div className="p-4 flex flex-col gap-4 overflow-y-auto">
					{loading ? (
						<div className="text-sm text-steel-400">Loading…</div>
					) : (
						<>
							<div className="flex flex-col gap-1">
								<label className="text-xs uppercase tracking-wide text-steel-400">Label</label>
								<input
									type="text"
									value={label}
									onChange={e => setLabel(e.target.value)}
									autoFocus
									placeholder="ex. Séance type calisthenics"
									className="w-full h-9 px-2 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 focus:outline-none focus:border-primary-500"
								/>
							</div>

							<ExerciseSection
								title="Warmup"
								type="warmup"
								rows={warmup}
								onUpdate={(key, patch) => updateRow('warmup', key, patch)}
								onAdd={() => addRow('warmup')}
								onRemove={key => removeRow('warmup', key)}
								onMove={(key, delta) => moveRow('warmup', key, delta)}
							/>
							<ExerciseSection
								title="Training"
								type="training"
								rows={training}
								onUpdate={(key, patch) => updateRow('training', key, patch)}
								onAdd={() => addRow('training')}
								onRemove={key => removeRow('training', key)}
								onMove={(key, delta) => moveRow('training', key, delta)}
							/>

							{error && <div className="text-sm text-red-400">{error}</div>}
						</>
					)}
				</div>

				<footer className="flex items-center justify-between px-4 py-3 border-t border-steel-700 shrink-0">
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

interface SectionProps {
	title: string
	type: ProgramExerciseType
	rows: ExerciseRow[]
	onUpdate: (key: string, patch: Partial<ProgramExerciseInput>) => void
	onAdd: () => void
	onRemove: (key: string) => void
	onMove: (key: string, delta: -1 | 1) => void
}

function ExerciseSection({ title, rows, onUpdate, onAdd, onRemove, onMove }: SectionProps) {
	return (
		<section className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<h3 className="text-[10px] uppercase tracking-[1.5px] text-steel-500">{title}</h3>
				<button
					type="button"
					onClick={onAdd}
					className="flex items-center gap-2 px-2 h-7 rounded text-steel-100 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer text-xs"
				>
					<FontAwesomeIcon icon={faPlus} />
					Add exercise
				</button>
			</div>

			{rows.length === 0 ? (
				<div className="text-xs text-steel-500 italic px-2 py-3 border border-dashed border-steel-800 rounded">
					No {title.toLowerCase()} exercises.
				</div>
			) : (
				<div className="flex flex-col gap-2">
					{rows.map((row, idx) => (
						<div key={row.key} className="flex flex-col gap-1 bg-steel-900/40 border border-steel-800 rounded p-2">
							<div className="grid grid-cols-3 sm:grid-cols-[1fr_70px_70px_100px_auto] gap-2 items-center">
								<input
									type="text"
									value={row.label}
									onChange={e => onUpdate(row.key, { label: e.target.value })}
									placeholder="Exercise"
									className="col-span-3 sm:col-span-1 min-w-0 h-8 px-2 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 focus:outline-none focus:border-primary-500"
								/>
								<input
									type="text"
									value={row.series}
									onChange={e => onUpdate(row.key, { series: e.target.value })}
									placeholder="Sets"
									className="min-w-0 h-8 px-2 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 focus:outline-none focus:border-primary-500"
								/>
								<input
									type="text"
									value={row.reps}
									onChange={e => onUpdate(row.key, { reps: e.target.value })}
									placeholder="Reps"
									className="min-w-0 h-8 px-2 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 focus:outline-none focus:border-primary-500"
								/>
								<input
									type="text"
									value={row.tempo ?? ''}
									onChange={e => onUpdate(row.key, { tempo: e.target.value })}
									placeholder="Tempo"
									className="min-w-0 h-8 px-2 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 focus:outline-none focus:border-primary-500"
								/>
								<div className="col-span-3 sm:col-span-1 flex items-center justify-end gap-1">
									<button
										type="button"
										onClick={() => onMove(row.key, -1)}
										disabled={idx === 0}
										className="w-7 h-8 flex items-center justify-center rounded text-steel-300 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer disabled:opacity-30 disabled:cursor-default"
										title="Move up"
									>
										<FontAwesomeIcon icon={faArrowUp} className="text-xs" />
									</button>
									<button
										type="button"
										onClick={() => onMove(row.key, 1)}
										disabled={idx === rows.length - 1}
										className="w-7 h-8 flex items-center justify-center rounded text-steel-300 bg-transparent border border-steel-700 hover:bg-steel-700 cursor-pointer disabled:opacity-30 disabled:cursor-default"
										title="Move down"
									>
										<FontAwesomeIcon icon={faArrowDown} className="text-xs" />
									</button>
									<button
										type="button"
										onClick={() => onRemove(row.key)}
										className="w-7 h-8 flex items-center justify-center rounded text-red-400 bg-transparent border border-red-400/40 hover:bg-red-400/10 cursor-pointer"
										title="Remove"
									>
										<FontAwesomeIcon icon={faTrash} className="text-xs" />
									</button>
								</div>
							</div>
							<input
								type="text"
								value={row.note ?? ''}
								onChange={e => onUpdate(row.key, { note: e.target.value })}
								placeholder="Note (optional)"
								className="h-8 px-2 bg-steel-950 border border-steel-700 rounded text-xs text-steel-300 placeholder:text-steel-600 focus:outline-none focus:border-primary-500"
							/>
						</div>
					))}
				</div>
			)}
		</section>
	)
}
