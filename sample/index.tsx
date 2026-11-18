import { faCircleInfo, faFlask } from '@fortawesome/free-solid-svg-icons'
import { collection, defineHubby } from '@cxxi-lab/hubbyware-sdk/frame'
import { Notes } from './pages/Notes'
import { About } from './pages/About'
import './hubby.css'

// Hubby Lab: the first hubby running isolated (docs/plan-hubby-architecture.md § 4 ter). Its pages
// make its navigation (the host builds it); it only knows @cxxi-lab/hubbyware-sdk/frame and @cxxi-lab/hubbyware-ui.
export default defineHubby({
	pages: [
		{ path: '/', component: Notes, title: 'Notes', icon: faFlask, nav: { section: 'Lab' } },
		{ path: '/about', component: About, title: 'About', icon: faCircleInfo, nav: { section: 'Lab' } }
	],
	navSections: { Lab: faFlask },
	// its API for the other hubbies (api.json describes it): run here, in its frame
	api: {
		'notes.search': async ({ query, limit = 10 }: { query?: string, limit?: number }) => {
			const text = query?.trim().toLowerCase() ?? ''
			const notes = await collection('note').find()
			return notes
				.filter(n => !text || String(n.title ?? '').toLowerCase().includes(text))
				.slice(0, limit)
				.map(n => ({ id: n.id, title: String(n.title ?? '') }))
		}
	}
})
