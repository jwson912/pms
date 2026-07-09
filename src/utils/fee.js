export const DEFAULT_SETTINGS = {
  maxCapacity: 100,
  freeMinutes: 0,
  baseMinutes: 30,
  baseFee: 1000,
  unitMinutes: 10,
  unitFee: 300,
  dailyMaxFee: 15000,
}

export function calculateParkingMinutes(entryTime, exitTime = new Date()) {
  const start = new Date(entryTime).getTime()
  const end = new Date(exitTime).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.max(0, Math.ceil((end - start) / 60000))
}

export function calculateFee(minutes, settings = DEFAULT_SETTINGS) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  const safeMinutes = Math.max(0, Number(minutes) || 0)
  const dailyMax = Math.max(0, Number(s.dailyMaxFee) || 0)
  const fullDays = Math.floor(safeMinutes / 1440)
  const remaining = safeMinutes % 1440

  const feeForOneDay = (dayMinutes) => {
    if (dayMinutes <= Number(s.freeMinutes)) return 0
    if (dayMinutes <= Number(s.baseMinutes)) return Math.min(Number(s.baseFee), dailyMax)
    const units = Math.ceil((dayMinutes - Number(s.baseMinutes)) / Number(s.unitMinutes))
    return Math.min(Number(s.baseFee) + units * Number(s.unitFee), dailyMax)
  }

  return fullDays * dailyMax + feeForOneDay(remaining)
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('ko-KR').format(value || 0) + '원'
}

export function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}
