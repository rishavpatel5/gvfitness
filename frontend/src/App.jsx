import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Dumbbell, 
  Hourglass, 
  Cake, 
  MessageSquare, 
  UserPlus, 
  Receipt, 
  Wallet, 
  Fingerprint, 
  UserCheck, 
  FileSpreadsheet, 
  Settings, 
  Sun, 
  Moon, 
  Search, 
  Plus, 
  Check, 
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Send,
  Printer,
  Copy,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Lock,
  LogOut,
  PhoneCall,
  Zap,
  X,
  ChevronRight,
  User,
  Clock,
  Utensils
} from 'lucide-react';
import DietPlanView from './components/DietPlan/DietPlanView';
import StandaloneDietPlanView from './components/DietPlan/StandaloneDietPlanView';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Universal Indian Date Formatter (DD/MM/YYYY)
const formatDate = (val) => {
  if (!val) return '—';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return '—';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, '0');
      const d = isoMatch[3].padStart(2, '0');
      return `${d}/${m}/${y}`;
    }
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const d = dmyMatch[1].padStart(2, '0');
      const m = dmyMatch[2].padStart(2, '0');
      const y = dmyMatch[3];
      return `${d}/${m}/${y}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const d = String(parsed.getDate()).padStart(2, '0');
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const y = parsed.getFullYear();
      return `${d}/${m}/${y}`;
    }
    return trimmed;
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '—';
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return String(val);
};

const formatTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}/${month}/${year}, ${time}`;
};

const getInquiryStatusBadge = (status) => {
  switch (status) {
    case 'Converted':
      return { bg: 'var(--gv-green-subtle)', text: 'var(--gv-green)', border: '#86EFAC' };
    case 'Trial Scheduled':
      return { bg: 'var(--gv-amber-subtle)', text: 'var(--gv-amber)', border: '#FDE68A' };
    case 'Contacted':
      return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    case 'Follow-up Needed':
      return { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
    case 'Not Interested':
      return { bg: 'var(--gv-red-subtle)', text: 'var(--gv-red-text)', border: '#FECACA' };
    case 'New':
    default:
      return { bg: 'var(--gv-bg)', text: 'var(--gv-text-main)', border: 'var(--gv-border)' };
  }
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', textAlign: 'center', backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', margin: '24px' }}>
          <AlertTriangle size={36} color="var(--gv-red)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Something went wrong</h3>
          <p style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginBottom: '16px' }}>{this.state.error?.message || 'An unexpected rendering error occurred.'}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--gv-red)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Auth state
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('gv_auth_token'));
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '' });
  const [loginError, setLoginError] = useState('');
  
  // Public standalone invoice viewer mode (if url has ?invoice=token or #invoice=token)
  const [publicInvoiceToken, setPublicInvoiceToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('invoice');
  });
  const [standaloneInvoice, setStandaloneInvoice] = useState(null);

  // Public standalone diet plan viewer mode (if url has ?dietPlan=token)
  const [publicDietPlanToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('dietPlan');
  });

  // App navigation & theme
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('light');
  
  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [members, setMembers] = useState([]);
  const [expiries, setExpiries] = useState(null);
  const [birthdays, setBirthdays] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [liveAttendance, setLiveAttendance] = useState({ todayCount: 0, sessions: [] });
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [hardwareSettings, setHardwareSettings] = useState(null);

  // Modals & UI states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddInquiryModal, setShowAddInquiryModal] = useState(false);
  const [showAddTrainerModal, setShowAddTrainerModal] = useState(false);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showAddPtModal, setShowAddPtModal] = useState(false);

  // Trainer Assigned Clients Modal State
  const [selectedTrainerDetails, setSelectedTrainerDetails] = useState(null);
  const [trainerClientsLoading, setTrainerClientsLoading] = useState(false);
  const [trainerClientsData, setTrainerClientsData] = useState(null);
  const [trainerClientsFilter, setTrainerClientsFilter] = useState('all'); // 'all' | 'active' | 'upcoming' | 'expired'
  const [trainerClientsSearch, setTrainerClientsSearch] = useState('');

  // Inquiry Note Quick Inline Editing
  const [editingInquiryNoteId, setEditingInquiryNoteId] = useState(null);
  const [editingInquiryNoteValue, setEditingInquiryNoteValue] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeExpirySubTab, setActiveExpirySubTab] = useState('7days');
  const [birthdayFilterAll, setBirthdayFilterAll] = useState(false);
  const [ptViewTab, setPtViewTab] = useState('active'); // 'active' (default) | 'history'

  // Forms
  const [newMember, setNewMember] = useState({
    name: '',
    phone: '',
    dob: '',
    gender: 'Any',
    fitness_level: 'Beginner',
    height_cm: '',
    weight_kg: '',
    device_user_id: '',
    membership_type: 'GT',
    gt_start_date: new Date().toISOString().split('T')[0],
    gt_duration: 12,
    gt_amount: 9000,
    gt_payment_method: 'Online',
    pt_trainer_id: '',
    pt_start_date: new Date().toISOString().split('T')[0],
    pt_duration: 3,
    pt_amount: 15000,
    pt_payment_method: 'Online'
  });

  const [addPtForm, setAddPtForm] = useState({
    member_id: '',
    memberName: '',
    gt_end_date: '',
    pt_trainer_id: '',
    pt_duration: 3,
    pt_start_date: new Date().toISOString().split('T')[0],
    pt_amount: 15000,
    pt_payment_method: 'Online',
    notes: ''
  });

  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category_name: 'Rent',
    payment_method: 'Online',
    expense_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [newInquiry, setNewInquiry] = useState({
    name: '',
    phone: '',
    preferred_type: 'GT',
    source: 'Walk-in',
    status: 'New',
    follow_up_date: '',
    notes: ''
  });

  const [newTrainer, setNewTrainer] = useState({ name: '', phone: '' });
  const [campaignData, setCampaignData] = useState({
    title: 'Diwali Fitness Offer 2026',
    message: 'Get 20% off on 6-month & 1-year GT/PT packages at GV Fitness! Valid till Sunday.',
    targetAudience: 'ALL'
  });

  const [simulatorInput, setSimulatorInput] = useState({ deviceUserId: 101 });
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResultModal, setCronResultModal] = useState(null);

  // Check public standalone invoice on load
  useEffect(() => {
    if (publicInvoiceToken) {
      fetch(`${API_BASE}/invoices/view/${publicInvoiceToken}`)
        .then(res => res.json())
        .then(json => {
          if (json.success) setStandaloneInvoice(json.data);
        })
        .catch(console.error);
    }
  }, [publicInvoiceToken]);

  // Toggle Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load all initial data once logged in
  useEffect(() => {
    if (authToken && !publicInvoiceToken && !publicDietPlanToken) {
      fetchAll();
      // Auto-poll live attendance every 5 seconds for real-time biometric feed
      const interval = setInterval(fetchAttendance, 5000);
      return () => clearInterval(interval);
    }
  }, [authToken, birthdayFilterAll, publicInvoiceToken, publicDietPlanToken]);

  const fetchAll = () => {
    fetchDashboard();
    fetchMembers();
    fetchTrainers();
    fetchExpiries();
    fetchExpenses();
    fetchInquiries();
    fetchAttendance();
    fetchBirthdays();
    fetchCampaigns();
    fetchHardwareSettings();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const json = await res.json();
      if (json.success) {
        setAuthToken(json.token);
        localStorage.setItem('gv_auth_token', json.token);
      } else {
        setLoginError(json.error || 'Invalid credentials');
      }
    } catch (err) {
      setLoginError('Cannot connect to backend API server at ' + API_BASE);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gv_auth_token');
    setAuthToken(null);
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard`);
      const json = await res.json();
      if (json.success) setDashboardData(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/members`);
      const json = await res.json();
      if (json.success) setMembers(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTrainers = async () => {
    try {
      const res = await fetch(`${API_BASE}/trainers`);
      const json = await res.json();
      if (json.success) setTrainers(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExpiries = async () => {
    try {
      const res = await fetch(`${API_BASE}/expiries`);
      const json = await res.json();
      if (json.success) setExpiries(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${API_BASE}/expenses`);
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data);
        setExpenseCategories(json.categories || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInquiries = async () => {
    try {
      const res = await fetch(`${API_BASE}/inquiries`);
      const json = await res.json();
      if (json.success) setInquiries(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`${API_BASE}/attendance/live`);
      const json = await res.json();
      if (json.success) setLiveAttendance(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBirthdays = async () => {
    try {
      const res = await fetch(`${API_BASE}/birthdays?includeInactive=${birthdayFilterAll}`);
      const json = await res.json();
      if (json.success) setBirthdays(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${API_BASE}/campaigns`);
      const json = await res.json();
      if (json.success) setCampaignLogs(json.allLogs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHardwareSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/hardware`);
      const json = await res.json();
      if (json.success) setHardwareSettings(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  const getNextAvailablePin = () => {
    if (!members || members.length === 0) return 101;
    const existingPins = members
      .map(m => Number(m.device_user_id))
      .filter(pin => !isNaN(pin) && pin > 0);
    if (existingPins.length === 0) return 101;
    return Math.max(...existingPins) + 1;
  };

  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const birth = new Date(dobString);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const calculateBmi = (heightCm, weightKg) => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!isNaN(h) && h > 0 && !isNaN(w) && w > 0) {
      const hM = h / 100;
      return (w / (hM * hM)).toFixed(2);
    }
    return null;
  };

  const handleOpenAddMemberModal = (type = 'GT') => {
    const nextPin = getNextAvailablePin();
    setNewMember({
      name: '',
      phone: '',
      dob: '',
      gender: 'Any',
      fitness_level: 'Beginner',
      height_cm: '',
      weight_kg: '',
      device_user_id: String(nextPin),
      membership_type: type,
      gt_start_date: new Date().toISOString().split('T')[0],
      gt_duration: 12,
      gt_amount: 9000,
      gt_discount_val: 0,
      gt_payment_method: 'Online',
      pt_trainer_id: trainers[0]?.id || '',
      pt_start_date: new Date().toISOString().split('T')[0],
      pt_duration: 3,
      pt_amount: 15000,
      pt_discount_val: 0,
      pt_payment_method: 'Online'
    });
    setShowAddMemberModal(true);
  };

  useEffect(() => {
    if (showAddMemberModal && (!newMember.device_user_id || newMember.device_user_id === '')) {
      const pin = getNextAvailablePin();
      setNewMember(prev => ({ ...prev, device_user_id: String(pin) }));
    }
  }, [showAddMemberModal, members]);

  // Actions
  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      const json = await res.json();
      if (json.success) {
        setShowAddMemberModal(false);
        fetchAll();
        alert(json.message || 'Member added successfully!');
      } else {
        alert(json.error || 'Failed to add member');
      }
    } catch (e) {
      alert(e.message);
    }
  };



  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense)
      });
      const json = await res.json();
      if (json.success) {
        setShowAddExpenseModal(false);
        fetchExpenses();
        fetchDashboard();
      }
    } catch (e) {
      alert(e.message);
    }
  };



  const handleAddInquiry = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInquiry)
      });
      const json = await res.json();
      if (json.success) {
        setShowAddInquiryModal(false);
        setNewInquiry({
          name: '',
          phone: '',
          preferred_type: 'GT',
          source: 'Walk-in',
          status: 'New',
          follow_up_date: '',
          notes: ''
        });
        fetchInquiries();
      }
    } catch (e) {
      alert(e.message);
    }
  };



  const handleAddTrainer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/trainers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrainer)
      });
      const json = await res.json();
      if (json.success) {
        setShowAddTrainerModal(false);
        setNewTrainer({ name: '', phone: '' });
        fetchTrainers();
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleOpenTrainerClients = async (trainer) => {
    setSelectedTrainerDetails(trainer);
    setTrainerClientsLoading(true);
    setTrainerClientsFilter('all');
    setTrainerClientsSearch('');
    try {
      const res = await fetch(`${API_BASE}/trainers/${trainer.id}/clients`);
      const json = await res.json();
      if (json.success) {
        setTrainerClientsData(json.data);
      }
    } catch (err) {
      console.error('Error fetching trainer clients:', err);
    } finally {
      setTrainerClientsLoading(false);
    }
  };



  const toggleInquiryComplete = async (id, currentStatus) => {
    try {
      await fetch(`${API_BASE}/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !currentStatus })
      });
      fetchInquiries();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateInquiryStatus = async (id, newStatus) => {
    try {
      setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq));
      await fetch(`${API_BASE}/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchInquiries();
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    }
  };

  const handleSaveInlineNote = async (id) => {
    try {
      const noteToSave = editingInquiryNoteValue;
      setEditingInquiryNoteId(null);
      setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, notes: noteToSave } : inq));
      await fetch(`${API_BASE}/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteToSave })
      });
      fetchInquiries();
    } catch (e) {
      console.error(e);
      alert('Failed to save note');
    }
  };

  const handleDeleteInquiry = async (id, name) => {
    if (!window.confirm(`Delete inquiry for ${name}?`)) return;
    try {
      setInquiries(prev => prev.filter(inq => inq.id !== id));
      await fetch(`${API_BASE}/inquiries/${id}`, { method: 'DELETE' });
      fetchInquiries();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerExpiryCronWorker = async () => {
    try {
      setCronRunning(true);
      const res = await fetch(`${API_BASE}/automation/run-expiry-reminders`, { method: 'POST' });
      const json = await res.json();
      setCronRunning(false);
      if (json.success) {
        setCronResultModal(json);
        fetchExpiries();
        fetchDashboard();
      } else {
        alert('Worker run error: ' + (json.error || 'Unknown error'));
      }
    } catch (e) {
      setCronRunning(false);
      console.error(e);
      alert('Failed to connect to backend worker');
    }
  };

  const handleSendSingleTestReminder = async (memberId, memberName) => {
    try {
      const res = await fetch(`${API_BASE}/automation/test-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });
      const json = await res.json();
      if (json.success) {
        alert(`WhatsApp reminder triggered for ${memberName}!\nCheck your phone for the message.`);
        fetchExpiries();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to trigger reminder');
    }
  };

  const handleTriggerBirthdayCronWorker = async () => {
    try {
      setCronRunning(true);
      const res = await fetch(`${API_BASE}/automation/run-birthday-greetings`, { method: 'POST' });
      const json = await res.json();
      setCronRunning(false);
      if (json.success) {
        setCronResultModal({
          ...json,
          title: 'Birthday Greetings Worker Report'
        });
        fetchBirthdays();
        fetchCampaigns();
      } else {
        alert('Birthday worker error: ' + (json.error || 'Unknown error'));
      }
    } catch (e) {
      setCronRunning(false);
      console.error(e);
      alert('Failed to connect to backend worker');
    }
  };

  const handleSimulatePunch = async () => {
    try {
      const res = await fetch(`${API_BASE}/attendance/simulate-punch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulatorInput)
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        fetchAttendance();
      } else {
        alert(json.error);
      }
    } catch (e) {
      alert(e.message);
    }
  };



  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!showRenewModal) return;
    try {
      const res = await fetch(`${API_BASE}/members/${showRenewModal.member_id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(showRenewModal)
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setShowRenewModal(null);
        fetchAll();
      } else {
        alert(json.error);
      }
    } catch (e) {
      alert(e.message);
    }
  };



  const handleAddPtSubmit = async (e) => {
    e.preventDefault();
    if (!addPtForm.member_id) return;
    try {
      const res = await fetch(`${API_BASE}/members/${addPtForm.member_id}/add-pt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addPtForm)
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setShowAddPtModal(false);
        fetchAll();
      } else {
        alert(json.error || 'Failed to attach PT package');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSendBirthdayGreeting = async (member) => {
    try {
      const res = await fetch(`${API_BASE}/birthdays/send-greeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id, phone: member.phone, name: member.name })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        fetchCampaigns();
      }
    } catch (e) {
      alert(e.message);
    }
  };



  const handleDispatchCampaign = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/campaigns/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setShowCampaignModal(false);
        fetchCampaigns();
      }
    } catch (e) {
      alert(e.message);
    }
  };



  const handleImportExcel = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      const res = await fetch(`${API_BASE}/import/excel`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        setImportResult(json);
        fetchAll();
      } else {
        alert(json.error);
      }
    } catch (e) {
      alert(e.message);
    }
  };



  const openInvoiceForMember = (period) => {
    const member = members.find(m => m.id === period.member_id);
    const trainer = period.trainer_id ? trainers.find(t => t.id === period.trainer_id) : null;
    const invToken = 'tok_' + period.id;
    setShowInvoiceModal({
      invoice_number: 'GV-INV-' + Math.floor(100000 + Math.random() * 900000),
      date: period.start_date || new Date().toISOString().split('T')[0],
      member,
      period,
      trainer,
      payment_method: 'Online',
      amount: period.final_payable,
      public_token: invToken
    });
  };

  // ==========================================
  // VIEW: STANDALONE PUBLIC DIET PLAN FOR MEMBERS
  // ==========================================
  if (publicDietPlanToken) {
    return <StandaloneDietPlanView token={publicDietPlanToken} apiBase={API_BASE} />;
  }

  // ==========================================
  // VIEW: STANDALONE PUBLIC INVOICE FOR MEMBERS
  // ==========================================
  if (publicInvoiceToken && standaloneInvoice) {
    const inv = standaloneInvoice;
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ backgroundColor: '#fff', color: '#0F172A', width: '600px', borderRadius: '12px', padding: '36px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #E2E8F0', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--gv-red)' }}>GV FITNESS</h1>
              <p style={{ fontSize: '13px', color: '#64748B' }}>Transform Your Body &amp; Mind</p>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>GV Fitness Club, India</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '20px', fontWeight: 800 }}>OFFICIAL RECEIPT</span>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>#{inv.invoice?.invoice_number}</p>
              <p style={{ fontSize: '12px', color: '#64748B' }}>Date: {formatDate(inv.period?.start_date)}</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px' }}>
            <div>
              <p style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Member Name</p>
              <p style={{ fontWeight: 700, fontSize: '15px' }}>{inv.member?.name}</p>
              <p style={{ color: '#64748B', fontSize: '13px' }}>{inv.member?.phone}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Package</p>
              <p style={{ fontWeight: 700, fontSize: '15px' }}>{inv.period?.membership_type} ({inv.period?.duration_months} Months)</p>
              {inv.trainer && <p style={{ color: 'var(--gv-red)', fontSize: '13px', fontWeight: 600 }}>Trainer: {inv.trainer.name}</p>}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #CBD5E1', textAlign: 'left', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '8px 0' }}>Description</th>
                <th style={{ padding: '8px 0' }}>Period</th>
                <th style={{ padding: '8px 0', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>
                  {inv.period?.membership_type === 'PT' ? 'Personal Training' : 'General Gym Membership'}
                </td>
                <td style={{ padding: '12px 0', color: '#64748B' }}>
                  {formatDate(inv.period?.start_date)} to {formatDate(inv.period?.end_date)}
                </td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700 }}>
                  ₹{Number(inv.invoice?.total_amount).toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065F46', fontWeight: 700, fontSize: '14px' }}>
              <CheckCircle size={18} /> FULLY PAID ({inv.payment?.payment_method || 'Online'})
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#065F46' }}>
              ₹{Number(inv.invoice?.total_amount).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => window.print()}
              style={{
                background: '#0F172A',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Printer size={16} /> Print or Download PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: ADMIN LOGIN PAGE
  // ==========================================
  if (!authToken) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gv-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ backgroundColor: '#fff', width: '420px', borderRadius: '16px', padding: '36px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
            <div style={{ width: '44px', height: '44px', backgroundColor: 'var(--gv-red)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '20px' }}>
              GV
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>GV FITNESS</h1>
              <p style={{ fontSize: '12px', color: '#64748B' }}>Gym Administrator Sign In</p>
            </div>
          </div>

          {loginError && (
            <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Username</label>
              <input
                required
                type="text"
                value={loginForm.username}
                onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                placeholder="admin"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Password</label>
              <input
                required
                type="password"
                value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••••••"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', fontSize: '14px' }}
              />
            </div>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--gv-red)',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Lock size={16} /> Sign In to GV Console
            </button>
            <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', marginTop: '4px' }}>
              Default credentials: <strong>admin</strong> / <strong>gvfitness2026</strong>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN ADMIN CONSOLE (AUTHENTICATED)
  // ==========================================
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--gv-bg)' }}>
      {/* SIDEBAR NAVIGATION */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--gv-sidebar)',
        color: '#94A3B8',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        borderRight: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            width: '38px',
            height: '38px',
            backgroundColor: 'var(--gv-red)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: '#fff',
            fontSize: '18px',
            letterSpacing: '1px'
          }}>
            GV
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, lineHeight: 1.2 }}>GV FITNESS</h1>
            <span style={{ fontSize: '11px', color: '#64748B', letterSpacing: '0.5px' }}>ADMIN CONSOLE</span>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'regular_members', label: 'Regular Members', icon: Users },
            { id: 'pt_members', label: 'PT Members', icon: Dumbbell },
            { id: 'diet_plan', label: 'Diet Plan', icon: Utensils },
            { id: 'expiries', label: 'Membership Expiry', icon: Hourglass, badge: dashboardData?.expiringSoonCount },
            { id: 'birthdays', label: 'Birthdays', icon: Cake, badge: birthdays?.today?.length > 0 ? `${birthdays.today.length} today` : null },
            { id: 'inquiries', label: 'Inquiries & Leads', icon: UserPlus },
            { id: 'attendance', label: 'Live Attendance', icon: Fingerprint, badge: (liveAttendance.sessions?.length || liveAttendance.todayCount) > 0 ? `${liveAttendance.sessions?.length || liveAttendance.todayCount} today` : null },
            { id: 'expenses', label: 'Expenses', icon: Wallet },
            { id: 'trainers', label: 'Trainers', icon: UserCheck },
            { id: 'campaigns', label: 'WhatsApp & WATI', icon: MessageSquare },
            { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
            { id: 'settings', label: 'Settings & Hardware', icon: Settings }
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--gv-red)' : 'transparent',
                  color: isActive ? '#fff' : '#94A3B8',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge ? (
                  <span style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--gv-red)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* User / Sign Out Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: '12px' }}>
              AD
            </div>
            <div>
              <p style={{ color: '#F8FAFC', fontSize: '13px', fontWeight: 600 }}>GV Admin</p>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--gv-red)', fontSize: '11px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <LogOut size={11} /> Sign Out
              </button>
            </div>
          </div>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{
              background: '#1E293B',
              border: 'none',
              color: '#94A3B8',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        
        {/* ========================================== */}
        {/* VIEW: DASHBOARD */}
        {/* ========================================== */}
        {activeTab === 'dashboard' && dashboardData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <div>
                <h1 style={{ fontSize: '26px', fontWeight: 700 }}>Overview & Performance</h1>
                <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px', marginTop: '4px' }}>Cash-basis metrics, visual trends & live attendance</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowImportModal(true)}
                  style={{
                    backgroundColor: 'var(--gv-dark)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Upload size={15} /> Import Excel
                </button>
                <button
                  onClick={() => handleOpenAddMemberModal('GT')}
                  style={{
                    backgroundColor: 'var(--gv-red)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <Plus size={16} /> Add Member
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--gv-border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gv-text-muted)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Total Members</span>
                  <Users size={20} color="var(--gv-red)" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '12px' }}>{dashboardData.totalMembers}</div>
                <div style={{ fontSize: '12px', color: 'var(--gv-green)', marginTop: '4px', fontWeight: 600 }}>
                  {dashboardData.activeMembers} currently active
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--gv-border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gv-text-muted)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>GT vs PT Distribution</span>
                  <Dumbbell size={20} color="#3B82F6" />
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '12px', display: 'flex', gap: '16px' }}>
                  <span>{dashboardData.activeGT} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--gv-text-muted)' }}>GT</span></span>
                  <span>{dashboardData.activePT} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--gv-text-muted)' }}>PT</span></span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gv-text-muted)', marginTop: '6px' }}>
                  Co-existing memberships tracked
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--gv-border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gv-text-muted)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Revenue Collected</span>
                  <TrendingUp size={20} color="var(--gv-green)" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gv-green)', marginTop: '12px' }}>
                  ₹{Number(dashboardData.totalRevenue).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gv-text-muted)', marginTop: '4px' }}>
                  Cash collected (hand & bank)
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--gv-border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gv-text-muted)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Total Expenses</span>
                  <TrendingDown size={20} color="var(--gv-red)" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gv-red)', marginTop: '12px' }}>
                  ₹{Number(dashboardData.totalExpenses).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gv-text-muted)', marginTop: '4px' }}>
                  Rent, Salaries, Bills
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--gv-border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gv-text-muted)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Net Profit</span>
                  <Wallet size={20} color={dashboardData.netProfit >= 0 ? 'var(--gv-green)' : 'var(--gv-red)'} />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: dashboardData.netProfit >= 0 ? 'var(--gv-green)' : 'var(--gv-red)', marginTop: '12px' }}>
                  ₹{Number(dashboardData.netProfit).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gv-text-muted)', marginTop: '4px' }}>
                  Collected Revenue − Expenses
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--gv-border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gv-text-muted)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Today's Intake</span>
                  <Calendar size={20} color="var(--gv-amber)" />
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '12px' }}>
                  ₹{Number(dashboardData.todayCollection.total).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gv-text-muted)', marginTop: '4px', display: 'flex', gap: '8px' }}>
                  <span>Cash: ₹{dashboardData.todayCollection.cash}</span> • <span>Online: ₹{dashboardData.todayCollection.online}</span>
                </div>
              </div>
            </div>

            {/* VISUAL CHARTS SECTION */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--gv-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Financial Performance (Cash vs Expense)</h3>
                    <p style={{ fontSize: '12px', color: 'var(--gv-text-muted)' }}>Direct collected revenue against spent capital</p>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gv-green)', backgroundColor: 'var(--gv-green-subtle)', padding: '4px 8px', borderRadius: '6px' }}>
                    Cash Flow Positive
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '32px', paddingBottom: '16px', borderBottom: '1px solid var(--gv-border)' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--gv-green)' }}>
                      ₹{Number(dashboardData.totalRevenue).toLocaleString('en-IN')}
                    </span>
                    <div style={{ width: '48px', height: '85%', backgroundColor: 'var(--gv-green)', borderRadius: '8px 8px 0 0' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, marginTop: '8px' }}>Revenue</span>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--gv-red)' }}>
                      ₹{Number(dashboardData.totalExpenses).toLocaleString('en-IN')}
                    </span>
                    <div style={{ width: '48px', height: `${Math.min(100, Math.round((dashboardData.totalExpenses / (dashboardData.totalRevenue || 1)) * 85))}%`, backgroundColor: 'var(--gv-red)', borderRadius: '8px 8px 0 0' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, marginTop: '8px' }}>Expenses</span>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#3B82F6' }}>
                      ₹{Number(dashboardData.netProfit).toLocaleString('en-IN')}
                    </span>
                    <div style={{ width: '48px', height: `${Math.min(100, Math.round((Math.max(0, dashboardData.netProfit) / (dashboardData.totalRevenue || 1)) * 85))}%`, backgroundColor: '#3B82F6', borderRadius: '8px 8px 0 0' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, marginTop: '8px' }}>Net Profit</span>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--gv-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Membership Split</h3>
                  <p style={{ fontSize: '12px', color: 'var(--gv-text-muted)' }}>GT vs PT Active Capacity</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px 0' }}>
                  <svg width="140" height="140" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#E2E8F0" strokeWidth="6" />
                    <circle 
                      cx="21" cy="21" r="15.91549430918954" 
                      fill="transparent" 
                      stroke="var(--gv-red)" 
                      strokeWidth="6" 
                      strokeDasharray={`${(dashboardData.activeGT / (dashboardData.activeGT + dashboardData.activePT || 1)) * 100} ${100 - (dashboardData.activeGT / (dashboardData.activeGT + dashboardData.activePT || 1)) * 100}`} 
                      strokeDashoffset="25" 
                    />
                    <circle 
                      cx="21" cy="21" r="15.91549430918954" 
                      fill="transparent" 
                      stroke="#3B82F6" 
                      strokeWidth="6" 
                      strokeDasharray={`${(dashboardData.activePT / (dashboardData.activeGT + dashboardData.activePT || 1)) * 100} ${100 - (dashboardData.activePT / (dashboardData.activeGT + dashboardData.activePT || 1)) * 100}`} 
                      strokeDashoffset={`${25 - ((dashboardData.activeGT / (dashboardData.activeGT + dashboardData.activePT || 1)) * 100)}`} 
                    />
                    <text x="21" y="22" textAnchor="middle" dominantBaseline="middle" fontSize="6" fontWeight="bold" fill="currentColor">
                      {dashboardData.activeGT + dashboardData.activePT}
                    </text>
                  </svg>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--gv-red)' }} />
                    <span>GT ({dashboardData.activeGT})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                    <span>PT ({dashboardData.activePT})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Expiries */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--gv-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Upcoming Expiries (Next 7 Days)</h3>
                  <button onClick={() => setActiveTab('expiries')} style={{ background: 'none', border: 'none', color: 'var(--gv-red)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    View all <ArrowUpRight size={14} />
                  </button>
                </div>
                {expiries?.expiring7Days?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {expiries.expiring7Days.slice(0, 5).map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--gv-bg)', borderRadius: '8px' }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '14px' }}>{item.memberName}</p>
                          <p style={{ fontSize: '12px', color: 'var(--gv-text-muted)' }}>{item.phone} • {item.membership_type} ({item.duration_months} mo)</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gv-amber)', backgroundColor: 'var(--gv-amber-subtle)', padding: '4px 8px', borderRadius: '6px' }}>
                            Expires {formatDate(item.end_date)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px', textAlign: 'center', padding: '24px' }}>No memberships expiring in the next 7 days 🎉</p>
                )}
              </div>

              {/* Hardware / Simulator Widget */}
              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--gv-border)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Biometric Gateway (eSSL K90 Pro)</h3>
                <p style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginBottom: '16px' }}>
                  Listening on port <strong>8081</strong> (/iclock) for plain HTTP push requests.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--gv-bg)', borderRadius: '8px', fontSize: '13px' }}>
                    <span>Gateway Status</span>
                    <span style={{ color: 'var(--gv-green)', fontWeight: 600 }}>Active (Listening)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--gv-bg)', borderRadius: '8px', fontSize: '13px' }}>
                    <span>Today's Check-ins</span>
                    <span style={{ fontWeight: 700 }}>{liveAttendance.sessions?.length || liveAttendance.todayCount || 0}</span>
                  </div>
                  <button
                    onClick={() => setShowSimulatorModal(true)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: 'var(--gv-dark)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Launch Punch Simulator
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: REGULAR MEMBERS */}
        {/* ========================================== */}
        {activeTab === 'regular_members' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Regular Members</h1>
                <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px' }}>General Training (GT) memberships, plans and renewals</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={`${API_BASE}/export/members`}
                  download
                  style={{
                    backgroundColor: 'var(--gv-card-bg)',
                    color: 'var(--gv-text-main)',
                    border: '1px solid var(--gv-border)',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={15} /> Export Excel (.xlsx)
                </a>
                <button
                  onClick={() => handleOpenAddMemberModal('GT')}
                  style={{
                    backgroundColor: 'var(--gv-red)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Plus size={16} /> Add Member
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', gap: '16px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--gv-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    borderRadius: '8px',
                    border: '1px solid var(--gv-border)',
                    backgroundColor: 'var(--gv-card-bg)',
                    color: 'var(--gv-text-main)',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gv-border)', color: 'var(--gv-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '16px 20px' }}>Name</th>
                    <th style={{ padding: '16px 20px' }}>Phone</th>
                    <th style={{ padding: '16px 20px' }}>Level</th>
                    <th style={{ padding: '16px 20px' }}>GT Plan Validity</th>
                    <th style={{ padding: '16px 20px' }}>PT Overlay Status</th>
                    <th style={{ padding: '16px 20px' }}>Amount</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members
                    .filter(m => m.gtPeriod)
                    .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone.includes(searchQuery))
                    .map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--gv-border)' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontWeight: 600 }}>{m.name}</span>
                          {m.device_user_id && (
                            <span style={{ fontSize: '12px', color: 'var(--gv-text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                              (PIN: #{m.device_user_id})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--gv-text-muted)' }}>{m.phone}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: 'var(--gv-bg)' }}>
                            {m.fitness_level}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 600 }}>{formatDate(m.gtPeriod?.start_date)} to {formatDate(m.gtPeriod?.end_date)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--gv-text-muted)' }}>{m.gtPeriod?.duration_months} Months GT</div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          {m.isPtCurrentlyActive ? (
                            <div>
                              <span style={{ backgroundColor: 'var(--gv-red)', color: '#fff', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                🔥 PT Active ({m.trainerName || 'Trainer'})
                              </span>
                              <div style={{ fontSize: '11px', color: 'var(--gv-text-muted)', marginTop: '2px' }}>
                                PT till {formatDate(m.ptPeriod?.end_date)} (reverts to GT)
                              </div>
                            </div>
                          ) : m.ptPeriod && m.ptPeriod.status === 'Upcoming' ? (
                            <div>
                              <span style={{ backgroundColor: 'var(--gv-amber-subtle)', color: 'var(--gv-amber)', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                ⏳ PT Starts {formatDate(m.ptPeriod?.start_date)}
                              </span>
                              <div style={{ fontSize: '11px', color: 'var(--gv-text-muted)', marginTop: '2px' }}>Currently on GT</div>
                            </div>
                          ) : m.ptPeriod && m.ptPeriod.status === 'Expired' && m.isGtCurrentlyActive ? (
                            <div>
                              <span style={{ backgroundColor: 'var(--gv-green-subtle)', color: 'var(--gv-green)', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                ✅ Regular GT (PT Completed)
                              </span>
                              <div style={{ fontSize: '11px', color: 'var(--gv-text-muted)', marginTop: '2px' }}>{m.ptPeriod?.duration_months} Mo PT Finished</div>
                            </div>
                          ) : (
                            <span style={{ backgroundColor: 'var(--gv-bg)', color: 'var(--gv-text-muted)', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                              Regular GT
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>₹{m.gtPeriod?.final_payable}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setAddPtForm({
                                member_id: m.id,
                                memberName: m.name,
                                gt_end_date: m.gtPeriod?.end_date || '',
                                pt_trainer_id: trainers[0]?.id || '',
                                pt_duration: 3,
                                pt_start_date: new Date().toISOString().split('T')[0],
                                pt_amount: 15000,
                                pt_payment_method: 'Online',
                                notes: ''
                              });
                              setShowAddPtModal(true);
                            }}
                            title="Attach 3-Month or Custom PT Package"
                            style={{
                              backgroundColor: 'var(--gv-red)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontWeight: 600,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Dumbbell size={13} /> + Add PT
                          </button>
                          <button
                            onClick={() => openInvoiceForMember(m.gtPeriod)}
                            title="View / Share Invoice"
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid var(--gv-border)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              color: 'var(--gv-text-main)',
                              cursor: 'pointer'
                            }}
                          >
                            <Receipt size={14} />
                          </button>
                          <button
                            onClick={() => setShowRenewModal({
                              member_id: m.id,
                              memberName: m.name,
                              membership_type: 'GT',
                              duration_months: 1,
                              package_price: m.gtPeriod?.package_price || 1800,
                              discount_value: 0,
                              payment_method: 'Online'
                            })}
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid var(--gv-border)',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              color: 'var(--gv-text-main)',
                              fontWeight: 600,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <RotateCcw size={13} /> Renew
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Delete member ${m.name}? This will remove their profile and records.`)) {
                                const res = await fetch(`${API_BASE}/members/${m.id}`, { method: 'DELETE' });
                                const json = await res.json();
                                if (json.success) {
                                  alert(json.message);
                                  fetchAll();
                                }
                              }
                            }}
                            title="Delete Member"
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid var(--gv-border)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              color: 'var(--gv-red)',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: PT MEMBERS */}
        {/* ========================================== */}
        {activeTab === 'pt_members' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Personal Training Members</h1>
                <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px' }}>Dedicated PT packages, assigned trainers & monthly rates</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={`${API_BASE}/export/pt_members`}
                  download
                  style={{
                    backgroundColor: 'var(--gv-card-bg)',
                    color: 'var(--gv-text-main)',
                    border: '1px solid var(--gv-border)',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={15} /> Export PT Members (Excel)
                </a>
                <button
                  onClick={() => handleOpenAddMemberModal('PT')}
                  style={{
                    backgroundColor: 'var(--gv-red)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Plus size={16} /> Add PT Member
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setPtViewTab('active')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid var(--gv-border)',
                  backgroundColor: ptViewTab === 'active' ? 'var(--gv-dark)' : 'var(--gv-card-bg)',
                  color: ptViewTab === 'active' ? '#fff' : 'var(--gv-text-main)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🔥 Active PT Clients ({members.filter(m => m.ptPeriod && (m.isPtCurrentlyActive || m.ptPeriod.status === 'Upcoming')).length})
              </button>
              <button
                type="button"
                onClick={() => setPtViewTab('history')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid var(--gv-border)',
                  backgroundColor: ptViewTab === 'history' ? 'var(--gv-dark)' : 'var(--gv-card-bg)',
                  color: ptViewTab === 'history' ? '#fff' : 'var(--gv-text-main)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Completed / Past PT ({members.filter(m => m.ptPeriod && !m.isPtCurrentlyActive && m.ptPeriod.status === 'Expired').length})
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gv-border)', color: 'var(--gv-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '16px 20px' }}>Name</th>
                    <th style={{ padding: '16px 20px' }}>Phone</th>
                    <th style={{ padding: '16px 20px' }}>Trainer</th>
                    <th style={{ padding: '16px 20px' }}>Level</th>
                    <th style={{ padding: '16px 20px' }}>PT Duration & Dates</th>
                    <th style={{ padding: '16px 20px' }}>PT Fee</th>
                    <th style={{ padding: '16px 20px' }}>Live Status & GT Transition</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members
                    .filter(m => {
                      if (!m.ptPeriod) return false;
                      if (ptViewTab === 'active') {
                        // Those whose PT is finished are excluded from Active PT list
                        return m.isPtCurrentlyActive || m.ptPeriod.status === 'Upcoming';
                      } else {
                        // Completed / Past PT history
                        return !m.isPtCurrentlyActive && m.ptPeriod.status === 'Expired';
                      }
                    })
                    .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone.includes(searchQuery))
                    .map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--gv-border)' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontWeight: 600 }}>{m.name}</span>
                          {m.device_user_id && (
                            <span style={{ fontSize: '12px', color: 'var(--gv-text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                              (PIN: #{m.device_user_id})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--gv-text-muted)' }}>{m.phone}</td>
                        <td style={{ padding: '16px 20px', color: 'var(--gv-red)', fontWeight: 600 }}>{m.trainerName || 'Unassigned'}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: 'var(--gv-bg)' }}>
                            {m.fitness_level}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 600 }}>{formatDate(m.ptPeriod?.start_date)} to {formatDate(m.ptPeriod?.end_date)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--gv-text-muted)' }}>{m.ptPeriod?.duration_months} Months PT Package</div>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>₹{m.ptPeriod?.final_payable}</td>
                        <td style={{ padding: '16px 20px' }}>
                          {m.isPtCurrentlyActive ? (
                            <div>
                              <span style={{
                                backgroundColor: 'var(--gv-green)',
                                color: '#fff',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700
                              }}>
                                Active PT (with {m.trainerName})
                              </span>
                              <div style={{ fontSize: '11px', color: 'var(--gv-text-muted)', marginTop: '2px' }}>
                                Reverts to GT on {formatDate(m.ptPeriod?.end_date)} (GT valid till {formatDate(m.gtPeriod?.end_date || 'N/A')})
                              </div>
                            </div>
                          ) : m.ptPeriod?.status === 'Expired' && m.isGtCurrentlyActive ? (
                            <div>
                              <span style={{
                                backgroundColor: 'var(--gv-bg)',
                                border: '1px solid var(--gv-border)',
                                color: 'var(--gv-text-main)',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}>
                                PT Finished • Reverted to GT
                              </span>
                              <div style={{ fontSize: '11px', color: 'var(--gv-green)', fontWeight: 600, marginTop: '2px' }}>
                                Base GT Active till {formatDate(m.gtPeriod?.end_date)}
                              </div>
                            </div>
                          ) : m.ptPeriod?.status === 'Upcoming' ? (
                            <div>
                              <span style={{
                                backgroundColor: 'var(--gv-amber-subtle)',
                                color: 'var(--gv-amber)',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700
                              }}>
                                PT Starts {formatDate(m.ptPeriod?.start_date)}
                              </span>
                              <div style={{ fontSize: '11px', color: 'var(--gv-text-muted)', marginTop: '2px' }}>
                                Currently on Base GT
                              </div>
                            </div>
                          ) : (
                            <span style={{
                              backgroundColor: 'var(--gv-dark)',
                              color: '#fff',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}>
                              {m.ptPeriod?.status}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => openInvoiceForMember(m.ptPeriod)}
                            title="View / Share Invoice"
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid var(--gv-border)',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              color: 'var(--gv-text-main)',
                              cursor: 'pointer'
                            }}
                          >
                            <Receipt size={14} />
                          </button>
                          <button
                            onClick={() => setShowRenewModal({
                              member_id: m.id,
                              memberName: m.name,
                              membership_type: 'PT',
                              duration_months: 1,
                              package_price: m.ptPeriod?.package_price || 5000,
                              discount_value: 0,
                              payment_method: 'Online',
                              trainer_id: m.ptPeriod?.trainer_id
                            })}
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid var(--gv-border)',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              color: 'var(--gv-text-main)',
                              fontWeight: 600,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <RotateCcw size={13} /> Renew
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Delete member ${m.name}? This will remove their profile and records.`)) {
                                const res = await fetch(`${API_BASE}/members/${m.id}`, { method: 'DELETE' });
                                const json = await res.json();
                                if (json.success) {
                                  alert(json.message);
                                  fetchAll();
                                }
                              }
                            }}
                            title="Delete Member"
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid var(--gv-border)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              color: 'var(--gv-red)',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: EXPIRY MANAGEMENT */}
        {/* ========================================== */}
        {activeTab === 'expiries' && expiries && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Membership Expiry Workflow</h1>
                <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px' }}>Automated reminder tracking & WATI WhatsApp cron worker (11:00 AM IST daily)</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={`${API_BASE}/export/expiries`}
                  download
                  style={{
                    backgroundColor: 'var(--gv-card-bg)',
                    color: 'var(--gv-text-main)',
                    border: '1px solid var(--gv-border)',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={15} /> Export Expiries (Excel)
                </a>
                <button
                  onClick={handleTriggerExpiryCronWorker}
                  disabled={cronRunning}
                  style={{
                    backgroundColor: 'var(--gv-dark)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: cronRunning ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <Zap size={16} color="var(--gv-amber)" /> {cronRunning ? 'Running Worker...' : '⚡ Run Expiry Reminders Worker Now'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--gv-border)', paddingBottom: '12px', marginBottom: '20px' }}>
              {[
                { id: '7days', label: 'In 7 Days', count: expiries.expiring7Days.length },
                { id: '3days', label: 'In 3 Days', count: expiries.expiring3Days.length },
                { id: 'tomorrow', label: 'Tomorrow', count: expiries.expiringTomorrow.length },
                { id: 'today', label: 'Today', count: expiries.expiringToday.length },
                { id: 'expired', label: 'Already Expired', count: expiries.alreadyExpired.length },
                { id: 'renewed', label: 'Renewed History', count: expiries.renewed.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveExpirySubTab(tab.id)}
                  style={{
                    backgroundColor: activeExpirySubTab === tab.id ? 'var(--gv-dark)' : 'transparent',
                    color: activeExpirySubTab === tab.id ? '#fff' : 'var(--gv-text-main)',
                    border: '1px solid var(--gv-border)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    backgroundColor: activeExpirySubTab === tab.id ? 'var(--gv-red)' : 'var(--gv-bg)',
                    color: activeExpirySubTab === tab.id ? '#fff' : 'var(--gv-text-muted)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '11px'
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', padding: '20px' }}>
              {(() => {
                let items = [];
                if (activeExpirySubTab === '7days') items = expiries.expiring7Days;
                if (activeExpirySubTab === '3days') items = expiries.expiring3Days;
                if (activeExpirySubTab === 'tomorrow') items = expiries.expiringTomorrow;
                if (activeExpirySubTab === 'today') items = expiries.expiringToday;
                if (activeExpirySubTab === 'expired') items = expiries.alreadyExpired;
                if (activeExpirySubTab === 'renewed') items = expiries.renewed;

                if (items.length === 0) {
                  return <p style={{ color: 'var(--gv-text-muted)', textAlign: 'center', padding: '32px' }}>No members in this category.</p>;
                }

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--gv-border)', color: 'var(--gv-text-muted)', fontSize: '12px' }}>
                        <th style={{ padding: '12px' }}>Member</th>
                        <th style={{ padding: '12px' }}>Phone</th>
                        <th style={{ padding: '12px' }}>Type</th>
                        <th style={{ padding: '12px' }}>Expiry Date</th>
                        <th style={{ padding: '12px' }}>Plan Price</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--gv-border)' }}>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontWeight: 600 }}>{p.memberName}</span>
                            {p.device_user_id && (
                              <span style={{ fontSize: '11px', color: 'var(--gv-text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                                (PIN: #{p.device_user_id})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--gv-text-muted)' }}>{p.phone}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: p.membership_type === 'PT' ? 'var(--gv-red-subtle)' : 'var(--gv-bg)', color: p.membership_type === 'PT' ? 'var(--gv-red-text)' : 'inherit' }}>
                              {p.membership_type}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontWeight: 600, color: 'var(--gv-red)' }}>{formatDate(p.end_date)}</td>
                          <td style={{ padding: '12px' }}>₹{p.final_payable}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                onClick={() => handleSendSingleTestReminder(p.member_id, p.memberName)}
                                title="Send WhatsApp reminder now via WATI"
                                style={{
                                  backgroundColor: '#DCFCE7',
                                  color: '#15803D',
                                  border: '1px solid #86EFAC',
                                  borderRadius: '6px',
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <MessageSquare size={13} /> Send Reminder
                              </button>
                              <button
                                onClick={() => setShowRenewModal({
                                  member_id: p.member_id,
                                  memberName: p.memberName,
                                  membership_type: p.membership_type,
                                  duration_months: p.duration_months,
                                  package_price: p.package_price,
                                  discount_value: 0,
                                  payment_method: 'Online',
                                  trainer_id: p.trainer_id
                                })}
                                style={{
                                  backgroundColor: 'var(--gv-red)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Renew Now
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: BIRTHDAYS & AUTOMATED GREETINGS */}
        {/* ========================================== */}
        {activeTab === 'birthdays' && birthdays && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Birthday Greetings</h1>
                <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px' }}>Automated WATI WhatsApp wishes & manual greetings</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={birthdayFilterAll}
                    onChange={(e) => setBirthdayFilterAll(e.target.checked)}
                    style={{ accentColor: 'var(--gv-red)' }}
                  />
                  <span>Include Inactive / Expired Members</span>
                </label>
                <button
                  onClick={handleTriggerBirthdayCronWorker}
                  disabled={cronRunning}
                  style={{
                    backgroundColor: 'var(--gv-dark)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: cronRunning ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <Zap size={16} color="var(--gv-amber)" /> {cronRunning ? 'Running Worker...' : '⚡ Run Birthday Greetings Worker Now'}
                </button>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Cake size={22} color="var(--gv-red)" />
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Today's Birthdays</h3>
              </div>

              {birthdays.today.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {birthdays.today.map(m => (
                    <div key={m.id} style={{ border: '1px solid var(--gv-border)', padding: '16px', borderRadius: '8px', background: 'var(--gv-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: '15px' }}>{m.name}</h4>
                        <p style={{ fontSize: '12px', color: 'var(--gv-text-muted)' }}>{m.phone} • PIN #{m.device_user_id}</p>
                      </div>
                      <button
                        onClick={() => handleSendBirthdayGreeting(m)}
                        style={{
                          backgroundColor: 'var(--gv-red)',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Send size={13} /> Send Wish
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px' }}>No birthdays today. Upcoming birthdays in the next 7 days are listed below.</p>
              )}
            </div>

            <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Upcoming Birthdays (Next 7 Days)</h3>
              {birthdays.upcoming.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--gv-border)', color: 'var(--gv-text-muted)', fontSize: '12px' }}>
                      <th style={{ padding: '12px' }}>Name</th>
                      <th style={{ padding: '12px' }}>Phone</th>
                      <th style={{ padding: '12px' }}>Date of Birth</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {birthdays.upcoming.map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--gv-border)' }}>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontWeight: 600 }}>{m.name}</span>
                          {m.device_user_id && (
                            <span style={{ fontSize: '11px', color: 'var(--gv-text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                              (PIN: #{m.device_user_id})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', color: 'var(--gv-text-muted)' }}>{m.phone}</td>
                        <td style={{ padding: '12px' }}>{formatDate(m.dob)}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gv-green)' }}>{m.status}</span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleSendBirthdayGreeting(m)}
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid var(--gv-border)',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Send Early Wish
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px', textAlign: 'center', padding: '16px' }}>No birthdays in the next 7 days.</p>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: TRAINERS */}
        {/* ========================================== */}
        {activeTab === 'trainers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Trainers & Staff</h1>
                <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px' }}>Dynamic trainer management and client assignment</p>
              </div>
              <button
                onClick={() => setShowAddTrainerModal(true)}
                style={{
                  backgroundColor: 'var(--gv-red)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Plus size={16} /> Add Trainer
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {trainers.map(t => {
                const assignedPTCount = members.filter(m => m.ptPeriod?.trainer_id === t.id && m.isPtCurrentlyActive).length;
                return (
                  <div 
                    key={t.id} 
                    onClick={() => handleOpenTrainerClients(t)}
                    style={{ 
                      backgroundColor: 'var(--gv-card-bg)', 
                      border: '1px solid var(--gv-border)', 
                      borderRadius: '12px', 
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--gv-red)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--gv-border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--gv-red-subtle)', color: 'var(--gv-red-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                        {t.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: t.is_active ? 'var(--gv-green-subtle)' : 'var(--gv-bg)', color: t.is_active ? 'var(--gv-green)' : 'var(--gv-text-muted)' }}>
                        {t.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginTop: '14px' }}>{t.name}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginTop: '2px' }}>{t.phone || 'No phone recorded'}</p>
                    
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--gv-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--gv-text-muted)' }}>Active PT Clients</span>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gv-red)' }}>{assignedPTCount}</span>
                    </div>

                    <div style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--gv-bg)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--gv-red)'
                    }}>
                      <span>View Assigned Clients</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: WHATSAPP CAMPAIGNS */}
        {/* ========================================== */}
        {activeTab === 'campaigns' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Offers & WhatsApp Campaigns (WATI)</h1>
                <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px' }}>Broadcast promotional deals & track automated WATI message logs</p>
              </div>
              <button
                onClick={() => setShowCampaignModal(true)}
                style={{
                  backgroundColor: 'var(--gv-red)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Send size={16} /> Create Campaign
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gv-border)', fontWeight: 700 }}>
                Notification & Broadcast History
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gv-border)', color: 'var(--gv-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '16px 20px' }}>Time</th>
                    <th style={{ padding: '16px 20px' }}>Recipient Phone</th>
                    <th style={{ padding: '16px 20px' }}>Type</th>
                    <th style={{ padding: '16px 20px' }}>Template / Title</th>
                    <th style={{ padding: '16px 20px' }}>Status</th>
                    <th style={{ padding: '16px 20px' }}>WATI Message ID</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignLogs.length > 0 ? (
                    campaignLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--gv-border)' }}>
                        <td style={{ padding: '16px 20px', color: 'var(--gv-text-muted)' }}>{formatDateTime(log.sent_at)}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>{log.recipient_phone}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: 'var(--gv-bg)' }}>
                            {log.notification_type}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>{log.template_name}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ color: 'var(--gv-green)', fontWeight: 600, fontSize: '12px' }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--gv-text-muted)' }}>
                          {log.wati_message_id}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--gv-text-muted)' }}>
                        No messages sent yet. Create a campaign or trigger birthday greetings.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: REPORTS & EXPORT */}
        {/* ========================================== */}
        {activeTab === 'reports' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Data Export & Financial Reports</h1>
              <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px' }}>1-Click Excel (.xlsx) backups, rosters and financial accounting sheets</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {[
                { title: 'Members Master File', desc: 'All registered members with GT/PT expiries, level & device PINs', type: 'members' },
                { title: 'PT Members Roster', desc: 'Dedicated Personal Training members, assigned trainers, package rates & expiries', type: 'pt_members' },
                { title: 'Revenue & Collections Report', desc: 'Every invoice payment with cash/online method & dates', type: 'collections' },
                { title: 'Expenses & Overhead File', desc: 'Itemized expenditures by categories (Rent, Salaries, etc.)', type: 'expenses' },
                { title: 'Inquiries & Leads Dump', desc: 'All walk-in and social leads with completion status', type: 'inquiries' },
                { title: 'Daily Biometric Attendance', desc: 'Complete biometric check-in history, device timestamps & entry validity', type: 'attendance' },
                { title: 'Membership Expiry Audit', desc: 'Members expiring soon or already overdue for membership renewal', type: 'expiries' },
                { title: 'Diet Plan Health Profiles', desc: 'Adult members, body metrics (height, weight, BMI), and fitness levels', type: 'diet_members' }
              ].map(item => (
                <div key={item.type} style={{ backgroundColor: 'var(--gv-card-bg)', border: '1px solid var(--gv-border)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{item.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginTop: '8px' }}>{item.desc}</p>
                  </div>
                  <a
                    href={`${API_BASE}/export/${item.type}`}
                    download
                    style={{
                      marginTop: '20px',
                      backgroundColor: 'var(--gv-dark)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Download size={15} /> Export Excel (.xlsx)
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: SETTINGS & HARDWARE CONFIG */}
        {/* ========================================== */}
        {activeTab === 'settings' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Settings & Hardware Configuration</h1>
              <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px' }}>eSSL K90 Pro network setup, WATI API, and system preferences</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Fingerprint size={22} color="var(--gv-red)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>eSSL K90 Pro Machine Setup</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginBottom: '16px' }}>
                  Configure your physical fingerprint machine's cloud push settings to point to your Railway TCP proxy or local server:
                </p>

                <div style={{ backgroundColor: 'var(--gv-bg)', padding: '16px', borderRadius: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><strong>Device Menu:</strong> Menu &gt; Comm. &gt; Cloud Server Setting</div>
                  <div><strong>Server Address:</strong> (Your Railway TCP Proxy Hostname or Server IP)</div>
                  <div><strong>Server Port:</strong> 8081</div>
                  <div><strong>Enable Domain Name:</strong> ON (for Railway) / OFF (for local IP)</div>
                  <div><strong>Push Data:</strong> Yes</div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <button
                    onClick={() => setShowSimulatorModal(true)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: 'var(--gv-dark)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Test with Fingerprint Simulator
                  </button>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <MessageSquare size={22} color="var(--gv-green)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>WATI WhatsApp Business API</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginBottom: '16px' }}>
                  Credentials stored securely on backend in <code>.env</code>:
                </p>

                <div style={{ backgroundColor: 'var(--gv-bg)', padding: '16px', borderRadius: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><strong>Endpoint:</strong> <code>https://live-server-XXXX.wati.io</code></div>
                  <div><strong>Automated Triggers:</strong> 7-day, 3-day, 1-day, 0-day Expiry Reminders</div>
                  <div><strong>Daily Birthday Cron:</strong> Runs 10:00 AM IST</div>
                  <div><strong>Auto-Close Attendance:</strong> Runs 11:30 PM IST</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: EXPENSES */}
        {/* ========================================== */}
        {activeTab === 'expenses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Expenses & Financial Overview</h1>
                <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px' }}>Track daily expenditures and categorize costs</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={`${API_BASE}/export/expenses`}
                  download
                  style={{
                    backgroundColor: 'var(--gv-card-bg)',
                    color: 'var(--gv-text-main)',
                    border: '1px solid var(--gv-border)',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={15} /> Export Excel (.xlsx)
                </a>
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  style={{
                    backgroundColor: 'var(--gv-dark)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Plus size={16} /> Add Expense
                </button>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gv-border)', color: 'var(--gv-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '16px 20px' }}>Date</th>
                    <th style={{ padding: '16px 20px' }}>Expense Name</th>
                    <th style={{ padding: '16px 20px' }}>Category</th>
                    <th style={{ padding: '16px 20px' }}>Method</th>
                    <th style={{ padding: '16px 20px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--gv-border)' }}>
                      <td style={{ padding: '16px 20px', color: 'var(--gv-text-muted)' }}>{formatDate(e.expense_date)}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 600 }}>{e.title}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: 'var(--gv-bg)' }}>
                          {e.category_name}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>{e.payment_method}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--gv-red)' }}>₹{Number(e.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: INQUIRIES & LEADS */}
        {/* ========================================== */}
        {activeTab === 'inquiries' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Inquiries & Leads</h1>
                <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px' }}>Walk-ins, trials, and conversion tracking (with strikeout UX)</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={`${API_BASE}/export/inquiries`}
                  download
                  style={{
                    backgroundColor: 'var(--gv-card-bg)',
                    color: 'var(--gv-text-main)',
                    border: '1px solid var(--gv-border)',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={15} /> Export Excel (.xlsx)
                </a>
                <button
                  onClick={() => setShowAddInquiryModal(true)}
                  style={{
                    backgroundColor: 'var(--gv-dark)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Plus size={16} /> Add Inquiry
                </button>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gv-border)', color: 'var(--gv-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '16px 20px', width: '50px' }}>Done</th>
                    <th style={{ padding: '16px 20px' }}>Name</th>
                    <th style={{ padding: '16px 20px' }}>Phone</th>
                    <th style={{ padding: '16px 20px' }}>Interested In</th>
                    <th style={{ padding: '16px 20px' }}>Status (Click to change)</th>
                    <th style={{ padding: '16px 20px' }}>Note (Click to edit as per call)</th>
                    <th style={{ padding: '16px 20px' }}>Follow-up</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map(inq => {
                    const isDone = inq.is_completed;
                    const badge = getInquiryStatusBadge(inq.status);
                    return (
                      <tr 
                        key={inq.id} 
                        style={{ 
                          borderBottom: '1px solid var(--gv-border)',
                          opacity: isDone ? 0.45 : 1,
                          textDecoration: isDone ? 'line-through' : 'none',
                          backgroundColor: isDone ? 'rgba(0,0,0,0.02)' : 'transparent',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => toggleInquiryComplete(inq.id, isDone)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--gv-dark)' }}
                          />
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>{inq.name}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <a href={`tel:${inq.phone}`} style={{ color: 'inherit', textDecoration: 'none' }} title="Click to call">
                            {inq.phone}
                          </a>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'var(--gv-bg)' }}>
                            {inq.preferred_type}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <select
                              value={inq.status}
                              onChange={(e) => handleUpdateInquiryStatus(inq.id, e.target.value)}
                              title="Click to update lead status"
                              style={{
                                backgroundColor: badge.bg,
                                color: badge.text,
                                border: `1px solid ${badge.border}`,
                                padding: '4px 22px 4px 10px',
                                borderRadius: '14px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                outline: 'none',
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none'
                              }}
                            >
                              <option value="New">New</option>
                              <option value="Contacted">Contacted</option>
                              <option value="Follow-up Needed">Follow-up Needed</option>
                              <option value="Trial Scheduled">Trial Scheduled</option>
                              <option value="Converted">Converted</option>
                              <option value="Not Interested">Not Interested</option>
                            </select>
                            <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', color: badge.text }}>
                              ▼
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', maxWidth: '320px' }}>
                          {editingInquiryNoteId === inq.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                autoFocus
                                type="text"
                                value={editingInquiryNoteValue}
                                onChange={(e) => setEditingInquiryNoteValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineNote(inq.id);
                                  if (e.key === 'Escape') setEditingInquiryNoteId(null);
                                }}
                                placeholder="Type note after call..."
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '13px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--gv-red)',
                                  outline: 'none',
                                  width: '100%',
                                  backgroundColor: 'var(--gv-card-bg)',
                                  color: 'var(--gv-text-main)'
                                }}
                              />
                              <button
                                onClick={() => handleSaveInlineNote(inq.id)}
                                title="Save Note (Enter)"
                                style={{
                                  background: 'var(--gv-green)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '6px 8px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingInquiryNoteId(null)}
                                title="Cancel (Esc)"
                                style={{
                                  background: 'transparent',
                                  border: '1px solid var(--gv-border)',
                                  borderRadius: '4px',
                                  padding: '6px 8px',
                                  cursor: 'pointer',
                                  color: 'var(--gv-text-muted)',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingInquiryNoteId(inq.id);
                                setEditingInquiryNoteValue(inq.notes || '');
                              }}
                              title="Click to edit note after call"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                cursor: 'pointer',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px dashed transparent',
                                transition: 'all 0.2s',
                                minHeight: '32px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--gv-border)';
                                e.currentTarget.style.backgroundColor = 'var(--gv-bg)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'transparent';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <span style={{ color: inq.notes ? 'var(--gv-text-main)' : 'var(--gv-text-muted)', fontSize: '13px', fontStyle: inq.notes ? 'normal' : 'italic' }}>
                                {inq.notes || '+ Click to add call note'}
                              </span>
                              <Edit2 size={13} style={{ color: 'var(--gv-text-muted)', opacity: 0.6, flexShrink: 0 }} />
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--gv-text-muted)', fontSize: '13px' }}>
                          {formatDate(inq.follow_up_date)}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <a
                              href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${inq.name}, greetings from GV Fitness! We wanted to follow up regarding your fitness inquiry.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              title="WhatsApp Message"
                              style={{
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                                border: '1px solid #86EFAC',
                                borderRadius: '6px',
                                padding: '6px 8px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                textDecoration: 'none'
                              }}
                            >
                              <MessageSquare size={14} />
                            </a>
                            <button
                              onClick={() => handleDeleteInquiry(inq.id, inq.name)}
                              title="Delete Inquiry"
                              style={{
                                backgroundColor: 'transparent',
                                border: '1px solid var(--gv-border)',
                                borderRadius: '6px',
                                padding: '6px 8px',
                                color: 'var(--gv-text-muted)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: LIVE ATTENDANCE */}
        {/* ========================================== */}
        {activeTab === 'attendance' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Daily Biometric Attendance</h1>
                <p style={{ color: 'var(--gv-text-muted)', fontSize: '14px' }}>eSSL K90 Pro daily entry check-in log and membership status radar</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={`${API_BASE}/export/attendance`}
                  download
                  style={{
                    backgroundColor: 'var(--gv-card-bg)',
                    color: 'var(--gv-text-main)',
                    border: '1px solid var(--gv-border)',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={15} /> Export Punch Log (Excel)
                </a>
                <button
                  onClick={() => setShowSimulatorModal(true)}
                  style={{
                    backgroundColor: 'var(--gv-red)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Fingerprint size={16} /> Test Scan Simulator
                </button>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gv-border)', color: 'var(--gv-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '16px 20px' }}>Member</th>
                    <th style={{ padding: '16px 20px' }}>Device User ID</th>
                    <th style={{ padding: '16px 20px' }}>Check-in Time</th>
                    <th style={{ padding: '16px 20px' }}>Phone / WhatsApp</th>
                    <th style={{ padding: '16px 20px' }}>Membership Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(!liveAttendance.sessions || liveAttendance.sessions.length === 0) ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--gv-text-muted)' }}>
                        <Fingerprint size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <div style={{ fontWeight: 600 }}>No Check-ins Yet Today</div>
                        <div style={{ fontSize: '13px', marginTop: '4px' }}>
                          When members punch their fingerprint on the eSSL K90 Pro, their entry check-in will appear here.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    liveAttendance.sessions.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--gv-border)' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontWeight: 600 }}>{s.memberName}</span>
                          {s.deviceUserId && (
                            <span style={{ fontSize: '12px', color: 'var(--gv-text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                              (PIN: #{s.deviceUserId})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--gv-text-muted)' }}>PIN #{s.deviceUserId}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>{formatTime(s.check_in_time)}</td>
                        <td style={{ padding: '16px 20px', color: 'var(--gv-text-muted)' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <span>{s.phone || '—'}</span>
                            {s.phone && (
                              <a
                                href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '4px',
                                  borderRadius: '6px',
                                  backgroundColor: '#25D36620',
                                  color: '#25D366',
                                  textDecoration: 'none'
                                }}
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare size={14} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          {s.isExpiredWarning ? (
                            <span style={{ backgroundColor: 'var(--gv-red-subtle)', color: 'var(--gv-red-text)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={14} /> Expired ({formatDate(s.expiryDate)})
                            </span>
                          ) : (
                            <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--gv-green)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              Active Plan
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: DIET PLAN */}
        {/* ========================================== */}
        {activeTab === 'diet_plan' && (
          <ErrorBoundary>
            <DietPlanView
              members={members}
              onRefreshMembers={fetchAll}
              apiBase={API_BASE}
              formatDate={formatDate}
            />
          </ErrorBoundary>
        )}

      </main>

      {/* ========================================== */}
      {/* MODAL: ADD MEMBER */}
      {/* ========================================== */}
      {showAddMemberModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '540px', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Register New Member</h2>
            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Full Name</label>
                <input required type="text" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Phone Number</label>
                  <input required type="text" value={newMember.phone} placeholder="+91..." onChange={e => setNewMember({ ...newMember, phone: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Date of Birth</label>
                  <input type="date" value={newMember.dob} onChange={e => setNewMember({ ...newMember, dob: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Gender (Optional)</label>
                  <select value={newMember.gender || 'Any'} onChange={e => setNewMember({ ...newMember, gender: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}>
                    <option value="Any">Any Gender (Default)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Fitness Level</label>
                  <select value={newMember.fitness_level} onChange={e => setNewMember({ ...newMember, fitness_level: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advance">Advance</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Height (cm)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="50" 
                    max="250" 
                    placeholder="e.g. 175" 
                    value={newMember.height_cm || ''} 
                    onChange={e => setNewMember({ ...newMember, height_cm: e.target.value })} 
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Weight (kg)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="20" 
                    max="300" 
                    placeholder="e.g. 75" 
                    value={newMember.weight_kg || ''} 
                    onChange={e => setNewMember({ ...newMember, weight_kg: e.target.value })} 
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} 
                  />
                </div>
              </div>

              {/* BMI & Age Live Calculation Notice */}
              {(() => {
                const bmi = calculateBmi(newMember.height_cm, newMember.weight_kg);
                const age = calculateAge(newMember.dob);
                const isUnder18 = age !== null && age < 18;

                if (!bmi && !isUnder18) return null;

                return (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: isUnder18 ? '#FFFBEB' : '#F0FDF4',
                    border: `1px solid ${isUnder18 ? '#FCD34D' : '#86EFAC'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '12px'
                  }}>
                    {bmi && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: '#166534' }}>Calculated BMI:</span>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: '#15803D' }}>{bmi} kg/m²</span>
                      </div>
                    )}
                    {isUnder18 && (
                      <div style={{ color: '#B45309', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} />
                        Member is under 18 ({age} yrs). Adult BMI diet plans will not be automatically generated.
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Device Fingerprint PIN</label>
                  <span style={{ fontSize: '11px', color: 'var(--gv-green)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={11} /> Auto-Locked
                  </span>
                </div>
                <input 
                  type="number" 
                  readOnly
                  tabIndex="-1"
                  required
                  value={newMember.device_user_id} 
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--gv-border)', 
                    marginTop: '4px', 
                    fontWeight: 800, 
                    fontSize: '15px', 
                    color: 'var(--gv-red)',
                    backgroundColor: 'var(--gv-bg)',
                    cursor: 'not-allowed',
                    userSelect: 'none'
                  }} 
                />
                <div style={{ fontSize: '11px', color: 'var(--gv-text-muted)', marginTop: '3px' }}>
                  System auto-assigns next sequential PIN #{newMember.device_user_id}. Custom PINs are disabled.
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Membership Type</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {['GT', 'PT', 'BOTH'].map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setNewMember({ ...newMember, membership_type: t })}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--gv-border)',
                        background: newMember.membership_type === t ? 'var(--gv-dark)' : 'transparent',
                        color: newMember.membership_type === t ? '#fff' : 'inherit',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {t === 'BOTH' ? 'GT + PT (Combined)' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Combined Membership Explanation Banner */}
              {newMember.membership_type === 'BOTH' && (
                <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', color: '#1E40AF', lineHeight: 1.5 }}>
                  <strong>💡 Combined GT + PT Overlay:</strong><br />
                  Member gets full 12-Month Gym Access (GT), with Personal Training for selected months (e.g. 3 Months). The PT can start on joining date, mid-way, or for the final months. While PT is active, the member is <strong>PT Active</strong> with their trainer; once PT finishes, they automatically continue on <strong>regular GT</strong> for the remainder of their 12 months!
                </div>
              )}

              {/* GT Section */}
              {(newMember.membership_type === 'GT' || newMember.membership_type === 'BOTH') && (
                <div style={{ padding: '14px', background: 'var(--gv-bg)', borderRadius: '8px', border: '1px solid var(--gv-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gv-dark)' }}>🏋️ General Gym Membership (GT)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>GT Duration (Months)</label>
                      <input type="number" value={newMember.gt_duration} onChange={e => setNewMember({ ...newMember, gt_duration: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gv-border)', marginTop: '2px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>GT Start Date</label>
                      <input type="date" value={newMember.gt_start_date} onChange={e => setNewMember({ ...newMember, gt_start_date: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gv-border)', marginTop: '2px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>GT Amount (₹)</label>
                      <input type="number" value={newMember.gt_amount} onChange={e => setNewMember({ ...newMember, gt_amount: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gv-border)', marginTop: '2px' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* PT Section */}
              {(newMember.membership_type === 'PT' || newMember.membership_type === 'BOTH') && (
                <div style={{ padding: '14px', background: 'var(--gv-bg)', borderRadius: '8px', border: '1px solid var(--gv-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gv-red)' }}>
                    🥊 Personal Training (PT) {newMember.membership_type === 'BOTH' ? 'Add-on / Overlay' : 'Package'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>Assigned Trainer</label>
                      <select required value={newMember.pt_trainer_id} onChange={e => setNewMember({ ...newMember, pt_trainer_id: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gv-border)', marginTop: '2px' }}>
                        <option value="">Select Trainer</option>
                        {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>PT Duration (Months)</label>
                      <input type="number" min="1" value={newMember.pt_duration} onChange={e => setNewMember({ ...newMember, pt_duration: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gv-border)', marginTop: '2px' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>PT Start Date (Start, Mid, or Last 3 Months)</label>
                      <input type="date" value={newMember.pt_start_date} onChange={e => setNewMember({ ...newMember, pt_start_date: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gv-border)', marginTop: '2px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>Total PT Package Fee (₹)</label>
                      <input type="number" value={newMember.pt_amount} onChange={e => setNewMember({ ...newMember, pt_amount: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gv-border)', marginTop: '2px' }} />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddMemberModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--gv-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--gv-red)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ATTACH PT PACKAGE TO EXISTING MEMBER */}
      {/* ========================================== */}
      {showAddPtModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '480px', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Attach Personal Training (PT) Package</h2>
            <p style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginBottom: '14px' }}>
              Adding PT for: <strong>{addPtForm.memberName}</strong><br />
              <span style={{ fontSize: '12px', color: 'var(--gv-green)', fontWeight: 600 }}>Current Base GT Valid till {formatDate(addPtForm.gt_end_date)}</span>
            </p>

            <form onSubmit={handleAddPtSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Assign Trainer</label>
                <select
                  required
                  value={addPtForm.pt_trainer_id}
                  onChange={e => setAddPtForm({ ...addPtForm, pt_trainer_id: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                >
                  <option value="">Select Trainer</option>
                  {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>PT Duration (Months)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={addPtForm.pt_duration}
                    onChange={e => setAddPtForm({ ...addPtForm, pt_duration: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>PT Start Date</label>
                  <input
                    required
                    type="date"
                    value={addPtForm.pt_start_date}
                    onChange={e => setAddPtForm({ ...addPtForm, pt_start_date: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Total PT Fee (₹)</label>
                  <input
                    required
                    type="number"
                    value={addPtForm.pt_amount}
                    onChange={e => setAddPtForm({ ...addPtForm, pt_amount: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Payment Method</label>
                  <select
                    value={addPtForm.pt_payment_method}
                    onChange={e => setAddPtForm({ ...addPtForm, pt_payment_method: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                  >
                    <option value="Online">Online (UPI / Card)</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
                ℹ️ The member will be <strong>PT Active</strong> for {addPtForm.pt_duration} months from {formatDate(addPtForm.pt_start_date)}. Once completed, they will automatically continue as <strong>GT Active</strong> for the remainder of their gym membership!
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddPtModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--gv-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--gv-red)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Confirm PT Package</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: DYNAMIC PRINTABLE WEB INVOICE */}
      {/* ========================================== */}
      {showInvoiceModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#fff', color: '#0F172A', width: '580px', borderRadius: '12px', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--gv-red)', letterSpacing: '0.5px' }}>GV FITNESS</h2>
                <p style={{ fontSize: '12px', color: '#64748B' }}>Transform Your Body &amp; Mind</p>
                <p style={{ fontSize: '11px', color: '#64748B' }}>Club Address: GV Fitness Club, India</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>RECEIPT / INVOICE</span>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>#{showInvoiceModal.invoice_number}</p>
                <p style={{ fontSize: '12px', color: '#64748B' }}>Date: {formatDate(showInvoiceModal.date)}</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '13px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px' }}>
              <div>
                <p style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Billed To</p>
                <p style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>{showInvoiceModal.member?.name}</p>
                <p style={{ color: '#64748B' }}>{showInvoiceModal.member?.phone}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Membership Details</p>
                <p style={{ fontWeight: 700, marginTop: '2px' }}>{showInvoiceModal.period?.membership_type} ({showInvoiceModal.period?.duration_months} Months)</p>
                {showInvoiceModal.trainer && <p style={{ color: 'var(--gv-red)', fontWeight: 600 }}>Trainer: {showInvoiceModal.trainer.name}</p>}
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #CBD5E1', textAlign: 'left', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 0' }}>Description</th>
                  <th style={{ padding: '8px 0' }}>Period</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px 0', fontWeight: 600 }}>
                    {showInvoiceModal.period?.membership_type === 'PT' ? 'Personal Training Package' : 'General Training (Gym Access)'}
                  </td>
                  <td style={{ padding: '12px 0', color: '#64748B' }}>
                    {formatDate(showInvoiceModal.period?.start_date)} to {formatDate(showInvoiceModal.period?.end_date)}
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700 }}>
                    ₹{Number(showInvoiceModal.amount).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#065F46', fontWeight: 700, fontSize: '13px' }}>
                <CheckCircle size={16} /> FULLY PAID ({showInvoiceModal.payment_method})
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#065F46' }}>
                ₹{Number(showInvoiceModal.amount).toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/?invoice=${showInvoiceModal.public_token || 'tok_yash_gt_1800'}`;
                  navigator.clipboard.writeText(shareUrl);
                  alert(`Direct member link copied:\n${shareUrl}`);
                }}
                style={{
                  background: 'none',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Copy size={13} /> Copy Direct Member Link
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_BASE}/invoices/send-whatsapp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          phone: showInvoiceModal.member?.phone,
                          memberName: showInvoiceModal.member?.name,
                          invoiceNumber: showInvoiceModal.invoice_number,
                          amount: showInvoiceModal.amount,
                          publicToken: showInvoiceModal.public_token
                        })
                      });
                      const json = await res.json();
                      if (json.success) alert(json.message);
                      else alert('Error: ' + json.error);
                    } catch (e) {
                      alert('Failed to send invoice');
                    }
                  }}
                  style={{
                    backgroundColor: '#15803D',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <MessageSquare size={13} /> Send via WhatsApp
                </button>
                <button
                  onClick={() => setShowInvoiceModal(null)}
                  style={{
                    background: 'none',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  style={{
                    background: '#0F172A',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EXCEL IMPORT */}
      {/* ========================================== */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '480px', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Import Members from Excel</h2>
            <p style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginBottom: '16px' }}>
              Upload your <code>.xlsx</code> or <code>.csv</code> spreadsheet. Columns supported: Name, Phone, Level, Amount, Start Date, End Date, PIN.
            </p>
            <form onSubmit={handleImportExcel} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                required
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={e => setImportFile(e.target.files[0])}
                style={{ padding: '8px', border: '1px dashed var(--gv-border)', borderRadius: '6px' }}
              />

              {importResult && (
                <div style={{ padding: '12px', backgroundColor: 'var(--gv-green-subtle)', color: 'var(--gv-green)', borderRadius: '6px', fontSize: '13px' }}>
                  {importResult.message}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => { setShowImportModal(false); setImportResult(null); }} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--gv-border)', background: 'transparent', cursor: 'pointer' }}>Close</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--gv-dark)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Upload &amp; Import</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: CREATE CAMPAIGN */}
      {/* ========================================== */}
      {showCampaignModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '480px', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Create WhatsApp Offer Campaign</h2>
            <form onSubmit={handleDispatchCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Campaign Title</label>
                <input required type="text" value={campaignData.title} onChange={e => setCampaignData({ ...campaignData, title: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Target Audience</label>
                <select value={campaignData.targetAudience} onChange={e => setCampaignData({ ...campaignData, targetAudience: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}>
                  <option value="ALL">All Registered Members</option>
                  <option value="ACTIVE">Active Members Only</option>
                  <option value="EXPIRED">Expired Members (Win-Back)</option>
                  <option value="PT">Personal Training Members</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Offer Message</label>
                <textarea rows={4} value={campaignData.message} onChange={e => setCampaignData({ ...campaignData, message: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowCampaignModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--gv-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--gv-red)', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={14} /> Send Campaign (WATI)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ADD TRAINER */}
      {/* ========================================== */}
      {showAddTrainerModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '420px', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Add Trainer</h2>
            <form onSubmit={handleAddTrainer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Trainer Name</label>
                <input required type="text" placeholder="e.g. Saurabh Sir" value={newTrainer.name} onChange={e => setNewTrainer({ ...newTrainer, name: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Phone</label>
                <input type="text" placeholder="+91..." value={newTrainer.phone} onChange={e => setNewTrainer({ ...newTrainer, phone: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddTrainerModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--gv-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--gv-dark)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Trainer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: TRAINER ASSIGNED CLIENTS */}
      {/* ========================================== */}
      {selectedTrainerDetails && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 110,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedTrainerDetails(null);
              setTrainerClientsData(null);
            }
          }}
        >
          <div style={{ 
            backgroundColor: 'var(--gv-card-bg)', 
            width: '800px', 
            maxWidth: '96vw', 
            maxHeight: '90vh', 
            borderRadius: '16px', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--gv-border)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid var(--gv-border)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: 'var(--gv-card-bg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--gv-red-subtle)', 
                  color: 'var(--gv-red-text)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 800, 
                  fontSize: '16px' 
                }}>
                  {selectedTrainerDetails.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                      {selectedTrainerDetails.name}
                    </h2>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      background: selectedTrainerDetails.is_active ? 'var(--gv-green-subtle)' : 'var(--gv-bg)', 
                      color: selectedTrainerDetails.is_active ? 'var(--gv-green)' : 'var(--gv-text-muted)' 
                    }}>
                      {selectedTrainerDetails.is_active ? 'ACTIVE TRAINER' : 'INACTIVE'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '13px', color: 'var(--gv-text-muted)' }}>
                    <span>{selectedTrainerDetails.phone || 'No phone recorded'}</span>
                    {selectedTrainerDetails.phone && (
                      <a 
                        href={`https://wa.me/${selectedTrainerDetails.phone.replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: '#25D366', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <MessageSquare size={13} /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => {
                  setSelectedTrainerDetails(null);
                  setTrainerClientsData(null);
                }} 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--gv-text-muted)', 
                  cursor: 'pointer', 
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '12px', 
              padding: '16px 24px', 
              backgroundColor: 'var(--gv-bg)',
              borderBottom: '1px solid var(--gv-border)'
            }}>
              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--gv-border)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gv-text-muted)', textTransform: 'uppercase' }}>Active Clients</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gv-green)', marginTop: '2px' }}>
                  {trainerClientsData?.activeCount || 0}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--gv-border)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gv-text-muted)', textTransform: 'uppercase' }}>Upcoming</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                  {trainerClientsData?.upcomingCount || 0}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--gv-border)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gv-text-muted)', textTransform: 'uppercase' }}>Completed / Past</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gv-text-muted)', marginTop: '2px' }}>
                  {trainerClientsData?.expiredCount || 0}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--gv-card-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--gv-border)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gv-text-muted)', textTransform: 'uppercase' }}>Total Assigned</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gv-red)', marginTop: '2px' }}>
                  {trainerClientsData?.totalCount || 0}
                </div>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div style={{ 
              padding: '14px 24px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              gap: '12px',
              borderBottom: '1px solid var(--gv-border)',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setTrainerClientsFilter('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--gv-border)',
                    backgroundColor: trainerClientsFilter === 'all' ? 'var(--gv-dark)' : 'transparent',
                    color: trainerClientsFilter === 'all' ? '#fff' : 'var(--gv-text-muted)'
                  }}
                >
                  All ({trainerClientsData?.totalCount || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setTrainerClientsFilter('active')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--gv-border)',
                    backgroundColor: trainerClientsFilter === 'active' ? 'var(--gv-green)' : 'transparent',
                    color: trainerClientsFilter === 'active' ? '#fff' : 'var(--gv-text-muted)'
                  }}
                >
                  🟢 Active ({trainerClientsData?.activeCount || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setTrainerClientsFilter('upcoming')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--gv-border)',
                    backgroundColor: trainerClientsFilter === 'upcoming' ? '#f59e0b' : 'transparent',
                    color: trainerClientsFilter === 'upcoming' ? '#fff' : 'var(--gv-text-muted)'
                  }}
                >
                  🟡 Upcoming ({trainerClientsData?.upcomingCount || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setTrainerClientsFilter('expired')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--gv-border)',
                    backgroundColor: trainerClientsFilter === 'expired' ? 'var(--gv-dark)' : 'transparent',
                    color: trainerClientsFilter === 'expired' ? '#fff' : 'var(--gv-text-muted)'
                  }}
                >
                  Past ({trainerClientsData?.expiredCount || 0})
                </button>
              </div>

              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--gv-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search client..."
                  value={trainerClientsSearch}
                  onChange={(e) => setTrainerClientsSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    border: '1px solid var(--gv-border)',
                    backgroundColor: 'var(--gv-bg)'
                  }}
                />
              </div>
            </div>

            {/* Client List Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {trainerClientsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gv-text-muted)' }}>
                  Loading assigned clients...
                </div>
              ) : (() => {
                const clients = (trainerClientsData?.clients || []).filter(c => {
                  if (trainerClientsFilter === 'active') return c.periodStatus === 'Active';
                  if (trainerClientsFilter === 'upcoming') return c.periodStatus === 'Upcoming';
                  if (trainerClientsFilter === 'expired') return c.periodStatus === 'Expired' || c.periodStatus === 'Renewed';
                  return true;
                }).filter(c => {
                  if (!trainerClientsSearch) return true;
                  const q = trainerClientsSearch.toLowerCase();
                  return (c.memberName || '').toLowerCase().includes(q) || (c.memberPhone || '').includes(q) || String(c.devicePin || '').includes(q);
                });

                if (clients.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--gv-bg)', color: 'var(--gv-text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                        <Users size={28} />
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>
                        {trainerClientsData?.totalCount === 0 
                          ? `No Clients Currently Assigned to ${selectedTrainerDetails.name}`
                          : 'No clients match this filter'}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--gv-text-muted)', margin: 0, maxWidth: '420px', marginInline: 'auto' }}>
                        {trainerClientsData?.totalCount === 0
                          ? `When registering a new member or attaching Personal Training, select ${selectedTrainerDetails.name} as their trainer.`
                          : 'Try changing the filter tab above or clearing your search query.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {clients.map(c => (
                      <div 
                        key={c.periodId} 
                        style={{ 
                          backgroundColor: 'var(--gv-bg)', 
                          borderRadius: '12px', 
                          border: '1px solid var(--gv-border)', 
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                          <div style={{ 
                            width: '42px', 
                            height: '42px', 
                            borderRadius: '50%', 
                            backgroundColor: c.periodStatus === 'Active' ? 'var(--gv-red-subtle)' : 'var(--gv-border)', 
                            color: c.periodStatus === 'Active' ? 'var(--gv-red-text)' : 'var(--gv-text-muted)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 700, 
                            fontSize: '13px' 
                          }}>
                            {c.memberName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '15px' }}>{c.memberName}</span>
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--gv-card-bg)', border: '1px solid var(--gv-border)', color: 'var(--gv-text-muted)' }}>
                                PIN #{c.devicePin}
                              </span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{c.memberPhone}</span>
                              {c.memberPhone && (
                                <a 
                                  href={`https://wa.me/${c.memberPhone.replace(/[^0-9]/g, '')}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{ color: '#25D366', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600, fontSize: '12px' }}
                                >
                                  <MessageSquare size={12} /> Chat
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gv-text)' }}>
                            {c.durationMonths} Months {c.membershipType === 'PT' ? 'Personal Training' : c.membershipType}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--gv-text-muted)', marginTop: '2px' }}>
                            {formatDate(c.startDate)} → {formatDate(c.endDate)}
                          </div>
                          {c.notes && (
                            <div style={{ fontSize: '11px', color: 'var(--gv-text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                              {c.notes}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right', minWidth: '130px' }}>
                          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--gv-text)' }}>
                            ₹{c.amount}
                          </div>
                          <div style={{ marginTop: '4px' }}>
                            {c.periodStatus === 'Active' && (
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'var(--gv-green-subtle)', color: 'var(--gv-green)' }}>
                                🟢 ACTIVE PT
                              </span>
                            )}
                            {c.periodStatus === 'Upcoming' && (
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#fef3c7', color: '#b45309' }}>
                                🟡 UPCOMING
                              </span>
                            )}
                            {c.periodStatus === 'Expired' && (
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'var(--gv-border)', color: 'var(--gv-text-muted)' }}>
                                EXPIRED
                              </span>
                            )}
                            {c.periodStatus === 'Renewed' && (
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'var(--gv-border)', color: 'var(--gv-text-muted)' }}>
                                RENEWED
                              </span>
                            )}
                          </div>
                        </div>

                        {c.invoiceToken && (
                          <button
                            type="button"
                            onClick={() => setShowInvoiceModal(c.invoiceToken)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--gv-border)',
                              backgroundColor: 'var(--gv-card-bg)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                            title="View Receipt"
                          >
                            <Receipt size={13} /> Receipt
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{ 
              padding: '16px 24px', 
              borderTop: '1px solid var(--gv-border)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: 'var(--gv-card-bg)'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--gv-text-muted)' }}>
                Showing assigned clients for <strong>{selectedTrainerDetails.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedTrainerDetails(null);
                  setTrainerClientsData(null);
                }}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--gv-dark)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: BIOMETRIC SCAN SIMULATOR */}
      {/* ========================================== */}
      {showSimulatorModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '420px', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Fingerprint Punch Simulator</h2>
            <p style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginBottom: '16px' }}>
              Simulates a member scanning their thumb on the eSSL K90 Pro machine.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Device User ID (PIN)</label>
                <select
                  value={simulatorInput.deviceUserId}
                  onChange={e => setSimulatorInput({ ...simulatorInput, deviceUserId: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                >
                  {members.map(m => (
                    <option key={m.id} value={m.device_user_id}>
                      PIN #{m.device_user_id} — {m.name} ({m.status})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button onClick={() => setShowSimulatorModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--gv-border)', background: 'transparent', cursor: 'pointer' }}>Close</button>
                <button onClick={handleSimulatePunch} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--gv-dark)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Simulate Thumb Scan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: RENEWAL */}
      {/* ========================================== */}
      {showRenewModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '450px', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Renew Membership</h2>
            <p style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginBottom: '16px' }}>
              Renewing for: <strong>{showRenewModal.memberName}</strong> ({showRenewModal.membership_type})
            </p>
            <form onSubmit={handleRenewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Duration (Months)</label>
                <input
                  type="number"
                  value={showRenewModal.duration_months}
                  onChange={e => setShowRenewModal({ ...showRenewModal, duration_months: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Package Amount (₹)</label>
                <input
                  type="number"
                  value={showRenewModal.package_price}
                  onChange={e => setShowRenewModal({ ...showRenewModal, package_price: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Payment Method</label>
                <select
                  value={showRenewModal.payment_method}
                  onChange={e => setShowRenewModal({ ...showRenewModal, payment_method: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                >
                  <option value="Online">Online (UPI / Bank)</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowRenewModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--gv-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--gv-red)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Confirm Renewal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ADD EXPENSE */}
      {/* ========================================== */}
      {showAddExpenseModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '450px', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Record New Expense</h2>
            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Title / Description</label>
                <input required type="text" placeholder="e.g. Electricity Bill, Cleaning" value={newExpense.title} onChange={e => setNewExpense({ ...newExpense, title: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Category</label>
                <select value={newExpense.category_name} onChange={e => setNewExpense({ ...newExpense, category_name: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}>
                  {expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Amount (₹)</label>
                <input required type="number" placeholder="₹" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Payment Method</label>
                <select value={newExpense.payment_method} onChange={e => setNewExpense({ ...newExpense, payment_method: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}>
                  <option value="Online">Online</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddExpenseModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--gv-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--gv-dark)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ADD INQUIRY (WITH FIRST CALL LOG INFO) */}
      {/* ========================================== */}
      {showAddInquiryModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '480px', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Add Lead / Inquiry</h2>
            <p style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginBottom: '16px' }}>
              Add lead details and initial call conversation. Subsequent call notes can be changed directly on the row.
            </p>
            <form onSubmit={handleAddInquiry} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Full Name</label>
                <input required type="text" placeholder="e.g. Rahul Sharma" value={newInquiry.name} onChange={e => setNewInquiry({ ...newInquiry, name: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Phone Number</label>
                <input required type="text" placeholder="+91..." value={newInquiry.phone} onChange={e => setNewInquiry({ ...newInquiry, phone: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Interested In</label>
                  <select value={newInquiry.preferred_type} onChange={e => setNewInquiry({ ...newInquiry, preferred_type: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}>
                    <option value="GT">GT (General Training)</option>
                    <option value="PT">PT (Personal Training)</option>
                    <option value="BOTH">GT + PT Combo</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Lead Source</label>
                  <select value={newInquiry.source} onChange={e => setNewInquiry({ ...newInquiry, source: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Direct Call">Direct Call</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Referral">Referral</option>
                    <option value="Google">Google / Maps</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Initial Call Status</label>
                  <select value={newInquiry.status} onChange={e => setNewInquiry({ ...newInquiry, status: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Follow-up Needed">Follow-up Needed</option>
                    <option value="Trial Scheduled">Trial Scheduled</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Follow-up Date (Optional)</label>
                  <input type="date" value={newInquiry.follow_up_date} onChange={e => setNewInquiry({ ...newInquiry, follow_up_date: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Call Notes / Initial Discussion</label>
                <textarea rows={3} placeholder="e.g. Spoke on call, interested in 12M GT, trial booked for Monday 6 PM" value={newInquiry.notes} onChange={e => setNewInquiry({ ...newInquiry, notes: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddInquiryModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--gv-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--gv-red)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Inquiry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: CRON WORKER EXECUTION REPORT */}
      {/* ========================================== */}
      {cronResultModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '560px', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-lg)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="var(--gv-amber)" />
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{cronResultModal.title || 'Cron Worker Execution Report'}</h2>
              </div>
              <button onClick={() => setCronResultModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--gv-text-muted)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--gv-bg)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--gv-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Evaluated</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{cronResultModal.evaluated}</div>
              </div>
              <div style={{ background: '#DCFCE7', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#15803D', textTransform: 'uppercase', fontWeight: 600 }}>Dispatched</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#15803D', marginTop: '4px' }}>{cronResultModal.dispatched}</div>
              </div>
              <div style={{ background: '#FEF3C7', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#B45309', textTransform: 'uppercase', fontWeight: 600 }}>Skipped (Duplicates)</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#B45309', marginTop: '4px' }}>{cronResultModal.skippedDuplicates}</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--gv-border)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--gv-bg)', borderBottom: '1px solid var(--gv-border)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Member</th>
                    <th style={{ padding: '8px 12px' }}>Stage</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(cronResultModal.results || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'var(--gv-text-muted)' }}>
                        No members matched criteria today.
                      </td>
                    </tr>
                  ) : (
                    cronResultModal.results.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--gv-border)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                          {r.name}
                          <div style={{ fontSize: '11px', color: 'var(--gv-text-muted)', fontWeight: 400 }}>{r.phone}</div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>{r.stage || 'Birthday Greeting'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '11px',
                            background: r.status === 'Sent' ? '#DCFCE7' : r.status.includes('Skipped') ? '#FEF3C7' : '#FEE2E2',
                            color: r.status === 'Sent' ? '#15803D' : r.status.includes('Skipped') ? '#B45309' : '#B91C1C'
                          }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setCronResultModal(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--gv-dark)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
