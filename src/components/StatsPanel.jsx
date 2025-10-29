import React, { useEffect, useState } from 'react';

const STATE_KEY='tp_state_v1';

function useStateLocal(key, init){
  const [v, setV] = useState(()=>{
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : init; }catch{return init;}
  });
  useEffect(()=>{ try{ localStorage.setItem(key, JSON.stringify(v)); }catch{} }, [key, v]);
  return [v, setV];
}

export default function StatsPanel(){
  const [state] = useStateLocal(STATE_KEY, { idx: 0, answers: {} });
  const [total, setTotal] = useState(0);
  useEffect(()=>{
    (async ()=>{
      try{
        const arr = await fetch('/questions.json', { cache:'no-store' }).then(r=> r.json());
        setTotal(Array.isArray(arr) ? arr.length : 0);
      }catch{ setTotal(0); }
    })();
  }, []);

  const answers = state.answers || {};
  const attempted = Object.keys(answers).length;
  const correct = Object.values(answers).filter(x=> x && x.ok===true).length;
  const acc = attempted ? Math.round((correct/attempted)*100) : 0;

  const days = new Set();
  Object.values(answers).forEach(x=> { if(x?.ts) { const d = new Date(x.ts); days.add(d.toDateString()); } });
  const streak = days.size;

  return (
    <div className="card">
      <h3 style={{marginTop:0}}>Your Progress</h3>
      <div className="kpi">
        <div className="card"><div className="muted">Attempted</div><div style={{fontSize:22, fontWeight:700}}>{attempted}</div></div>
        <div className="card"><div className="muted">Correct</div><div style={{fontSize:22, fontWeight:700, color:'#1fbb88'}}>{correct}</div></div>
        <div className="card"><div className="muted">Accuracy</div><div style={{fontSize:22, fontWeight:700}}>{acc}%</div></div>
        <div className="card"><div className="muted">Streak</div><div style={{fontSize:22, fontWeight:700}}>{streak}d</div></div>
      </div>
      <hr className="sep" />
      <div className="muted">Coverage</div>
      <div className="pill" style={{display:'inline-block', marginTop:6}}>{attempted} / {total} questions</div>
    </div>
  )
}

export { StatsPanel };