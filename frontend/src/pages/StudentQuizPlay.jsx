import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Timer as TimerIcon, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTheme, ThemeToggle } from '../context/ThemeContext';
import '../styles/StudentDashboard.css';

const API = "http://127.0.0.1:8000";

/* ─── tiny helpers ─────────────────────────────────────────────── */
const fmtTime = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

/* ─── StudentQuizPlay ───────────────────────────────────────────── */
const StudentQuizPlay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { theme, tokens } = useTheme();

  const [quiz, setQuiz]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const [currentIdx, setCurrentIdx]  = useState(0);
  const [fetchedQuestions, setFetchedQuestions] = useState({}); // { index: questionObj }
  const [loadingQ, setLoadingQ]      = useState(false);

  const [answers, setAnswers]        = useState({});   // { qIdx: optionText }
  const [answerMeta, setAnswerMeta]  = useState({});   // { qIdx: { at: ISOStr, elapsed: secs } }
  const [timeLeft, setTimeLeft]      = useState(0);
  const [submitted, setSubmitted]    = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // score data from server
  const [submitting, setSubmitting]  = useState(false);
  const timerRef    = useRef(null);
  const quizStartAt = useRef(null);  // epoch ms when quiz loaded
  const doSubmitRef = useRef(null);  // always points to latest doSubmit
  const answersRef  = useRef({});    // mirrors answers state — readable from stale closures
  const answerMetaRef = useRef({});  // mirrors answerMeta state

  /* ── fetch quiz ── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { 
      navigate(`/login?redirect=/student/quiz/${id}/play`); 
      return; 
    }

    const load = async () => {
      try {
        const res = await axios.post(
          `${API}/quizzes/${id}/attempt`, {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setQuiz(res.data);
        quizStartAt.current = Date.now();

        const now = Date.now();
        const end = new Date(res.data.end_time).getTime();
        setTimeLeft(isNaN(end) ? 3600 : Math.max(0, Math.round((end - now) / 1000)));
      } catch (err) {
        const detail = err.response?.data?.detail || 'Failed to load quiz.';
        if (detail.includes('already completed')) setAlreadyDone(true);
        setError(detail);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user, navigate]);

  /* ── fetch individual question ── */
  const fetchQuestion = async (idx) => {
    if (fetchedQuestions[idx]) return; // already have it
    setLoadingQ(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API}/quizzes/${id}/questions/${idx}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFetchedQuestions(prev => ({ ...prev, [idx]: res.data }));
    } catch (err) {
      console.error("Failed to fetch question", err);
      // If unauthorized, maybe session expired
      if (err.response?.status === 403) alert("Session access issue. Please try refreshing.");
    } finally {
      setLoadingQ(false);
    }
  };

  useEffect(() => {
    if (!loading && quiz) {
      fetchQuestion(currentIdx);
    }
  }, [currentIdx, loading, quiz]);

  /* ── keep refs in sync with state ── */
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { answerMetaRef.current = answerMeta; }, [answerMeta]);

  /* ── websocket connection ── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Use ws:// for http, wss:// for https
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//127.0.0.1:8000/ws/quiz/${id}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.action === 'KICKED') {
          alert('You have been banned from this quiz by the administrator.');
          navigate('/student/dashboard');
        }
      } catch (err) {
        console.error("WS Parse error", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [id, navigate]);

  /* ── timer ── */
  useEffect(() => {
    if (loading || timeLeft <= 0 || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Use ref so we always call the latest doSubmit with fresh state
          doSubmitRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, submitted]);

  /* ── submit ── */
  const doSubmit = async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    try {
      const token = localStorage.getItem('token');
      // Read from refs so this works even in stale-closure (timer) context
      const currentAnswers = answersRef.current;
      const currentMeta    = answerMetaRef.current;

      const answerList = Object.entries(currentAnswers).map(([qIdx, selectedOption]) => {
        const meta = currentMeta[Number(qIdx)] || {};
        return {
          question_index:   Number(qIdx),
          selected_option:  selectedOption,
          answered_at:      meta.at || new Date().toISOString(),
          elapsed_seconds:  meta.elapsed || 0,
        };
      });

      const res = await axios.post(
        `${API}/quizzes/${id}/submit`,
        { answers: answerList },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmitResult(res.data);
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert('Submission failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSubmitting(false);
    }
  };
  // Keep the ref pointing to the latest version of doSubmit
  doSubmitRef.current = doSubmit;

  const handleSelect = (qIdx, opt) => {
    const now = new Date();
    const elapsedSecs = quizStartAt.current
      ? Math.round((Date.now() - quizStartAt.current) / 1000)
      : 0;
    setAnswers(prev => ({ ...prev, [qIdx]: opt }));
    setAnswerMeta(prev => ({
      ...prev,
      [qIdx]: { at: now.toISOString(), elapsed: elapsedSecs }
    }));
  };

  /* ── loading / error screens ── */
  if (loading) return <Splash msg="Loading your quiz…" />;
  if (alreadyDone) return <AlreadyDoneScreen navigate={navigate} />;
  if (error) return <Splash msg={error} isError />;
  if (submitted) return <SubmittedScreen quiz={quiz} answers={answers} result={submitResult} navigate={navigate} />;

  const total    = quiz.total_questions || 0;
  const currentQ = fetchedQuestions[currentIdx];
  const answered = Object.keys(answers).length;
  const pct = Math.round(((currentIdx + 1) / total) * 100);
  const timerWarning = timeLeft <= 60;

  return (
    <div style={{ ...css.root, background: tokens.bg, color: tokens.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme === 'dark' ? '#1e3358' : '#cbd5e1'}; border-radius: 3px; }

        .opt-card { transition: all 0.18s ease; cursor: pointer; }
        .opt-card:hover { 
          background: ${tokens.surfaceHover} !important; 
          border-color: ${tokens.primary} !important; 
          transform: translateY(-2px); 
          box-shadow: ${tokens.cardShadow}; 
        }

        .nav-btn { transition: all 0.18s ease; cursor: pointer; border: none; }
        .nav-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .nav-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .q-bubble { transition: all 0.14s ease; cursor: pointer; }
        .q-bubble:hover { transform: scale(1.1); }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .timer-warn { animation: pulse 1s infinite; color: ${tokens.danger} !important; }

        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn 0.25s ease both; }

        .play-header {
          height: 60px;
          background: ${tokens.navBg};
          color: ${tokens.navText};
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          transition: background 0.3s;
          gap: 16px;
        }
      `}</style>

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <header className="play-header">
        <div className="brand-area">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/1200px-IEEE_logo.svg.png"
            alt="IEEE" style={{ height: 20, filter: 'brightness(0) invert(1)' }}
          />
          <span className="brand-title">QuizHub</span>
          <span className="brand-badge">LIVE QUIZ</span>
        </div>

        {/* progress - Center aligned in header */}
        <div style={{ ...css.progressArea, flex: '0 1 400px' }}>
          <div style={css.progressLabels}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 500 }}>
              Progress: {currentIdx + 1}/{total}
            </span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '12px' }}>{pct}%</span>
          </div>
          <div style={{ ...css.progressTrack, background: 'rgba(255,255,255,0.15)' }}>
            <div style={{ ...css.progressFill, background: '#fff', width: `${pct}%` }} />
          </div>
        </div>

        {/* timer + user */}
        <div className="header-right">
          <div style={{
            ...css.timerChip,
            background: timerWarning ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
            borderColor: timerWarning ? '#ef4444' : 'rgba(255,255,255,0.2)',
            color: '#fff'
          }} className={timerWarning ? 'timer-warn' : ''}>
            <TimerIcon size={14} />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' }}>{fmtTime(timeLeft)}</span>
          </div>

          <div className="header-divider" />

          <ThemeToggle />

          <div className="header-user-info">
            <div className="profile-circle" style={{ width: 30, height: 30, fontSize: 12 }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
          </div>

          <button
            className="icon-btn"
            title="Logout"
            onClick={() => { if(window.confirm("Quit quiz and logout?")) { logout(); navigate('/login'); } }}
            style={{ width: 32, height: 32 }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ══ BODY ════════════════════════════════════════════════ */}
      <div style={css.body}>

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <aside style={{ ...css.sidebar, background: tokens.sidebarBg, borderRight: `1px solid ${tokens.border}` }}>
          <div style={{ padding: '20px 16px 8px', borderBottom: `1px solid ${tokens.border}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: tokens.textMuted, textTransform: 'uppercase' }}>Question Map</div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: tokens.textMuted }}>
              <span style={{ color: tokens.success, fontWeight: 700 }}>{answered}</span> / {total} answered
            </div>
          </div>

          <div style={css.qGrid}>
            {[...Array(total)].map((_, idx) => {
              const active   = idx === currentIdx;
              const isAnswered = !!answers[idx];
              return (
                <div
                  key={idx}
                  className="q-bubble"
                  onClick={() => setCurrentIdx(idx)}
                  style={{
                    ...css.qBubble,
                    background: active
                      ? tokens.primary
                      : isAnswered ? tokens.activeItem : tokens.surfaceHover,
                    color: active ? '#fff' : isAnswered ? tokens.activeText : tokens.textMuted,
                    border: `2px solid ${active ? tokens.primary : (isAnswered ? tokens.activeItem : 'transparent')}`,
                    fontWeight: active ? 700 : 500
                  }}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>

          {/* answered count badge */}
          <div style={{ ...css.sidebarFooter, borderTop: `1px solid ${tokens.border}` }}>
            <div style={css.progressMini}>
              <div style={{ ...css.progressMiniFill, width: `${(answered / total) * 100}%` }} />
            </div>
            <div style={{ fontSize: '11px', color: tokens.textMuted, marginTop: '8px', fontWeight: 500 }}>
              {Math.round((answered / total) * 100)}% complete
            </div>
          </div>
        </aside>

        {/* ── QUESTION AREA ────────────────────────────────────── */}
        <main style={css.main}>
          <div style={{ ...css.card, background: tokens.surface, border: `1px solid ${tokens.border}`, boxShadow: tokens.cardShadow }} className="fade-in" key={currentIdx}>
            {!currentQ || loadingQ ? (
              <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', border: `3px solid ${tokens.border}`, borderTopColor: tokens.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: tokens.textMuted, fontWeight: 500 }}>Loading question...</p>
              </div>
            ) : (
              <>
                {/* Question header */}
                <div style={css.qHeader}>
                  <div style={css.qBadge}>Question {currentIdx + 1}</div>
                  <div style={{ flex: 1, height: '1px', background: tokens.border }} />
                  <div style={{ fontSize: '12px', color: tokens.textMuted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {answers[currentIdx] ? <><CheckCircle size={14} style={{ color: tokens.success }} /> Answered</> : '○ Not answered'}
                  </div>
                </div>

                {/* Question text */}
                <h2 style={{ ...css.qText, color: tokens.text }}>{currentQ.question}</h2>

                {/* Options */}
                <div style={css.optGrid}>
                  {currentQ.options.map((opt, oIdx) => {
                    const selected = answers[currentIdx] === opt;
                    const label = OPTION_LABELS[oIdx];
                    return (
                      <div
                        key={oIdx}
                        className="opt-card"
                        onClick={() => handleSelect(currentIdx, opt)}
                        style={{
                          ...css.optCard,
                          borderColor: selected ? tokens.primary : tokens.border,
                          background: selected
                            ? (theme === 'dark' ? 'rgba(79,142,247,0.1)' : 'rgba(30,99,181,0.05)')
                            : tokens.surface,
                        }}
                      >
                        <div style={{
                          ...css.optLabel,
                          background: selected ? tokens.primary : (theme === 'dark' ? '#1e3358' : '#f1f5f9'),
                          color: selected ? '#fff' : tokens.textMuted,
                        }}>{label}</div>
                        <div style={{ ...css.optText, color: selected ? tokens.activeText : tokens.text, fontWeight: selected ? 600 : 400 }}>
                          {opt}
                        </div>
                        {selected && (
                          <div style={{ marginLeft: 'auto', color: tokens.primary }}><CheckCircle size={18} /></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Navigation */}
            <div style={{ ...css.navRow, borderTop: `1px solid ${tokens.border}` }}>
              <button
                className="nav-btn"
                style={{ ...css.btn, ...css.btnGhost, visibility: currentIdx > 0 ? 'visible' : 'hidden' }}
                onClick={() => setCurrentIdx(p => p - 1)}
              > <ChevronLeft size={16} style={{ marginRight: 4 }} /> Previous </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                {currentIdx < total - 1 ? (
                  <button
                    className="nav-btn"
                    style={{ ...css.btn, ...css.btnBlue, display: 'flex', alignItems: 'center' }}
                    onClick={() => setCurrentIdx(p => p + 1)}
                  > Next <ChevronRight size={16} style={{ marginLeft: 4 }} /> </button>
                ) : (
                  <button
                    className="nav-btn"
                    style={{ ...css.btn, ...css.btnGreen }}
                    onClick={doSubmit}
                    disabled={submitting}
                  > {submitting ? 'Submitting…' : '🏁 Submit Quiz'} </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

/* ── Splash ─────────────────────────────────────────────────────── */
const Splash = ({ msg, isError }) => {
  const { tokens } = useTheme();
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: tokens.bg, fontFamily: "'Inter', sans-serif", flexDirection: 'column', gap: '20px',
      transition: 'background 0.3s'
    }}>
      {!isError && (
        <div style={{
          width: '48px', height: '48px', border: `4px solid ${tokens.border}`,
          borderTopColor: tokens.primary, borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color: isError ? tokens.danger : tokens.textMuted, fontSize: '16px', fontWeight: 500, textAlign: 'center', padding: '0 24px' }}>{msg}</p>
    </div>
  );
};

/* ── AlreadyDoneScreen ──────────────────────────────────────────── */
const AlreadyDoneScreen = ({ navigate }) => {
  const { tokens } = useTheme();
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: tokens.bg, fontFamily: "'Inter', sans-serif",
      transition: 'background 0.3s'
    }}>
      <div style={{
        background: tokens.surface, borderRadius: '20px', padding: '48px',
        textAlign: 'center', maxWidth: '420px', border: `1px solid ${tokens.border}`,
        boxShadow: tokens.cardShadow
      }}>
        <div style={{ fontSize: '56px', marginBottom: '20px' }}>🏆</div>
        <h2 style={{ color: tokens.text, fontSize: '26px', fontWeight: 800, marginBottom: '12px' }}>Already Completed!</h2>
        <p style={{ color: tokens.textMuted, marginBottom: '32px', lineHeight: '1.6', fontSize: '15px' }}>
          You have already submitted this quiz. Each contest entry is recorded once to ensure fair scoring.
        </p>
        <button
          onClick={() => navigate('/student/dashboard')}
          style={{
            padding: '12px 32px', background: tokens.primary,
            border: 'none', borderRadius: '10px', color: '#fff',
            fontWeight: 700, fontSize: '15px', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(30,99,181,0.2)'
          }}
        > Back to Dashboard </button>
      </div>
    </div>
  );
};

/* ── SubmittedScreen ────────────────────────────────────────────── */
const SubmittedScreen = ({ quiz, answers, result, navigate }) => {
  const { tokens } = useTheme();
  const total    = quiz.total_questions || 0;
  const answered = result?.answered ?? Object.keys(answers).length;
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: tokens.bg, fontFamily: "'Inter', sans-serif",
      transition: 'background 0.3s'
    }}>
      <div style={{
        background: tokens.surface, borderRadius: '24px', padding: '48px',
        textAlign: 'center', maxWidth: '420px', width: '90%',
        border: `1px solid ${tokens.border}`, boxShadow: tokens.cardShadow
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
        <h2 style={{ color: tokens.text, fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>
          Quiz Submitted!
        </h2>
        <p style={{ color: tokens.textMuted, fontSize: '16px', lineHeight: '1.7', marginBottom: '36px' }}>
          Great effort! You attempted{' '}
          <strong style={{ color: tokens.primary, fontSize: '22px' }}>{answered}</strong>
          {' '}out of{' '}
          <strong style={{ color: tokens.text, fontSize: '22px' }}>{total}</strong>
          {' '}questions.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button
            onClick={() => navigate(`/leaderboard/${quiz._id}`)}
            style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              border: 'none', borderRadius: '12px', color: '#fff',
              fontWeight: 700, fontSize: '16px', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(124,58,237,0.2)'
            }}
          >🏆 View Live Leaderboard</button>
          <button
            onClick={() => navigate('/student/dashboard')}
            style={{
              width: '100%', padding: '14px',
              background: tokens.surfaceHover, border: `1px solid ${tokens.border}`,
              borderRadius: '12px', color: tokens.textMuted,
              fontWeight: 600, fontSize: '15px', cursor: 'pointer'
            }}
          >Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
};

/* ── styles ─────────────────────────────────────────────────────── */
const css = {
  root: {
    display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',
    transition:'background 0.3s, color 0.3s'
  },
  progressArea: {
    display:'flex',flexDirection:'column',gap:'4px'
  },
  progressLabels: {
    display:'flex',justifyContent:'space-between',alignItems:'center'
  },
  progressTrack: {
    height:'5px',borderRadius:'99px',overflow:'hidden'
  },
  progressFill: {
    height:'100%',
    borderRadius:'99px',transition:'width 0.4s ease'
  },
  timerChip: {
    display:'flex',alignItems:'center',gap:'6px',
    padding: '5px 10px', borderRadius: '6px', border: '1px solid',
    fontWeight: 600, fontSize: '13px'
  },
  body: { display:'flex',flex:1,overflow:'hidden' },

  sidebar: {
    width:'220px',
    overflowY:'auto',display:'flex',flexDirection:'column',flexShrink:0,
    transition: 'background 0.3s, border-color 0.3s'
  },
  qGrid: {
    display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',padding:'16px'
  },
  qBubble: {
    width:'38px',height:'38px',borderRadius:'10px',
    display:'flex',alignItems:'center',justifyContent:'center',
    fontSize:'13px',userSelect:'none'
  },
  sidebarFooter: { padding:'12px 16px',marginTop:'auto' },
  progressMini: { height:'4px',background:'rgba(0,0,0,0.1)',borderRadius:'99px',overflow:'hidden' },
  progressMiniFill: {
    height:'100%',background:'var(--success)',
    borderRadius:'99px',transition:'width 0.5s ease'
  },

  main: { flex:1,overflowY:'auto',padding:'24px' },
  card: {
    borderRadius:'16px',
    padding:'36px',
    maxWidth:'800px',margin:'0 auto',
    display:'flex',flexDirection:'column',gap:'32px',
    minHeight:'calc(100vh - 110px)',
    transition: 'background 0.3s, border-color 0.3s'
  },
  qHeader: { display:'flex',alignItems:'center',gap:'12px' },
  qBadge: {
    background:'var(--active-item)',color:'var(--active-text)',
    padding:'4px 12px',borderRadius:'99px',fontSize:'12px',fontWeight:700,
    border:'1px solid var(--border)',whiteSpace:'nowrap'
  },
  qText: { fontSize:'22px',fontWeight:700,lineHeight:1.5 },
  optGrid: { display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' },
  optCard: {
    borderWidth:'2px',borderStyle:'solid',borderRadius:'12px',
    padding:'20px',display:'flex',alignItems:'center',gap:'14px'
  },
  optLabel: {
    width:'34px',height:'34px',borderRadius:'10px',flexShrink:0,
    display:'flex',alignItems:'center',justifyContent:'center',
    fontWeight:700,fontSize:'14px'
  },
  optText: { fontSize:'15px',lineHeight:1.5,flex:1 },
  navRow: {
    display:'flex',justifyContent:'space-between',alignItems:'center',
    paddingTop:'24px',marginTop:'auto'
  },
  btn: {
    padding:'11px 24px',borderRadius:'10px',fontFamily:"'Inter',sans-serif",
    fontWeight:700,fontSize:'14px',border:'none',letterSpacing:'0.2px'
  },
  btnBlue: { background:'var(--primary)',color:'#fff' },
  btnGreen: { background:'var(--success)',color:'#fff' },
  btnGhost: { background:'var(--surface-hover)',color:'var(--text-muted)',border:'1px solid var(--border)' },
};

export default StudentQuizPlay;
