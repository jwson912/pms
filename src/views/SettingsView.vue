<script setup>
import { reactive, watchEffect, ref } from 'vue'
import { useParkingStore } from '../stores/parking'

const parking = useParkingStore()
const message = ref('')
const error = ref('')
const form = reactive({ ...parking.settings })
watchEffect(() => Object.assign(form, parking.settings))

async function save() {
  message.value = ''
  error.value = ''
  try {
    await parking.updateSettings({ ...form })
    message.value = '설정이 저장되었습니다.'
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <section>
    <h2>시스템 설정</h2>
    <form class="panel form" @submit.prevent="save">
      <label>최대 주차 가능 대수</label><input v-model.number="form.maxCapacity" type="number" min="1" required />
      <label>무료 시간(분)</label><input v-model.number="form.freeMinutes" type="number" min="0" required />
      <label>기본 시간(분)</label><input v-model.number="form.baseMinutes" type="number" min="1" required />
      <label>기본 요금(원)</label><input v-model.number="form.baseFee" type="number" min="0" required />
      <label>추가 단위 시간(분)</label><input v-model.number="form.unitMinutes" type="number" min="1" required />
      <label>추가 요금(원)</label><input v-model.number="form.unitFee" type="number" min="0" required />
      <label>1일 최대 요금(원)</label><input v-model.number="form.dailyMaxFee" type="number" min="0" required />
      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn btn-primary">설정 저장</button>
    </form>
  </section>
</template>
