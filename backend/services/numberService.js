import { Counter } from '../models/Counter.js'

export async function nextSequence(prefix) {
  const counter = await Counter.findOneAndUpdate(
    { name: prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  return `${prefix}-${String(counter.seq).padStart(5, '0')}`
}
