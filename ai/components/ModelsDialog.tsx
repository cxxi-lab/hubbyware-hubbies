import { useState } from 'react'
import { Button, Modal } from '@cxxi-lab/hubbyware-ui'
import { ai, errorMessage, type AiRepoModel } from '@cxxi-lab/hubbyware-sdk'
import { addedModels, type AddedModelDoc } from '../lib/data'

/**
 * The models added from Hugging Face links (client docs/plan-ia-chat.md § 2.6): a link read by the
 * device (its commit, its GGUF files, how each fits here), one picked, named, kept (synced: the other
 * devices offer it too, each downloading it once allowed); removed.
 */

const gb = (bytes: number) => `${(bytes / 2 ** 30).toFixed(bytes < 2 ** 30 ? 2 : 1)} GB`
const FIT: Record<AiRepoModel['fit'], string> = { runs: 'text-emerald-300', slow: 'text-amber-300', cannot: 'text-red-300' }

export function ModelsDialog({ added, onClose }: { added: AddedModelDoc[], onClose: () => void }) {
	const [link, setLink] = useState('')
	const [reading, setReading] = useState(false)
	const [listing, setListing] = useState<{ repo: string, revision: string, models: AiRepoModel[] } | null>(null)
	const [picked, setPicked] = useState<string | null>(null)
	const [label, setLabel] = useState('')
	const [error, setError] = useState<string | null>(null)

	const read = async () => {
		setError(null)
		setListing(null)
		setReading(true)
		try {
			const result = await ai.models.inspect(link)
			setListing(result)
			const first = result.models.find(m => m.name === result.selected) ?? result.models.find(m => m.fit === 'runs') ?? result.models[0]
			setPicked(first.name)
			setLabel(first.label)
		}
		catch (err) {
			setError(errorMessage(err))
		}
		finally {
			setReading(false)
		}
	}

	const add = async () => {
		const model = listing?.models.find(m => m.name === picked)
		if (!listing || !model) return
		if (added.some(a => a.name === model.name)) { setError('This model is already added.'); return }
		try {
			await addedModels.create({ name: model.name, label: label.trim() || model.label, spec: JSON.stringify({ repo: listing.repo, revision: listing.revision, files: model.files, requires: model.requires }) })
			setListing(null)
			setLink('')
		}
		catch (err) {
			setError(errorMessage(err))
		}
	}

	return (
		<Modal title="Models" size="lg" onClose={onClose}>
			<div className="flex flex-col gap-4 text-sm text-steel-200">
				<div className="flex flex-col gap-2">
					<span className="text-xs text-steel-400">Added from Hugging Face. Each runs on the device: it is downloaded, once you allow it, on each device that uses it.</span>
					{added.length === 0 && <span className="text-xs text-steel-500">None yet.</span>}
					{added.map(m => (
						<div key={m.id} className="flex items-center gap-3 rounded border border-steel-800 px-3 py-2">
							<div className="flex-1 min-w-0">
								<div className="truncate text-white">{m.label}</div>
								<div className="truncate text-xs text-steel-400">{(JSON.parse(m.spec) as { repo: string }).repo}</div>
							</div>
							<Button label="Remove" color="secondary" onClick={() => void addedModels.remove(m.id)} />
						</div>
					))}
				</div>
				<div className="flex flex-col gap-2 border-t border-steel-800 pt-4">
					<span className="text-xs text-steel-400">Add a model: its link on Hugging Face (a GGUF model; public repos for now).</span>
					<div className="flex gap-2">
						<input value={link} onChange={e => setLink(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void read() }}
							placeholder="https://huggingface.co/owner/model-GGUF" className="flex-1 min-w-0 rounded bg-steel-800 px-3 py-2 text-white outline-none focus:ring-1 focus:ring-primary-500" />
						<Button label={reading ? 'Reading…' : 'Read'} isDisabled={reading || !link.trim()} onClick={() => void read()} />
					</div>
					{error && <p className="m-0 text-xs text-red-300" data-testid="models-error">{error}</p>}
					{listing && (
						<div className="flex flex-col gap-1" data-testid="repo-models">
							<span className="text-xs text-steel-400">{listing.repo} @ {listing.revision.slice(0, 8)} — {listing.models.length} file{listing.models.length > 1 ? 's' : ''}</span>
							<div className="max-h-64 overflow-y-auto flex flex-col gap-1">
								{listing.models.map(m => (
									<label key={m.name} className={`flex items-center gap-3 rounded px-2 py-1.5 cursor-pointer ${picked === m.name ? 'bg-steel-800' : 'hover:bg-steel-800/60'}`}>
										<input type="radio" name="model" checked={picked === m.name} onChange={() => { setPicked(m.name); setLabel(m.label) }} />
										<span className="flex-1 min-w-0 truncate text-white">{m.label}{m.files.length > 1 ? ` (${m.files.length} parts)` : ''}</span>
										<span className="text-xs text-steel-400">{gb(m.sizeBytes)}</span>
										<span className={`text-xs ${FIT[m.fit]}`} title={m.reason}>{m.fit === 'runs' ? 'runs here' : m.fit === 'slow' ? 'slow here' : 'too large'}</span>
									</label>
								))}
							</div>
							<div className="flex items-center gap-2 pt-2">
								<input value={label} onChange={e => setLabel(e.target.value)} placeholder="Its name" className="flex-1 min-w-0 rounded bg-steel-800 px-3 py-2 text-white outline-none" />
								<Button label="Add" isDisabled={!picked || listing.models.find(m => m.name === picked)?.fit === 'cannot'} onClick={() => void add()} />
							</div>
						</div>
					)}
				</div>
			</div>
		</Modal>
	)
}
