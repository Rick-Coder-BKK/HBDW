export const PRIZES = [
  { label: '€50',        safe: false }, // Q1
  { label: '€100',       safe: false }, // Q2
  { label: '€200',       safe: false }, // Q3
  { label: '€300',       safe: false }, // Q4
  { label: '€500',       safe: true  }, // Q5  ← first safe level
  { label: '€1.000',     safe: false }, // Q6
  { label: '€2.000',     safe: false }, // Q7
  { label: '€4.000',     safe: false }, // Q8
  { label: '€8.000',     safe: false }, // Q9
  { label: '€16.000',    safe: true  }, // Q10 ← second safe level
  { label: '€32.000',    safe: false }, // Q11
  { label: '€64.000',    safe: false }, // Q12
  { label: '€125.000',   safe: false }, // Q13
  { label: '€500.000',   safe: false }, // Q14
  { label: '€1.000.000', safe: false }, // Q15
]

export function getSafeAmount(questionIndex) {
  // Returns the safe amount string the player keeps after a wrong answer
  // questionIndex is 0-based
  if (questionIndex >= 10) return '€16.000'
  if (questionIndex >= 5)  return '€500'
  return '€0'
}
