import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet } from '@fortawesome/free-solid-svg-icons'

export function ComingSoon() {
	return (
		<div className="flex flex-col items-center justify-center gap-3 p-10 text-center text-sm text-steel-400">
			<FontAwesomeIcon icon={faWallet} className="text-3xl text-steel-600" />
			<h1 className="m-0 text-lg font-semibold text-white">Budget</h1>
			<p className="m-0">Expenses and accounts. Coming soon.</p>
		</div>
	)
}
