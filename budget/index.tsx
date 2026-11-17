import { faWallet } from '@fortawesome/free-solid-svg-icons'
import { defineHubby } from '@cxxi-lab/hubbyware-sdk/frame'
import { ComingSoon } from './pages/ComingSoon'
import './hubby.css'

// Budget: announced, its pages to come.
export default defineHubby({
	pages: [
		{ path: '/', component: ComingSoon, title: 'Budget', icon: faWallet, nav: {} }
	]
})
