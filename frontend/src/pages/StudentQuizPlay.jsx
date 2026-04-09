import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

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
  const { user } = useContext(AuthContext);

  const [quiz, setQuiz]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const [currentIdx, setCurrentIdx]  = useState(0);
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
    if (!user) { navigate(`/login?redirect=/student/quiz/${id}/play`); return; }

    const load = async () => {
      try {
        const token = localStorage.getItem('token');
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

  /* ── keep refs in sync with state ── */
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { answerMetaRef.current = answerMeta; }, [answerMeta]);

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
  if (!quiz?.questions?.length) return <Splash msg="This quiz has no questions." />;
  if (submitted) return <SubmittedScreen quiz={quiz} answers={answers} result={submitResult} navigate={navigate} />;

  const total = quiz.questions.length;
  const currentQ = quiz.questions[currentIdx];
  const answered = Object.keys(answers).length;
  const pct = Math.round(((currentIdx + 1) / total) * 100);
  const timerWarning = timeLeft <= 60;

  return (
    <div style={css.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }

        .opt-card { transition: all 0.18s ease; cursor: pointer; }
        .opt-card:hover { background: #1e293b !important; border-color: #60a5fa !important; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(96,165,250,0.15); }

        .nav-btn { transition: all 0.18s ease; cursor: pointer; }
        .nav-btn:hover { opacity: 0.85; transform: translateY(-1px); }

        .q-bubble { transition: all 0.14s ease; cursor: pointer; }
        .q-bubble:hover { transform: scale(1.1); }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .timer-warn { animation: pulse 1s infinite; }

        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn 0.25s ease both; }
      `}</style>

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <header style={css.header}>
        <div style={css.logo}>
          <span style={{color:'#60a5fa',fontWeight:700}}>IEEE</span>
          <span style={{color:'#f1f5f9',fontWeight:600}}> QuizHub</span>
        </div>

        {/* progress */}
        <div style={css.progressArea}>
          <div style={css.progressLabels}>
            <span style={{color:'#94a3b8',fontSize:'13px'}}>
              Question <strong style={{color:'#f1f5f9'}}>{currentIdx+1}</strong> of <strong style={{color:'#f1f5f9'}}>{total}</strong>
            </span>
            <span style={{color:'#60a5fa',fontWeight:600,fontSize:'13px'}}>{pct}%</span>
          </div>
          <div style={css.progressTrack}>
            <div style={{...css.progressFill, width:`${pct}%`}} />
          </div>
        </div>

        {/* timer + user */}
        <div style={css.headerRight}>
          <div style={{
            ...css.timerChip,
            background: timerWarning ? 'rgba(239,68,68,0.15)' : 'rgba(96,165,250,0.1)',
            borderColor: timerWarning ? '#ef4444' : '#334155',
            color: timerWarning ? '#f87171' : '#93c5fd'
          }} className={timerWarning ? 'timer-warn' : ''}>
            <span style={{fontSize:'14px'}}>⏱</span>
            <span style={{fontFamily:'monospace',fontWeight:700,letterSpacing:'1px'}}>{fmtTime(timeLeft)}</span>
          </div>

          <div style={css.userChip}>
            {user?.picture
              ? <img src={user.picture} alt="av" style={css.avatar} />
              : <div style={css.avatarFallback}>{(user?.name||'S')[0].toUpperCase()}</div>
            }
            <div>
              <div style={{fontSize:'13px',fontWeight:600,color:'#f1f5f9'}}>{user?.name||'Student'}</div>
              <div style={{fontSize:'11px',color:'#64748b'}}>#{quiz._id.slice(-5).toUpperCase()}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ══ BODY ════════════════════════════════════════════════ */}
      <div style={css.body}>

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <aside style={css.sidebar}>
          <div style={{padding:'20px 16px 8px',borderBottom:'1px solid #1e293b'}}>
            <div style={{fontSize:'11px',fontWeight:600,letterSpacing:'1px',color:'#475569',textTransform:'uppercase'}}>Question Map</div>
            <div style={{marginTop:'8px',fontSize:'12px',color:'#64748b'}}>
              <span style={{color:'#34d399',fontWeight:600}}>{answered}</span> / {total} answered
            </div>
          </div>

          <div style={css.qGrid}>
            {quiz.questions.map((_, idx) => {
              const active   = idx === currentIdx;
              const answered = !!answers[idx];
              return (
                <div
                  key={idx}
                  className="q-bubble"
                  onClick={() => setCurrentIdx(idx)}
                  style={{
                    ...css.qBubble,
                    background: active
                      ? 'linear-gradient(135deg,#2563eb,#1d4ed8)'
                      : answered ? '#1e3a5f' : '#1e293b',
                    color: active ? '#fff' : answered ? '#93c5fd' : '#64748b',
                    border: active
                      ? '2px solid #60a5fa'
                      : answered ? '2px solid #2563eb' : '2px solid transparent',
                    boxShadow: active ? '0 0 0 3px rgba(96,165,250,0.2)' : 'none',
                    fontWeight: active ? 700 : answered ? 600 : 400
                  }}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>

          {/* answered count badge */}
          <div style={css.sidebarFooter}>
            <div style={css.progressMini}>
              <div style={{...css.progressMiniFill, width:`${(answered/total)*100}%`}} />
            </div>
            <div style={{fontSize:'11px',color:'#475569',marginTop:'6px'}}>{Math.round((answered/total)*100)}% complete</div>
          </div>
        </aside>

        {/* ── QUESTION AREA ────────────────────────────────────── */}
        <main style={css.main}>
          <div style={css.card} className="fade-in" key={currentIdx}>

            {/* Question header */}
            <div style={css.qHeader}>
              <div style={css.qBadge}>Question {currentIdx + 1}</div>
              <div style={{flex:1,height:'1px',background:'#1e293b'}} />
              <div style={{fontSize:'12px',color:'#475569',whiteSpace:'nowrap'}}>
                {answers[currentIdx] ? '✅ Answered' : '○ Not answered'}
              </div>
            </div>

            {/* Question text */}
            <h2 style={css.qText}>{currentQ.question}</h2>

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
                      borderColor: selected ? '#3b82f6' : '#1e293b',
                      background: selected
                        ? 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(29,78,216,0.15))'
                        : '#111827',
                    }}
                  >
                    <div style={{
                      ...css.optLabel,
                      background: selected ? '#2563eb' : '#1e293b',
                      color: selected ? '#fff' : '#64748b',
                    }}>{label}</div>
                    <div style={{...css.optText, color: selected ? '#eff6ff' : '#cbd5e1'}}>
                      {opt}
                    </div>
                    {selected && (
                      <div style={{marginLeft:'auto',color:'#60a5fa',fontSize:'18px',flexShrink:0}}>✓</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={css.navRow}>
              <button
                className="nav-btn"
                style={{...css.btn, ...css.btnGhost, visibility: currentIdx > 0 ? 'visible' : 'hidden'}}
                onClick={() => setCurrentIdx(p => p - 1)}
              > ← Previous </button>

              <div style={{display:'flex',gap:'12px'}}>
                {currentIdx < total - 1 ? (
                  <button
                    className="nav-btn"
                    style={{...css.btn, ...css.btnBlue}}
                    onClick={() => setCurrentIdx(p => p + 1)}
                  > Next → </button>
                ) : (
                  <button
                    className="nav-btn"
                    style={{...css.btn, ...css.btnGreen}}
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
const Splash = ({ msg, isError }) => (
  <div style={{
    display:'flex',justifyContent:'center',alignItems:'center',
    height:'100vh',background:'#0f172a',fontFamily:'Inter,sans-serif',flexDirection:'column',gap:'16px'
  }}>
    {!isError && (
      <div style={{
        width:'48px',height:'48px',border:'4px solid #1e293b',
        borderTopColor:'#3b82f6',borderRadius:'50%',
        animation:'spin 0.8s linear infinite'
      }}/>
    )}
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <p style={{color: isError ? '#f87171' : '#94a3b8', fontSize:'16px',textAlign:'center',padding:'0 20px'}}>{msg}</p>
  </div>
);

/* ── AlreadyDoneScreen ──────────────────────────────────────────── */
const AlreadyDoneScreen = ({ navigate }) => (
  <div style={{
    display:'flex',justifyContent:'center',alignItems:'center',
    height:'100vh',background:'#0f172a',fontFamily:'Inter,sans-serif'
  }}>
    <div style={{
      background:'#1e293b',borderRadius:'16px',padding:'48px',
      textAlign:'center',maxWidth:'420px',border:'1px solid #334155'
    }}>
      <div style={{fontSize:'56px',marginBottom:'16px'}}>🏆</div>
      <h2 style={{color:'#f1f5f9',fontSize:'24px',marginBottom:'8px'}}>Already Completed!</h2>
      <p style={{color:'#94a3b8',marginBottom:'32px',lineHeight:'1.6'}}>
        You have already submitted this quiz. Each quiz can only be attempted once.
      </p>
      <button
        onClick={() => navigate('/student/dashboard')}
        style={{
          padding:'12px 28px',background:'linear-gradient(135deg,#2563eb,#1d4ed8)',
          border:'none',borderRadius:'8px',color:'#fff',
          fontWeight:600,fontSize:'15px',cursor:'pointer'
        }}
      > Back to Dashboard </button>
    </div>
  </div>
);

/* ── SubmittedScreen ────────────────────────────────────────────── */
const SubmittedScreen = ({ quiz, answers, result, navigate }) => {
  const total    = quiz.questions.length;
  const answered = result?.answered ?? Object.keys(answers).length;
  return (
    <div style={{
      display:'flex', justifyContent:'center', alignItems:'center',
      height:'100vh', background:'#0f172a', fontFamily:'Inter,sans-serif'
    }}>
      <div style={{
        background:'linear-gradient(135deg,#1e293b,#0f172a)', borderRadius:'20px', padding:'48px',
        textAlign:'center', maxWidth:'400px', width:'90%',
        border:'1px solid #1e3a5f', boxShadow:'0 25px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{fontSize:'64px', marginBottom:'16px'}}>🎉</div>
        <h2 style={{color:'#f1f5f9', fontSize:'24px', fontWeight:700, marginBottom:'12px'}}>
          Quiz Submitted!
        </h2>
        <p style={{color:'#94a3b8', fontSize:'15px', lineHeight:'1.7', marginBottom:'32px'}}>
          You attempted{' '}
          <strong style={{color:'#60a5fa', fontSize:'20px'}}>{answered}</strong>
          {' '}out of{' '}
          <strong style={{color:'#f1f5f9', fontSize:'20px'}}>{total}</strong>
          {' '}questions.
        </p>
        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
          <button
            onClick={() => navigate(`/student/quiz/${quiz._id}/leaderboard`)}
            style={{
              width:'100%', padding:'13px',
              background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
              border:'none', borderRadius:'10px', color:'#fff',
              fontWeight:600, fontSize:'15px', cursor:'pointer'
            }}
          >🏆 View Leaderboard</button>
          <button
            onClick={() => navigate('/student/dashboard')}
            style={{
              width:'100%', padding:'13px',
              background:'#1e293b', border:'1px solid #334155',
              borderRadius:'10px', color:'#94a3b8',
              fontWeight:500, fontSize:'15px', cursor:'pointer'
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
    background:'#0f172a',fontFamily:"'Inter',sans-serif",color:'#f1f5f9'
  },
  header: {
    height:'64px',background:'rgba(15,23,42,0.95)',
    backdropFilter:'blur(12px)',
    borderBottom:'1px solid #1e293b',
    display:'flex',alignItems:'center',padding:'0 24px',gap:'24px',
    position:'sticky',top:0,zIndex:100,flexShrink:0
  },
  logo: { fontSize:'18px',flexShrink:0,letterSpacing:'-0.3px' },
  progressArea: {
    flex:1,maxWidth:'500px',display:'flex',flexDirection:'column',gap:'6px'
  },
  progressLabels: {
    display:'flex',justifyContent:'space-between',alignItems:'center'
  },
  progressTrack: {
    height:'6px',background:'#1e293b',borderRadius:'99px',overflow:'hidden'
  },
  progressFill: {
    height:'100%',
    background:'linear-gradient(90deg,#2563eb,#60a5fa)',
    borderRadius:'99px',transition:'width 0.4s ease'
  },
  headerRight: {
    display:'flex',alignItems:'center',gap:'12px',flexShrink:0
  },
  timerChip: {
    display:'flex',alignItems:'center',gap:'6px',
    padding:'6px 12px',borderRadius:'8px',border:'1px solid',
    fontWeight:600,fontSize:'14px'
  },
  userChip: {
    display:'flex',alignItems:'center',gap:'10px',
    padding:'6px 12px 6px 6px',
    background:'#1e293b',borderRadius:'10px',border:'1px solid #334155'
  },
  avatar: { width:'30px',height:'30px',borderRadius:'50%',objectFit:'cover' },
  avatarFallback: {
    width:'30px',height:'30px',borderRadius:'50%',
    background:'linear-gradient(135deg,#2563eb,#7c3aed)',
    display:'flex',alignItems:'center',justifyContent:'center',
    fontSize:'13px',fontWeight:700,color:'#fff',flexShrink:0
  },
  body: { display:'flex',flex:1,overflow:'hidden' },

  sidebar: {
    width:'220px',borderRight:'1px solid #1e293b',
    overflowY:'auto',display:'flex',flexDirection:'column',flexShrink:0,
    background:'#0d1520'
  },
  qGrid: {
    display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',padding:'16px'
  },
  qBubble: {
    width:'36px',height:'36px',borderRadius:'8px',
    display:'flex',alignItems:'center',justifyContent:'center',
    fontSize:'12px',userSelect:'none'
  },
  sidebarFooter: { padding:'12px 16px',marginTop:'auto',borderTop:'1px solid #1e293b' },
  progressMini: { height:'4px',background:'#1e293b',borderRadius:'99px',overflow:'hidden' },
  progressMiniFill: {
    height:'100%',background:'linear-gradient(90deg,#10b981,#34d399)',
    borderRadius:'99px',transition:'width 0.5s ease'
  },

  main: { flex:1,overflowY:'auto',padding:'24px' },
  card: {
    background:'#111827',borderRadius:'16px',
    border:'1px solid #1e293b',padding:'36px',
    maxWidth:'900px',margin:'0 auto',
    display:'flex',flexDirection:'column',gap:'32px',
    minHeight:'calc(100vh - 112px)'
  },
  qHeader: { display:'flex',alignItems:'center',gap:'12px' },
  qBadge: {
    background:'rgba(37,99,235,0.15)',color:'#60a5fa',
    padding:'4px 12px',borderRadius:'99px',fontSize:'12px',fontWeight:600,
    border:'1px solid rgba(96,165,250,0.2)',whiteSpace:'nowrap'
  },
  qText: { fontSize:'22px',fontWeight:700,lineHeight:1.5,color:'#f1f5f9' },
  optGrid: { display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' },
  optCard: {
    borderWidth:'2px',borderStyle:'solid',borderRadius:'12px',
    padding:'20px',display:'flex',alignItems:'center',gap:'14px'
  },
  optLabel: {
    width:'32px',height:'32px',borderRadius:'8px',flexShrink:0,
    display:'flex',alignItems:'center',justifyContent:'center',
    fontWeight:700,fontSize:'13px'
  },
  optText: { fontSize:'15px',lineHeight:1.5,flex:1 },
  navRow: {
    display:'flex',justifyContent:'space-between',alignItems:'center',
    paddingTop:'20px',borderTop:'1px solid #1e293b',marginTop:'auto'
  },
  btn: {
    padding:'11px 22px',borderRadius:'8px',fontFamily:"'Inter',sans-serif",
    fontWeight:600,fontSize:'14px',border:'none',letterSpacing:'0.2px'
  },
  btnBlue: { background:'linear-gradient(135deg,#2563eb,#1d4ed8)',color:'#fff' },
  btnGreen: { background:'linear-gradient(135deg,#059669,#10b981)',color:'#fff' },
  btnGhost: { background:'#1e293b',color:'#94a3b8',border:'1px solid #334155' },
};

export default StudentQuizPlay;
