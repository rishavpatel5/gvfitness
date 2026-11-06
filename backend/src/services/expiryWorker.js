const { getStore, saveStore } = require('./store');
const { sendWatiMessage } = require('./wati');

/**
 * Runs the Automated Membership Expiry Reminders Worker
 * Triggers on:
 *   - 7 Days before expiry
 *   - 3 Days before expiry
 *   - Tomorrow (1 Day before)
 *   - Today (Day of expiry)
 *
 * Implements idempotency: Will NOT send duplicate reminders on the same day.
 */
async function runExpiryRemindersWorker({ forceMemberId = null, dryRun = false } = {}) {
  const store = getStore();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const results = [];
  let evaluatedCount = 0;
  let dispatchedCount = 0;
  let skippedDuplicatesCount = 0;
  let skippedRenewedCount = 0;

  store.notification_logs = store.notification_logs || [];
  const periods = store.membership_periods || [];

  for (const period of periods) {
    if (forceMemberId && period.member_id !== forceMemberId) continue;

    // Skip already renewed periods
    if (period.status === 'Renewed') {
      skippedRenewedCount++;
      continue;
    }

    const member = (store.members || []).find(m => m.id === period.member_id);
    if (!member || !member.phone) continue;

    evaluatedCount++;

    const expiryDate = new Date(period.end_date);
    // Difference in whole calendar days
    const diffDays = Math.round((expiryDate.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));

    let stage = null;
    let stageTitle = '';

    if (diffDays === 7) {
      stage = '7_DAYS';
      stageTitle = '7 Days Before Expiry';
    } else if (diffDays === 3) {
      stage = '3_DAYS';
      stageTitle = '3 Days Before Expiry';
    } else if (diffDays === 1) {
      stage = 'TOMORROW';
      stageTitle = 'Expiring Tomorrow';
    } else if (diffDays === 0 || period.end_date === todayStr) {
      stage = 'TODAY';
      stageTitle = 'Expiring Today';
    }

    // If forceMemberId is specified (manual test for this member), allow triggering
    if (!stage && forceMemberId) {
      stage = 'TEST_REMINDER';
      stageTitle = 'Test Expiry Reminder';
    }

    if (!stage) continue;

    // Idempotency Key: Prevents sending more than 1 reminder for the same period + stage on the same calendar day
    const idempotencyKey = `EXPIRY-${period.id}-${stage}-${todayStr}`;
    const alreadySent = store.notification_logs.some(log => log.idempotency_key === idempotencyKey);

    if (alreadySent && !forceMemberId) {
      skippedDuplicatesCount++;
      results.push({
        memberId: member.id,
        name: member.name,
        phone: member.phone,
        stage: stageTitle,
        status: 'Skipped (Already Sent Today)',
        idempotencyKey
      });
      continue;
    }

    // Template selection based on stage (Configurable via .env)
    let templateName;
    if (stage === 'TODAY') {
      templateName = process.env.WATI_EXPIRED_DAY_TEMPLATE || process.env.WATI_EXPIRY_REMINDER_TEMPLATE || 'gvnutrition_invoice_v2';
    } else {
      templateName = process.env.WATI_EXPIRY_REMINDER_TEMPLATE || process.env.WATI_EXPIRY_TEMPLATE || 'gvnutrition_invoice_v2';
    }

    const formattedExpiry = (period.end_date && period.end_date.includes('-'))
      ? period.end_date.split('-').reverse().join('/')
      : (period.end_date || '');

    const planName = period.membership_type === 'GT'
      ? 'General Training (GT)'
      : (period.membership_type === 'PT' ? 'Personal Training (PT)' : (period.membership_type || 'Gym'));

    const isLegacyNutrition = (templateName || '').includes('gvnutrition');

    // Parameters: Strictly NO amount and NO website link in expiry reminders!
    // {{1}}: Member Name, {{2}}: Plan Name, {{3}}: Expiry Date (DD/MM/YYYY)
    const parameters = isLegacyNutrition
      ? [
          { name: '1', value: member.name },
          { name: 'name', value: member.name },
          { name: '2', value: stage === 'TODAY' ? `${planName} expired today (${formattedExpiry})` : `${planName} Expiry: ${formattedExpiry}` },
          { name: 'plan', value: planName },
          { name: '3', value: 'Gym Desk' },
          { name: 'desk', value: 'Gym Desk' },
          { name: '4', value: '-' },
          { name: 'link', value: '-' }
        ]
      : [
          { name: '1', value: member.name },
          { name: 'name', value: member.name },
          { name: '2', value: planName },
          { name: 'plan', value: planName },
          { name: '3', value: formattedExpiry },
          { name: 'expiry_date', value: formattedExpiry }
        ];

    let dispatchRes = { success: true, isSimulation: dryRun };
    if (!dryRun) {
      dispatchRes = await sendWatiMessage({
        phone: member.phone,
        templateName: templateName,
        broadcastTitle: stage === 'TODAY' ? 'Membership_Expired_Notice' : `Expiry_Reminder_${stage}`,
        parameters
      });
    }

    dispatchedCount++;

    const logEntry = {
      id: 'log_exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      recipient_phone: member.phone,
      member_id: member.id,
      member_name: member.name,
      notification_type: `Expiry_${stage}`,
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
      stage: stageTitle,
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
    skippedRenewed: skippedRenewedCount,
    results
  };
}

module.exports = { runExpiryRemindersWorker };

