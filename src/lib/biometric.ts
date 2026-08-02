import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth'
import { Capacitor } from '@capacitor/core'

export type LockMethod = 'faceId' | 'touchId' | 'fingerprint' | 'biometrics' | 'passcode' | 'none'

export const lockMethodLabels: Record<Exclude<LockMethod, 'none'>, string> = {
  faceId: 'Face ID',
  touchId: 'Touch ID',
  fingerprint: 'fingerprint',
  biometrics: 'biometrics',
  passcode: 'passcode',
}

// dev-only: the plugin's web mock (confirm dialogs) so the unlock flow works in the browser
async function simulateWebBiometry() {
  await BiometricAuth.setBiometryType(BiometryType.faceId)
  await BiometricAuth.setBiometryIsEnrolled(true)
  await BiometricAuth.setDeviceIsSecure(true)
}

export async function getLockMethod(): Promise<LockMethod> {
  if (!Capacitor.isNativePlatform() && import.meta.env.DEV) await simulateWebBiometry()
  const result = await BiometricAuth.checkBiometry()
  if (result.isAvailable) {
    if (result.biometryType === BiometryType.faceId) return 'faceId'
    if (result.biometryType === BiometryType.touchId) return 'touchId'
    if (result.biometryType === BiometryType.fingerprintAuthentication) return 'fingerprint'
    return 'biometrics'
  }
  return result.deviceIsSecure ? 'passcode' : 'none'
}

export async function authenticateForDocuments(): Promise<boolean> {
  try {
    await BiometricAuth.authenticate({
      reason: 'Unlock your documents',
      allowDeviceCredential: true,
    })
    return true
  } catch {
    return false
  }
}
