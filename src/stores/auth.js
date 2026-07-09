import { defineStore } from 'pinia'

const SESSION_KEY = 'parking.admin.session'
const USER_PROFILES_KEY = 'parking.user.profiles'

const INITIAL_USERS = [
  {
    id: 'admin',
    userId: 'admin',
    legacyEmail: 'admin@miracom-inc.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    id: 'jw85.son',
    userId: 'jw85.son',
    legacyEmail: 'jw85.son@miracom-inc.com',
    password: 'jw85.son123',
    role: 'user',
  },
]

function normalizeUserId(value) {
  return String(value || '').trim().toLowerCase()
}

function userIdFromEmail(email) {
  return normalizeUserId(String(email || '').split('@')[0])
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

function readLocalProfiles() {
  try {
    const profiles = JSON.parse(localStorage.getItem(USER_PROFILES_KEY) || '[]')
    return Array.isArray(profiles) ? profiles : []
  } catch {
    localStorage.removeItem(USER_PROFILES_KEY)
    return []
  }
}

function writeLocalProfiles(profiles) {
  localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles))
}

function normalizeProfile(profile) {
  const legacyEmail = profile.legacyEmail || profile.email || ''
  const userId = normalizeUserId(profile.userId || (legacyEmail ? userIdFromEmail(legacyEmail) : profile.id))
  return {
    id: userId,
    userId,
    legacyEmail,
    password: profile.password || '',
    role: profile.role || 'user',
    createdAt: profile.createdAt || new Date().toISOString(),
    updatedAt: profile.updatedAt || new Date().toISOString(),
    lastSignInAt: profile.lastSignInAt || null,
    provider: 'localStorage',
  }
}

function ensureInitialUsers() {
  const originalProfiles = readLocalProfiles()
    .filter((profile) => profile.id !== 'local-admin')
    .map(normalizeProfile)

  const byUserId = new Map()
  for (const profile of originalProfiles) {
    byUserId.set(profile.userId, profile)
  }

  const now = new Date().toISOString()
  for (const user of INITIAL_USERS) {
    const userId = normalizeUserId(user.userId)
    const legacyMatch = [...byUserId.values()].find((profile) => profile.legacyEmail === user.legacyEmail)
    const existing = byUserId.get(userId) || legacyMatch
    byUserId.set(userId, {
      ...normalizeProfile(existing || user),
      id: userId,
      userId,
      legacyEmail: user.legacyEmail,
      password: existing?.password || user.password,
      role: existing?.role || user.role,
      updatedAt: existing?.updatedAt || now,
    })
  }

  const profiles = [...byUserId.values()]
  writeLocalProfiles(profiles)
  return profiles
}

function findProfileByUserId(userId) {
  const normalizedUserId = normalizeUserId(userId)
  return ensureInitialUsers().find((profile) => profile.userId === normalizedUserId)
}

function toStoredUser(profile) {
  if (!profile) return null
  return {
    id: profile.userId,
    userId: profile.userId,
    legacyEmail: profile.legacyEmail || '',
    role: profile.role || 'user',
  }
}

function validateSession(session) {
  const sessionUserId = normalizeUserId(session?.userId || session?.id || userIdFromEmail(session?.email))
  if (!sessionUserId) return null
  const profile = findProfileByUserId(sessionUserId)
  if (!profile) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
  return toStoredUser(profile)
}

function saveProfiles(profiles) {
  const normalized = profiles.map(normalizeProfile)
  writeLocalProfiles(normalized)
  return normalized
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: validateSession(readSession()),
    profiles: ensureInitialUsers(),
    initialized: true,
    loading: false,
    error: '',
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    isAdmin: (state) => state.user?.role === 'admin',
  },
  actions: {
    async initialize() {
      this.profiles = ensureInitialUsers()
      this.user = validateSession(this.user)
      this.initialized = true
    },
    async login(userId, password) {
      this.loading = true
      this.error = ''
      try {
        const profile = findProfileByUserId(userId)
        if (!profile) throw new Error('아이디가 올바르지 않습니다.')
        if (profile.password !== password) throw new Error('비밀번호가 올바르지 않습니다.')

        const profiles = ensureInitialUsers()
        const index = profiles.findIndex((item) => item.userId === profile.userId)
        const updatedProfile = { ...profiles[index], lastSignInAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        profiles[index] = updatedProfile
        this.profiles = saveProfiles(profiles)
        this.user = toStoredUser(updatedProfile)
        localStorage.setItem(SESSION_KEY, JSON.stringify(this.user))
        return true
      } catch (error) {
        this.error = error.message
        return false
      } finally {
        this.loading = false
      }
    },
    async signup(userId, password) {
      this.loading = true
      this.error = ''
      try {
        const normalizedUserId = normalizeUserId(userId)
        if (!normalizedUserId) throw new Error('아이디를 입력해 주세요.')
        const profiles = ensureInitialUsers()
        if (profiles.some((profile) => profile.userId === normalizedUserId)) {
          throw new Error('이미 등록된 아이디입니다.')
        }

        const now = new Date().toISOString()
        const profile = {
          id: normalizedUserId,
          userId: normalizedUserId,
          legacyEmail: '',
          password,
          role: 'user',
          createdAt: now,
          updatedAt: now,
          lastSignInAt: now,
          provider: 'localStorage',
        }
        profiles.push(profile)
        this.profiles = saveProfiles(profiles)
        this.user = toStoredUser(profile)
        localStorage.setItem(SESSION_KEY, JSON.stringify(this.user))
        return { ok: true, needsConfirmation: false }
      } catch (error) {
        this.error = error.message
        return { ok: false, needsConfirmation: false }
      } finally {
        this.loading = false
      }
    },
    async logout() {
      this.user = null
      localStorage.removeItem(SESSION_KEY)
    },
    findUserIds() {
      return ensureInitialUsers().map((profile) => profile.userId)
    },
    findPassword(userId) {
      return findProfileByUserId(userId)?.password || ''
    },
    updateUserRole(userId, role) {
      const profiles = ensureInitialUsers()
      const index = profiles.findIndex((profile) => profile.userId === normalizeUserId(userId))
      if (index < 0) return false
      profiles[index] = { ...profiles[index], role, updatedAt: new Date().toISOString() }
      this.profiles = saveProfiles(profiles)
      if (this.user?.userId === profiles[index].userId) {
        this.user = toStoredUser(profiles[index])
        localStorage.setItem(SESSION_KEY, JSON.stringify(this.user))
      }
      return true
    },
    deleteUsers(userIds) {
      const targets = new Set(userIds.map(normalizeUserId))
      const profiles = ensureInitialUsers().filter((profile) => !targets.has(profile.userId) || profile.userId === this.user?.userId)
      this.profiles = saveProfiles(profiles)
      return this.profiles
    },
    loadLocalProfiles() {
      this.profiles = ensureInitialUsers()
      return this.profiles
    },
  },
})
