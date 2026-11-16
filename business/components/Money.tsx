import { Amount } from '@cxxi-lab/hubbyware-sdk'
import { formatCents } from '../lib/money'

/** An amount shown (cents, in euros): blurred when Business' Privacy asks for it, a click shows it. */
export function Money({ cents }: { cents: number }) {
	return <Amount hubby="business">{formatCents(cents)}</Amount>
}
