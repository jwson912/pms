<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useParkingStore } from '../stores/parking'
import { calculateFee, calculateParkingMinutes, formatCurrency, formatDateTime } from '../utils/fee'

const auth = useAuthStore()
const parking = useParkingStore()

const myActiveCars = computed(() => {
  const userId = auth.user?.userId || auth.user?.id || ''
  const legacyEmail = auth.user?.legacyEmail || ''
  return parking.parkingRecords.filter((record) => (
    record.owner_id === userId || record.owner_email === legacyEmail
  ))
})

function plateText(carNumber) {
  return String(carNumber || '').replace(/\s+/g, '')
}

function minutesFor(record) {
  return calculateParkingMinutes(record.entry_time)
}

function feeFor(record) {
  return calculateFee(minutesFor(record), parking.settings)
}
</script>

<template>
  <section>
    <h2>내 정보</h2>
    <div class="cards">
      <div class="card wide">
        <span>로그인 아이디</span>
        <strong>{{ auth.user?.userId }}</strong>
      </div>
      <div class="card">
        <span>권한</span>
        <strong>{{ auth.isAdmin ? '관리자' : '사용자' }}</strong>
      </div>
      <div class="card">
        <span>입차 등록 차량</span>
        <strong>{{ myActiveCars.length }}대</strong>
      </div>
    </div>

    <div v-if="myActiveCars.length" class="my-car-grid">
      <article v-for="record in myActiveCars" :key="record.id" class="panel my-car-card">
        <div class="plate-photo-image" aria-label="자동차 앞범퍼와 차량번호판 이미지">
          <div class="plate-photo-number">
            <span class="plate-photo-text">{{ plateText(record.car_number) }}</span>
          </div>
        </div>
        <div class="detail-grid">
          <span>차량 번호</span><strong>{{ record.car_number }}</strong>
          <span>차종</span><strong>{{ record.car_type }}</strong>
          <span>주차 구역</span><strong>{{ record.parking_zone }}</strong>
          <span>입차 시간</span><strong>{{ formatDateTime(record.entry_time) }}</strong>
          <span>주차 시간</span><strong>{{ minutesFor(record) }}분</strong>
          <span>현재 요금</span><strong>{{ formatCurrency(feeFor(record)) }}</strong>
        </div>
      </article>
    </div>
    <div v-else class="panel empty">
      현재 내 계정으로 등록된 입차 차량이 없습니다.
    </div>
  </section>
</template>
