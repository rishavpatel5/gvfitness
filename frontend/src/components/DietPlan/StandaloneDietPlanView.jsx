import React, { useState, useEffect } from 'react';
import { 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  User, 
  Activity, 
  Utensils, 
  Clock, 
  ShieldCheck, 
  Share2, 
  ExternalLink 
} from 'lucide-react';

export default function StandaloneDietPlanView({ token, apiBase }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('No diet plan token provided.');
      setLoading(false);
      return;
    }

    fetch(`${apiBase}/diet/view/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (res.status === 410) {
          setError('This diet plan link has expired (14-day validity). Please contact GV Fitness staff to receive an updated plan.');
        } else if (!json.success) {
          setError(json.error || 'Failed to load diet plan.');
        } else {
          setPlan(json.data);
        }
      })
      .catch((err) => {
        setError('Network error loading diet plan: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [token, apiBase]);

  const pdfUrl = `${apiBase}/diet/pdf/${token}`;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #E11D48', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Loading Your GV Fitness Diet Plan...</h2>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ maxWidth: '480px', width: '100%', backgroundColor: '#fff', borderRadius: '16px', padding: '36px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>Diet Plan Unavailable</h2>
          <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, marginBottom: '24px' }}>
            {error || 'This diet plan is no longer accessible.'}
          </p>
          <div style={{ padding: '12px 16px', backgroundColor: '#F1F5F9', borderRadius: '8px', fontSize: '13px', color: '#334155' }}>
            GV Fitness • Dedicated to Your Fitness Journey
          </div>
        </div>
      </div>
    );
  }

  const meals = Array.isArray(plan.meals) ? plan.meals : [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0B0F19', padding: '24px 16px 60px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0F172A' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>

        {/* TOP BRAND HEADER */}
        <div style={{ backgroundColor: '#0F172A', borderRadius: '16px 16px 0 0', padding: '28px 24px', borderBottom: '4px solid #E11D48', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
              GV <span style={{ color: '#E11D48' }}>FITNESS</span>
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '13px', margin: '4px 0 0', fontWeight: 500 }}>
              Official Member Personalized Nutrition Guide
            </p>
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            download
            style={{
              backgroundColor: '#E11D48',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.35)',
              transition: 'background 0.2s'
            }}
          >
            <Download size={16} /> Download Official PDF
          </a>
        </div>

        {/* MAIN BODY CONTAINER */}
        <div style={{ backgroundColor: '#fff', borderRadius: '0 0 16px 16px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '1px solid #1E293B', borderTop: 'none' }}>

          {/* MEMBER PROFILE SUMMARY CARD */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px', color: '#E11D48', textTransform: 'uppercase' }}>
                Member Details & Recorded Metrics
              </span>
              <span style={{ fontSize: '12px', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} /> Valid for 14 Days
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>MEMBER NAME</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>{plan.memberName}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {plan.gender} {plan.age ? `• ${plan.age} yrs` : ''}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>MEASUREMENTS & BMI</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                  {plan.height_cm ? `${plan.height_cm} cm` : '-'} • {plan.weight_kg ? `${plan.weight_kg} kg` : '-'}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <span style={{ backgroundColor: '#FEE2E2', color: '#E11D48', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                    BMI: {plan.bmi} ({plan.bmiCategory || 'Normal'})
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>GOAL & DIETARY PREFERENCE</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                  {plan.goalName || 'General Fitness'}
                </div>
                <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                  {plan.dietaryPreference || 'Standard'} • {plan.fitness_level}
                </div>
              </div>
            </div>
          </div>

          {/* MEAL SCHEDULE */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Utensils size={20} color="#E11D48" /> Daily Nutrition & Meal Schedule
            </h2>

            {meals.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '14px' }}>No specific meals listed. Follow general guidance from your coach.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {meals.map((meal, idx) => (
                  <div key={meal.id || idx} style={{ borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#0F172A', color: '#fff', padding: '10px 16px', fontWeight: 700, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>MEAL {idx + 1}: {meal.name}</span>
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>
                        {meal.items?.length || 0} items
                      </span>
                    </div>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '14px 16px' }}>
                      {(!meal.items || meal.items.length === 0) ? (
                        <div style={{ fontSize: '13px', color: '#64748B', fontStyle: 'italic' }}>As recommended by coach.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {meal.items.map((item, itemIdx) => (
                            <div key={item.id || itemIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: itemIdx < meal.items.length - 1 ? '8px' : 0, borderBottom: itemIdx < meal.items.length - 1 ? '1px dashed #E2E8F0' : 'none' }}>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A' }}>• {item.name}</span>
                                {item.notes && (
                                  <span style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic', marginLeft: '8px' }}>
                                    ({item.notes})
                                  </span>
                                )}
                              </div>
                              {item.quantity && (
                                <span style={{ fontWeight: 700, fontSize: '13px', color: '#E11D48', backgroundColor: '#FEE2E2', padding: '2px 8px', borderRadius: '4px' }}>
                                  {item.quantity}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COACH INSTRUCTIONS & HYDRATION */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#E11D48" /> Coach Guidelines & Hydration
            </h3>
            <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {plan.instructions || 'Drink 3-4 liters of water daily. Ensure 7-8 hours of sound sleep for proper recovery.'}
            </div>
          </div>

          {/* DOWNLOAD ACTION CARD AT BOTTOM */}
          <div style={{ backgroundColor: '#0F172A', borderRadius: '12px', padding: '20px', textAlign: 'center', color: '#fff' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>Save Your Plan to Your Phone</h3>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 16px 0' }}>
              This temporary link is valid for 14 days. Download the PDF now so you can refer to it anytime offline.
            </p>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              download
              style={{
                backgroundColor: '#E11D48',
                color: '#fff',
                padding: '12px 28px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(225, 29, 72, 0.4)'
              }}
            >
              <Download size={18} /> Download High-Resolution PDF
            </a>
          </div>

        </div>

        {/* FOOTER NOTE */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#64748B' }}>
          GV Fitness • Ahmedabad, India • Designed exclusively for our members
        </div>

      </div>
    </div>
  );
}

