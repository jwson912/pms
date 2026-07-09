<script setup>
import { computed, ref } from 'vue'
import { useParkingStore } from '../stores/parking'
import { calculateFee, calculateParkingMinutes, formatCurrency, formatDateTime } from '../utils/fee'

const parking = useParkingStore()
const carNumber = ref('')
const selected = ref(null)
const message = ref('')
const error = ref('')
const couponCode = ref('')
const exitNotice = ref('')

const coupons = [
  { code: '', label: '쿠폰 미적용', type: 'fixed', value: 0 },
  { code: 'WELCOME10', label: 'WELCOME10 · 10% 할인', type: 'percent', value: 10 },
  { code: 'ECO50', label: '친환경차 50% 할인', type: 'percent', value: 50 },
  { code: 'FREE30', label: '30분 무료권', type: 'minutes', value: 30 },
  { code: 'FREE60', label: '60분 무료권', type: 'minutes', value: 60 },
]

const preview = computed(() => {
  if (!selected.value) return null
  const minutes = calculateParkingMinutes(selected.value.entry_time)
  const fee = calculateFee(minutes, parking.settings)
  const coupon = coupons.find((item) => item.code === couponCode.value) || coupons[0]
  let discountAmount = 0
  if (coupon.type === 'percent') discountAmount = Math.floor(fee * (coupon.value / 100))
  //if (coupon.type === 'fixed') discountAmount = coupon.value
  if (coupon.type === 'minutes') {
    const discountedMinutes = Math.max(0, minutes - coupon.value)
    discountAmount = fee - calculateFee(discountedMinutes, parking.settings)
  }
  discountAmount = Math.min(fee, Math.max(0, discountAmount))
  return { minutes, fee, coupon, discountAmount, finalFee: Math.max(0, fee - discountAmount) }
})

function search() {
  message.value = ''
  exitNotice.value = ''
  error.value = ''
  couponCode.value = ''
  selected.value = parking.findParkingCar(carNumber.value)
  if (!selected.value) error.value = '현재 주차 중인 차량을 찾을 수 없습니다.'
}

async function complete() {
  if (!selected.value) return
  try {
    const result = await parking.exitCar(selected.value, {
      code: preview.value.coupon.code,
      discountAmount: preview.value.discountAmount,
    })
    message.value = `${result.car_number} 출차 완료 · 최종 요금 ${formatCurrency(result.fee)}`
    exitNotice.value = '출차 처리가 완료되었습니다. 10분 이내로 출차해 주세요.'
    selected.value = null
    carNumber.value = ''
    couponCode.value = ''
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <section>
    <h2>출차 처리</h2>
    <div class="panel form">
      <label>차량 번호 검색</label>
      <div class="inline-form">
        <input v-model.trim="carNumber" placeholder="예: 12가3456" @keyup.enter="search" />
        <button class="btn btn-primary" type="button" @click="search">검색</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="exitNotice" class="panel notice">{{ exitNotice }}</p>
    </div>
    <div v-if="selected" class="panel exit-detail">
      <h3>출차 대상</h3>
      <div class="detail-grid">
        <span>차량 번호</span><strong>{{ selected.car_number }}</strong>
        <span>입차 시간</span><strong>{{ formatDateTime(selected.entry_time) }}</strong>
        <span>주차 시간</span><strong>{{ preview.minutes }}분</strong>
        <span>정산 요금</span><strong>{{ formatCurrency(preview.fee) }}</strong>
        <span>할인쿠폰</span>
        <select v-model="couponCode">
          <option v-for="coupon in coupons" :key="coupon.code" :value="coupon.code">
            {{ coupon.label }}
          </option>
        </select>
        <span>할인 금액</span><strong>{{ formatCurrency(preview.discountAmount) }}</strong>
        <span>최종 요금</span><strong>{{ formatCurrency(preview.finalFee) }}</strong>
      </div>
      <button class="btn btn-danger" @click="complete">결제 완료 및 출차</button>
    </div>
  </section>
</template>
