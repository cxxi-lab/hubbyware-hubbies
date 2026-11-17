import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShareNodes } from '@fortawesome/free-solid-svg-icons'

export function ComingSoon() {
	return (
		<div className="flex flex-col items-center justify-center gap-3 p-10 text-center text-sm text-steel-400">
			<FontAwesomeIcon icon={faShareNodes} className="text-3xl text-steel-600" />
			<h1 className="m-0 text-lg font-semibold text-white">File Sharing</h1>
			<p className="m-0">Send and receive files. Coming soon.</p>
		</div>
	)
}
