import { useInit } from '@cxxi-lab/hub-sdk/frame'

export function About() {
	const init = useInit()
	return (
		<div className="flex flex-col gap-3 p-4 sm:p-6 text-sm text-steel-300 max-w-2xl">
			<h1 className="m-0 text-lg font-semibold text-white">About Hubby Lab</h1>
			<p className="m-0">This module runs isolated: in a sandboxed frame with an origin of its own, without the app's session. Everything it does goes through the app, within the permissions you gave it.</p>
			<p className="m-0 text-steel-500">{init ? `Running as "${init.module}" on a ${init.phone ? 'phone' : 'desktop'}.` : 'Waiting for the app…'}</p>
		</div>
	)
}
