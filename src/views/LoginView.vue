<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const mode = ref('login')
const userId = ref('')
const password = ref('')
const passwordConfirm = ref('')
const message = ref('')
const findMessage = ref('')
const showFindActions = ref(false)

async function submit() {
  message.value = ''
  findMessage.value = ''
  showFindActions.value = false
  if (mode.value === 'signup') {
    if (!userId.value.trim()) {
      auth.error = '아이디를 입력하세요.'
      return
    }
    if (password.value.length < 8) {
      auth.error = '비밀번호는 8자 이상 입력하세요.'
      return
    }
    if (password.value !== passwordConfirm.value) {
      auth.error = '비밀번호가 서로 일치하지 않습니다.'
      return
    }
    const result = await auth.signup(userId.value, password.value)
    if (!result.ok) return
    router.push('/admin/dashboard')
    return
  }

  const ok = await auth.login(userId.value, password.value)
  if (ok) {
    router.push('/admin/dashboard')
  } else {
    showFindActions.value = true
  }
}

function changeMode(nextMode) {
  mode.value = nextMode
  auth.error = ''
  message.value = ''
  findMessage.value = ''
  showFindActions.value = false
  password.value = ''
  passwordConfirm.value = ''
}

function findIds() {
  auth.error = ''
  message.value = ''
  const ids = auth.findUserIds()
  findMessage.value = ids.length
    ? `등록된 아이디: ${ids.join(', ')}`
    : '등록된 아이디가 없습니다.'
}

function findPassword() {
  auth.error = ''
  message.value = ''
  const id = userId.value.trim()
  if (!id) {
    findMessage.value = '비밀번호를 찾으려면 아이디를 먼저 입력하세요.'
    return
  }
  const foundPassword = auth.findPassword(id)
  findMessage.value = foundPassword
    ? `${id} 계정의 비밀번호는 ${foundPassword} 입니다.`
    : '해당 아이디를 찾을 수 없습니다.'
}
</script>

<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="submit">
      <h1>주차관리 시스템</h1>
      <p class="muted">{{ mode === 'login' ? '서비스 로그인' : '신규 회원가입' }}</p>
      <label>아이디</label>
      <input v-model.trim="userId" required />
      <label>비밀번호</label>
      <input v-model="password" type="password" minlength="8" required />
      <template v-if="mode === 'signup'">
        <label>비밀번호 확인</label>
        <input v-model="passwordConfirm" type="password" minlength="8" required />
      </template>
      <p v-if="auth.error" class="error">{{ auth.error }}</p>
      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="findMessage" class="hint">{{ findMessage }}</p>
      <button class="btn btn-primary full" :disabled="auth.loading">
        {{ auth.loading ? '처리 중...' : (mode === 'login' ? '로그인' : '회원가입') }}
      </button>
      <div v-if="mode === 'login' && showFindActions" class="login-actions">
        <button class="btn btn-light" type="button" @click="findIds">아이디 찾기</button>
        <button class="btn btn-light" type="button" @click="findPassword">비밀번호 찾기</button>
      </div>
      <button
        class="btn btn-light full"
        type="button"
        :disabled="auth.loading"
        @click="changeMode(mode === 'login' ? 'signup' : 'login')"
      >
        {{ mode === 'login' ? '신규 회원가입' : '로그인으로 돌아가기' }}
      </button>
    </form>
  </div>
</template>
