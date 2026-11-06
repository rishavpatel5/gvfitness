require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { supabase } = require('./src/config/supabase');
const { createDeviceGateway } = require('./src/device-gateway');
const apiRoutes = require('./src/routes/api');

// ==========================================
// 1. MAIN REST API APP (Port 5000 / HTTPS)
// ==========================================
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

// Root health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'GV Fitness Backend API',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 GV Fitness Main API running on http://localhost:${PORT}`);
  console.log(`=======================================================`);
});

// ==========================================
// 2. ISOLATED DEVICE GATEWAY (Port 8081 / TCP Proxy)
// ==========================================
const DEVICE_GATEWAY_PORT = process.env.DEVICE_GATEWAY_PORT || 8081;
const deviceGatewayApp = createDeviceGateway(supabase);

// Mount on main app so /iclock works over public HTTP domain (Port 80/443) as well as port 8081
app.use(deviceGatewayApp);

deviceGatewayApp.listen(DEVICE_GATEWAY_PORT, () => {
  console.log(`📟 eSSL K90 Pro Device Gateway running on port ${DEVICE_GATEWAY_PORT}`);
  console.log(`   Serving dedicated /iclock routes (Plain HTTP for ADMS push)`);
});

const { runExpiryRemindersWorker } = require('./src/services/expiryWorker');
const { runBirthdayGreetingsWorker } = require('./src/services/birthdayWorker');

// ==========================================
// 3. AUTOMATION WORKERS (NODE-CRON)
// ==========================================

// Daily 10:00 AM IST: Birthday Greetings Worker
cron.schedule('0 10 * * *', async () => {
  console.log('[Cron Worker] Running 10:00 AM Birthday Greetings check...');
  try {
    const report = await runBirthdayGreetingsWorker();
    console.log(`[Cron Worker] Birthday greetings finished: Evaluated ${report.evaluated}, Dispatched ${report.dispatched}, Skipped Duplicates ${report.skippedDuplicates}`);
  } catch (err) {
    console.error('[Cron Worker Birthday Error]:', err.message);
  }
});

// Daily 11:00 AM IST: Expiry Reminders Worker (7d, 3d, 1d, 0d)
cron.schedule('0 11 * * *', async () => {
  console.log('[Cron Worker] Running 11:00 AM Membership Expiry Reminders check...');
  try {
    const report = await runExpiryRemindersWorker();
    console.log(`[Cron Worker] Expiry reminders finished: Evaluated ${report.evaluated}, Dispatched ${report.dispatched}, Skipped Duplicates ${report.skippedDuplicates}`);
  } catch (err) {
    console.error('[Cron Worker Error]:', err.message);
  }
});


