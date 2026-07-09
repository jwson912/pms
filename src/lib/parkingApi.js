import { DEFAULT_SETTINGS } from '../utils/fee'

const RECORD_KEY = 'parking.records'
const SETTINGS_KEY = 'parking.settings'

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }
  catch { return fallback }
}
const readLocalRecords = () => readJson(RECORD_KEY, [])
const writeLocalRecords = (records) => localStorage.setItem(RECORD_KEY, JSON.stringify(records))

export async function getSettings() {
  return { ...DEFAULT_SETTINGS, ...readJson(SETTINGS_KEY, {}) }
}

export async function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  return settings
}

export async function listParkingRecords() {
  return readLocalRecords().sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time))
}

export async function createEntry({ car_number, car_type, parking_zone, memo, owner_id, owner_email }) {
  const now = new Date().toISOString()
  const record = {
    id: crypto.randomUUID(), car_number, car_type: car_type || '일반',
    parking_zone: parking_zone || 'A구역', memo: memo || '',
    owner_id: owner_id || owner_email || '',
    owner_email: owner_email || '',
    entry_time: now,
    exit_time: null, parking_minutes: 0, fee: 0, payment_status: 'unpaid',
    original_fee: 0, discount_amount: 0, coupon_code: '',
    status: 'parking', created_at: now,
  }
  const records = readLocalRecords()
  records.unshift(record)
  writeLocalRecords(records)
  return record
}

export async function completeExit(id, values) {
  const update = { ...values, payment_status: 'paid', status: 'out' }
  const records = readLocalRecords().map((record) => record.id === id ? { ...record, ...update } : record)
  writeLocalRecords(records)
  return records.find((record) => record.id === id)
}

export async function deleteRecord(id) {
  writeLocalRecords(readLocalRecords().filter((record) => record.id !== id))
  return true
}
