<script setup>
import { reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useParkingStore } from '../stores/parking'

const auth = useAuthStore()
const parking = useParkingStore()
const message = ref('')
const error = ref('')
const form = reactive({ car_number: '', car_type: '일반', parking_zone: 'A구역', owner_id: '', memo: '' })

async function submit() {
  message.value = ''
  error.value = ''
  try {
    const ownerId = auth.isAdmin ? form.owner_id : auth.user?.userId || auth.user?.id || ''
    const record = await parking.addEntry({ ...form, owner_id: ownerId })
    message.value = `${record.car_number} 차량의 입차 등록이 완료되었습니다.`
    form.car_number = ''
    if (auth.isAdmin) form.owner_id = ''
    form.memo = ''
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <section>
    <h2>입차 등록</h2>
    <form class="panel form" @submit.prevent="submit">
      <label>차량 번호</label>
      <input v-model.trim="form.car_number" placeholder="예: 12가3456" required />
      <label>차종</label>
      <select v-model="form.car_type">
        <option>일반</option><option>SUV</option><option>경차</option><option>전기차</option>
      </select>
      <label>주차 구역</label>
      <select v-model="form.parking_zone">
        <option>A구역</option><option>B구역</option><option>C구역</option>
      </select>
      <template v-if="auth.isAdmin">
        <label>소유자 아이디</label>
        <input v-model.trim="form.owner_id" placeholder="예: jw85.son" />
      </template>
      <p v-else class="muted">일반 사용자는 로그인 아이디 {{ auth.user?.userId }}로 입차 등록됩니다.</p>
      <label>메모</label>
      <input v-model.trim="form.memo" placeholder="선택 입력" />
      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn btn-primary" :disabled="parking.loading">입차 등록</button>
    </form>
  </section>
</template>
