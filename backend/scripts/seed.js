import { connectDB, disconnectDB } from '../config/db.js'
import { User } from '../models/User.js'
import { ROLES } from '../utils/constants.js'
import { writeAudit } from '../services/auditService.js'

function argValue(flag, envName) {
  const index = process.argv.indexOf(flag)
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1]
  return process.env[envName] || ''
}

function readHiddenPassword(prompt) {
  if (!process.stdin.isTTY) {
    throw new Error('No terminal available. Set SEED_PASSWORD in the environment instead.')
  }
  return new Promise((resolve) => {
    let value = ''
    process.stdout.write(prompt)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    const onData = (character) => {
      if (character === '\r' || character === '\n') {
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdin.removeListener('data', onData)
        process.stdout.write('\n')
        resolve(value)
      } else if (character === '\u0003') {
        process.stdin.setRawMode(false)
        process.exit(1)
      } else if (character === '\u007f') {
        value = value.slice(0, -1)
        process.stdout.write('\b \b')
      } else {
        value += character
        process.stdout.write('*')
      }
    }
    process.stdin.on('data', onData)
  })
}

async function main() {
  const fullName = argValue('--full-name', 'SEED_FULL_NAME').trim()
  const username = argValue('--username', 'SEED_USERNAME').trim().toLowerCase()
  const department = argValue('--department', 'SEED_DEPARTMENT').trim()
  const password = process.env.SEED_PASSWORD || await readHiddenPassword('Password: ')

  if (!fullName || !username || !department || !password) {
    throw new Error('Provide --full-name, --username, --department and a password (SEED_PASSWORD or interactive prompt).')
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Password must be at least 8 characters with a letter and a number.')
  }

  await connectDB()
  const existingCustodian = await User.findOne({ role: { $in: [ROLES.CUSTODIAN, ROLES.SUPPLY_OFFICER] } })
  if (existingCustodian) {
    throw new Error('An administrative account already exists. Use User Management to create more accounts.')
  }
  if (await User.findOne({ username })) {
    throw new Error(`Username "${username}" is already taken.`)
  }

  const user = await User.create({
    fullName,
    username,
    passwordHash: await User.hashPassword(password),
    role: ROLES.CUSTODIAN,
    department,
    isActive: true,
  })
  await writeAudit({
    user,
    action: 'USER_ACCOUNT_CREATED',
    description: `Bootstrapped first custodian account for ${user.fullName} (${user.username})`,
    metadata: { bootstrap: true },
  })
  console.log(`Created first Property Custodian: ${user.fullName} (@${user.username})`)
  await disconnectDB()
}

main().catch(async (error) => {
  console.error(`Seed failed: ${error.message}`)
  try { await disconnectDB() } catch { }
  process.exit(1)
})
