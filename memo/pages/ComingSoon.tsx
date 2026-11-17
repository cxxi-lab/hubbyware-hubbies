import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faNoteSticky } from '@fortawesome/free-solid-svg-icons'

export function ComingSoon() {
	return (
		<div className="flex flex-col items-center justify-center gap-3 p-10 text-center text-sm text-steel-400">
			<FontAwesomeIcon icon={faNoteSticky} className="text-3xl text-steel-600" />
			<h1 className="m-0 text-lg font-semibold text-white">Memo</h1>
			<p className="m-0">Notes and reminders. Coming soon.</p>
		</div>
	)
}
