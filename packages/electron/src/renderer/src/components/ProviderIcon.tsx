import type { SVGProps } from 'react'
import sprite from '../../../../../ui/src/components/provider-icons/sprite.svg'
import { iconNames, type IconName } from '../../../../../ui/src/components/provider-icons/types'

type ProviderIconProps = Omit<SVGProps<SVGSVGElement>, 'id'> & {
  id: string
}

export function ProviderIcon({ id, ...props }: ProviderIconProps) {
  const resolved = iconNames.includes(id as IconName) ? id : 'synthetic'

  return (
    <svg {...props} data-component="provider-icon">
      <use href={`${sprite}#${resolved}`} />
    </svg>
  )
}
