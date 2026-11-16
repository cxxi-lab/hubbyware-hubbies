import { useEffect, useState, type FormEvent } from 'react'
import { useBackHandler } from '@cxxi-lab/hubbyware-sdk'
import { faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	createGreasingGroove,
	deleteGreasingGroove,
	updateGreasingGroove,
	type GreasingGrooveExercise,
	type GreasingGrooveWriteInput
} from '../api/greasingGroove'

interface Props {
	mode: 'create' | 'edit'
	exercise: GreasingGrooveExercise | null
	onClose: () => void
	onSaved: () => void
}

export function GreasingGrooveModal({ mode, exercise, onClose, onSaved }: Props) {
	const [label, setLabel] = useState('')
	const [note, setNote] = useState('')
	const [saving, setSaving] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (mode === 'edit' && exercise) {
			setLabel(exercise.label)
			setNote(exercise.note ?? '')
		} else {
			setLabel('')
			setNote('')
		}
		setError(null)
	}, [mode, exercise])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [onClose])
	useBackHandler(true, onClose)

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		if (!label.trim()) {
			setError('Label is required')
			return
		}
		const payload: GreasingGrooveWriteInput = {
			label: label.trim(),
			note: note.trim() || null
		}
		setSaving(true)
		setError(null)
		try {
			if (mode === 'edit' && exercise) await updateGreasingGroove(exercise.id, payload)
			else await createGreasingGroove(payload)
			onSaved()
			onClose()
		} catch (err) {
			console.warn('[greasing-modal] save failed', err)
			setError(err instanceof Error ? err.message : 'Failed to save')
		} finally {
			setSaving(false)
		}
	}

	async function handleDelete() {
		if (mode !== 'edit' || !exercise) return
		setDeleting(true)
		try {
			await deleteGreasingGroove(exercise.id)
			onSaved()
			onClose()
		} catch (err) {
			console.warn('[greasing-modal] delete failed', err)
			setError(err instanceof Error ? err.message : 'Failed to delete')
		} finally {
			setDeleting(false)
		}
	}

	const inputClass = 'w-full h-9 px-2 bg-steel-950 border border-steel-700 rounded text-sm text-steel-100 focus:outline-none focus:border-primary-500'

	return (
		<div
			className="fixed top-14 inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center sm:p-4"
			onClick={onClose}
		>
			<form
				onSubmit={handleSubmit}
				onClick={e => e.stopPropagation()}
				className="w-full h-full sm:h-auto sm:max-w-md max-h-full bg-steel-900 sm:border sm:border-steel-700 sm:rounded-lg shadow-2xl flex flex-col"
			>
				<header className="flex items-center justify-between px-4 py-3 border-b border-steel-700">
					<h2 className="text-base font-semibold text-white">
						{mode === 'edit' ? 'Edit idea' : 'New idea'}
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
						<label className="text-xs uppercase tracking-wide text-steel-400">Label</label>
						<input
							type="text"
							value={label}
							onChange={e => setLabel(e.target.value)}
							autoFocus
							placeholder="ex. Pull-ups ladder"
							className={inputClass}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-xs uppercase tracking-wide text-steel-400">Note</label>
						<textarea
							value={note}
							onChange={e => setNote(e.target.value)}
							rows={4}
							placeholder="Optional details, sets, target reps…"
							className={`${inputClass} h-auto py-2 resize-none`}
						/>
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
