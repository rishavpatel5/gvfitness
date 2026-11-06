const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const crypto = require('crypto');
const upload = multer({ storage: multer.memoryStorage() });

const { getStore, saveStore } = require('../services/store');
const { sendWatiMessage } = require('../services/wati');
const { runExpiryRemindersWorker } = require('../services/expiryWorker');
const { runBirthdayGreetingsWorker } = require('../services/birthdayWorker');
const { generateDietPlanPDF } = require('../services/pdfGenerator');

// Universal Date Formatter for DD/MM/YYYY
const formatDateDDMMYYYY = (val) => {
  if (!val) return '';
  const str = String(val).trim();
  const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return `${match[3].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[1]}`;
  }
  return str;
};

// ==========================================
// 0. AUTHENTICATION (End-to-End Login)
// ==========================================
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  const expectedPass = process.env.ADMIN_PASSWORD || 'gvfitness2026';

  if (username === expectedUser && password === expectedPass) {
    const token = 'gv_tok_' + Buffer.from(`${username}:${Date.now()}`).toString('base64');
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { username, role: 'Administrator', gymName: 'GV Fitness' }
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid credentials. Default is admin / gvfitness2026'
  });
});

router.get('/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer gv_tok_')) {
    return res.json({
      success: true,
      user: { username: process.env.ADMIN_USERNAME || 'admin', role: 'Administrator', gymName: 'GV Fitness' }
    });
  }
  return res.status(401).json({ success: false, error: 'Unauthorized' });
});

// ==========================================
// 1. DASHBOARD OVERVIEW & METRICS
// ==========================================
router.get('/dashboard', async (req, res) => {
  try {
    const store = getStore();
    const { startDate, endDate } = req.query;

    const members = store.members || [];
    const periods = store.membership_periods || [];
    const payments = store.payments || [];
    const expenses = store.expenses || [];

    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.status === 'Active').length;
    
    const activeGT = periods.filter(p => p.membership_type === 'GT' && p.status === 'Active').length;
    const activePT = periods.filter(p => p.membership_type === 'PT' && p.status === 'Active').length;

    let filteredPayments = payments;
    let filteredExpenses = expenses;

    if (startDate && endDate) {
      filteredPayments = payments.filter(p => p.payment_date >= startDate && p.payment_date <= endDate);
      filteredExpenses = expenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);
    }

    const totalRevenue = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    const today = new Date().toISOString().split('T')[0];
    const todayPayments = payments.filter(p => p.payment_date === today);
    const todayCash = todayPayments.filter(p => p.payment_method === 'Cash').reduce((s, p) => s + Number(p.amount), 0);
    const todayOnline = todayPayments.filter(p => p.payment_method === 'Online').reduce((s, p) => s + Number(p.amount), 0);

    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(now.getDate() + 7);
    const nowStr = now.toISOString().split('T')[0];
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    const expiringSoon = periods.filter(p => p.status === 'Active' && p.end_date >= nowStr && p.end_date <= in7DaysStr);

    res.json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        activeGT,
        activePT,
        expiringSoonCount: expiringSoon.length,
        totalRevenue,
        totalExpenses,
        netProfit,
        todayCollection: {
          total: todayCash + todayOnline,
          cash: todayCash,
          online: todayOnline
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. MEMBERS (GT & PT with full period history)
// ==========================================
router.get('/members', (req, res) => {
  const store = getStore();
  const { type, search } = req.query;
  const todayStr = new Date().toISOString().split('T')[0];

  let result = (store.members || []).map(member => {
    const memberPeriods = (store.membership_periods || []).filter(p => p.member_id === member.id);
    
    // Automatically evaluate period statuses dynamically against today's date
    memberPeriods.forEach(p => {
      if (p.status !== 'Renewed' && p.status !== 'Cancelled') {
        if (p.end_date < todayStr) {
          p.status = 'Expired';
        } else if (p.start_date > todayStr) {
          p.status = 'Upcoming';
        } else {
          p.status = 'Active';
        }
      }
    });

    const gtPeriods = memberPeriods.filter(p => p.membership_type === 'GT');
    const ptPeriods = memberPeriods.filter(p => p.membership_type === 'PT');

    const activeGt = gtPeriods.find(p => p.status === 'Active');
    const latestGt = gtPeriods.sort((a, b) => b.end_date.localeCompare(a.end_date))[0];
    const gtPeriod = activeGt || latestGt || null;

    const activePt = ptPeriods.find(p => p.status === 'Active');
    const latestPt = ptPeriods.sort((a, b) => b.end_date.localeCompare(a.end_date))[0];
    const ptPeriod = activePt || latestPt || null;

    // Is PT currently active right now?
    const isPtCurrentlyActive = !!activePt;
    const isGtCurrentlyActive = !!activeGt;

    // Determine current live role:
    // If today is within PT period -> 'PT'
    // Else if today is within GT period -> 'GT'
    // Else -> 'Expired'
    let currentLiveTier = 'Expired';
    if (isPtCurrentlyActive) {
      currentLiveTier = 'PT Active';
    } else if (isGtCurrentlyActive) {
      currentLiveTier = 'GT Active';
    }

    const trainer = ptPeriod ? (store.trainers || []).find(t => t.id === ptPeriod.trainer_id) : null;

    return {
      ...member,
      gtPeriod,
      ptPeriod,
      isPtCurrentlyActive,
      isGtCurrentlyActive,
      currentLiveTier,
      trainerName: trainer ? trainer.name : null,
      allPeriods: memberPeriods
    };
  });

  if (type === 'GT') {
    result = result.filter(m => m.gtPeriod);
  } else if (type === 'PT') {
    if (req.query.includeFinished === 'true') {
      result = result.filter(m => m.ptPeriod);
    } else {
      // Exclude members whose PT is finished! Only active or upcoming PT clients belong in PT list.
      result = result.filter(m => m.ptPeriod && (m.isPtCurrentlyActive || m.ptPeriod.status === 'Upcoming'));
    }
  }

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(m => m.name.toLowerCase().includes(q) || m.phone.includes(q));
  }

  res.json({ success: true, data: result });
});

router.post('/members', async (req, res) => {
  try {
    const store = getStore();
    const {
      name,
      phone,
      dob,
      gender,
      fitness_level,
      emergency_contact,
      notes,
      device_user_id,
      height_cm,
      weight_kg,
      membership_type,
      gt_start_date,
      gt_duration,
      gt_amount,
      gt_discount_val,
      gt_payment_method,
      pt_trainer_id,
      pt_start_date,
      pt_duration,
      pt_amount,
      pt_discount_val,
      pt_payment_method
    } = req.body;

    if (store.members.some(m => m.phone === phone)) {
      return res.status(400).json({ success: false, error: 'A member with this phone number already exists.' });
    }

    const newMemberId = 'm_' + Date.now();
    const newMemberCode = 'GV-' + (1000 + store.members.length + 1);

    // Strictly auto-assign next sequential PIN (custom PINs disallowed when system auto-assigns)
    const existingPins = (store.members || [])
      .map(m => Number(m.device_user_id))
      .filter(p => !isNaN(p) && p > 0);
    const assignedPin = existingPins.length > 0 ? (Math.max(...existingPins) + 1) : 101;

    if (device_user_id && Number(device_user_id) !== assignedPin) {
      return res.status(400).json({
        success: false,
        error: `Custom PINs are disabled. The system strictly auto-assigns next sequential PIN #${assignedPin}.`
      });
    }

    const parsedHeight = parseFloat(height_cm);
    const parsedWeight = parseFloat(weight_kg);
    let calculatedBmi = null;
    if (!isNaN(parsedHeight) && parsedHeight > 0 && !isNaN(parsedWeight) && parsedWeight > 0) {
      calculatedBmi = parseFloat((parsedWeight / Math.pow(parsedHeight / 100, 2)).toFixed(2));
    }

    const newMember = {
      id: newMemberId,
      member_code: newMemberCode,
      device_user_id: assignedPin,
      name,
      phone,
      dob: dob || null,
      gender: gender || 'Male',
      fitness_level: fitness_level || 'Beginner',
      emergency_contact: emergency_contact || '',
      notes: notes || '',
      height_cm: !isNaN(parsedHeight) && parsedHeight > 0 ? parsedHeight : null,
      weight_kg: !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : null,
      bmi: calculatedBmi,
      status: 'Active',
      created_at: new Date().toISOString()
    };
    store.members.push(newMember);

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. GT subscription
    if (membership_type === 'GT' || membership_type === 'BOTH') {
      const dur = Number(gt_duration) || 1;
      const price = Number(gt_amount) || 0;
      const start = gt_start_date ? new Date(gt_start_date) : new Date();
      const end = new Date(start);
      end.setMonth(start.getMonth() + dur);

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      const periodStatus = endStr < todayStr ? 'Expired' : (startStr > todayStr ? 'Upcoming' : 'Active');

      const periodId = 'p_' + Date.now() + '_gt';
      const period = {
        id: periodId,
        member_id: newMemberId,
        membership_type: 'GT',
        duration_months: dur,
        start_date: startStr,
        end_date: endStr,
        package_price: price,
        discount_value: Number(gt_discount_val) || 0,
        final_payable: price - (Number(gt_discount_val) || 0),
        status: periodStatus,
        notes: `Base GT Plan (${dur} Months)`
      };
      store.membership_periods.push(period);

      const invId = 'inv_' + Date.now() + '_gt';
      const invNumber = 'GV-INV-' + Math.floor(100000 + Math.random() * 900000);
      const invToken = 'tok_' + Math.random().toString(36).substring(2, 10);
      store.invoices.push({
        id: invId,
        invoice_number: invNumber,
        member_id: newMemberId,
        membership_period_id: periodId,
        total_amount: period.final_payable,
        status: 'Paid',
        public_token: invToken,
        created_at: new Date().toISOString()
      });
      store.payments.push({
        id: 'pay_' + Date.now() + '_gt',
        invoice_id: invId,
        amount: period.final_payable,
        payment_method: gt_payment_method || 'Online',
        payment_date: todayStr
      });
    }

    // 2. PT subscription (Can start at beginning, mid-way, or end of GT)
    if (membership_type === 'PT' || membership_type === 'BOTH') {
      const dur = Number(pt_duration) || 1;
      const price = Number(pt_amount) || 0;
      const start = pt_start_date ? new Date(pt_start_date) : (gt_start_date ? new Date(gt_start_date) : new Date());
      const end = new Date(start);
      end.setMonth(start.getMonth() + dur);

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      const periodStatus = endStr < todayStr ? 'Expired' : (startStr > todayStr ? 'Upcoming' : 'Active');

      const periodId = 'p_' + Date.now() + '_pt';
      const period = {
        id: periodId,
        member_id: newMemberId,
        membership_type: 'PT',
        trainer_id: pt_trainer_id || null,
        duration_months: dur,
        start_date: startStr,
        end_date: endStr,
        package_price: price,
        discount_value: Number(pt_discount_val) || 0,
        final_payable: price - (Number(pt_discount_val) || 0),
        status: periodStatus,
        notes: membership_type === 'BOTH' ? `PT Add-on (${dur} Months inside GT)` : `PT Plan (${dur} Months)`
      };
      store.membership_periods.push(period);

      const invId = 'inv_' + Date.now() + '_pt';
      const invNumber = 'GV-INV-' + Math.floor(100000 + Math.random() * 900000);
      const invToken = 'tok_' + Math.random().toString(36).substring(2, 10);
      store.invoices.push({
        id: invId,
        invoice_number: invNumber,
        member_id: newMemberId,
        membership_period_id: periodId,
        total_amount: period.final_payable,
        status: 'Paid',
        public_token: invToken,
        created_at: new Date().toISOString()
      });
      store.payments.push({
        id: 'pay_' + Date.now() + '_pt',
        invoice_id: invId,
        amount: period.final_payable,
        payment_method: pt_payment_method || 'Online',
        payment_date: todayStr
      });
    }

    // Automatic Unified Welcome & Receipt Message via WATI
    let watiConfirmation = null;
    if (newMember.phone) {
      const welcomeTemplate = process.env.WATI_WELCOME_MEMBER_TEMPLATE || process.env.WATI_INVOICE_TEMPLATE || 'gvnutrition_invoice_v2';
      const planText = membership_type === 'BOTH' ? 'GT + PT Combo' : (membership_type === 'PT' ? 'Personal Training (PT)' : 'General Training (GT)');
      
      const gtPaid = (membership_type === 'GT' || membership_type === 'BOTH') ? (Number(gt_amount || 0) - (Number(gt_discount_val) || 0)) : 0;
      const ptPaid = (membership_type === 'PT' || membership_type === 'BOTH') ? (Number(pt_amount || 0) - (Number(pt_discount_val) || 0)) : 0;
      const totalPaid = gtPaid + ptPaid;

      const primaryInvoice = (store.invoices || []).find(inv => inv.member_id === newMemberId);
      const baseUrl = (process.env.PUBLIC_INVOICE_BASE_URL || 'http://localhost:5373').replace(/\/$/, '');
      const invoiceUrl = `${baseUrl}/?invoice=${primaryInvoice?.public_token || 'tok_new_member'}`;

      try {
        const watiRes = await sendWatiMessage({
          phone: newMember.phone,
          templateName: welcomeTemplate,
          broadcastTitle: 'New_Member_Onboarding',
          parameters: [
            { name: '1', value: newMember.name },
            { name: 'name', value: newMember.name },
            { name: '2', value: `Welcome to GV Fitness! Plan: ${planText} | Biometric PIN: #${newMember.device_user_id}` },
            { name: 'plan_details', value: `Welcome to GV Fitness! Plan: ${planText} | Biometric PIN: #${newMember.device_user_id}` },
            { name: '3', value: String(totalPaid) },
            { name: 'amount', value: String(totalPaid) },
            { name: '4', value: invoiceUrl },
            { name: 'link', value: invoiceUrl }
          ]
        });

        const logEntry = {
          id: 'log_wel_' + Date.now(),
          recipient_phone: newMember.phone,
          member_id: newMember.id,
          member_name: newMember.name,
          notification_type: 'Welcome_Member',
          template_name: welcomeTemplate,
          status: watiRes.success ? 'Sent' : 'Failed',
          wati_message_id: watiRes.watiMessageId,
          sent_at: new Date().toISOString()
        };

        store.notification_logs = store.notification_logs || [];
        store.notification_logs.unshift(logEntry);
        watiConfirmation = { sent: watiRes.success, messageId: watiRes.watiMessageId };
      } catch (watiErr) {
        console.error('[WATI Welcome Onboarding Error]:', watiErr.message);
      }
    }

    saveStore(store);
    res.status(201).json({
      success: true,
      message: `Member registered successfully!${watiConfirmation?.sent ? ' Welcome WhatsApp & receipt dispatched.' : ''}`,
      data: newMember,
      wati: watiConfirmation
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2.1 ATTACH PT PACKAGE TO EXISTING MEMBER (Mid-way or Any Time)
// ==========================================
router.post('/members/:id/add-pt', (req, res) => {
  try {
    const store = getStore();
    const { id } = req.params;
    const {
      pt_trainer_id,
      pt_duration,
      pt_start_date,
      pt_amount,
      pt_payment_method,
      notes
    } = req.body;

    const member = store.members.find(m => m.id === id);
    if (!member) return res.status(404).json({ success: false, error: 'Member not found' });

    const dur = Number(pt_duration) || 1;
    const price = Number(pt_amount) || 0;
    const start = pt_start_date ? new Date(pt_start_date) : new Date();
    const end = new Date(start);
    end.setMonth(start.getMonth() + dur);

    const todayStr = new Date().toISOString().split('T')[0];
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const periodStatus = endStr < todayStr ? 'Expired' : (startStr > todayStr ? 'Upcoming' : 'Active');

    const periodId = 'p_' + Date.now() + '_pt';
    const period = {
      id: periodId,
      member_id: id,
      membership_type: 'PT',
      trainer_id: pt_trainer_id || null,
      duration_months: dur,
      start_date: startStr,
      end_date: endStr,
      package_price: price,
      discount_value: 0,
      final_payable: price,
      status: periodStatus,
      notes: notes || `Attached PT package (${dur} Months)`
    };

    store.membership_periods.push(period);

    // Create Invoice & Payment
    const invId = 'inv_' + Date.now() + '_pt';
    const invNumber = 'GV-INV-' + Math.floor(100000 + Math.random() * 900000);
    const invToken = 'tok_' + Math.random().toString(36).substring(2, 10);
    store.invoices.push({
      id: invId,
      invoice_number: invNumber,
      member_id: id,
      membership_period_id: periodId,
      total_amount: price,
      status: 'Paid',
      public_token: invToken,
      created_at: new Date().toISOString()
    });
    store.payments.push({
      id: 'pay_' + Date.now() + '_pt',
      invoice_id: invId,
      amount: price,
      payment_method: pt_payment_method || 'Online',
      payment_date: todayStr
    });

    saveStore(store);

    res.status(201).json({
      success: true,
      message: `Successfully added ${dur}-Month Personal Training package for ${member.name}!`,
      data: period
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/members/:id', (req, res) => {
  const store = getStore();
  const { id } = req.params;
  const idx = (store.members || []).findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Member not found' });

  const [deletedMember] = store.members.splice(idx, 1);
  store.membership_periods = (store.membership_periods || []).filter(p => p.member_id !== id);
  saveStore(store);

  res.json({ success: true, message: `Member ${deletedMember.name} deleted successfully` });
});

// ==========================================
// 3. MEMBERSHIP RENEWAL (Extends from Old Expiry)
// ==========================================
router.post('/members/:id/renew', async (req, res) => {
  try {
    const store = getStore();
    const { id } = req.params;
    const {
      membership_type,
      duration_months,
      package_price,
      discount_value,
      payment_method,
      trainer_id
    } = req.body;

    const member = store.members.find(m => m.id === id);
    if (!member) return res.status(404).json({ success: false, error: 'Member not found' });

    const existingPeriods = store.membership_periods
      .filter(p => p.member_id === id && p.membership_type === membership_type)
      .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

    const latest = existingPeriods[0];
    const dur = Number(duration_months) || 1;
    const price = Number(package_price) || 0;
    const disc = Number(discount_value) || 0;
    const finalAmount = price - disc;

    // RENEWAL ALGORITHM: Extends from old expiry date
    let newStart = new Date();
    if (latest && new Date(latest.end_date) >= new Date()) {
      newStart = new Date(latest.end_date);
      newStart.setDate(newStart.getDate() + 1);
    }

    const newEnd = new Date(newStart);
    newEnd.setMonth(newStart.getMonth() + dur);
    newEnd.setDate(newEnd.getDate() - 1);

    const newPeriodId = 'p_renew_' + Date.now();
    const newPeriod = {
      id: newPeriodId,
      member_id: id,
      membership_type,
      trainer_id: trainer_id || latest?.trainer_id || null,
      duration_months: dur,
      start_date: newStart.toISOString().split('T')[0],
      end_date: newEnd.toISOString().split('T')[0],
      package_price: price,
      discount_value: disc,
      final_payable: finalAmount,
      status: 'Active',
      notes: 'Renewed period'
    };

    if (latest) {
      latest.status = 'Renewed';
      latest.renewed_into_period_id = newPeriodId;
    }

    store.membership_periods.push(newPeriod);

    const invId = 'inv_' + Date.now();
    const invNumber = 'GV-INV-' + Math.floor(100000 + Math.random() * 900000);
    const invToken = 'tok_' + Math.random().toString(36).substring(2, 10);
    store.invoices.push({
      id: invId,
      invoice_number: invNumber,
      member_id: id,
      membership_period_id: newPeriodId,
      total_amount: finalAmount,
      status: 'Paid',
      public_token: invToken,
      created_at: new Date().toISOString()
    });
    store.payments.push({
      id: 'pay_' + Date.now(),
      invoice_id: invId,
      amount: finalAmount,
      payment_method: payment_method || 'Online',
      payment_date: new Date().toISOString().split('T')[0]
    });

    // Automatic WhatsApp Renewal Confirmation via WATI
    let watiConfirmation = null;
    if (member.phone) {
      const renewalTemplate = process.env.WATI_RENEWAL_CONFIRMATION_TEMPLATE || process.env.WATI_INVOICE_TEMPLATE || 'gvnutrition_invoice_v2';
      const baseUrl = (process.env.PUBLIC_INVOICE_BASE_URL || 'http://localhost:5373').replace(/\/$/, '');
      const invoiceUrl = `${baseUrl}/?invoice=${invToken}`;

      try {
        const watiRes = await sendWatiMessage({
          phone: member.phone,
          templateName: renewalTemplate,
          broadcastTitle: 'Membership_Renewal_Confirmation',
          parameters: [
            { name: '1', value: member.name },
            { name: 'name', value: member.name },
            { name: '2', value: `${membership_type} renewed for ${dur} mo. Valid till ${formatDateDDMMYYYY(newPeriod.end_date)}` },
            { name: 'renewal_details', value: `${membership_type} renewed for ${dur} mo. Valid till ${formatDateDDMMYYYY(newPeriod.end_date)}` },
            { name: '3', value: String(finalAmount) },
            { name: 'amount', value: String(finalAmount) },
            { name: '4', value: invoiceUrl },
            { name: 'link', value: invoiceUrl }
          ]
        });

        const logEntry = {
          id: 'log_renew_' + Date.now(),
          recipient_phone: member.phone,
          member_id: member.id,
          member_name: member.name,
          notification_type: 'Renewal_Confirmation',
          template_name: renewalTemplate,
          status: watiRes.success ? 'Sent' : 'Failed',
          wati_message_id: watiRes.watiMessageId,
          sent_at: new Date().toISOString()
        };

        store.notification_logs = store.notification_logs || [];
        store.notification_logs.unshift(logEntry);
        watiConfirmation = { sent: watiRes.success, messageId: watiRes.watiMessageId };
      } catch (watiErr) {
        console.error('[WATI Renewal Error]:', watiErr.message);
      }
    }

    saveStore(store);

    res.json({
      success: true,
      message: `Membership renewed successfully!${watiConfirmation?.sent ? ' WhatsApp confirmation sent.' : ''}`,
      data: newPeriod,
      wati: watiConfirmation
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. EXPIRY MANAGEMENT
// ==========================================
router.get('/expiries', (req, res) => {
  const store = getStore();
  const { type } = req.query;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let periods = store.membership_periods || [];
  if (type) periods = periods.filter(p => p.membership_type === type);

  const categorized = {
    expiring7Days: [],
    expiring3Days: [],
    expiringTomorrow: [],
    expiringToday: [],
    alreadyExpired: [],
    renewed: []
  };

  periods.forEach(p => {
    const member = store.members.find(m => m.id === p.member_id);
    const trainer = p.trainer_id ? store.trainers.find(t => t.id === p.trainer_id) : null;
    const enriched = { ...p, memberName: member?.name, phone: member?.phone, device_user_id: member?.device_user_id, trainerName: trainer?.name };

    if (p.status === 'Renewed') {
      categorized.renewed.push(enriched);
      return;
    }

    const expiryDate = new Date(p.end_date);
    const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (p.end_date < todayStr) {
      categorized.alreadyExpired.push(enriched);
    } else if (p.end_date === todayStr) {
      categorized.expiringToday.push(enriched);
    } else if (diffDays === 1) {
      categorized.expiringTomorrow.push(enriched);
    } else if (diffDays <= 3) {
      categorized.expiring3Days.push(enriched);
    } else if (diffDays <= 7) {
      categorized.expiring7Days.push(enriched);
    }
  });

  res.json({ success: true, data: categorized });
});

// Trigger full expiry reminder worker on-demand
router.post('/automation/run-expiry-reminders', async (req, res) => {
  try {
    const report = await runExpiryRemindersWorker();
    res.json({ success: true, ...report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Trigger test reminder for a single member
router.post('/automation/test-reminder', async (req, res) => {
  const { memberId } = req.body;
  if (!memberId) return res.status(400).json({ success: false, error: 'Member ID is required' });
  try {
    const report = await runExpiryRemindersWorker({ forceMemberId: memberId });
    res.json({ success: true, ...report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get automation / notification logs
router.get('/automation/logs', (req, res) => {
  const store = getStore();
  res.json({ success: true, data: store.notification_logs || [] });
});

// ==========================================
// 5. BIRTHDAYS (WATI Integration)
// ==========================================
router.get('/birthdays', (req, res) => {
  const store = getStore();
  const { includeInactive } = req.query;
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  let members = store.members || [];
  if (includeInactive !== 'true') {
    members = members.filter(m => m.status === 'Active');
  }

  const todayBirthdays = [];
  const upcomingBirthdays = [];

  members.forEach(m => {
    if (!m.dob) return;
    const bday = new Date(m.dob);
    const bMonth = bday.getMonth() + 1;
    const bDay = bday.getDate();

    if (bMonth === currentMonth && bDay === currentDay) {
      todayBirthdays.push(m);
    } else if (bMonth === currentMonth && bDay > currentDay && bDay <= currentDay + 7) {
      upcomingBirthdays.push(m);
    }
  });

  res.json({
    success: true,
    data: {
      today: todayBirthdays,
      upcoming: upcomingBirthdays
    }
  });
});

// Trigger full birthday greetings worker on-demand
router.post('/automation/run-birthday-greetings', async (req, res) => {
  try {
    const report = await runBirthdayGreetingsWorker();
    res.json({ success: true, ...report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/birthdays/send-greeting', async (req, res) => {
  const { memberId, name } = req.body;
  try {
    const report = await runBirthdayGreetingsWorker({ forceMemberId: memberId });
    res.json({ success: true, message: `Birthday greeting sent to ${name || 'member'}!`, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. EXPENSES (With categories & full edit)
// ==========================================
router.get('/expenses', (req, res) => {
  const store = getStore();
  res.json({
    success: true,
    data: store.expenses || [],
    categories: store.expense_categories || []
  });
});

router.post('/expenses', (req, res) => {
  const store = getStore();
  const { title, amount, category_name, payment_method, expense_date, notes } = req.body;

  const newExpense = {
    id: 'e_' + Date.now(),
    title,
    amount: Number(amount) || 0,
    category_name: category_name || 'Miscellaneous',
    payment_method: payment_method || 'Online',
    expense_date: expense_date || new Date().toISOString().split('T')[0],
    notes: notes || ''
  };

  store.expenses = store.expenses || [];
  store.expenses.unshift(newExpense);
  saveStore(store);

  res.status(201).json({ success: true, data: newExpense });
});

// ==========================================
// 7. INQUIRIES (Lead pipeline)
// ==========================================
router.get('/inquiries', (req, res) => {
  const store = getStore();
  res.json({ success: true, data: store.inquiries || [] });
});

router.post('/inquiries', (req, res) => {
  const store = getStore();
  const { name, phone, preferred_type, source, status, follow_up_date, notes } = req.body;

  const newInq = {
    id: 'inq_' + Date.now(),
    name,
    phone,
    preferred_type: preferred_type || 'GT',
    source: source || 'Walk-in',
    status: status || 'New',
    is_completed: false,
    follow_up_date: follow_up_date || null,
    notes: notes || '',
    created_at: new Date().toISOString()
  };

  store.inquiries = store.inquiries || [];
  store.inquiries.unshift(newInq);
  saveStore(store);

  res.status(201).json({ success: true, data: newInq });
});

router.patch('/inquiries/:id', (req, res) => {
  const store = getStore();
  const { id } = req.params;
  const inq = store.inquiries.find(i => i.id === id);
  if (!inq) return res.status(404).json({ success: false, error: 'Inquiry not found' });

  Object.assign(inq, req.body);
  saveStore(store);

  res.json({ success: true, data: inq });
});

router.delete('/inquiries/:id', (req, res) => {
  const store = getStore();
  const { id } = req.params;
  const idx = (store.inquiries || []).findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Inquiry not found' });
  store.inquiries.splice(idx, 1);
  saveStore(store);
  res.json({ success: true, message: 'Inquiry deleted successfully' });
});

// ==========================================
// 8. DYNAMIC STANDALONE PUBLIC INVOICE VIEW
// ==========================================
router.get('/invoices/view/:token', (req, res) => {
  const store = getStore();
  const { token } = req.params;
  const invoice = (store.invoices || []).find(inv => inv.public_token === token);
  
  if (!invoice) {
    // If not found by token, check if token is invoice_number
    const byNum = (store.invoices || []).find(inv => inv.invoice_number === token);
    if (!byNum) return res.status(404).json({ success: false, error: 'Invoice not found' });
  }

  const activeInv = invoice || store.invoices[0];
  const member = store.members.find(m => m.id === activeInv.member_id);
  const period = store.membership_periods.find(p => p.id === activeInv.membership_period_id);
  const payment = store.payments.find(p => p.invoice_id === activeInv.id);
  const trainer = period?.trainer_id ? store.trainers.find(t => t.id === period.trainer_id) : null;

  res.json({
    success: true,
    data: {
      invoice: activeInv,
      member,
      period,
      payment,
      trainer,
      gym: {
        name: 'GV FITNESS',
        tagline: 'Transform Your Body & Mind',
        address: 'GV Fitness Club, India',
        phone: '+91 90995 58885',
        email: 'info@gvfitness.in'
      }
    }
  });
});

router.post('/invoices/send-whatsapp', async (req, res) => {
  const store = getStore();
  const { phone, memberName, invoiceNumber, amount, publicToken } = req.body;
  if (!phone) return res.status(400).json({ success: false, error: 'Phone number required' });

  const invoiceTemplate = process.env.WATI_INVOICE_TEMPLATE || 'gvnutrition_invoice_v2';
  const baseUrl = (process.env.PUBLIC_INVOICE_BASE_URL || 'http://localhost:5373').replace(/\/$/, '');
  const invoiceUrl = `${baseUrl}/?invoice=${publicToken || 'tok_yash_gt_1800'}`;

  const watiRes = await sendWatiMessage({
    phone,
    templateName: invoiceTemplate,
    broadcastTitle: 'Invoice_Receipt',
    parameters: [
      { name: '1', value: memberName || 'Member' },
      { name: 'name', value: memberName || 'Member' },
      { name: '2', value: invoiceNumber || 'INV-GV-001' },
      { name: 'invoice_no', value: invoiceNumber || 'INV-GV-001' },
      { name: '3', value: String(amount || '0') },
      { name: 'amount', value: String(amount || '0') },
      { name: '4', value: invoiceUrl },
      { name: 'link', value: invoiceUrl }
    ]
  });

  const logEntry = {
    id: 'log_inv_' + Date.now(),
    recipient_phone: phone,
    member_name: memberName,
    notification_type: 'Invoice_Receipt',
    template_name: invoiceTemplate,
    status: watiRes.success ? 'Sent' : 'Failed',
    wati_message_id: watiRes.watiMessageId,
    sent_at: new Date().toISOString()
  };

  store.notification_logs = store.notification_logs || [];
  store.notification_logs.unshift(logEntry);
  saveStore(store);

  res.json({ success: true, message: `Invoice sent to ${memberName} via WhatsApp!`, data: logEntry });
});

// ==========================================
// 9. ATTENDANCE & SIMULATOR
// ==========================================
router.get('/attendance/live', (req, res) => {
  const store = getStore();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const sessions = (store.attendance_sessions || []).filter(s => s.date === today);

  const enriched = sessions.map(s => {
    const member = (store.members || []).find(m => m.id === s.member_id);
    const activeGT = (store.membership_periods || []).find(p => p.member_id === s.member_id && p.membership_type === 'GT');
    const isExpired = activeGT ? new Date(activeGT.end_date) < new Date() : false;

    return {
      ...s,
      memberName: member?.name,
      phone: member?.phone,
      deviceUserId: member?.device_user_id,
      isExpiredWarning: isExpired,
      expiryDate: activeGT?.end_date,
      membershipStatus: !activeGT ? 'No Plan' : isExpired ? 'Expired' : 'Active GT'
    };
  });

  // Sort latest punches first
  enriched.sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time));

  const todayCount = sessions.length;

  res.json({
    success: true,
    data: {
      todayCount,
      currentlyInside: todayCount, // backward compatibility
      sessions: enriched
    }
  });
});

router.post('/attendance/simulate-punch', (req, res) => {
  const store = getStore();
  const { deviceUserId } = req.body;
  const punchTime = new Date();

  const member = store.members.find(m => m.device_user_id === Number(deviceUserId));
  if (!member) {
    return res.status(404).json({ success: false, error: 'No member enrolled with PIN #' + deviceUserId });
  }

  const todayStr = punchTime.toISOString().split('T')[0];
  store.attendance_sessions = store.attendance_sessions || [];
  const existing = store.attendance_sessions.find(s => s.member_id === member.id && s.date === todayStr);

  if (existing) {
    return res.json({
      success: true,
      message: `${member.name} (PIN #${deviceUserId}) has already checked in today at ${new Date(existing.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
      action: 'Already Checked-in'
    });
  }

  const newSession = {
    id: 'att_' + Date.now(),
    member_id: member.id,
    date: todayStr,
    check_in_time: punchTime.toISOString(),
    check_in_source: 'biometric'
  };

  store.attendance_sessions.unshift(newSession);
  saveStore(store);

  res.json({
    success: true,
    message: `Check-in recorded: ${member.name} (PIN #${deviceUserId})`,
    action: 'Check-in'
  });
});

// ==========================================
// 10. TRAINERS
// ==========================================
router.get('/trainers', (req, res) => {
  const store = getStore();
  res.json({ success: true, data: store.trainers || [] });
});

router.get('/trainers/:id/clients', (req, res) => {
  const store = getStore();
  const { id } = req.params;
  const trainer = (store.trainers || []).find(t => t.id === id);
  if (!trainer) return res.status(404).json({ success: false, error: 'Trainer not found' });

  const assignedPeriods = (store.membership_periods || []).filter(p => p.trainer_id === id);
  const todayStr = new Date().toISOString().split('T')[0];

  const clients = assignedPeriods.map(period => {
    const member = (store.members || []).find(m => m.id === period.member_id);
    const invoice = (store.invoices || []).find(inv => inv.membership_period_id === period.id);

    let clientStatus = 'Active';
    if (period.status === 'Renewed') {
      clientStatus = 'Renewed';
    } else if (period.end_date < todayStr) {
      clientStatus = 'Expired';
    } else if (period.start_date > todayStr) {
      clientStatus = 'Upcoming';
    } else {
      clientStatus = 'Active';
    }

    return {
      periodId: period.id,
      memberId: member?.id,
      memberName: member?.name || 'Unknown Member',
      memberPhone: member?.phone || '',
      memberCode: member?.member_code || '',
      devicePin: member?.device_user_id || '',
      gender: member?.gender || '',
      membershipType: period.membership_type,
      durationMonths: period.duration_months,
      startDate: period.start_date,
      endDate: period.end_date,
      amount: period.final_payable,
      periodStatus: clientStatus,
      rawStatus: period.status,
      notes: period.notes || '',
      invoiceToken: invoice?.public_token || null
    };
  });

  // Sort: Active first, then Upcoming, then Expired / Renewed
  clients.sort((a, b) => {
    const order = { 'Active': 1, 'Upcoming': 2, 'Expired': 3, 'Renewed': 4 };
    const diff = (order[a.periodStatus] || 5) - (order[b.periodStatus] || 5);
    if (diff !== 0) return diff;
    return (b.endDate || '').localeCompare(a.endDate || '');
  });

  res.json({
    success: true,
    data: {
      trainer,
      clients,
      activeCount: clients.filter(c => c.periodStatus === 'Active').length,
      upcomingCount: clients.filter(c => c.periodStatus === 'Upcoming').length,
      expiredCount: clients.filter(c => c.periodStatus === 'Expired' || c.periodStatus === 'Renewed').length,
      totalCount: clients.length
    }
  });
});

router.post('/trainers', (req, res) => {
  const store = getStore();
  const { name, phone } = req.body;
  const newTrainer = {
    id: 't_' + Date.now(),
    name,
    phone: phone || '',
    is_active: true
  };
  store.trainers = store.trainers || [];
  store.trainers.push(newTrainer);
  saveStore(store);

  res.status(201).json({ success: true, data: newTrainer });
});

// ==========================================
// 11. CAMPAIGNS (WATI WhatsApp API)
// ==========================================
router.get('/campaigns', (req, res) => {
  const store = getStore();
  res.json({
    success: true,
    allLogs: store.notification_logs || []
  });
});

router.post('/campaigns/dispatch', async (req, res) => {
  const store = getStore();
  const { title, message, targetAudience } = req.body;

  let recipients = [];
  if (targetAudience === 'ALL') {
    recipients = store.members;
  } else if (targetAudience === 'ACTIVE') {
    recipients = store.members.filter(m => m.status === 'Active');
  } else if (targetAudience === 'EXPIRED') {
    recipients = store.members.filter(m => m.status === 'Expired');
  } else if (targetAudience === 'PT') {
    recipients = store.members.filter(m => {
      return store.membership_periods.some(p => p.member_id === m.id && p.membership_type === 'PT');
    });
  }

  store.notification_logs = store.notification_logs || [];
  const campaignTemplate = process.env.WATI_CAMPAIGN_TEMPLATE || 'gvnutrition_invoice_v2';
  const isLegacyNutrition = (campaignTemplate || '').includes('gvnutrition');

  for (const m of recipients) {
    const parameters = isLegacyNutrition
      ? [
          { name: '1', value: m.name },
          { name: 'name', value: m.name },
          { name: '2', value: title },
          { name: 'title', value: title },
          { name: '3', value: message },
          { name: 'message', value: message },
          { name: '4', value: '-' },
          { name: 'link', value: '-' }
        ]
      : [
          { name: '1', value: m.name },
          { name: 'name', value: m.name },
          { name: '2', value: title },
          { name: 'title', value: title },
          { name: '3', value: message },
          { name: 'message', value: message }
        ];

    const watiRes = await sendWatiMessage({
      phone: m.phone,
      templateName: campaignTemplate,
      broadcastTitle: title,
      parameters
    });

    store.notification_logs.unshift({
      id: 'cmp_' + Date.now() + '_' + m.id,
      recipient_phone: m.phone,
      member_id: m.id,
      notification_type: 'Custom_Offer',
      template_name: title,
      idempotency_key: `CMP-${title}-${m.id}-${Date.now()}`,
      status: watiRes.success ? 'Sent' : 'Failed',
      wati_message_id: watiRes.watiMessageId,
      sent_at: new Date().toISOString()
    });
  }

  saveStore(store);

  res.json({
    success: true,
    message: `Campaign "${title}" dispatched successfully to ${recipients.length} members!`,
    count: recipients.length
  });
});

// ==========================================
// 12. EXPORT & EXCEL IMPORT
// ==========================================
router.get('/export/:type', (req, res) => {
  const store = getStore();
  const { type } = req.params;
  let rows = [];
  let sheetTitle = 'Data Export';
  const todayStr = new Date().toISOString().split('T')[0];
  let filename = `gvfitness_${type}_${todayStr}.xlsx`;

  if (type === 'members') {
    sheetTitle = 'Members Master';
    rows = (store.members || []).map(m => {
      const gt = (store.membership_periods || []).find(p => p.member_id === m.id && p.membership_type === 'GT');
      const pt = (store.membership_periods || []).find(p => p.member_id === m.id && p.membership_type === 'PT');
      const trainer = pt?.trainer_id ? (store.trainers || []).find(t => t.id === pt.trainer_id) : null;
      return {
        'Member Code': m.member_code || '',
        'Device PIN': m.device_user_id || '',
        'Full Name': m.name || '',
        'Phone Number': m.phone || '',
        'Date of Birth': formatDateDDMMYYYY(m.dob),
        'Gender': m.gender || 'Any',
        'Fitness Level': m.fitness_level || '',
        'Status': m.status || 'Active',
        'Emergency Contact': m.emergency_contact || '',
        'GT Duration (Mo)': gt?.duration_months || '',
        'GT Start Date': gt ? formatDateDDMMYYYY(gt.start_date) : '',
        'GT Expiry Date': gt ? formatDateDDMMYYYY(gt.end_date) : '',
        'GT Status': gt?.status || '',
        'PT Active': pt && pt.status === 'Active' ? 'Yes' : 'No',
        'PT Duration (Mo)': pt?.duration_months || '',
        'PT Assigned Trainer': trainer?.name || '',
        'PT Expiry Date': pt ? formatDateDDMMYYYY(pt.end_date) : '',
        'Registered Date': formatDateDDMMYYYY(m.created_at)
      };
    });
  } else if (type === 'pt_members') {
    sheetTitle = 'PT Members';
    const ptPeriods = (store.membership_periods || []).filter(p => p.membership_type === 'PT');
    rows = ptPeriods.map(pt => {
      const m = (store.members || []).find(mem => mem.id === pt.member_id) || {};
      const trainer = pt.trainer_id ? (store.trainers || []).find(t => t.id === pt.trainer_id) : null;
      return {
        'Member Code': m.member_code || '',
        'Device PIN': m.device_user_id || '',
        'Full Name': m.name || '',
        'Phone Number': m.phone || '',
        'PT Status': pt.status || 'Active',
        'Assigned Trainer': trainer?.name || 'Unassigned',
        'Trainer Phone': trainer?.phone || '',
        'Package Duration (Mo)': pt.duration_months || '',
        'PT Start Date': formatDateDDMMYYYY(pt.start_date),
        'PT Expiry Date': formatDateDDMMYYYY(pt.end_date),
        'Package Amount (₹)': pt.final_payable || pt.package_price || 0,
        'Member Notes': m.notes || ''
      };
    });
  } else if (type === 'expenses') {
    sheetTitle = 'Expenses & Overhead';
    rows = (store.expenses || []).map(e => ({
      'Date': formatDateDDMMYYYY(e.expense_date),
      'Expense Title': e.title,
      'Category': e.category_name,
      'Payment Method': e.payment_method,
      'Amount (₹)': e.amount,
      'Notes': e.notes || ''
    }));
  } else if (type === 'collections') {
    sheetTitle = 'Revenue & Collections';
    rows = (store.payments || []).map(p => {
      const inv = (store.invoices || []).find(i => i.id === p.invoice_id);
      const mem = inv ? (store.members || []).find(m => m.id === inv.member_id) : null;
      return {
        'Invoice Number': inv?.invoice_number || '',
        'Member Code': mem?.member_code || '',
        'Member Name': mem?.name || '',
        'Member Phone': mem?.phone || '',
        'Payment Date': formatDateDDMMYYYY(p.payment_date),
        'Payment Method': p.payment_method,
        'Amount Collected (₹)': p.amount,
        'Invoice Grand Total (₹)': inv?.final_payable || ''
      };
    });
  } else if (type === 'inquiries') {
    sheetTitle = 'Inquiries & Leads';
    rows = (store.inquiries || []).map(i => ({
      'Lead Name': i.name,
      'Phone Number': i.phone,
      'Preferred Package': i.preferred_type,
      'Lead Source': i.source,
      'Status': i.status,
      'Follow-up Date': formatDateDDMMYYYY(i.follow_up_date),
      'Completed': i.is_completed ? 'Yes' : 'No',
      'Notes': i.notes || '',
      'Date Created': formatDateDDMMYYYY(i.created_at)
    }));
  } else if (type === 'attendance') {
    sheetTitle = 'Daily Attendance Log';
    rows = (store.attendance_sessions || []).map(s => {
      const mem = (store.members || []).find(m => m.id === s.member_id) || {};
      const gt = (store.membership_periods || []).find(p => p.member_id === mem.id && p.membership_type === 'GT');
      return {
        'Date': formatDateDDMMYYYY(s.date),
        'Check-In Time': s.check_in_time ? new Date(s.check_in_time).toLocaleTimeString('en-IN') : '',
        'Member Code': mem.member_code || '',
        'Device PIN': mem.device_user_id || '',
        'Member Name': mem.name || 'Unknown',
        'Phone Number': mem.phone || '',
        'Membership Type': gt ? 'GT' : 'Other',
        'GT Expiry': gt ? formatDateDDMMYYYY(gt.end_date) : '',
        'Check-In Source': s.check_in_source || 'Biometric'
      };
    });
  } else if (type === 'expiries') {
    sheetTitle = 'Membership Expiries';
    const now = new Date();
    rows = (store.membership_periods || []).map(p => {
      const mem = (store.members || []).find(m => m.id === p.member_id) || {};
      const expiry = new Date(p.end_date);
      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      return {
        'Member Code': mem.member_code || '',
        'Device PIN': mem.device_user_id || '',
        'Member Name': mem.name || '',
        'Phone Number': mem.phone || '',
        'Membership Type': p.membership_type,
        'Start Date': formatDateDDMMYYYY(p.start_date),
        'Expiry Date': formatDateDDMMYYYY(p.end_date),
        'Days Remaining / Overdue': diffDays,
        'Status': p.status,
        'Total Payable (₹)': p.final_payable || ''
      };
    });
  } else if (type === 'diet_members') {
    sheetTitle = 'Diet Plan Members';
    const ranges = store.diet_bmi_ranges || [];
    rows = (store.members || []).map(m => {
      const numBmi = parseFloat(m.bmi);
      const matchedRange = !isNaN(numBmi) ? ranges.find(r => numBmi >= r.min_bmi && numBmi <= r.max_bmi) : null;
      return {
        'Member Code': m.member_code || '',
        'Full Name': m.name || '',
        'Phone Number': m.phone || '',
        'Gender': m.gender || 'Any',
        'Fitness Level': m.fitness_level || 'Beginner',
        'Height (cm)': m.height_cm || 'Not Recorded',
        'Weight (kg)': m.weight_kg || 'Not Recorded',
        'BMI': !isNaN(numBmi) ? numBmi.toFixed(2) : 'Not Calculated',
        'BMI Category': matchedRange ? matchedRange.name : 'Unassigned',
        'Adult (18+)': m.dob ? (new Date().getFullYear() - new Date(m.dob).getFullYear() >= 18 ? 'Yes' : 'No') : 'Unknown',
        'Registered Date': formatDateDDMMYYYY(m.created_at)
      };
    });
  }

  if (rows.length === 0) {
    rows = [{ 'Notice': 'No data records available for this export category.' }];
  }

  // Create worksheet from JSON data
  const ws = xlsx.utils.json_to_sheet(rows);

  // Auto-fit column widths based on maximum string lengths
  const keys = Object.keys(rows[0] || {});
  const colWidths = keys.map(key => {
    const maxLen = Math.max(
      key.length,
      ...rows.map(r => (r[key] !== undefined && r[key] !== null ? String(r[key]).length : 0))
    );
    return { wch: Math.min(Math.max(maxLen + 3, 14), 45) };
  });
  ws['!cols'] = colWidths;

  const wb = xlsx.utils.book_new();
  const cleanSheetName = (sheetTitle || type).replace(/[^a-zA-Z0-9 ]/g, ' ').trim().slice(0, 31) || 'Sheet1';
  xlsx.utils.book_append_sheet(wb, ws, cleanSheetName);

  // Optional: support ?format=csv if explicitly requested, but default is Excel .xlsx
  if (req.query.format === 'csv') {
    const csvContent = xlsx.utils.sheet_to_csv(ws);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace('.xlsx', '.csv')}"`);
    return res.status(200).send(csvContent);
  }

  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(buffer);
});

router.post('/import/excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No Excel file uploaded' });

    const store = getStore();
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let importedCount = 0;
    let skippedCount = 0;

    jsonData.forEach((row, idx) => {
      const name = row['Name'] || row['name'] || row['Full Name'] || row['Member Name'];
      let phone = String(row['Phone'] || row['phone'] || row['Mobile'] || row['Contact'] || '').trim();
      if (!phone.startsWith('+91') && phone.length === 10) phone = '+91' + phone;

      if (!name || !phone || store.members.some(m => m.phone === phone)) {
        skippedCount++;
        return;
      }

      const memberId = 'm_imp_' + Date.now() + '_' + idx;
      store.members.push({
        id: memberId,
        member_code: 'GV-' + (1000 + store.members.length + 1),
        device_user_id: row['Device PIN'] || row['PIN'] || (100 + store.members.length + 1),
        name,
        phone,
        dob: row['DOB'] || null,
        gender: row['Gender'] || 'Male',
        fitness_level: row['Level'] || 'Beginner',
        emergency_contact: '',
        notes: row['Notes'] || 'Imported from Excel',
        status: 'Active',
        created_at: new Date().toISOString()
      });

      const amount = Number(row['Amount'] || 1800);
      const start = row['Start Date'] || new Date().toISOString().split('T')[0];
      const end = row['End Date'] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      store.membership_periods.push({
        id: 'p_imp_' + Date.now() + '_' + idx,
        member_id: memberId,
        membership_type: row['Type'] === 'PT' ? 'PT' : 'GT',
        duration_months: 1,
        start_date: start,
        end_date: end,
        package_price: amount,
        discount_value: 0,
        final_payable: amount,
        status: new Date(end) < new Date() ? 'Expired' : 'Active',
        notes: 'Imported'
      });

      importedCount++;
    });

    saveStore(store);

    res.json({
      success: true,
      message: `Import complete: ${importedCount} members added, ${skippedCount} skipped.`,
      importedCount,
      skippedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 13. HARDWARE SETTINGS
// ==========================================
router.get('/settings/hardware', (req, res) => {
  res.json({
    success: true,
    data: {
      gatewayPort: 8081,
      apiPort: process.env.PORT || 5000,
      whitelistedSerials: (process.env.DEVICE_WHITELIST_SERIALS || 'K90PRO001').split(','),
      instructions: {
        serverIpOrDomain: 'Your Railway TCP Proxy Host or Local IP',
        serverPort: 8081,
        deviceMenu: 'eSSL K90 Pro > Menu > Comm. > Cloud Server Setting',
        settingsToSet: {
          'Server Address': 'e.g. railway-tcp-proxy.railway.app or 192.168.1.X',
          'Server Port': '8081',
          'Enable Domain Name': 'ON (if using Railway URL) / OFF (if using IP)',
          'Push Data': 'Yes'
        }
      }
    }
  });
});

// ==========================================
// 14. DIET PLAN MODULE
// ==========================================

function getValidGoalsForBmiRange(range, allGoals) {
  if (!range) return allGoals || [];
  if (Array.isArray(range.applicable_goal_ids) && range.applicable_goal_ids.length > 0) {
    return (allGoals || []).filter(g => range.applicable_goal_ids.includes(g.id));
  }
  // Automatic physiological interlink
  const min = parseFloat(range.min_bmi);
  const max = parseFloat(range.max_bmi);
  const name = (range.name || '').toLowerCase();

  return (allGoals || []).filter(g => {
    const gn = (g.name || '').toLowerCase();
    // 1. Underweight (BMI < 18.5)
    if (max <= 18.5 || name.includes('underweight')) {
      if (gn.includes('fat loss') || gn.includes('maintain') || gn.includes('cutting') || gn.includes('loose') || gn.includes('lose')) {
        return false;
      }
      return true;
    }
    // 2. Overweight / Obesity (BMI >= 25): NEVER gain weight, bulk, OR maintain weight!
    if (min >= 25 || name.includes('overweight') || name.includes('obese') || name.includes('obesity')) {
      if (gn.includes('weight gain') || gn.includes('bulking') || gn.includes('gain weight') || gn.includes('maintain')) {
        return false;
      }
      return true;
    }
    // 3. Normal Weight (18.5 - 24.99)
    return true;
  });
}

// --- A. BMI RANGES ---
router.get('/diet/bmi-ranges', (req, res) => {
  const store = getStore();
  const ranges = (store.diet_bmi_ranges || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  res.json({ success: true, data: ranges });
});

router.post('/diet/bmi-ranges', (req, res) => {
  const store = getStore();
  const { name, min_bmi, max_bmi, is_active, applicable_goal_ids } = req.body;
  const min = parseFloat(min_bmi);
  const max = parseFloat(max_bmi);

  if (!name || isNaN(min) || isNaN(max) || min < 0 || max <= min) {
    return res.status(400).json({ success: false, error: 'Valid range name and bounds (min < max) are required.' });
  }

  store.diet_bmi_ranges = store.diet_bmi_ranges || [];

  // Check for overlapping with active ranges
  const activeRanges = store.diet_bmi_ranges.filter(r => r.is_active !== false);
  const hasOverlap = activeRanges.some(r => Math.max(min, r.min_bmi) <= Math.min(max, r.max_bmi));
  if (hasOverlap) {
    return res.status(400).json({ success: false, error: 'This BMI range overlaps with an existing active range. Please adjust bounds.' });
  }

  const newRange = {
    id: 'bmi_' + Date.now(),
    name: name.trim(),
    min_bmi: min,
    max_bmi: max,
    applicable_goal_ids: Array.isArray(applicable_goal_ids) ? applicable_goal_ids : [],
    is_active: is_active !== false,
    display_order: store.diet_bmi_ranges.length + 1,
    created_at: new Date().toISOString()
  };

  store.diet_bmi_ranges.push(newRange);
  saveStore(store);
  res.status(201).json({ success: true, data: newRange });
});

router.put('/diet/bmi-ranges/:id', (req, res) => {
  const store = getStore();
  const { id } = req.params;
  const { name, min_bmi, max_bmi, is_active, applicable_goal_ids } = req.body;
  const range = (store.diet_bmi_ranges || []).find(r => r.id === id);
  if (!range) return res.status(404).json({ success: false, error: 'BMI range not found.' });

  const min = min_bmi !== undefined ? parseFloat(min_bmi) : range.min_bmi;
  const max = max_bmi !== undefined ? parseFloat(max_bmi) : range.max_bmi;

  if (isNaN(min) || isNaN(max) || min < 0 || max <= min) {
    return res.status(400).json({ success: false, error: 'Valid range bounds (min < max) are required.' });
  }

  const willBeActive = is_active !== undefined ? !!is_active : range.is_active;
  if (willBeActive) {
    const otherActives = (store.diet_bmi_ranges || []).filter(r => r.id !== id && r.is_active !== false);
    const hasOverlap = otherActives.some(r => Math.max(min, r.min_bmi) <= Math.min(max, r.max_bmi));
    if (hasOverlap) {
      return res.status(400).json({ success: false, error: 'Updated bounds overlap with another active range.' });
    }
  }

  if (name) range.name = name.trim();
  range.min_bmi = min;
  range.max_bmi = max;
  if (is_active !== undefined) range.is_active = is_active;
  if (applicable_goal_ids !== undefined) {
    range.applicable_goal_ids = Array.isArray(applicable_goal_ids) ? applicable_goal_ids : [];
  }

  saveStore(store);
  res.json({ success: true, data: range });
});

router.delete('/diet/bmi-ranges/:id', (req, res) => {
  const store = getStore();
  const { id } = req.params;
  
  const linkedPlan = (store.diet_plans || []).find(p => p.bmi_range_id === id);
  if (linkedPlan) {
    return res.status(400).json({ success: false, error: `Cannot delete: Range is used by master plan "${linkedPlan.title}". Deactivate it instead.` });
  }

  store.diet_bmi_ranges = (store.diet_bmi_ranges || []).filter(r => r.id !== id);
  saveStore(store);
  res.json({ success: true, message: 'BMI range removed.' });
});

// --- B. FITNESS GOALS ---
router.get('/diet/goals', (req, res) => {
  const store = getStore();
  const goals = (store.diet_fitness_goals || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  res.json({ success: true, data: goals });
});

router.post('/diet/goals', (req, res) => {
  const store = getStore();
  const { name, is_active } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'Goal name is required.' });

  store.diet_fitness_goals = store.diet_fitness_goals || [];
  if (store.diet_fitness_goals.some(g => g.name.toLowerCase() === name.trim().toLowerCase())) {
    return res.status(400).json({ success: false, error: 'A fitness goal with this name already exists.' });
  }

  const newGoal = {
    id: 'goal_' + Date.now(),
    name: name.trim(),
    is_active: is_active !== false,
    display_order: store.diet_fitness_goals.length + 1,
    created_at: new Date().toISOString()
  };

  store.diet_fitness_goals.push(newGoal);
  saveStore(store);
  res.status(201).json({ success: true, data: newGoal });
});

router.put('/diet/goals/:id', (req, res) => {
  const store = getStore();
  const { id } = req.params;
  const { name, is_active } = req.body;
  const goal = (store.diet_fitness_goals || []).find(g => g.id === id);
  if (!goal) return res.status(404).json({ success: false, error: 'Goal not found.' });

  if (name && name.trim()) {
    const duplicate = (store.diet_fitness_goals || []).find(g => g.id !== id && g.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicate) return res.status(400).json({ success: false, error: 'Another goal with this name already exists.' });
    goal.name = name.trim();
  }
  if (is_active !== undefined) goal.is_active = is_active;

  saveStore(store);
  res.json({ success: true, data: goal });
});

router.delete('/diet/goals/:id', (req, res) => {
  const store = getStore();
  const { id } = req.params;
  const linkedPlan = (store.diet_plans || []).find(p => p.goal_id === id);
  if (linkedPlan) {
    return res.status(400).json({ success: false, error: `Cannot delete: Goal is used by master plan "${linkedPlan.title}". Deactivate it instead.` });
  }

  store.diet_fitness_goals = (store.diet_fitness_goals || []).filter(g => g.id !== id);
  saveStore(store);
  res.json({ success: true, message: 'Goal removed.' });
});

// --- C. MASTER DIET PLANS ---
router.get('/diet/plans', (req, res) => {
  const store = getStore();
  const plans = store.diet_plans || [];
  const ranges = store.diet_bmi_ranges || [];
  const goals = store.diet_fitness_goals || [];

  res.json({
    success: true,
    data: {
      plans,
      ranges,
      goals
    }
  });
});

router.post('/diet/plans', (req, res) => {
  const store = getStore();
  const {
    id,
    bmi_range_id,
    fitness_level,
    goal_id,
    dietary_preference,
    gender,
    title,
    status,
    meals,
    instructions
  } = req.body;

  if (!bmi_range_id || !fitness_level || !goal_id || !dietary_preference) {
    return res.status(400).json({ success: false, error: 'Missing required combination dimensions.' });
  }

  store.diet_plans = store.diet_plans || [];
  const assignedGender = gender || 'Any';

  const existingIdx = store.diet_plans.findIndex(p => 
    (id && p.id === id) ||
    (p.bmi_range_id === bmi_range_id &&
     p.fitness_level === fitness_level &&
     p.goal_id === goal_id &&
     p.dietary_preference === dietary_preference &&
     p.gender === assignedGender)
  );

  const planId = id || ('plan_' + Date.now());
  const planData = {
    id: planId,
    bmi_range_id,
    fitness_level,
    goal_id,
    dietary_preference,
    gender: assignedGender,
    title: title ? title.trim() : `${fitness_level} ${dietary_preference}`,
    status: status || 'Active',
    meals: Array.isArray(meals) ? meals : [],
    instructions: instructions || '',
    updated_at: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    store.diet_plans[existingIdx] = {
      ...store.diet_plans[existingIdx],
      ...planData
    };
  } else {
    planData.created_at = new Date().toISOString();
    store.diet_plans.push(planData);
  }

  saveStore(store);
  res.status(201).json({ success: true, data: planData });
});

router.delete('/diet/plans/:id', (req, res) => {
  const store = getStore();
  const { id } = req.params;
  store.diet_plans = (store.diet_plans || []).filter(p => p.id !== id);
  saveStore(store);
  res.json({ success: true, message: 'Master diet plan removed.' });
});

// --- D. MEMBER MEASUREMENTS UPDATE ---
router.put('/members/:id/measurements', (req, res) => {
  const store = getStore();
  const { id } = req.params;
  const { height_cm, weight_kg } = req.body;

  const member = (store.members || []).find(m => m.id === id);
  if (!member) return res.status(404).json({ success: false, error: 'Member not found.' });

  const height = parseFloat(height_cm);
  const weight = parseFloat(weight_kg);

  if (isNaN(height) || height <= 0 || isNaN(weight) || weight <= 0) {
    return res.status(400).json({ success: false, error: 'Valid positive height (cm) and weight (kg) are required.' });
  }

  const bmi = parseFloat((weight / Math.pow(height / 100, 2)).toFixed(2));
  member.height_cm = height;
  member.weight_kg = weight;
  member.bmi = bmi;
  member.updated_at = new Date().toISOString();

  saveStore(store);
  res.json({ success: true, data: { height_cm: height, weight_kg: weight, bmi } });
});

// --- E. COMBINATION MATCHING ENGINE ---
router.post('/diet/match', (req, res) => {
  const store = getStore();
  const { memberId, goalId, dietaryPreference } = req.body;

  const member = (store.members || []).find(m => m.id === memberId);
  if (!member) return res.status(404).json({ success: false, error: 'Member not found.' });

  if (member.dob) {
    const dob = new Date(member.dob);
    const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) {
      return res.status(400).json({ success: false, error: 'Member is under 18 years old. Adult BMI-based diet plans are ineligible for auto-generation.' });
    }
  }

  if (!member.bmi || isNaN(member.bmi) || member.bmi <= 0) {
    return res.status(400).json({ success: false, error: 'Member has no valid BMI recorded. Please update their height and weight first.' });
  }

  const activeRanges = (store.diet_bmi_ranges || []).filter(r => r.is_active !== false);
  const matchedRange = activeRanges.find(r => member.bmi >= r.min_bmi && member.bmi <= r.max_bmi);

  if (!matchedRange) {
    return res.status(404).json({
      success: false,
      error: `Member BMI (${member.bmi}) does not fall into any active BMI range. Please configure or expand a range in Manage Diet Plans.`
    });
  }

  const goal = (store.diet_fitness_goals || []).find(g => g.id === goalId && g.is_active !== false);
  if (!goal) return res.status(404).json({ success: false, error: 'Selected fitness goal is invalid or inactive.' });

  // Validate goal is applicable to this BMI range
  const validGoalsForRange = getValidGoalsForBmiRange(matchedRange, store.diet_fitness_goals);
  const isGoalValid = validGoalsForRange.some(g => g.id === goalId);
  if (!isGoalValid) {
    return res.status(400).json({
      success: false,
      error: `Fitness goal "${goal.name}" is not applicable for member's ${matchedRange.name} BMI range (${member.bmi}).`
    });
  }

  const plans = (store.diet_plans || []).filter(p => p.status === 'Active');
  
  let matchedPlan = plans.find(p => 
    p.bmi_range_id === matchedRange.id &&
    p.fitness_level === member.fitness_level &&
    p.goal_id === goalId &&
    p.dietary_preference === dietaryPreference &&
    p.gender === (member.gender || 'Any')
  );

  if (!matchedPlan) {
    matchedPlan = plans.find(p => 
      p.bmi_range_id === matchedRange.id &&
      p.fitness_level === member.fitness_level &&
      p.goal_id === goalId &&
      p.dietary_preference === dietaryPreference &&
      p.gender === 'Any'
    );
  }

  if (!matchedPlan) {
    return res.status(404).json({
      success: false,
      error: 'No matching diet plan found for this combination. Please create the required combination in Manage Diet Plans.',
      combinationDetails: {
        bmiRange: matchedRange.name,
        fitnessLevel: member.fitness_level,
        goal: goal.name,
        preference: dietaryPreference,
        gender: member.gender || 'Any'
      }
    });
  }

  res.json({
    success: true,
    data: {
      plan: matchedPlan,
      bmiRange: matchedRange,
      goal,
      member
    }
  });
});

// --- F. CREATE 14-DAY SHARE & SEND VIA WATI ---
router.post('/diet/shares', async (req, res) => {
  const store = getStore();
  const { memberId, planSnapshot, sendViaWhatsApp } = req.body;

  const member = (store.members || []).find(m => m.id === memberId);
  if (!member) return res.status(404).json({ success: false, error: 'Member not found.' });

  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  store.diet_plan_shares = store.diet_plan_shares || [];

  const shareEntry = {
    id: 'share_' + Date.now(),
    token,
    member_id: member.id,
    plan_snapshot: planSnapshot,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };

  store.diet_plan_shares.push(shareEntry);
  saveStore(store);

  const baseUrl = (process.env.PUBLIC_DIET_PLAN_BASE_URL || process.env.PUBLIC_INVOICE_BASE_URL || 'http://localhost:5373').replace(/\/$/, '');
  const publicShareUrl = `${baseUrl}/?dietPlan=${token}`;

  let watiResult = null;
  if (sendViaWhatsApp && member.phone) {
    const templateName = process.env.WATI_DIET_PLAN_TEMPLATE || 'gvfitness_diet_plan_v1';
    const params = [
      { name: '1', value: member.name.split(' ')[0] },
      { name: '2', value: publicShareUrl }
    ];

    watiResult = await sendWatiMessage({
      phone: member.phone,
      templateName,
      broadcastName: `DietPlan_${member.name.replace(/\s+/g, '')}`,
      parameters: params
    });

    store.notification_logs = store.notification_logs || [];
    store.notification_logs.unshift({
      id: 'notif_diet_' + Date.now(),
      recipient_phone: member.phone,
      member_id: member.id,
      notification_type: 'Diet_Plan',
      template_name: templateName,
      idempotency_key: `diet_${token}`,
      status: watiResult.success ? 'Sent' : 'Failed',
      wati_message_id: watiResult.watiMessageId || null,
      error_message: watiResult.error || null,
      sent_at: new Date().toISOString()
    });
    saveStore(store);
  }

  res.status(201).json({
    success: true,
    data: {
      token,
      shareUrl: publicShareUrl,
      expiresAt,
      wati: watiResult
    }
  });
});

// --- G. VIEW SHARE PAYLOAD (WEB VIEW / PDF) ---
router.get('/diet/view/:token', (req, res) => {
  const store = getStore();
  const { token } = req.params;

  const share = (store.diet_plan_shares || []).find(s => s.token === token);
  if (!share) {
    return res.status(404).json({ success: false, error: 'Diet plan not found or invalid link.' });
  }

  if (new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ success: false, error: 'This diet plan link has expired (14-day validity). Please request a fresh plan from GV Fitness staff.' });
  }

  res.json({ success: true, data: share.plan_snapshot });
});

router.get('/diet/pdf/:token', (req, res) => {
  const store = getStore();
  const { token } = req.params;

  const share = (store.diet_plan_shares || []).find(s => s.token === token);
  if (!share) {
    return res.status(404).send('Diet plan link not found or invalid.');
  }

  if (new Date(share.expires_at) < new Date()) {
    return res.status(410).send('This diet plan link has expired (14-day validity). Please request a fresh plan from GV Fitness staff.');
  }

  const memberNameClean = (share.plan_snapshot?.memberName || 'Member').replace(/[^a-zA-Z0-9]/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="GV_Fitness_Diet_Plan_${memberNameClean}.pdf"`);

  generateDietPlanPDF(share.plan_snapshot, res);
});

module.exports = router;
