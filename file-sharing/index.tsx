import { faShareNodes } from '@fortawesome/free-solid-svg-icons'
import { defineHubby } from '@cxxi-lab/hubbyware-sdk/frame'
import { ComingSoon } from './pages/ComingSoon'
import './hubby.css'

// File Sharing: announced, its pages to come.
export default defineHubby({
	pages: [
		{ path: '/', component: ComingSoon, title: 'File Sharing', icon: faShareNodes, nav: {} }
	]
})
