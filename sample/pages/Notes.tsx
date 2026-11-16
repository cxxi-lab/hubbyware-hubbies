import { useEffect, useState } from 'react'
import { faPlus, faStopwatch, faTrash, faWindowRestore } from '@fortawesome/free-solid-svg-icons'
import { Button, Modal } from '@cxxi-lab/hubbyware-ui'
import { call, collection, nav, notifications, settings, useInit, usePath, type Doc } from '@cxxi-lab/hubbyware-sdk/frame'

const notes = collection('note')

/**
 * The prototype hubby: a few notes (a collection through the host), a modal (what a modal covers
 * from inside a frame), a latency meter, what the frame can and can't reach.
 */
export function Notes() {
	const init = useInit()
	const path = usePath()
	const [items, setItems] = useState<Doc[]>([])
	const [title, setTitle] = useState('')
	const [modal, setModal] = useState(false)
	const [lines, setLines] = useState<string[]>([])
	const log = (line: string) => setLines(l => [line, ...l].slice(0, 12))

	useEffect(() => { if (init) void notes.find().then(setItems) }, [init])

	const add = async () => {
		if (!title.trim()) return
		const doc = await notes.create({ title: title.trim() })
		setItems(i => [doc, ...i])
		setTitle('')
	}

	const latency = async () => {
		const n = 100
		const t0 = performance.now()
		for (let i = 0; i < n; i++) await call('echo', i)
		const local = (performance.now() - t0) / n
		const t1 = performance.now()
		await settings.account()
		log(`echo: ${local.toFixed(2)} ms/round trip (×${n}) · real API call through the host: ${(performance.now() - t1).toFixed(0)} ms`)
	}

	const probes = () => {
		const tryIt = (label: string, fn: () => unknown) => {
			try { log(`${label}: ${String(fn())}`) }
			catch (e) { log(`${label}: blocked (${(e as Error).name})`) }
		}
		tryIt('parent DOM', () => window.parent.document.title)
		tryIt('localStorage', () => window.localStorage.length)
		tryIt('document.cookie', () => document.cookie || '(empty)')
		tryIt('origin', () => window.origin)
	}

	return (
		<div className="min-h-screen flex flex-col gap-4 p-4 text-steel-100">
			<header className="flex items-center gap-2">
				<h1 className="flex-1 m-0 text-lg font-semibold text-white">Notes</h1>
				<span className="text-xs text-steel-500">{init ? `${init.hubby} · ${init.phone ? 'phone' : 'desktop'} · path ${path}` : 'waiting for the host…'}</span>
			</header>

			<section className="flex gap-2">
				<input
					value={title}
					onChange={e => setTitle(e.target.value)}
					onKeyDown={e => { if (e.key === 'Enter') void add() }}
					placeholder="A note"
					className="flex-1 min-w-0 h-9 px-3 rounded bg-steel-950 border border-steel-700 text-sm text-steel-100 outline-none focus:border-primary-500"
				/>
				<Button icon={faPlus} label="Add" onClick={() => void add()} />
			</section>

			<ul className="m-0 p-0 list-none flex flex-col gap-1">
				{items.map(n => (
					<li key={n.id} className="flex items-center gap-2 px-3 h-10 rounded bg-steel-900 border border-steel-800">
						<span className="flex-1 truncate text-sm">{String(n.title)}</span>
						<button
							type="button"
							onClick={() => void notes.remove(n.id).then(() => setItems(i => i.filter(x => x.id !== n.id)))}
							className="size-7 flex items-center justify-center rounded bg-transparent border-0 text-steel-400 hover:text-white cursor-pointer"
							aria-label="Delete"
						>
							<span className="text-xs">✕</span>
						</button>
					</li>
				))}
				{items.length === 0 && <li className="text-sm text-steel-500 italic">No notes yet.</li>}
			</ul>

			<section className="flex flex-wrap gap-2">
				<Button icon={faWindowRestore} color="secondary" label="Open a modal" onClick={() => setModal(true)} />
				<Button icon={faStopwatch} color="secondary" label="Measure latency" onClick={() => void latency()} />
				<Button color="secondary" label="Probe the sandbox" onClick={probes} />
				<Button color="secondary" label="Go to About" onClick={() => nav.navigate('/about')} />
				<Button icon={faTrash} color="secondary" label="Notify" onClick={() => void notifications.upsert({ key: 'proto', title: 'From the frame', body: 'A notification asked by the hubby' }).then(() => log('notification: done'), e => log(`notification: ${(e as Error).message}`))} />
			</section>

			<pre className="m-0 p-3 rounded bg-steel-950 border border-steel-800 text-[11px] leading-relaxed whitespace-pre-wrap">{lines.join('\n') || 'Results show here.'}</pre>

			{modal && (
				<Modal title="A modal inside the frame" onClose={() => setModal(false)}>
					<p className="text-sm text-steel-300">It covers the frame only: the app's top bar (and the phone's bottom bar) stay above it. The back button closes it (the host asks the frame).</p>
				</Modal>
			)}
		</div>
	)
}
