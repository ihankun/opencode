import { Trans } from 'react-i18next'
import type { ComponentType, ReactElement } from 'react'

type I18nTransProps = {
  i18nKey: string
  components?: Record<string, ReactElement>
}

// react-i18next can resolve a second compatible React type package in this
// monorepo. Keep the type bridge in one place while retaining Trans at runtime.
export const I18nTrans = Trans as unknown as ComponentType<I18nTransProps>
