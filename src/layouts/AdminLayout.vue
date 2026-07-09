<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useParkingStore } from '../stores/parking'

const router = useRouter()
const auth = useAuthStore()
const parking = useParkingStore()

onMounted(() => parking.load())

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="brand">PARKING MVP</div>
      <nav class="nav">
        <RouterLink v-if="auth.isAdmin" to="/admin/dashboard">대시보드</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin/entry">입차 등록</RouterLink>
        <RouterLink to="/admin/exit">출차 처리</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin/parking">주차 현황</RouterLink>
        <RouterLink to="/admin/notices">공지사항</RouterLink>
        <RouterLink to="/admin/my">내 정보</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin/users">사용자 관리</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin/settings">설정</RouterLink>
      </nav>
    </aside>

    <main class="content">
      <header class="topbar">
        <div>
          <strong>{{ auth.isAdmin ? '관리자' : '일반 사용자' }}</strong>
        </div>
        <button class="btn btn-light" @click="logout">로그아웃</button>
      </header>
      <p v-if="parking.error" class="panel error">{{ parking.error }}</p>
      <RouterView />
    </main>
  </div>
</template>
