import { faCircleInfo, faFlask } from '@fortawesome/free-solid-svg-icons'
import { defineModule } from '@cxxi-lab/hub-sdk/frame'
import { Notes } from './pages/Notes'
import { About } from './pages/About'
import './module.css'

// Hubby Lab: the first hubby running isolated (docs/plan-module-architecture.md § 4 ter). Its pages
// make its navigation (the host builds it); it only knows @cxxi-lab/hub-sdk/frame and @cxxi-lab/hub-ui.
export default defineModule({
	pages: [
		{ path: '/', component: Notes, title: 'Notes', icon: faFlask, nav: { section: 'Lab' } },
		{ path: '/about', component: About, title: 'About', icon: faCircleInfo, nav: { section: 'Lab' } }
	],
	navSections: { Lab: faFlask }
})
