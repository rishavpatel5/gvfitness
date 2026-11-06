const express = require('express');
const { getStore, saveStore } = require('../services/store');

/**
 * Isolated Device Gateway Listener for eSSL K90 Pro / ZKTeco Push ADMS Protocol.
 * Runs on a dedicated plain HTTP port (e.g. 8081) exposed via Railway TCP Proxy or local IP.
 */
function createDeviceGateway(supabaseClient) {
  const app = express();

  // Support plain text/raw payloads sent by ZK push devices
  app.use(express.text({ type: '*/*' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Whitelist checker (If set to '*' or blank, allows any serial number for easy onboarding)
  const whitelistEnv = (process.env.DEVICE_WHITELIST_SERIALS || 'K90PRO001').trim();
  const allowAllSerials = whitelistEnv === '*' || whitelistEnv === '';
  const allowedSerials = allowAllSerials
    ? []
    : whitelistEnv.split(',').map(s => s.trim().toUpperCase());

  const debounceMinutes = Number(process.env.DEVICE_DEBOUNCE_MINUTES) || 3;
  const pushDelay = process.env.DEVICE_PUSH_DELAY_SECONDS || '10';
  const timezone = process.env.DEVICE_TIMEZONE || '5.5';

  // Middleware to log debug requests from the machine
  app.use(async (req, res, next) => {
    try {
      if (supabaseClient) {
        await supabaseClient.from('device_raw_debug').insert({
          endpoint: req.originalUrl,
          method: req.method,
          query_params: req.query,
          headers: req.headers,
          body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
        });
      }
    } catch (err) {
      console.error('[Device Gateway Debug Log Error]:', err.message);
    }
    next();
  });

  // 1. Initial Handshake / Connection Check (GET /iclock/cdata)
  app.get('/iclock/cdata', (req, res) => {
    const sn = (req.query.SN || req.query.sn || '').toUpperCase();
    console.log(`[Device Gateway] Handshake request from serial: ${sn || 'UNKNOWN'}`);

    if (sn && !allowAllSerials && !allowedSerials.includes(sn)) {
      console.warn(`[Device Gateway] Rejected unauthorized device serial: ${sn}`);
      return res.status(403).send('ERROR: Unauthorized Device Serial');
    }

    // Standard ZKTeco ADMS response format telling the device push parameters & server time
    const now = new Date();
    res.setHeader('Content-Type', 'text/plain');
    return res.send(`GET OPTION FROM: ${sn}\nStamp=0\nOpStamp=0\nErrorDelay=60\nDelay=${pushDelay}\nTransTimes=00:00;14:05\nTransInterval=1\nTransFlag=TransData AttLog\nServerVersion=2.4.1\nServerName=GVFitnessGateway\nPushProtVer=2.4.1\nTimeZone=${timezone}\nRealtime=1\nEncrypt=0\n`);
  });

  // 2. Data Push Endpoint (POST /iclock/cdata) - Attendance punches
  app.post('/iclock/cdata', async (req, res) => {
    const sn = (req.query.SN || req.query.sn || '').toUpperCase();
    const table = req.query.table || req.query.Table;
    console.log(`[Device Gateway] Push data from serial: ${sn}, table: ${table}`);

    if (sn && !allowAllSerials && !allowedSerials.includes(sn)) {
      return res.status(403).send('ERROR: Unauthorized Device');
    }

    const payload = req.body || '';
    
    // Parse AttLog records (each line typically: PIN \t Time \t Status \t VerifyType)
    // Example: 101\t2026-10-28 17:30:00\t0\t1
    if (typeof payload === 'string' && payload.length > 0) {
      const lines = payload.split(/\r?\n/).filter(line => line.trim().length > 0);
      let processedCount = 0;

      for (const line of lines) {
        // Support tab-delimited, comma-delimited, or space-delimited punch lines
        const parts = line.includes('\t')
          ? line.split('\t')
          : line.includes(',')
            ? line.split(',')
            : line.trim().split(/\s+/);

        if (parts.length >= 2) {
          const deviceUserId = parseInt(parts[0], 10);
          const rawTimeStr = parts[1].trim(); // e.g. "2026-11-06 10:15:00"
          const dateStr = rawTimeStr.includes(' ') ? rawTimeStr.split(' ')[0] : (rawTimeStr.includes('T') ? rawTimeStr.split('T')[0] : '');
          const punchTime = new Date(rawTimeStr.replace(' ', 'T') + (rawTimeStr.includes('Z') ? '' : '+05:30'));

          if (!isNaN(deviceUserId) && !isNaN(punchTime.getTime())) {
            if (supabaseClient) {
              try {
                // Insert into immutable attendance_raw table in PostgreSQL
                await supabaseClient.from('attendance_raw').insert({
                  device_serial: sn || 'UNKNOWN',
                  device_user_id: deviceUserId,
                  punch_time_utc: punchTime.toISOString(),
                });

                // Debounce and derive check-in session for member
                await processAttendancePunch(supabaseClient, deviceUserId, punchTime, dateStr);
                processedCount++;
              } catch (insertErr) {
                if (!insertErr.message?.includes('duplicate key')) {
                  console.error('[Device Gateway Punch Error]:', insertErr.message);
                }
              }
            } else {
              // Local store.json fallback mode (Zero setup required for offline/local testing)
              const store = getStore();
              store.attendance_raw = store.attendance_raw || [];
              store.attendance_raw.push({
                device_serial: sn || 'UNKNOWN',
                device_user_id: deviceUserId,
                punch_time: punchTime.toISOString(),
                logged_at: new Date().toISOString()
              });

              processAttendancePunchStore(store, deviceUserId, punchTime, dateStr);
              saveStore(store);
              processedCount++;
            }
          }
        }
      }
      console.log(`[Device Gateway] Successfully processed ${processedCount} punches`);
    }

    // Standard ZKTeco ACK response
    res.setHeader('Content-Type', 'text/plain');
    return res.send('OK');
  });

  // 3. Command Request Poll (GET /iclock/getrequest)
  app.get('/iclock/getrequest', (req, res) => {
    // Device polls for remote commands (e.g. reboot, clear logs)
    res.setHeader('Content-Type', 'text/plain');
    return res.send('OK');
  });

  // 4. Command Execution Result ACK (POST /iclock/devicecmd)
  app.post('/iclock/devicecmd', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    return res.send('OK');
  });

  // 5. Template & Photo Sync Handlers (GET / POST /iclock/fdata)
  app.get('/iclock/fdata', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    return res.send('OK');
  });
  app.post('/iclock/fdata', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    return res.send('OK');
  });

  // 6. Generic Ping / Heartbeat
  app.all('/iclock/ping', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    return res.send('OK');
  });

  return app;
}

/**
 * Derives attendance_sessions in PostgreSQL (Entry-Only Daily Check-in)
 */
async function processAttendancePunch(supabase, deviceUserId, punchTime, dateStr) {
  const { data: member } = await supabase
    .from('members')
    .select('id, name, status')
    .eq('device_user_id', parseInt(deviceUserId, 10))
    .single();

  if (!member) {
    console.log(`[Punch] No member linked to device_user_id: ${deviceUserId}`);
    return;
  }

  const todayStr = dateStr || punchTime.toISOString().split('T')[0];

  const { data: existingSessions } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('member_id', member.id)
    .eq('date', todayStr);

  if (!existingSessions || existingSessions.length === 0) {
    await supabase.from('attendance_sessions').insert({
      member_id: member.id,
      date: todayStr,
      check_in_time: punchTime.toISOString(),
      check_in_source: 'biometric'
    });
    console.log(`[Punch] Member checked in: ${member.name} (PIN #${deviceUserId})`);
  } else {
    console.log(`[Punch] Member ${member.name} already checked in today (${todayStr})`);
  }
}

/**
 * Derives attendance_sessions in store.json (Entry-Only Daily Check-in)
 */
function processAttendancePunchStore(store, deviceUserId, punchTime, dateStr) {
  const member = (store.members || []).find(m => String(m.device_user_id) === String(deviceUserId));
  if (!member) {
    console.log(`[Device Gateway Punch] No member enrolled with PIN #${deviceUserId}`);
    return null;
  }

  const todayStr = dateStr || punchTime.toISOString().split('T')[0];
  store.attendance_sessions = store.attendance_sessions || [];
  const existing = store.attendance_sessions.find(s => s.member_id === member.id && s.date === todayStr);

  if (!existing) {
    const newSession = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      member_id: member.id,
      date: todayStr,
      check_in_time: punchTime.toISOString(),
      check_in_source: 'biometric'
    };
    store.attendance_sessions.unshift(newSession);
    console.log(`[Device Gateway] Check-in registered: ${member.name} (PIN #${deviceUserId})`);
    return newSession;
  } else {
    console.log(`[Device Gateway] Member ${member.name} already checked in today (${todayStr})`);
    return existing;
  }
}

module.exports = { createDeviceGateway, processAttendancePunch, processAttendancePunchStore };
