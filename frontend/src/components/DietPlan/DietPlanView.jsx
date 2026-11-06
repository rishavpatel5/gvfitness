import React, { useState, useEffect, useMemo } from 'react';
import {
  Utensils,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Send,
  Download,
  Copy,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Sliders,
  Scale,
  Sparkles,
  MessageSquare,
  Lock,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export default function DietPlanView({
  members,
  onRefreshMembers,
  apiBase,
  formatDate
}) {
  const [activeSubTab, setActiveSubTab] = useState('manage'); // 'manage' | 'members'

  // ==========================================
  // DATA STATES
  // ==========================================
  const [bmiRanges, setBmiRanges] = useState([]);
  const [fitnessGoals, setFitnessGoals] = useState([]);
  const [masterPlans, setMasterPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==========================================
  // MODAL STATES
  // ==========================================
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [editingRange, setEditingRange] = useState(null);
  const [rangeForm, setRangeForm] = useState({ name: '', min_bmi: '', max_bmi: '', is_active: true, applicable_goal_ids: [] });

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({ name: '', is_active: true });

  // Blank-Canvas Plan Editor Modal
  const [editingPlanCombo, setEditingPlanCombo] = useState(null); // the combination being edited
  const [planForm, setPlanForm] = useState({
    id: null,
    title: '',
    status: 'Active',
    meals: [],
    instructions: ''
  });

  // Member Measurement Update Modal
  const [measurementModalMember, setMeasurementModalMember] = useState(null);
  const [measurementForm, setMeasurementForm] = useState({ height_cm: '', weight_kg: '' });

  // On-Demand Generation & Editable Preview Modal
  const [generatingMember, setGeneratingMember] = useState(null);
  const [generationStep, setGenerationStep] = useState('select'); // 'select' | 'preview'
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [selectedDietaryPref, setSelectedDietaryPref] = useState('Vegetarian');
  const [matchedPlanData, setMatchedPlanData] = useState(null);
  const [editablePreviewSnapshot, setEditablePreviewSnapshot] = useState(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [generatedShareSuccess, setGeneratedShareSuccess] = useState(null);

  // ==========================================
  // FILTERS
  // ==========================================
  // Manage Matrix Filters
  const [matrixRangeFilter, setMatrixRangeFilter] = useState('');
  const [matrixGoalFilter, setMatrixGoalFilter] = useState('');
  const [matrixPrefFilter, setMatrixPrefFilter] = useState('');
  const [matrixLevelFilter, setMatrixLevelFilter] = useState('');
  const [matrixGenderFilter, setMatrixGenderFilter] = useState('Any');
  const [matrixStatusFilter, setMatrixStatusFilter] = useState('all'); // 'all' | 'configured' | 'draft' | 'not_created'
  const [matrixSearch, setMatrixSearch] = useState('');

  // Members View Filters
  const [memberSearch, setMemberSearch] = useState('');
  const [memberTypeFilter, setMemberTypeFilter] = useState('all');
  const [memberBmiFilter, setMemberBmiFilter] = useState('all');
  const [memberLevelFilter, setMemberLevelFilter] = useState('all');

  // ==========================================
  // FETCH DATA
  // ==========================================
  const fetchDietData = async () => {
    try {
      setLoading(true);
      const [rangesRes, goalsRes, plansRes] = await Promise.all([
        fetch(`${apiBase}/diet/bmi-ranges`),
        fetch(`${apiBase}/diet/goals`),
        fetch(`${apiBase}/diet/plans`)
      ]);

      const [rangesJson, goalsJson, plansJson] = await Promise.all([
        rangesRes.json(),
        goalsRes.json(),
        plansRes.json()
      ]);

      if (rangesJson.success) setBmiRanges(rangesJson.data || []);
      if (goalsJson.success) setFitnessGoals(goalsJson.data || []);
      if (plansJson.success) setMasterPlans(plansJson.data?.plans || []);
    } catch (err) {
      console.error('Error fetching diet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDietData();
  }, []);

  // Helper to calculate age from DOB
  const calculateAge = (dobStr) => {
    if (!dobStr) return null;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  };

  // Helper to get matching BMI category object
  const getBmiCategory = (bmiVal) => {
    if (!bmiVal || isNaN(bmiVal)) return null;
    const active = bmiRanges.filter(r => r.is_active !== false);
    return active.find(r => bmiVal >= r.min_bmi && bmiVal <= r.max_bmi) || null;
  };

  // Helper to get linked/applicable goals for a BMI range (Interlinked domain logic)
  const getGoalsForBmiRange = (range, allGoals) => {
    if (!range) return allGoals || [];
    if (Array.isArray(range.applicable_goal_ids) && range.applicable_goal_ids.length > 0) {
      return (allGoals || []).filter(g => range.applicable_goal_ids.includes(g.id));
    }
    // Intelligent physiological defaults
    const min = parseFloat(range.min_bmi);
    const max = parseFloat(range.max_bmi);
    const name = (range.name || '').toLowerCase();

    return (allGoals || []).filter(g => {
      const gn = (g.name || '').toLowerCase();
      // 1. Underweight (BMI < 18.5): NEVER maintain, lose weight, or cut!
      if (max <= 18.5 || name.includes('underweight')) {
        if (gn.includes('fat loss') || gn.includes('maintain') || gn.includes('cutting') || gn.includes('loose') || gn.includes('lose')) {
          return false;
        }
        return true;
      }
      // 2. Overweight / Obese (BMI >= 25): NEVER gain weight, bulk, OR maintain weight!
      if (min >= 25 || name.includes('overweight') || name.includes('obese') || name.includes('obesity')) {
        if (gn.includes('weight gain') || gn.includes('bulking') || gn.includes('gain weight') || gn.includes('maintain')) {
          return false;
        }
        return true;
      }
      // 3. Normal Weight (18.5 - 24.99): all active goals are valid
      return true;
    });
  };

  // ==========================================
  // DYNAMIC COMBINATION MATRIX COMPUTATION
  // ==========================================
  const activeRanges = useMemo(() => bmiRanges.filter(r => r.is_active !== false), [bmiRanges]);
  const activeGoals = useMemo(() => fitnessGoals.filter(g => g.is_active !== false), [fitnessGoals]);
  const fitnessLevels = ['Beginner', 'Intermediate', 'Advance'];
  const dietaryPreferences = ['Vegetarian', 'Non-vegetarian'];
  const genders = ['Any', 'Male', 'Female'];

  const allCombinations = useMemo(() => {
    const list = [];
    activeRanges.forEach(range => {
      // Interlink: Only combine with goals valid for this BMI range
      const validGoals = getGoalsForBmiRange(range, activeGoals);
      validGoals.forEach(goal => {
        fitnessLevels.forEach(level => {
          dietaryPreferences.forEach(pref => {
            genders.forEach(gender => {
              const matchedPlan = masterPlans.find(p =>
                p.bmi_range_id === range.id &&
                p.goal_id === goal.id &&
                p.fitness_level === level &&
                p.dietary_preference === pref &&
                p.gender === gender
              );

              list.push({
                key: `${range.id}_${goal.id}_${level}_${pref}_${gender}`,
                range,
                goal,
                level,
                pref,
                gender,
                plan: matchedPlan || null,
                status: matchedPlan ? matchedPlan.status : 'Not Created'
              });
            });
          });
        });
      });
    });
    return list;
  }, [activeRanges, activeGoals, masterPlans]);

  // Available goals dynamically linked to selected range filter
  const availableGoalsForFilter = useMemo(() => {
    if (!matrixRangeFilter) return activeGoals;
    const selectedRange = activeRanges.find(r => r.id === matrixRangeFilter);
    return selectedRange ? getGoalsForBmiRange(selectedRange, activeGoals) : activeGoals;
  }, [matrixRangeFilter, activeRanges, activeGoals]);

  // Available ranges dynamically linked to selected goal filter
  const availableRangesForFilter = useMemo(() => {
    if (!matrixGoalFilter) return activeRanges;
    return activeRanges.filter(r => getGoalsForBmiRange(r, activeGoals).some(g => g.id === matrixGoalFilter));
  }, [matrixGoalFilter, activeRanges, activeGoals]);

  // Auto-reset goal filter if current selection is invalid for newly selected range
  useEffect(() => {
    if (matrixGoalFilter && matrixRangeFilter) {
      const isValid = availableGoalsForFilter.some(g => g.id === matrixGoalFilter);
      if (!isValid) {
        setMatrixGoalFilter('');
      }
    }
  }, [matrixRangeFilter, availableGoalsForFilter]);

  // Filtered Matrix Combinations
  const filteredCombinations = useMemo(() => {
    const list = allCombinations.filter(combo => {
      if (matrixRangeFilter && combo.range.id !== matrixRangeFilter) return false;
      if (matrixGoalFilter && combo.goal.id !== matrixGoalFilter) return false;
      if (matrixPrefFilter && combo.pref !== matrixPrefFilter) return false;
      if (matrixLevelFilter && combo.level !== matrixLevelFilter) return false;

      // Gender filter: match gender, but NEVER hide active configured plans
      if (matrixGenderFilter) {
        if (matrixGenderFilter === 'Any') {
          if (combo.gender !== 'Any' && !combo.plan) return false;
        } else {
          if (combo.gender !== matrixGenderFilter && !combo.plan) return false;
        }
      }

      if (matrixStatusFilter === 'configured' && combo.status !== 'Active') return false;
      if (matrixStatusFilter === 'draft' && combo.status !== 'Draft') return false;
      if (matrixStatusFilter === 'not_created' && combo.status !== 'Not Created') return false;

      if (matrixSearch) {
        const q = matrixSearch.toLowerCase();
        const str = `${combo.range.name} ${combo.goal.name} ${combo.level} ${combo.pref} ${combo.gender} ${combo.plan?.title || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });

    // Sort: Active plans first, then Drafts, then Not Created
    return list.sort((a, b) => {
      const score = item => (item.status === 'Active' ? 3 : item.status === 'Draft' ? 2 : 1);
      return score(b) - score(a);
    });
  }, [allCombinations, matrixRangeFilter, matrixGoalFilter, matrixPrefFilter, matrixLevelFilter, matrixGenderFilter, matrixStatusFilter, matrixSearch]);

  // Statistics
  const configuredCount = useMemo(() => masterPlans.filter(p => p.status === 'Active').length, [masterPlans]);
  const draftCount = useMemo(() => masterPlans.filter(p => p.status === 'Draft').length, [masterPlans]);

  // ==========================================
  // MEMBERS VIEW FILTERING
  // ==========================================
  const eligibleMembers = useMemo(() => {
    return (members || []).map(m => {
      const age = calculateAge(m.dob);
      const isAdult = age === null || age >= 18;
      const bmiCategory = getBmiCategory(m.bmi);
      return {
        ...m,
        age,
        isAdult,
        bmiCategory
      };
    }).filter(m => {
      // Must be active
      if (m.status !== 'Active') return false;

      // Filter by type
      if (memberTypeFilter === 'GT' && (!m.gtPeriod || !m.isGtCurrentlyActive)) return false;
      if (memberTypeFilter === 'PT' && (!m.ptPeriod || !m.isPtCurrentlyActive)) return false;

      // Filter by BMI
      if (memberBmiFilter !== 'all') {
        if (!m.bmiCategory || m.bmiCategory.id !== memberBmiFilter) return false;
      }

      // Filter by Level
      if (memberLevelFilter !== 'all' && m.fitness_level !== memberLevelFilter) return false;

      // Search
      if (memberSearch) {
        const q = memberSearch.toLowerCase();
        return (m.name || '').toLowerCase().includes(q) || (m.phone || '').includes(q);
      }
      return true;
    });
  }, [members, bmiRanges, memberTypeFilter, memberBmiFilter, memberLevelFilter, memberSearch]);

  // ==========================================
  // HANDLERS: BMI RANGE MODAL
  // ==========================================
  const handleOpenAddRange = () => {
    setEditingRange(null);
    setRangeForm({ name: '', min_bmi: '', max_bmi: '', is_active: true, applicable_goal_ids: [] });
    setShowRangeModal(true);
  };

  const handleOpenEditRange = (r) => {
    setEditingRange(r);
    const initialGoals = Array.isArray(r.applicable_goal_ids) && r.applicable_goal_ids.length > 0
      ? r.applicable_goal_ids
      : getGoalsForBmiRange(r, fitnessGoals).map(g => g.id);

    setRangeForm({
      name: r.name,
      min_bmi: r.min_bmi,
      max_bmi: r.max_bmi,
      is_active: r.is_active,
      applicable_goal_ids: initialGoals
    });
    setShowRangeModal(true);
  };

  const handleSaveRange = async (e) => {
    e.preventDefault();
    try {
      const url = editingRange ? `${apiBase}/diet/bmi-ranges/${editingRange.id}` : `${apiBase}/diet/bmi-ranges`;
      const method = editingRange ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rangeForm)
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to save BMI range');
        return;
      }
      setShowRangeModal(false);
      fetchDietData();
    } catch (err) {
      alert('Error saving range: ' + err.message);
    }
  };

  const handleDeleteRange = async (id) => {
    if (!window.confirm('Are you sure you want to delete this BMI range?')) return;
    try {
      const res = await fetch(`${apiBase}/diet/bmi-ranges/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to delete BMI range');
        return;
      }
      fetchDietData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // ==========================================
  // HANDLERS: GOALS MODAL
  // ==========================================
  const handleOpenAddGoal = () => {
    setEditingGoal(null);
    setGoalForm({ name: '', is_active: true });
    setShowGoalModal(true);
  };

  const handleOpenEditGoal = (g) => {
    setEditingGoal(g);
    setGoalForm({ name: g.name, is_active: g.is_active });
  };

  const handleCancelEditGoal = () => {
    setEditingGoal(null);
    setGoalForm({ name: '', is_active: true });
  };

  const handleToggleGoalActive = async (goal) => {
    try {
      const res = await fetch(`${apiBase}/diet/goals/${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !goal.is_active })
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to update goal');
        return;
      }
      fetchDietData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.name || !goalForm.name.trim()) return;
    try {
      const url = editingGoal ? `${apiBase}/diet/goals/${editingGoal.id}` : `${apiBase}/diet/goals`;
      const method = editingGoal ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: goalForm.name.trim(), is_active: goalForm.is_active })
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to save goal');
        return;
      }
      setEditingGoal(null);
      setGoalForm({ name: '', is_active: true });
      fetchDietData();
    } catch (err) {
      alert('Error saving goal: ' + err.message);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fitness goal?')) return;
    try {
      const res = await fetch(`${apiBase}/diet/goals/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to delete goal');
        return;
      }
      fetchDietData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // ==========================================
  // HANDLERS: BLANK-CANVAS PLAN EDITOR
  // ==========================================
  const handleOpenPlanEditor = (combo) => {
    setEditingPlanCombo(combo);
    const existing = combo.plan;
    if (existing) {
      setPlanForm({
        id: existing.id,
        title: existing.title || '',
        status: existing.status || 'Active',
        meals: existing.meals && existing.meals.length > 0 ? JSON.parse(JSON.stringify(existing.meals)) : [
          { id: 'meal_1', name: 'Meal 1 – Morning Boost', items: [{ id: 'item_1', name: 'Oats with Almond Milk', quantity: '1 Bowl (60g)', notes: 'Top with berries' }] }
        ],
        instructions: existing.instructions || 'Drink at least 3.5 to 4 liters of clean water daily. Ensure 7 to 8 hours of quality sleep.'
      });
    } else {
      setPlanForm({
        id: null,
        title: `${combo.range.name} - ${combo.level} ${combo.pref}`,
        status: 'Active',
        meals: [
          { id: 'meal_1', name: 'Meal 1 – Breakfast', items: [{ id: 'item_1', name: '', quantity: '', notes: '' }] },
          { id: 'meal_2', name: 'Meal 2 – Lunch', items: [{ id: 'item_2', name: '', quantity: '', notes: '' }] },
          { id: 'meal_3', name: 'Meal 3 – Dinner', items: [{ id: 'item_3', name: '', quantity: '', notes: '' }] }
        ],
        instructions: '1. Drink 3.5 - 4L of water daily.\n2. Maintain consistent meal timings.\n3. Take adequate protein post-workout.'
      });
    }
  };

  const handleAddMealSection = () => {
    const mealNum = planForm.meals.length + 1;
    const newMeal = {
      id: 'meal_' + Date.now(),
      name: `Meal ${mealNum} – Snack / Meal`,
      items: [{ id: 'item_' + Date.now(), name: '', quantity: '', notes: '' }]
    };
    setPlanForm({ ...planForm, meals: [...planForm.meals, newMeal] });
  };

  const handleRemoveMealSection = (mealIdx) => {
    if (planForm.meals.length <= 1) {
      alert('Plan must have at least one meal section.');
      return;
    }
    const updated = planForm.meals.filter((_, idx) => idx !== mealIdx);
    setPlanForm({ ...planForm, meals: updated });
  };

  const handleMoveMeal = (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= planForm.meals.length) return;
    const updated = [...planForm.meals];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setPlanForm({ ...planForm, meals: updated });
  };

  const handleAddFoodItem = (mealIdx) => {
    const updated = [...planForm.meals];
    updated[mealIdx].items.push({
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: '',
      quantity: '',
      notes: ''
    });
    setPlanForm({ ...planForm, meals: updated });
  };

  const handleRemoveFoodItem = (mealIdx, itemIdx) => {
    const updated = [...planForm.meals];
    updated[mealIdx].items = updated[mealIdx].items.filter((_, idx) => idx !== itemIdx);
    setPlanForm({ ...planForm, meals: updated });
  };

  const handleSaveMasterPlan = async (e) => {
    e.preventDefault();
    if (!editingPlanCombo) return;

    const payload = {
      id: planForm.id || undefined,
      bmi_range_id: editingPlanCombo.range.id,
      goal_id: editingPlanCombo.goal.id,
      fitness_level: editingPlanCombo.level,
      dietary_preference: editingPlanCombo.pref,
      gender: editingPlanCombo.gender,
      title: planForm.title || `${editingPlanCombo.level} ${editingPlanCombo.pref}`,
      status: planForm.status,
      meals: planForm.meals.filter(m => m.name && m.name.trim()),
      instructions: planForm.instructions
    };

    try {
      const res = await fetch(`${apiBase}/diet/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to save master plan.');
        return;
      }
      setEditingPlanCombo(null);
      fetchDietData();
    } catch (err) {
      alert('Error saving plan: ' + err.message);
    }
  };

  // ==========================================
  // HANDLERS: MEASUREMENT MODAL
  // ==========================================
  const handleOpenMeasurements = (member) => {
    setMeasurementModalMember(member);
    setMeasurementForm({
      height_cm: member.height_cm || '',
      weight_kg: member.weight_kg || ''
    });
  };

  const handleSaveMeasurements = async (e) => {
    e.preventDefault();
    if (!measurementModalMember) return;

    try {
      const res = await fetch(`${apiBase}/members/${measurementModalMember.id}/measurements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurementForm)
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to update measurements.');
        return;
      }
      setMeasurementModalMember(null);
      if (onRefreshMembers) onRefreshMembers();
      fetchDietData();
    } catch (err) {
      alert('Error updating measurements: ' + err.message);
    }
  };

  // Computed live BMI for measurement form
  const modalComputedBmi = useMemo(() => {
    const h = parseFloat(measurementForm.height_cm);
    const w = parseFloat(measurementForm.weight_kg);
    if (!isNaN(h) && h > 0 && !isNaN(w) && w > 0) {
      const val = parseFloat((w / Math.pow(h / 100, 2)).toFixed(2));
      const cat = getBmiCategory(val);
      return { val, category: cat?.name || 'Unclassified' };
    }
    return null;
  }, [measurementForm, bmiRanges]);

  // Interlinked goals for member generation
  const memberBmiCat = useMemo(() => {
    if (!generatingMember) return null;
    return getBmiCategory(generatingMember.bmi);
  }, [generatingMember, bmiRanges]);

  const applicableGoalsForMember = useMemo(() => {
    if (!memberBmiCat) return activeGoals;
    return getGoalsForBmiRange(memberBmiCat, activeGoals);
  }, [memberBmiCat, activeGoals]);

  useEffect(() => {
    if (generatingMember && applicableGoalsForMember.length > 0) {
      if (!applicableGoalsForMember.some(g => g.id === selectedGoalId)) {
        setSelectedGoalId(applicableGoalsForMember[0].id);
      }
    }
  }, [generatingMember, applicableGoalsForMember]);

  // ==========================================
  // HANDLERS: ON-DEMAND GENERATION & PREVIEW
  // ==========================================
  const handleOpenGenerate = (member) => {
    if (!member.isAdult) {
      alert('Adult BMI-based diet plans are ineligible for members under 18 years of age.');
      return;
    }

    if (!member.bmi || isNaN(member.bmi)) {
      alert('Member has no recorded BMI. Please update their height and weight first.');
      handleOpenMeasurements(member);
      return;
    }

    const memberRange = getBmiCategory(member.bmi);
    const applicableGoals = getGoalsForBmiRange(memberRange, activeGoals);

    setGeneratingMember(member);
    setGenerationStep('select');
    setSelectedGoalId(applicableGoals[0]?.id || '');
    setSelectedDietaryPref('Vegetarian');
    setMatchedPlanData(null);
    setEditablePreviewSnapshot(null);
    setGeneratedShareSuccess(null);
  };

  const handleFindMatchingPlan = async () => {
    if (!generatingMember || !selectedGoalId || !selectedDietaryPref) {
      alert('Please select both a fitness goal and dietary preference.');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/diet/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: generatingMember.id,
          goalId: selectedGoalId,
          dietaryPreference: selectedDietaryPref
        })
      });

      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'No matching master diet plan found.');
        return;
      }

      setMatchedPlanData(json.data);

      // Create tailored editable preview snapshot
      const goalObj = json.data.goal;
      const rangeObj = json.data.bmiRange;
      const planObj = json.data.plan;

      setEditablePreviewSnapshot({
        memberId: generatingMember.id,
        memberName: generatingMember.name,
        phone: generatingMember.phone,
        gender: generatingMember.gender,
        age: generatingMember.age,
        height_cm: generatingMember.height_cm,
        weight_kg: generatingMember.weight_kg,
        bmi: generatingMember.bmi,
        bmiCategory: rangeObj?.name || 'Normal',
        fitness_level: generatingMember.fitness_level,
        goalName: goalObj?.name || 'Fitness Goal',
        dietaryPreference: selectedDietaryPref,
        meals: JSON.parse(JSON.stringify(planObj.meals || [])),
        instructions: planObj.instructions || '',
        generatedDate: new Date().toLocaleDateString('en-IN')
      });

      setGenerationStep('preview');
    } catch (err) {
      alert('Error matching plan: ' + err.message);
    }
  };

  const handleSendViaWhatsApp = async () => {
    if (!generatingMember || !editablePreviewSnapshot) return;
    setIsSendingWhatsApp(true);

    try {
      const res = await fetch(`${apiBase}/diet/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: generatingMember.id,
          planSnapshot: editablePreviewSnapshot,
          sendViaWhatsApp: true
        })
      });

      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to dispatch diet plan.');
        return;
      }

      setGeneratedShareSuccess(json.data);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Preview PDF in new tab
  const handleOpenPdfPreview = async () => {
    if (!generatingMember || !editablePreviewSnapshot) return;

    try {
      const res = await fetch(`${apiBase}/diet/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: generatingMember.id,
          planSnapshot: editablePreviewSnapshot,
          sendViaWhatsApp: false
        })
      });
      const json = await res.json();
      if (json.success && json.data?.token) {
        window.open(`${apiBase}/diet/pdf/${json.data.token}`, '_blank');
      }
    } catch (err) {
      alert('Error opening PDF preview: ' + err.message);
    }
  };

  return (
    <div>
      {/* ========================================== */}
      {/* HEADER & SUB-TABS */}
      {/* ========================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Utensils size={24} color="var(--gv-red)" /> Diet Plan Module
          </h1>
          <p style={{ color: 'var(--gv-text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Master combination matrices, blank-canvas meal editors, and on-demand personalized WhatsApp delivery
          </p>
        </div>

        {/* TOP TAB TOGGLE */}
        <div style={{ display: 'flex', backgroundColor: 'var(--gv-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--gv-border)' }}>
          <button
            onClick={() => setActiveSubTab('manage')}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeSubTab === 'manage' ? 'var(--gv-dark)' : 'transparent',
              color: activeSubTab === 'manage' ? '#fff' : 'var(--gv-text-muted)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sliders size={14} /> Manage Diet Plans ({configuredCount})
          </button>
          <button
            onClick={() => setActiveSubTab('members')}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeSubTab === 'members' ? 'var(--gv-dark)' : 'transparent',
              color: activeSubTab === 'members' ? '#fff' : 'var(--gv-text-muted)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <UserCheck size={14} /> Diet Plan Members ({eligibleMembers.length})
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* TAB 1: MANAGE DIET PLANS */}
      {/* ========================================== */}
      {activeSubTab === 'manage' && (
        <div>
          {/* TOP ACTIONS & STATS BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleOpenAddRange}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--gv-border)',
                  backgroundColor: 'var(--gv-card-bg)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Scale size={15} color="var(--gv-red)" /> Manage BMI Ranges ({bmiRanges.length})
              </button>

              <button
                onClick={handleOpenAddGoal}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--gv-border)',
                  backgroundColor: 'var(--gv-card-bg)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={15} color="var(--gv-red)" /> Add, Edit & Remove Goals ({fitnessGoals.length})
              </button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--gv-text-muted)' }}>
              Configured Combinations: <strong>{configuredCount} Active</strong> • <strong>{draftCount} Drafts</strong> • {allCombinations.length} Permutations
            </div>
          </div>

          {/* COMBINATION MATRIX FILTERS */}
          <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--gv-border)', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', alignItems: 'center' }}>

              {/* BMI Range Filter */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>BMI Range</label>
                <select value={matrixRangeFilter} onChange={e => setMatrixRangeFilter(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px', fontSize: '12px' }}>
                  <option value="">All BMI Ranges ({availableRangesForFilter.length})</option>
                  {availableRangesForFilter.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.min_bmi} - {r.max_bmi})</option>
                  ))}
                </select>
              </div>

              {/* Goal Filter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>
                    Fitness Goal {matrixRangeFilter ? '(Interlinked)' : ''}
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenAddGoal}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--gv-red)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Add, edit, or remove fitness goals"
                  >
                    <Edit2 size={10} /> Edit / Add Goals
                  </button>
                </div>
                <select
                  value={matrixGoalFilter}
                  onChange={e => {
                    if (e.target.value === '__manage__') {
                      handleOpenAddGoal();
                    } else {
                      setMatrixGoalFilter(e.target.value);
                    }
                  }}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px', fontSize: '12px' }}
                >
                  <option value="">All Goals ({availableGoalsForFilter.length})</option>
                  {availableGoalsForFilter.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                  <option value="__manage__">➕ Manage / Edit / Add Goals...</option>
                </select>
              </div>

              {/* Preference Filter */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Dietary Preference</label>
                <select value={matrixPrefFilter} onChange={e => setMatrixPrefFilter(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px', fontSize: '12px' }}>
                  <option value="">All Preferences</option>
                  {dietaryPreferences.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Fitness Level Filter */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Fitness Level</label>
                <select value={matrixLevelFilter} onChange={e => setMatrixLevelFilter(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px', fontSize: '12px' }}>
                  <option value="">All Levels</option>
                  {fitnessLevels.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Gender Filter */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Gender Scope (Optional)</label>
                <select value={matrixGenderFilter} onChange={e => setMatrixGenderFilter(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px', fontSize: '12px' }}>
                  <option value="Any">Any Gender (Default)</option>
                  <option value="">All Genders (Show All)</option>
                  <option value="Male">Male Specific Plans</option>
                  <option value="Female">Female Specific Plans</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gv-text-muted)' }}>Status</label>
                <select value={matrixStatusFilter} onChange={e => setMatrixStatusFilter(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px', fontSize: '12px' }}>
                  <option value="all">All Statuses</option>
                  <option value="configured">Active Configured</option>
                  <option value="draft">Drafts Only</option>
                  <option value="not_created">Not Created Yet</option>
                </select>
              </div>

            </div>
          </div>

          {/* COMBINATION MATRIX TABLE */}
          <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gv-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>
                Combination Matrix ({filteredCombinations.length} displayed)
              </div>
              <div style={{ width: '260px' }}>
                <input
                  type="text"
                  placeholder="Search combinations..."
                  value={matrixSearch}
                  onChange={e => setMatrixSearch(e.target.value)}
                  style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', fontSize: '12px' }}
                />
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gv-border)', color: 'var(--gv-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 20px' }}>BMI Range</th>
                  <th style={{ padding: '12px 16px' }}>Fitness Goal</th>
                  <th style={{ padding: '12px 16px' }}>Dietary Preference</th>
                  <th style={{ padding: '12px 16px' }}>Fitness Level</th>
                  <th style={{ padding: '12px 16px' }}>Gender</th>
                  <th style={{ padding: '12px 16px' }}>Configuration Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCombinations.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--gv-text-muted)' }}>
                      No combinations match this filter query.
                    </td>
                  </tr>
                ) : (
                  filteredCombinations.slice(0, 50).map(combo => (
                    <tr key={combo.key} style={{ borderBottom: '1px solid var(--gv-border)' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>
                        <span>{combo.range.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--gv-text-muted)', marginLeft: '6px' }}>
                          ({combo.range.min_bmi} - {combo.range.max_bmi})
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--gv-red)' }}>
                        {combo.goal.name}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: combo.pref === 'Vegetarian' ? '#DCFCE7' : '#FEE2E2',
                          color: combo.pref === 'Vegetarian' ? '#166534' : '#991B1B'
                        }}>
                          {combo.pref}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--gv-text-muted)' }}>
                        {combo.level}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--gv-text-muted)' }}>
                        {combo.gender === 'Any' ? 'Any Gender' : combo.gender}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {combo.status === 'Active' ? (
                          <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--gv-green)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            Active ({combo.plan?.meals?.length || 0} Meals)
                          </span>
                        ) : combo.status === 'Draft' ? (
                          <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            Draft
                          </span>
                        ) : (
                          <span style={{ border: '1px solid var(--gv-border)', color: 'var(--gv-text-muted)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                            Not Created
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenPlanEditor(combo)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: combo.plan ? 'var(--gv-dark)' : 'var(--gv-red)',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {combo.plan ? 'Edit Plan' : 'Configure Plan'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {filteredCombinations.length > 50 && (
              <div style={{ padding: '12px 20px', textAlign: 'center', backgroundColor: 'var(--gv-bg)', fontSize: '12px', color: 'var(--gv-text-muted)', borderTop: '1px solid var(--gv-border)' }}>
                Showing first 50 results. Narrow your filters to target specific combinations.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: DIET PLAN MEMBERS */}
      {/* ========================================== */}
      {activeSubTab === 'members' && (
        <div>
          {/* MEMBERS FILTER BAR */}
          <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--gv-border)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ width: '240px' }}>
                <input
                  type="text"
                  placeholder="Search by member name or phone..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', fontSize: '13px' }}
                />
              </div>

              <select value={memberTypeFilter} onChange={e => setMemberTypeFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', fontSize: '13px' }}>
                <option value="all">All Memberships</option>
                <option value="GT">Active GT</option>
                <option value="PT">Active PT</option>
              </select>

              <select value={memberBmiFilter} onChange={e => setMemberBmiFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', fontSize: '13px' }}>
                <option value="all">All BMI Categories</option>
                {activeRanges.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              <select value={memberLevelFilter} onChange={e => setMemberLevelFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', fontSize: '13px' }}>
                <option value="all">All Fitness Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advance">Advance</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--gv-text-muted)' }}>
                Eligible Adult Members: <strong>{eligibleMembers.filter(m => m.isAdult).length}</strong>
              </div>
              <a
                href={`${apiBase}/export/diet_members`}
                download
                style={{
                  backgroundColor: 'var(--gv-card-bg)',
                  color: 'var(--gv-text-main)',
                  border: '1px solid var(--gv-border)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '12px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Download size={13} /> Export Excel (.xlsx)
              </a>
            </div>
          </div>

          {/* MEMBERS TABLE */}
          <div style={{ backgroundColor: 'var(--gv-card-bg)', borderRadius: '12px', border: '1px solid var(--gv-border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gv-border)', color: 'var(--gv-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 20px' }}>Member</th>
                  <th style={{ padding: '14px 16px' }}>Phone</th>
                  <th style={{ padding: '14px 16px' }}>Gender / Age</th>
                  <th style={{ padding: '14px 16px' }}>Height</th>
                  <th style={{ padding: '14px 16px' }}>Weight</th>
                  <th style={{ padding: '14px 16px' }}>BMI & Range</th>
                  <th style={{ padding: '14px 16px' }}>Level</th>
                  <th style={{ padding: '14px 16px' }}>Type</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {eligibleMembers.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: 'var(--gv-text-muted)' }}>
                      No active members match this search criteria.
                    </td>
                  </tr>
                ) : (
                  eligibleMembers.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--gv-border)' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontWeight: 600 }}>{m.name}</span>
                        {m.device_user_id && (
                          <span style={{ fontSize: '11px', color: 'var(--gv-text-muted)', marginLeft: '6px' }}>
                            (PIN: #{m.device_user_id})
                          </span>
                        )}
                        {!m.isAdult && (
                          <div style={{ marginTop: '2px' }}>
                            <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                              Under 18
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--gv-text-muted)' }}>
                        {m.phone}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {m.gender || 'Male'} {m.age ? `(${m.age}y)` : ''}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {m.height_cm ? `${m.height_cm} cm` : <span style={{ color: 'var(--gv-text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {m.weight_kg ? `${m.weight_kg} kg` : <span style={{ color: 'var(--gv-text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {m.bmi ? (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '11px',
                            backgroundColor: m.bmiCategory?.name === 'Normal Weight' ? '#DCFCE7' : '#FEE2E2',
                            color: m.bmiCategory?.name === 'Normal Weight' ? '#166534' : '#991B1B'
                          }}>
                            {m.bmi} ({m.bmiCategory?.name || 'Range'})
                          </span>
                        ) : (
                          <span style={{ color: '#D97706', fontSize: '11px', fontWeight: 600 }}>
                            Measurements needed
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '4px', background: 'var(--gv-bg)' }}>
                          {m.fitness_level}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, fontSize: '12px', color: m.isPtCurrentlyActive ? 'var(--gv-red)' : 'inherit' }}>
                          {m.isPtCurrentlyActive ? 'PT Active' : 'GT'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenMeasurements(m)}
                            title="Update Weight / Height"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--gv-border)',
                              background: 'transparent',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <Scale size={13} style={{ marginRight: '4px' }} /> Update Wt
                          </button>

                          <button
                            disabled={!m.isAdult}
                            onClick={() => handleOpenGenerate(m)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: m.isAdult ? 'var(--gv-red)' : 'var(--gv-border)',
                              color: m.isAdult ? '#fff' : 'var(--gv-text-muted)',
                              fontWeight: 600,
                              fontSize: '12px',
                              cursor: m.isAdult ? 'pointer' : 'not-allowed',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Utensils size={13} /> Generate Plan
                          </button>
                        </div>
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
      {/* MODAL: MANAGE BMI RANGES */}
      {/* ========================================== */}
      {showRangeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '600px', maxWidth: '95vw', borderRadius: '14px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                {editingRange ? 'Edit BMI Range' : 'Manage BMI Ranges'}
              </h2>
              <button onClick={() => setShowRangeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gv-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Existing Ranges List */}
            {!editingRange && (
              <div style={{ marginBottom: '20px', maxHeight: '200px', overflowY: 'auto' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gv-text-muted)', marginBottom: '8px' }}>CURRENT ACTIVE RANGES</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {bmiRanges.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--gv-bg)', borderRadius: '6px', border: '1px solid var(--gv-border)', fontSize: '13px' }}>
                      <div>
                        <strong>{r.name}</strong>: {r.min_bmi} to {r.max_bmi}
                        {!r.is_active && <span style={{ color: 'var(--gv-text-muted)', marginLeft: '6px' }}>(Inactive)</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleOpenEditRange(r)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gv-dark)' }}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteRange(r.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gv-red)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add / Edit Form */}
            <form onSubmit={handleSaveRange} style={{ borderTop: '1px solid var(--gv-border)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0' }}>
                {editingRange ? 'Update Range' : 'Add New BMI Range'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Category Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Normal Weight, Overweight"
                    value={rangeForm.name}
                    onChange={e => setRangeForm({ ...rangeForm, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Lower Bound (Min BMI)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="e.g. 18.50"
                      value={rangeForm.min_bmi}
                      onChange={e => setRangeForm({ ...rangeForm, min_bmi: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Upper Bound (Max BMI)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="e.g. 24.99"
                      value={rangeForm.max_bmi}
                      onChange={e => setRangeForm({ ...rangeForm, max_bmi: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="rangeActive"
                    checked={rangeForm.is_active}
                    onChange={e => setRangeForm({ ...rangeForm, is_active: e.target.checked })}
                  />
                  <label htmlFor="rangeActive" style={{ fontSize: '13px', fontWeight: 600 }}>Active in Matrix Matching</label>
                </div>

                {/* Linked Fitness Goals for this BMI Range */}
                <div style={{ marginTop: '8px', padding: '12px', backgroundColor: 'var(--gv-bg)', borderRadius: '8px', border: '1px solid var(--gv-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>Linked Fitness Goals for this Range</span>
                      <p style={{ fontSize: '11px', color: 'var(--gv-text-muted)', margin: '2px 0 0 0' }}>
                        Only checked goals can have diet plans configured in this BMI range.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const smartGoals = getGoalsForBmiRange({
                          name: rangeForm.name,
                          min_bmi: rangeForm.min_bmi,
                          max_bmi: rangeForm.max_bmi
                        }, fitnessGoals).map(g => g.id);
                        setRangeForm({ ...rangeForm, applicable_goal_ids: smartGoals });
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--gv-border)',
                        backgroundColor: 'var(--gv-card-bg)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'var(--gv-red)'
                      }}
                      title="Automatically link physiologically sensible goals based on BMI"
                    >
                      ✨ Auto-Link
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                    {fitnessGoals.map(g => {
                      const isChecked = Array.isArray(rangeForm.applicable_goal_ids) && rangeForm.applicable_goal_ids.length > 0
                        ? rangeForm.applicable_goal_ids.includes(g.id)
                        : getGoalsForBmiRange({
                            name: rangeForm.name,
                            min_bmi: rangeForm.min_bmi,
                            max_bmi: rangeForm.max_bmi
                          }, [g]).length > 0;

                      return (
                        <label
                          key={g.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            padding: '6px 8px',
                            backgroundColor: isChecked ? '#FFF1F2' : 'transparent',
                            borderRadius: '6px',
                            border: isChecked ? '1px solid #FECACA' : '1px solid transparent',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const currentSelected = Array.isArray(rangeForm.applicable_goal_ids) && rangeForm.applicable_goal_ids.length > 0
                                ? [...rangeForm.applicable_goal_ids]
                                : getGoalsForBmiRange({
                                    name: rangeForm.name,
                                    min_bmi: rangeForm.min_bmi,
                                    max_bmi: rangeForm.max_bmi
                                  }, fitnessGoals).map(x => x.id);

                              const updated = e.target.checked
                                ? [...new Set([...currentSelected, g.id])]
                                : currentSelected.filter(id => id !== g.id);

                              setRangeForm({ ...rangeForm, applicable_goal_ids: updated });
                            }}
                          />
                          <span style={{ fontWeight: isChecked ? 600 : 400 }}>{g.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button type="button" onClick={() => setShowRangeModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--gv-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--gv-red)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Range</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: MANAGE FITNESS GOALS */}
      {/* ========================================== */}
      {showGoalModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '580px', maxWidth: '95vw', borderRadius: '14px', padding: '24px', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="var(--gv-red)" /> Manage Fitness Goals
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--gv-text-muted)', margin: '4px 0 0 0' }}>
                  Add new goals, edit goal names, or remove goals for diet plan matching.
                </p>
              </div>
              <button onClick={() => setShowGoalModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gv-text-muted)', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* QUICK ADD NEW GOAL BAR */}
            <form onSubmit={handleSaveGoal} style={{ backgroundColor: 'var(--gv-bg)', padding: '14px', borderRadius: '10px', border: '1px solid var(--gv-border)', marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: editingGoal ? 'var(--gv-red)' : 'inherit' }}>
                {editingGoal ? `Edit Goal: "${editingGoal.name}"` : '+ Add New Goal'}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  required
                  type="text"
                  placeholder="e.g. Endurance, Keto, Athletic..."
                  value={goalForm.name}
                  onChange={e => setGoalForm({ ...goalForm, name: e.target.value })}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', fontSize: '13px' }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '9px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--gv-red)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={14} /> {editingGoal ? 'Update Goal' : 'Add Goal'}
                </button>
                {editingGoal && (
                  <button
                    type="button"
                    onClick={handleCancelEditGoal}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--gv-border)',
                      backgroundColor: 'transparent',
                      color: 'var(--gv-text-muted)',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* CONFIGURED GOALS LIST */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gv-text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>CONFIGURED GOALS ({fitnessGoals.length})</span>
                <span style={{ fontSize: '11px', fontWeight: 500 }}>Click badge to toggle Active / Inactive</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fitnessGoals.map(g => (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: editingGoal?.id === g.id ? '#FFF1F2' : 'var(--gv-bg)',
                      borderRadius: '8px',
                      border: editingGoal?.id === g.id ? '1px solid var(--gv-red)' : '1px solid var(--gv-border)',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 600 }}>{g.name}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleGoalActive(g)}
                        title="Click to toggle status"
                        style={{
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: g.is_active ? 'rgba(34, 197, 94, 0.15)' : 'var(--gv-border)',
                          color: g.is_active ? 'var(--gv-green)' : 'var(--gv-text-muted)'
                        }}
                      >
                        {g.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditGoal(g)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--gv-border)',
                          backgroundColor: 'var(--gv-card-bg)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--gv-dark)'
                        }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(g.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #FECACA',
                          backgroundColor: '#FEF2F2',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--gv-red)'
                        }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--gv-border)', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                style={{
                  padding: '8px 22px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--gv-dark)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: BLANK-CANVAS MASTER PLAN EDITOR */}
      {/* ========================================== */}
      {editingPlanCombo && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '850px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', borderRadius: '16px', padding: '28px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--gv-border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--gv-red)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Master Plan Combination Editor
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '4px 0 0' }}>
                  {editingPlanCombo.range.name} • {editingPlanCombo.level} • {editingPlanCombo.goal.name}
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--gv-text-muted)', marginTop: '4px', display: 'flex', gap: '8px' }}>
                  <span>Scope: <strong>{editingPlanCombo.gender === 'Any' ? 'Any Gender' : editingPlanCombo.gender}</strong></span>
                  <span>•</span>
                  <span>Preference: <strong>{editingPlanCombo.pref}</strong></span>
                </div>
              </div>
              <button onClick={() => setEditingPlanCombo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gv-text-muted)' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveMasterPlan} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Plan Title</label>
                  <input
                    required
                    type="text"
                    value={planForm.title}
                    onChange={e => setPlanForm({ ...planForm, title: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Status</label>
                  <select
                    value={planForm.status}
                    onChange={e => setPlanForm({ ...planForm, status: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                  >
                    <option value="Active">Active (Ready for matching)</option>
                    <option value="Draft">Draft (In progress)</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* MEAL SECTIONS */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700 }}>
                    Meal Sections ({planForm.meals.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMealSection}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--gv-red)',
                      backgroundColor: 'transparent',
                      color: 'var(--gv-red)',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} /> Add Meal Section
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {planForm.meals.map((meal, mealIdx) => (
                    <div key={meal.id || mealIdx} style={{ backgroundColor: 'var(--gv-bg)', border: '1px solid var(--gv-border)', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px' }}>
                        <input
                          type="text"
                          value={meal.name}
                          onChange={e => {
                            const updated = [...planForm.meals];
                            updated[mealIdx].name = e.target.value;
                            setPlanForm({ ...planForm, meals: updated });
                          }}
                          placeholder={`Meal ${mealIdx + 1} Name...`}
                          style={{ fontWeight: 700, fontSize: '14px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--gv-border)', width: '280px' }}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            disabled={mealIdx === 0}
                            onClick={() => handleMoveMeal(mealIdx, 'up')}
                            style={{ padding: '4px 6px', border: '1px solid var(--gv-border)', borderRadius: '4px', background: 'transparent', cursor: mealIdx === 0 ? 'not-allowed' : 'pointer' }}
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={mealIdx === planForm.meals.length - 1}
                            onClick={() => handleMoveMeal(mealIdx, 'down')}
                            style={{ padding: '4px 6px', border: '1px solid var(--gv-border)', borderRadius: '4px', background: 'transparent', cursor: mealIdx === planForm.meals.length - 1 ? 'not-allowed' : 'pointer' }}
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMealSection(mealIdx)}
                            style={{ padding: '4px 6px', border: 'none', background: 'transparent', color: 'var(--gv-red)', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* FOOD ITEMS */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {meal.items.map((item, itemIdx) => (
                          <div key={item.id || itemIdx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 36px', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Food Item (e.g. Oats / Eggs / Paneer)"
                              value={item.name}
                              onChange={e => {
                                const updated = [...planForm.meals];
                                updated[mealIdx].items[itemIdx].name = e.target.value;
                                setPlanForm({ ...planForm, meals: updated });
                              }}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--gv-border)', fontSize: '13px' }}
                            />
                            <input
                              type="text"
                              placeholder="Quantity / Serving (e.g. 60g / 3 whole)"
                              value={item.quantity}
                              onChange={e => {
                                const updated = [...planForm.meals];
                                updated[mealIdx].items[itemIdx].quantity = e.target.value;
                                setPlanForm({ ...planForm, meals: updated });
                              }}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--gv-border)', fontSize: '13px' }}
                            />
                            <input
                              type="text"
                              placeholder="Notes (optional, e.g. Pre-workout)"
                              value={item.notes}
                              onChange={e => {
                                const updated = [...planForm.meals];
                                updated[mealIdx].items[itemIdx].notes = e.target.value;
                                setPlanForm({ ...planForm, meals: updated });
                              }}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--gv-border)', fontSize: '13px' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveFoodItem(mealIdx, itemIdx)}
                              style={{ border: 'none', background: 'transparent', color: 'var(--gv-text-muted)', cursor: 'pointer' }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddFoodItem(mealIdx)}
                        style={{
                          marginTop: '10px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px dashed var(--gv-border)',
                          backgroundColor: 'transparent',
                          color: 'var(--gv-text-muted)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        + Add Food Item
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* GENERAL INSTRUCTIONS */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>Coach Instructions & Hydration Guidelines</label>
                <textarea
                  rows="4"
                  value={planForm.instructions}
                  onChange={e => setPlanForm({ ...planForm, instructions: e.target.value })}
                  placeholder="Water intake, timing notes, sleep requirements..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--gv-border)', marginTop: '4px', fontSize: '13px', lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--gv-border)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPlanCombo(null)}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--gv-border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--gv-red)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Master Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: UPDATE MEMBER MEASUREMENTS */}
      {/* ========================================== */}
      {measurementModalMember && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '450px', maxWidth: '95vw', borderRadius: '14px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Update Measurements</h2>
                <div style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginTop: '2px' }}>
                  {measurementModalMember.name} (PIN #{measurementModalMember.device_user_id})
                </div>
              </div>
              <button onClick={() => setMeasurementModalMember(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gv-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMeasurements} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Height (cm)</label>
                <input
                  required
                  type="number"
                  step="0.1"
                  placeholder="e.g. 175"
                  value={measurementForm.height_cm}
                  onChange={e => setMeasurementForm({ ...measurementForm, height_cm: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Weight (kg)</label>
                <input
                  required
                  type="number"
                  step="0.1"
                  placeholder="e.g. 74.5"
                  value={measurementForm.weight_kg}
                  onChange={e => setMeasurementForm({ ...measurementForm, weight_kg: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px' }}
                />
              </div>

              {/* LIVE BMI PREVIEW */}
              {modalComputedBmi && (
                <div style={{ padding: '12px', backgroundColor: 'var(--gv-bg)', borderRadius: '8px', border: '1px solid var(--gv-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Calculated BMI</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gv-red)' }}>
                    {modalComputedBmi.val} ({modalComputedBmi.category})
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setMeasurementModalMember(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--gv-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--gv-red)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Measurements</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: GENERATE & EDITABLE PREVIEW */}
      {/* ========================================== */}
      {generatingMember && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--gv-card-bg)', width: '820px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', borderRadius: '16px', padding: '28px', boxShadow: 'var(--shadow-lg)' }}>

            {/* MODAL HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--gv-border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--gv-red)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {generationStep === 'select' ? 'Generate Personalized Diet Plan' : 'Personalized Preview & Individual Adjustments'}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0' }}>
                  {generatingMember.name}
                </h2>
                <div style={{ fontSize: '13px', color: 'var(--gv-text-muted)', marginTop: '2px' }}>
                  {generatingMember.gender} • {generatingMember.age ? `${generatingMember.age} yrs • ` : ''}Height: {generatingMember.height_cm} cm • Weight: {generatingMember.weight_kg} kg • <strong>BMI: {generatingMember.bmi}</strong>
                </div>
              </div>
              <button onClick={() => setGeneratingMember(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gv-text-muted)' }}>
                <X size={22} />
              </button>
            </div>

            {/* STEP 1: SELECT GOAL & PREFERENCE */}
            {generationStep === 'select' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '16px', backgroundColor: 'var(--gv-bg)', borderRadius: '10px', border: '1px solid var(--gv-border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Automatic Combination Detection</div>
                  <div style={{ fontSize: '13px', color: 'var(--gv-text-muted)', lineHeight: 1.5 }}>
                    The system will match this member's current BMI (<strong>{generatingMember.bmi}</strong>) and fitness level (<strong>{generatingMember.fitness_level}</strong>) with your selected goal and dietary preference.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700 }}>
                      Select Fitness Goal
                      {memberBmiCat && (
                        <span style={{ fontSize: '11px', color: 'var(--gv-red)', fontWeight: 600, marginLeft: '6px' }}>
                          (Interlinked for {memberBmiCat.name})
                        </span>
                      )}
                    </label>
                    {applicableGoalsForMember.length === 0 ? (
                      <div style={{ marginTop: '6px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: 'var(--gv-red)', fontSize: '12px', lineHeight: 1.4 }}>
                        No goals are currently suitable for {memberBmiCat?.name} (e.g. Underweight members cannot have Fat Loss or Maintain Weight). Please add 'Weight Gain' or 'Muscle Gain' in Manage Goals.
                      </div>
                    ) : (
                      <select
                        value={selectedGoalId}
                        onChange={e => setSelectedGoalId(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--gv-border)', marginTop: '6px', fontSize: '13px' }}
                      >
                        {applicableGoalsForMember.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700 }}>Dietary Preference</label>
                    <select
                      value={selectedDietaryPref}
                      onChange={e => setSelectedDietaryPref(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--gv-border)', marginTop: '6px', fontSize: '13px' }}
                    >
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Non-vegetarian">Non-vegetarian</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                  <button type="button" onClick={() => setGeneratingMember(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--gv-border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button
                    type="button"
                    onClick={handleFindMatchingPlan}
                    disabled={applicableGoalsForMember.length === 0}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: applicableGoalsForMember.length > 0 ? 'var(--gv-red)' : 'var(--gv-border)',
                      color: applicableGoalsForMember.length > 0 ? '#fff' : 'var(--gv-text-muted)',
                      fontWeight: 700,
                      cursor: applicableGoalsForMember.length > 0 ? 'pointer' : 'not-allowed',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    Find Matching Plan <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: EDITABLE PREVIEW */}
            {generationStep === 'preview' && editablePreviewSnapshot && (
              <div>
                {/* WATI SHARE SUCCESS CARD */}
                {generatedShareSuccess && (
                  <div style={{ padding: '16px', backgroundColor: '#DCFCE7', borderRadius: '10px', border: '1px solid #86EFAC', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '14px' }}>
                      <CheckCircle size={18} /> Diet Plan Dispatched via WhatsApp!
                    </div>
                    <div style={{ fontSize: '13px', color: '#166534', marginTop: '4px' }}>
                      Sent to <strong>{generatingMember.phone}</strong> with a secure 14-day download link.
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        readOnly
                        value={generatedShareSuccess.shareUrl}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #86EFAC', fontSize: '12px', backgroundColor: '#fff' }}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedShareSuccess.shareUrl);
                          alert('Direct download link copied to clipboard!');
                        }}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#166534', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Copy size={13} /> Copy Link
                      </button>
                    </div>
                  </div>
                )}

                {/* TAILORED MEAL SECTIONS (EDITABLE) */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>
                      Individual Meal Tweaks for {generatingMember.name}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--gv-text-muted)' }}>
                      Changes here affect only this generated plan, not the master template.
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {editablePreviewSnapshot.meals.map((meal, mIdx) => (
                      <div key={meal.id || mIdx} style={{ backgroundColor: 'var(--gv-bg)', border: '1px solid var(--gv-border)', borderRadius: '10px', padding: '14px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--gv-dark)', marginBottom: '8px' }}>
                          {meal.name}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {meal.items.map((item, iIdx) => (
                            <div key={item.id || iIdx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 30px', gap: '8px', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => {
                                  const updated = { ...editablePreviewSnapshot };
                                  updated.meals[mIdx].items[iIdx].name = e.target.value;
                                  setEditablePreviewSnapshot(updated);
                                }}
                                style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--gv-border)', fontSize: '12px' }}
                              />
                              <input
                                type="text"
                                value={item.quantity}
                                onChange={e => {
                                  const updated = { ...editablePreviewSnapshot };
                                  updated.meals[mIdx].items[iIdx].quantity = e.target.value;
                                  setEditablePreviewSnapshot(updated);
                                }}
                                style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--gv-border)', fontSize: '12px' }}
                              />
                              <input
                                type="text"
                                value={item.notes || ''}
                                onChange={e => {
                                  const updated = { ...editablePreviewSnapshot };
                                  updated.meals[mIdx].items[iIdx].notes = e.target.value;
                                  setEditablePreviewSnapshot(updated);
                                }}
                                style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--gv-border)', fontSize: '12px' }}
                              />
                              <button
                                onClick={() => {
                                  const updated = { ...editablePreviewSnapshot };
                                  updated.meals[mIdx].items = updated.meals[mIdx].items.filter((_, idx) => idx !== iIdx);
                                  setEditablePreviewSnapshot(updated);
                                }}
                                style={{ border: 'none', background: 'transparent', color: 'var(--gv-text-muted)', cursor: 'pointer' }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* INSTRUCTIONS */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Coach Guidelines (Included in PDF & WhatsApp link)</label>
                  <textarea
                    rows="3"
                    value={editablePreviewSnapshot.instructions}
                    onChange={e => setEditablePreviewSnapshot({ ...editablePreviewSnapshot, instructions: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginTop: '4px', fontSize: '12px' }}
                  />
                </div>

                {/* ACTION BUTTONS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--gv-border)', paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setGenerationStep('select')}
                    style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--gv-border)', background: 'transparent', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  >
                    Back to Select
                  </button>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={handleOpenPdfPreview}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: '1px solid var(--gv-border)',
                        backgroundColor: 'var(--gv-card-bg)',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Download size={15} /> Preview PDF
                    </button>

                    <button
                      type="button"
                      disabled={isSendingWhatsApp}
                      onClick={handleSendViaWhatsApp}
                      style={{
                        padding: '10px 22px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#25D366',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: isSendingWhatsApp ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)'
                      }}
                    >
                      <Send size={15} /> {isSendingWhatsApp ? 'Sending via WATI...' : 'Send via WhatsApp'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

