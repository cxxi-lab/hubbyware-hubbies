import { useEffect, type FormEvent, type ReactNode } from 'react'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface Props {
	title: string
	width?: string
	onClose: () => void
	onSubmit: (e: FormEvent) => void
	footer: ReactNode
	children: ReactNode
}

// In the Settings window there is no top bar to leave uncovered.
const BELOW_TOP_BAR = new URLSearchParams(window.location.search).get('window') !== 'settings'

/** Overlay + form frame of the Mail modals (Escape / backdrop close). */
export function ModalShell({ title, width = 'max-w-2xl', onClose, onSubmit, footer, children }: Props) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [onClose])

	return (
		<div
			className={`fixed ${BELOW_TOP_BAR ? 'top-14' : 'top-0'} inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center p-4`}
			onClick={onClose}
		>
			<form
				onSubmit={onSubmit}
				onClick={e => e.stopPropagation()}
				className={`w-full ${width} max-h-full bg-steel-900 border border-steel-700 rounded-lg shadow-2xl flex flex-col`}
			>
				<header className="flex items-center justify-between px-4 py-3 border-b border-steel-700 shrink-0">
					<h2 className="text-base font-semibold text-white">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 flex items-center justify-center rounded text-steel-300 bg-transparent border-0 hover:bg-steel-700 cursor-pointer"
					>
						<FontAwesomeIcon icon={faXmark} />
					</button>
				</header>
				<div className="p-4 flex flex-col gap-4 overflow-y-auto">{children}</div>
				<footer className="flex items-center justify-between px-4 py-3 border-t border-steel-700 shrink-0">
					{footer}
				</footer>
			</form>
		</div>
	)
}
