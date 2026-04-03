/**
 * Firebase Web SDK 初始化（Vite）。
 * 請在 .env / .env.local 設定 VITE_FIREBASE_*，勿將真實金鑰提交至版控。
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined
}

function canInit(): boolean {
  return Boolean(
    firebaseConfig.apiKey?.trim() &&
      firebaseConfig.projectId?.trim() &&
      firebaseConfig.appId?.trim()
  )
}

let app: FirebaseApp | null = null

if (canInit()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  } catch (e) {
    console.warn('[Firebase] initializeApp 失敗', e)
  }
} else if (import.meta.env.DEV) {
  console.info(
    '[Firebase] 未設定 VITE_FIREBASE_API_KEY / PROJECT_ID / APP_ID，已略過初始化。請參考 .env.example'
  )
}

export const firebaseApp = app

/** Firebase Auth（與 App 共用實例）；未初始化時為 null */
export const firebaseAuth: Auth | null = app ? getAuth(app) : null

export const googleAuthProvider = new GoogleAuthProvider()

/**
 * Google 彈窗登入並取得 ID Token（傳給後端 POST /user/login/firebase）。
 */
export async function getGoogleIdToken(): Promise<string | null> {
  if (!firebaseAuth) {
    console.warn('[Firebase] Auth 未初始化')
    return null
  }
  try {
    const result = await signInWithPopup(firebaseAuth, googleAuthProvider)
    return await result.user.getIdToken()
  } catch (e) {
    console.error('[Firebase] Google 登入失敗', e)
    return null
  }
}

/** Analytics 僅在瀏覽器且支援時建立；需 measurementId */
let analyticsPromise: Promise<Analytics | null> | null = null

export function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (!app || !firebaseConfig.measurementId?.trim()) {
    return Promise.resolve(null)
  }
  if (typeof window === 'undefined') {
    return Promise.resolve(null)
  }
  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) => {
      if (!supported || !app) return null
      return getAnalytics(app)
    })
  }
  return analyticsPromise
}

void getFirebaseAnalytics()
