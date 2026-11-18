import { Link } from 'react-router'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { MailSettings } from './MailSettings'

/**
 * Mail's settings as a page of its own (hubby.json `settingsPage`): Mail runs isolated, its
 * settings open from the app's Hubbies screen into this page (client docs/plan-isolation.md).
 */
export function MailSettingsPage() {
	return (
		<div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
			<div className="max-w-3xl flex flex-col gap-4">
				<div className="flex items-center gap-3">
					<Link to="/mail" title="Back to the mail" aria-label="Back" className="size-8 shrink-0 flex items-center justify-center rounded text-steel-300 hover:text-white hover:bg-steel-700">
						<FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
					</Link>
					<h1 className="m-0 text-lg font-semibold text-white">Mail settings</h1>
				</div>
				<MailSettings />
			</div>
		</div>
	)
}
