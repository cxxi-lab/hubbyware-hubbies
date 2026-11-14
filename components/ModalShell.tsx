import { useEffect, type FormEvent, type ReactNode } from 'react'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useBackHandler } from '@cxxi-lab/hub-sdk'

interface Props {
	title: string
	/** its width from sm up, a whole class (sm:max-w-…): the whole screen on a phone */
	width?: string
	onClose: () => void
	onSubmit: (e: FormEvent) => void
	footer: ReactNode
	children: ReactNode
}

/** Overlay + form frame shared by the Business modals (Escape / backdrop close). */
export function ModalShell({ title, width = 'sm:max-w-2xl', onClose, onSubmit, footer, children }: Props) {
	// the phone's back button closes it
	useBackHandler(true, onClose)
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [onClose])

	return (
		<div
			className="fixed top-14 inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center sm:p-4"
			onClick={onClose}
		>
			<form
				onSubmit={onSubmit}
				onClick={e => e.stopPropagation()}
				className={`w-full h-full sm:h-auto ${width} max-h-full bg-steel-900 sm:border sm:border-steel-700 sm:rounded-lg shadow-2xl flex flex-col`}
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
