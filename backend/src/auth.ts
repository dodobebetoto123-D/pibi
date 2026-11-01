import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import type { Context, Next } from 'hono'
import { projectsDb } from './db.js'

export type AppEnv = { Variables: { uid: string } }

let adminAuth: Auth | undefined

function getFirebaseAdminAuth(): Auth {
  if (adminAuth) return adminAuth
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required to verify Firebase ID tokens')
    const credential = serviceAccountJson
      ? (() => {
          const serviceAccount = JSON.parse(serviceAccountJson)
          return cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key?.replace(/\\n/g, '\n'),
          })
        })()
      : applicationDefault()
    initializeApp({ credential, projectId })
  }
  adminAuth = getAuth()
  return adminAuth
}

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const authorization = c.req.header('Authorization') ?? ''
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return c.json({ error: 'authentication required' }, 401)

  let auth: Auth
  try {
    auth = getFirebaseAdminAuth()
  } catch (error) {
    console.error('Firebase Admin configuration error:', error)
    return c.json({ error: 'Firebase Admin is not configured on the server' }, 503)
  }

  let decoded: Awaited<ReturnType<Auth['verifyIdToken']>>
  try {
    // Signature, issuer, audience, and expiry are verified by default. Checking
    // revocation makes an extra authenticated Admin API call, so enable it only
    // when the server is provisioned with credentials for that call.
    decoded = await auth.verifyIdToken(token, process.env.FIREBASE_CHECK_REVOKED === 'true')
  } catch (error) {
    console.warn('Firebase ID token verification failed:', error instanceof Error ? error.message : error)
    return c.json({ error: 'invalid or expired authentication token' }, 401)
  }
  try {
    c.set('uid', decoded.uid)
    // Existing local projects have no owner. The first authenticated account claims them.
    projectsDb.claimUnowned(decoded.uid)
  } catch {
    return c.json({ error: 'could not initialize the user workspace' }, 500)
  }
  await next()
}
