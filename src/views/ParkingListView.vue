<script setup>
import { computed, ref } from 'vue'
import { useParkingStore } from '../stores/parking'
import { useAuthStore } from '../stores/auth'
import { calculateFee, calculateParkingMinutes, formatCurrency, formatDateTime } from '../utils/fee'

const parking = useParkingStore()
const auth = useAuthStore()
const keyword = ref('')
const status = ref('parking')
const now = ref(Date.now())
setInterval(() => { now.value = Date.now() }, 60_000)

const filtered = computed(() => {
  const key = keyword.value.trim().toUpperCase()
  return parking.records.filter((record) => {
    const statusOk = status.value === 'all' || record.status === status.value
    return statusOk && (!key || record.car_number.includes(key))
  })
})

function minutesFor(record) {
  void now.value
  return record.status === 'out'
    ? Number(record.parking_minutes || 0)
    : calculateParkingMinutes(record.entry_time)
}

function currentFee(record) {
  return record.status === 'out' ? Number(record.fee || 0) : calculateFee(minutesFor(record), parking.settings)
}
</script>

<template>
  <section>
    <h2>주차 현황</h2>
    <div class="panel toolbar">
      <input v-model="keyword" placeholder="차량 번호 검색" />
      <select v-model="status">
        <option value="parking">주차 중</option>
        <option value="out">출차 완료</option>
        <option value="all">전체</option>
      </select>
    </div>
    <div class="panel table-wrap">
      <table>
        <thead>
          <tr><th>차량 번호</th><th>차종</th><th>구역</th><th>입차</th><th>주차 시간</th><th>상태</th><th>요금</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="record in filtered" :key="record.id">
            <td>{{ record.car_number }}</td>
            <td>{{ record.car_type }}</td>
            <td>{{ record.parking_zone }}</td>
            <td>{{ formatDateTime(record.entry_time) }}</td>
            <td>{{ minutesFor(record) }}분</td>
            <td><span class="badge" :class="record.status">{{ record.status === 'parking' ? '주차 중' : '출차 완료' }}</span></td>
            <td>{{ formatCurrency(currentFee(record)) }}</td>
            <td>
              <button v-if="auth.isAdmin" class="btn btn-light small" @click="parking.remove(record.id)">
                삭제
              </button>
            </td>
          </tr>
          <tr v-if="filtered.length === 0"><td colspan="8" class="empty">조건에 맞는 기록이 없습니다.</td></tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
