export const REPORT_REASONS = [
  { value: 'inappropriate', label: 'Not suitable for a family audience' },
  { value: 'wrong_content', label: 'Wrong, confusing or mistaken content' },
  { value: 'broken_pages', label: 'Pages are missing, blank or will not load' },
  { value: 'copyright', label: 'It may copy someone else’s work' },
  { value: 'other', label: 'Something else' },
]

export function reasonLabel(value) {
  return REPORT_REASONS.find((r) => r.value === value)?.label ?? value
}