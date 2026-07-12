// Weight-unit preference (Account screen toggle). Storage stays canonical lbs
// everywhere — sessions keep unit:'lbs' so history and sync merges never mix
// units; this preference only converts at the display/input boundary.
// Device-local on purpose (not in the synced store): worst case after an
// eviction it falls back to lbs.
const KEY = 'workout-tracker:unit'
const LB_PER_KG = 2.20462

export function getWeightUnit() {
  try {
    return localStorage.getItem(KEY) === 'kg' ? 'kg' : 'lbs'
  } catch {
    return 'lbs'
  }
}

export function setWeightUnit(unit) {
  try {
    localStorage.setItem(KEY, unit)
  } catch {
    // storage blocked — preference just won't stick
  }
}

// stored lbs → number in the display unit, rounded to 0.1
export function lbsToDisplay(lbs, unit) {
  const v = unit === 'kg' ? lbs / LB_PER_KG : lbs
  return Math.round(v * 10) / 10
}

// entered display-unit value → lbs for storage (2 decimals keeps the
// kg→lbs→kg roundtrip stable on prefill)
export function displayToLbs(value, unit) {
  const v = unit === 'kg' ? value * LB_PER_KG : value
  return Math.round(v * 100) / 100
}

// stepper increment: 2.5 lb plates / 1.25 kg plates
export function weightStep(unit) {
  return unit === 'kg' ? 1.25 : 2.5
}
