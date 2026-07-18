import { getSDKClient, unwrap } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'

export async function moveSession(sessionId: string, destination: string, moveChanges: boolean) {
  const sdk = getSDKClient()
  unwrap(await sdk.experimental.controlPlane.moveSession({
    sessionID: sessionId,
    destination: { directory: formatPathForApi(destination) || destination },
    moveChanges,
  }))
}
