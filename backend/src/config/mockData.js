// CommonJS compatible random UUID generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// In-Memory store as a safe mock layer before real DB credentials are added
const mockStore = {
  members: [
    {
      id: 'm1',
      member_code: 'GV-1001',
      device_user_id: 101,
      name: 'Yash Patel',
      phone: '+919099558885',
      dob: '1998-05-14',
      gender: 'Male',
      fitness_level: 'Beginner',
      emergency_contact: '9876543210',
      notes: 'Evening slot preferred',
      status: 'Active',
      created_at: new Date().toISOString()
    },
    {
      id: 'm2',
      member_code: 'GV-1002',
      device_user_id: 102,
      name: 'Akash Ahire',
      phone: '+917359856683',
      dob: '1995-10-20',
      gender: 'Male',
      fitness_level: 'Beginner',
      emergency_contact: '9876543211',
      notes: '',
      status: 'Active',
      created_at: new Date().toISOString()
    },
    {
      id: 'm3',
      member_code: 'GV-1003',
      device_user_id: 103,
      name: 'Bijal Joshi',
      phone: '+918141378585',
      dob: '2000-01-12',
      gender: 'Female',
      fitness_level: 'Advance',
      emergency_contact: '',
      notes: 'PT with Gautam Sir',
      status: 'Active',
      created_at: new Date().toISOString()
    }
  ],
  trainers: [
    { id: 't1', name: 'Saurabh Sir', phone: '+919800000001', is_active: true },
    { id: 't2', name: 'Gautam Sir', phone: '+919800000002', is_active: true },
    { id: 't3', name: 'Vinay Sir', phone: '+919800000003', is_active: true },
    { id: 't4', name: 'Naeem Sir', phone: '+919800000004', is_active: true },
    { id: 't5', name: 'Pratham Sir', phone: '+919800000005', is_active: true },
    { id: 't6', name: 'Akash Sir', phone: '+919800000006', is_active: true }
  ],
  membership_periods: [
    {
      id: 'p1',
      member_id: 'm1',
      membership_type: 'GT',
      duration_months: 1,
      start_date: '2026-10-17',
      end_date: '2026-11-17',
      package_price: 1800,
      discount_type: 'none',
      discount_value: 0,
      final_payable: 1800,
      status: 'Active',
      notes: ''
    },
    {
      id: 'p1_pt',
      member_id: 'm1',
      membership_type: 'PT',
      trainer_id: 't1',
      duration_months: 1,
      start_date: '2026-10-17',
      end_date: '2026-11-17',
      package_price: 5000,
      discount_type: 'none',
      discount_value: 0,
      final_payable: 5000,
      status: 'Active',
      notes: 'Monthly rate'
    },
    {
      id: 'p2',
      member_id: 'm2',
      membership_type: 'GT',
      duration_months: 12,
      start_date: '2026-10-12',
      end_date: '2027-10-12',
      package_price: 9000,
      discount_type: 'none',
      discount_value: 0,
      final_payable: 9000,
      status: 'Active',
      notes: '1-year GT'
    },
    {
      id: 'p3_pt',
      member_id: 'm3',
      membership_type: 'PT',
      trainer_id: 't2',
      duration_months: 1,
      start_date: '2026-10-08',
      end_date: '2026-11-08',
      package_price: 6000,
      discount_type: 'none',
      discount_value: 0,
      final_payable: 6000,
      status: 'Active',
      notes: ''
    }
  ],
  invoices: [
    {
      id: 'inv1',
      invoice_number: 'GV-INV-2026-0001',
      member_id: 'm1',
      membership_period_id: 'p1',
      total_amount: 1800,
      status: 'Paid',
      public_token: 'tok_yash_gt_1800',
      created_at: '2026-10-17T10:00:00Z'
    },
    {
      id: 'inv1_pt',
      invoice_number: 'GV-INV-2026-0002',
      member_id: 'm1',
      membership_period_id: 'p1_pt',
      total_amount: 5000,
      status: 'Paid',
      public_token: 'tok_yash_pt_5000',
      created_at: '2026-10-17T10:05:00Z'
    },
    {
      id: 'inv2',
      invoice_number: 'GV-INV-2026-0003',
      member_id: 'm2',
      membership_period_id: 'p2',
      total_amount: 9000,
      status: 'Paid',
      public_token: 'tok_akash_gt_9000',
      created_at: '2026-10-12T11:00:00Z'
    }
  ],
  payments: [
    { id: 'pay1', invoice_id: 'inv1', amount: 1800, payment_method: 'Online', payment_date: '2026-10-17' },
    { id: 'pay1_pt', invoice_id: 'inv1_pt', amount: 5000, payment_method: 'Online', payment_date: '2026-10-17' },
    { id: 'pay2', invoice_id: 'inv2', amount: 9000, payment_method: 'Cash', payment_date: '2026-10-12' }
  ],
  expense_categories: [
    { id: 'c1', name: 'Rent', is_custom: false },
    { id: 'c2', name: 'Staff Salary', is_custom: false },
    { id: 'c3', name: 'Electricity & Water', is_custom: false },
    { id: 'c4', name: 'Equipment & Maintenance', is_custom: false },
    { id: 'c5', name: 'Supplements & Retail', is_custom: false },
    { id: 'c6', name: 'Mobile & Internet', is_custom: false },
    { id: 'c7', name: 'Marketing & Ads', is_custom: false },
    { id: 'c8', name: 'Miscellaneous', is_custom: false }
  ],
  expenses: [
    { id: 'e1', category_id: 'c6', category_name: 'Mobile & Internet', title: 'mobile recharge', amount: 353, payment_method: 'Online', expense_date: '2026-10-15', notes: '' },
    { id: 'e2', category_id: 'c2', category_name: 'Staff Salary', title: 'ASHVINI SALARY', amount: 13522, payment_method: 'Online', expense_date: '2026-10-12', notes: '' },
    { id: 'e3', category_id: 'c1', category_name: 'Rent', title: 'RENT', amount: 79500, payment_method: 'Online', expense_date: '2026-10-10', notes: 'Monthly gym rent' },
    { id: 'e4', category_id: 'c2', category_name: 'Staff Salary', title: 'kamwali', amount: 7800, payment_method: 'Cash', expense_date: '2026-10-07', notes: '' },
    { id: 'e5', category_id: 'c2', category_name: 'Staff Salary', title: 'AKASH SIR SALARY', amount: 8467, payment_method: 'Online', expense_date: '2026-10-07', notes: '' },
    { id: 'e6', category_id: 'c2', category_name: 'Staff Salary', title: 'SAURABH SIR SALARY', amount: 8651, payment_method: 'Online', expense_date: '2026-10-07', notes: '' },
    { id: 'e7', category_id: 'c2', category_name: 'Staff Salary', title: 'vinay sir salary', amount: 10000, payment_method: 'Online', expense_date: '2026-10-07', notes: '' },
    { id: 'e8', category_id: 'c2', category_name: 'Staff Salary', title: 'pratham sir salay', amount: 9300, payment_method: 'Online', expense_date: '2026-10-07', notes: '' }
  ],
  inquiries: [
    {
      id: 'inq1',
      name: 'sarang singh',
      phone: '+919712481116',
      preferred_type: 'PT',
      source: 'Walk-in',
      status: 'New',
      is_completed: false,
      follow_up_date: '2026-11-01T10:00:00Z',
      notes: '1 pt inquiry'
    },
    {
      id: 'inq2',
      name: 'varun',
      phone: '+919327407695',
      preferred_type: 'GT',
      source: 'Walk-in',
      status: 'Trial Scheduled',
      is_completed: true,
      follow_up_date: '2026-10-17T18:00:00Z',
      notes: 'monday trail'
    },
    {
      id: 'inq3',
      name: 'sarthik',
      phone: '+916353922032',
      preferred_type: 'GT',
      source: 'Instagram',
      status: 'Contacted',
      is_completed: false,
      follow_up_date: '2026-10-29T11:00:00Z',
      notes: 'interested in 3-month GT'
    }
  ],
  attendance_sessions: [
    {
      id: 'att1',
      member_id: 'm1',
      date: '2026-10-28',
      check_in_time: '2026-10-28T18:15:00Z',
      check_out_time: null,
      duration_minutes: null,
      is_auto_closed: false,
      check_in_source: 'biometric'
    }
  ],
  devices_whitelist: [
    { device_serial: 'K90PRO001', device_name: 'Main Door eSSL K90 Pro', is_active: true, last_heartbeat: new Date().toISOString() }
  ],
  notification_logs: [],
  diet_bmi_ranges: [
    { id: 'bmi_underweight', name: 'Underweight', min_bmi: 0.00, max_bmi: 18.49, is_active: true, display_order: 1 },
    { id: 'bmi_normal', name: 'Normal Weight', min_bmi: 18.50, max_bmi: 24.99, is_active: true, display_order: 2 },
    { id: 'bmi_overweight', name: 'Overweight', min_bmi: 25.00, max_bmi: 29.99, is_active: true, display_order: 3 },
    { id: 'bmi_obese1', name: 'Obesity Grade 1', min_bmi: 30.00, max_bmi: 34.99, is_active: true, display_order: 4 },
    { id: 'bmi_obese2', name: 'Obesity Grade 2+', min_bmi: 35.00, max_bmi: 50.00, is_active: true, display_order: 5 }
  ],
  diet_fitness_goals: [
    { id: 'goal_fat_loss', name: 'Fat Loss', is_active: true, display_order: 1 },
    { id: 'goal_muscle_gain', name: 'Muscle Gain', is_active: true, display_order: 2 },
    { id: 'goal_weight_gain', name: 'Weight Gain', is_active: true, display_order: 3 },
    { id: 'goal_maintain', name: 'Maintain Weight', is_active: true, display_order: 4 },
    { id: 'goal_cutting', name: 'Cutting', is_active: true, display_order: 5 },
    { id: 'goal_bulking', name: 'Bulking', is_active: true, display_order: 6 },
    { id: 'goal_recomp', name: 'Body Recomposition', is_active: true, display_order: 7 },
    { id: 'goal_general', name: 'General Fitness', is_active: true, display_order: 8 }
  ],
  diet_plans: [],
  diet_plan_shares: []
};

module.exports = { mockStore };
