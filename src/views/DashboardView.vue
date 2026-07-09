<script setup>
import { computed } from 'vue'
import { useParkingStore } from '../stores/parking'
import { calculateFee, calculateParkingMinutes, formatCurrency, formatDateTime } from '../utils/fee'

const parking = useParkingStore()
const occupancy = computed(() => {
  const max = Number(parking.settings.maxCapacity || 100)
  return max ? Math.round((parking.currentCount / max) * 100) : 0
})
const recent = computed(() => parking.records.slice(0, 5))
const estimatedCurrentFee = computed(() => parking.parkingRecords.reduce((sum, record) => {
  return sum + calculateFee(calculateParkingMinutes(record.entry_time), parking.settings)
}, 0))
</script>

<template>
  <section>
    <h2>대시보드</h2>
    <div class="cards">
      <div class="card"><span>현재 주차</span><strong>{{ parking.currentCount }}대</strong></div>
      <div class="card"><span>남은 자리</span><strong>{{ parking.remainingCount }}대</strong></div>
      <div class="card"><span>점유율</span><strong>{{ occupancy }}%</strong></div>
      <div class="card"><span>오늘 매출</span><strong>{{ formatCurrency(parking.todaySales) }}</strong></div>
      <div class="card"><span>오늘 입차</span><strong>{{ parking.todayEntryCount }}건</strong></div>
      <div class="card"><span>오늘 출차</span><strong>{{ parking.todayExitCount }}건</strong></div>
      <div class="card wide"><span>현재 예상 요금 합계</span><strong>{{ formatCurrency(estimatedCurrentFee) }}</strong></div>
    </div>
    <div class="panel table-wrap">
      <h3>최근 입·출차</h3>
      <table>
        <thead><tr><th>차량 번호</th><th>입차</th><th>출차</th><th>상태</th><th>요금</th></tr></thead>
        <tbody>
          <tr v-for="record in recent" :key="record.id">
            <td>{{ record.car_number }}</td>
            <td>{{ formatDateTime(record.entry_time) }}</td>
            <td>{{ formatDateTime(record.exit_time) }}</td>
            <td><span class="badge" :class="record.status">{{ record.status === 'parking' ? '주차 중' : '출차 완료' }}</span></td>
            <td>{{ formatCurrency(record.fee) }}</td>
          </tr>
          <tr v-if="!recent.length"><td colspan="5" class="empty">등록된 기록이 없습니다.</td></tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
