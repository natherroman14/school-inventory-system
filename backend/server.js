import { createApp } from './app.js'
import { connectDB, disconnectDB } from './config/db.js'
import { config, assertProductionConfig } from './config/env.js'

async function start() {
  if (config.env === 'production') assertProductionConfig()
  await connectDB()
  const app = createApp()
  const server = app.listen(config.port, () => {
    console.log(`ESSU inventory API listening on http://localhost:${config.port}`)
  })

  const shutdown = async (signal) => {
    console.log(`Received ${signal}; closing server`)
    server.close(async () => {
      await disconnectDB()
      process.exit(0)
    })
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start().catch((error) => {
  console.error('Failed to start server:', error.message)
  process.exit(1)
})
