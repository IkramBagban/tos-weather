import { useUiScaleToSetRem } from '@telemetryos/sdk/react'
import { useUiScaleStoreState } from '../hooks/store'

export function Render() {
  const [_isUiScaleLoading, uiScale] = useUiScaleStoreState()
  useUiScaleToSetRem(uiScale)

  return (
    <div className="render">
      <h1>Weather App Render View</h1>
      <p>Configure settings in the Settings panel.</p>
    </div>
  )
}
