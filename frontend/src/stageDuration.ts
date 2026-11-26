const number = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 1})
const unit = (value: number, label: string) => number.format(value) + '\u202f' + label

export function stageDuration(seconds: number | null | undefined, shortUnits = false): string {
  if (seconds == null || !Number.isFinite(seconds)) return ''
  const tenths = Math.round(seconds * 10)
  const minutes = shortUnits ? 'm' : 'min'
  if (seconds <= 60) return unit(tenths / 10, 's')
  if (seconds <= 3600) {
    return unit(Math.floor(tenths / 600), minutes) + ' ' + unit((tenths % 600) / 10, 's')
  }
  return [
    unit(Math.floor(tenths / 36000), 'h'),
    unit(Math.floor((tenths % 36000) / 600), minutes),
    unit((tenths % 600) / 10, 's'),
  ].join(' ')
}
