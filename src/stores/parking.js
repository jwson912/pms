import { defineStore } from 'pinia'
import { calculateFee, calculateParkingMinutes, DEFAULT_SETTINGS } from '../utils/fee'
import { completeExit, createEntry, deleteRecord, getSettings, listParkingRecords, saveSettings } from '../lib/parkingApi'

const localDate = (value = new Date()) => new Date(value).toLocaleDateString('sv-SE')

export const useParkingStore = defineStore('parking', {
  state: () => ({ records: [], settings: { ...DEFAULT_SETTINGS }, loading: false, error: '' }),
  getters: {
    parkingRecords: (state) => state.records.filter((r) => r.status === 'parking'),
    outRecords: (state) => state.records.filter((r) => r.status === 'out'),
    currentCount() { return this.parkingRecords.length },
    remainingCount() { return Math.max(0, Number(this.settings.maxCapacity) - this.currentCount) },
    todayEntryCount: (state) => state.records.filter((r) => r.entry_time && localDate(r.entry_time) === localDate()).length,
    todayExitCount: (state) => state.records.filter((r) => r.exit_time && localDate(r.exit_time) === localDate()).length,
    todaySales: (state) => state.records
      .filter((r) => r.exit_time && localDate(r.exit_time) === localDate())
      .reduce((sum, r) => sum + Number(r.fee || 0), 0),
  },
  actions: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        ;[this.settings, this.records] = await Promise.all([getSettings(), listParkingRecords()])
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    async addEntry(payload) {
      const carNumber = payload.car_number.trim().toUpperCase().replace(/\s+/g, '')
      if (!carNumber) throw new Error('차량 번호를 입력해 주세요.')
      if (this.parkingRecords.some((record) => record.car_number === carNumber)) {
        throw new Error('이미 주차 중인 차량입니다.')
      }
      if (this.currentCount >= Number(this.settings.maxCapacity)) {
        throw new Error('주차 가능 대수를 초과했습니다.')
      }
      const record = await createEntry({ ...payload, car_number: carNumber })
      this.records = [record, ...this.records]
      return record
    },
    findParkingCar(carNumber) {
      const normalized = carNumber.trim().toUpperCase().replace(/\s+/g, '')
      return this.parkingRecords.find((record) => record.car_number === normalized)
    },
    async exitCar(record, coupon = null) {
      const exitTime = new Date().toISOString()
      const minutes = calculateParkingMinutes(record.entry_time, exitTime)
      const originalFee = calculateFee(minutes, this.settings)
      const discountAmount = Math.min(originalFee, Math.max(0, Number(coupon?.discountAmount || 0)))
      const fee = Math.max(0, originalFee - discountAmount)
      const updated = await completeExit(record.id, {
        exit_time: exitTime,
        parking_minutes: minutes,
        original_fee: originalFee,
        discount_amount: discountAmount,
        coupon_code: coupon?.code || '',
        fee,
      })
      this.records = this.records.map((item) => item.id === record.id ? updated : item)
      return updated
    },
    async remove(id) {
      if (!window.confirm('이 주차 기록을 삭제할까요?')) return false
      await deleteRecord(id)
      this.records = this.records.filter((record) => record.id !== id)
      return true
    },
    async updateSettings(settings) {
      const values = Object.fromEntries(Object.entries(settings).map(([key, value]) => [key, Number(value)]))
      if (Object.values(values).some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error('설정값은 0 이상의 숫자여야 합니다.')
      }
      if (!values.maxCapacity || !values.baseMinutes || !values.unitMinutes) {
        throw new Error('주차 가능 대수와 시간 단위는 1 이상이어야 합니다.')
      }
      this.settings = await saveSettings(values)
    },
  },
})
