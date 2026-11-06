const { getStore, saveStore } = require('./store');
const { sendWatiMessage } = require('./wati');

/**
 * Runs the Automated Birthday Greetings Worker
 * Identifies active members whose Date of Birth is today (matches Month and Day)
 * Dispatches WhatsApp Birthday Greeting via WATI
 * Implements Idempotency: Prevents sending more than 1 birthday greeting to the same member on the same day.
 */
async function runBirthdayGreetingsWorker({ forceMemberId = null, dryRun = false } = {}) {
  const store = getStore();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const todayStr = now.toISOString().split('T')[0];

  const results = [];
  let evaluatedCount = 0;
  let dispatchedCount = 0;
  let skippedDuplicatesCount = 0;

  store.notification_logs = store.notification_logs || [];
  const members = (store.members || []).filter(m => m.status === 'Active');

  for (const member of members) {
    if (forceMemberId && member.id !== forceMemberId) continue;
    if (!member.dob && !forceMemberId) continue;

    evaluatedCount++;

    let isBirthdayToday = false;
    if (member.dob) {
      let bMonth, bDay;
      if (member.dob.includes('/')) {
        const parts = member.dob.split('/');
        bDay = parseInt(parts[0], 10);
        bMonth = parseInt(parts[1], 10);
      } else {
        const parts = member.dob.split('-');
        bMonth = parseInt(parts[1], 10);
        bDay = parseInt(parts[2], 10);
      }
      isBirthdayToday = (bMonth === currentMonth && bDay === currentDay);
    }

    // If testing for a specific member, allow even if not today's exact date
    if (!isBirthdayToday && !forceMemberId) continue;

    // Idempotency Key: Prevents sending duplicate birthday wish on the same date
    const idempotencyKey = `BDAY-${member.id}-${todayStr}`;
    const alreadySent = store.notification_logs.some(log => log.idempotency_key === idempotencyKey);

    if (alreadySent && !forceMemberId) {
      skippedDuplicatesCount++;
      results.push({
        memberId: member.id,
        name: member.name,
        phone: member.phone,
        status: 'Skipped (Already Sent Today)',
        idempotencyKey
      });
      continue;
    }

    // Uses the user's approved WATI template (Configurable via .env)
    const templateName = process.env.WATI_BIRTHDAY_TEMPLATE || 'gvnutrition_invoice_v2';
    const isLegacyNutrition = (templateName || '').includes('gvnutrition');

    // Category: UTILITY (Zero marketing, no website link)
    // Variable: {{1}} Member Name
    const parameters = isLegacyNutrition
      ? [
          { name: '1', value: member.name },
          { name: 'name', value: member.name },
          { name: '2', value: 'Happy Birthday from GV Fitness! 🎉🎂' },
          { name: 'wish', value: 'Happy Birthday from GV Fitness! 🎉🎂' },
          { name: '3', value: 'Best Wishes' },
          { name: 'amount', value: 'Best Wishes' },
          { name: '4', value: '-' },
          { name: 'link', value: '-' }
        ]
      : [
          { name: '1', value: member.name },
          { name: 'name', value: member.name }
        ];

    let dispatchRes = { success: true, isSimulation: dryRun };
    if (!dryRun) {
      dispatchRes = await sendWatiMessage({
        phone: member.phone,
        templateName,
        broadcastTitle: 'Birthday_Greeting',
        parameters
      });
    }

    dispatchedCount++;

    const logEntry = {
      id: 'log_bday_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      recipient_phone: member.phone,
      member_id: member.id,
      member_name: member.name,
      notification_type: 'Birthday',
      template_name: templateName,
      idempotency_key: idempotencyKey,
      status: dispatchRes.success ? 'Sent' : 'Failed',
      is_simulation: !!dispatchRes.isSimulation,
      wati_message_id: dispatchRes.watiMessageId,
      error_message: dispatchRes.error || (dispatchRes.raw?.items ? JSON.stringify(dispatchRes.raw.items) : null),
      sent_at: new Date().toISOString()
    };

    store.notification_logs.unshift(logEntry);

    results.push({
      memberId: member.id,
      name: member.name,
      phone: member.phone,
      status: logEntry.status,
      watiMessageId: logEntry.watiMessageId,
      error: logEntry.error_message
    });
  }

  saveStore(store);

  return {
    success: true,
    evaluated: evaluatedCount,
    dispatched: dispatchedCount,
    skippedDuplicates: skippedDuplicatesCount,
    results
  };
}

module.exports = { runBirthdayGreetingsWorker };

