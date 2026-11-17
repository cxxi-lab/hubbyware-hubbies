import { faMusic } from '@fortawesome/free-solid-svg-icons'
import { defineHubby } from '@cxxi-lab/hubbyware-sdk/frame'
import { ComingSoon } from './pages/ComingSoon'
import './hubby.css'

// Music: announced, its pages to come.
export default defineHubby({
	pages: [
		{ path: '/', component: ComingSoon, title: 'Music', icon: faMusic, nav: {} }
	]
})
