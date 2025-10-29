import React, { useEffect, useMemo, useState } from 'react';

const STATE_KEY='tp_state_v1';
const SELECTED_KEY='tp_selected_ids';

function useLocal(key, init){
  const [v, setV] = useState(()=>{
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : init; } catch { return init; }
  });
  useEffect(()=>{ try{ localStorage.setItem(key, JSON.stringify(v)); }catch{} }, [key, v]);
  return [v, setV];
}

function normalize(q, i){
  const id = q.id || `Q-${i+1}`;
  const options = Array.isArray(q.options) ? q.options.filter(Boolean) : [];
  return { ...q, id, options };
}

function evaluate(q, ans){
  if (q.type === 'NAT') {
    if (typeof q.answerNat !== 'number') return null;
    const prec = q.natPrecision || 0.01;
    const v = parseFloat(ans);
    if (Number.isNaN(v)) return false;
    return Math.abs(v - q.answerNat) <= prec;
  }
  if (!q.answer) return null;
  return String(ans).toLowerCase() === String(q.answer).toLowerCase();
}

function QuestionView({ q, given, onAnswer, onNav, idx, total }){
  const [local, setLocal] = useState(given?.ans ?? (q.type==='NAT' ? '' : ''));
  useEffect(()=> setLocal(given?.ans ?? (q.type==='NAT' ? '' : '')), [q?.id]);

  const verdict = given?.ok;
  const options = q.options || [];
  return (
    <div className="card">
      <div className="muted" style={{marginBottom:6}}>{q.exam || 'GATE'} {q.year || ''} • {q.chapter || 'Fluid Mechanics'} {q.topic ? `• ${q.topic}` : ''} • <span className="pill">{q.difficulty || 'M'}</span></div>
      <div style={{fontSize:18, lineHeight:1.5}}>{q.question_text}</div>
      {q.type !== 'NAT' ? (
        <div className="options" style={{marginTop:12}}>
          {options.map((t, i)=>{
            const key = 'abcd'[i];
            const selected = String(local).toLowerCase()===key;
            const className = verdict==null ? 'option' : selected ? (verdict ? 'option correct' : 'option wrong') : 'option';
            return <div key={i} className={className} onClick={()=> setLocal(key)}>
              <strong style={{marginRight:8}}>{key.toUpperCase()}.</strong> {t}
            </div>;
          })}
        </div>
      ) : (
        <div style={{marginTop:12}}>
          <input type="text" value={local} onChange={(e)=> setLocal(e.target.value)} placeholder="Enter numeric answer" />
        </div>
      )}
      <div className="toolbar" style={{marginTop:12}}>
        <button className="btn" onClick={()=> onAnswer(local)}>Submit</button>
        <button className="btn alt" onClick={()=> onNav(-1)}>&larr; Prev</button>
        <button className="btn" onClick={()=> onNav(+1)}>Next &rarr;</button>
        <span className="muted" style={{marginLeft:'auto'}}>#{idx+1} / {total}</span>
      </div>
      {verdict!=null && q.answer && <div className="muted" style={{marginTop:8}}>Correct option: <strong>{String(q.answer).toUpperCase()}</strong></div>}
      {verdict!=null && q.type==='NAT' && typeof q.answerNat==='number' && <div className="muted" style={{marginTop:8}}>Expected: <strong>{q.answerNat}</strong> &plusmn; {q.natPrecision || 0.01}</div>}
    </div>
  );
}

function QuestionPlayer(){
  const [all, setAll] = useState([]);
  const [pool, setPool] = useState([]);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [state, setState] = useLocal(STATE_KEY, { idx: 0, answers: {} });
  const [err, setErr] = useState(null);

  useEffect(()=>{
    (async ()=>{
      try{
        const res = await fetch('/questions.json', { cache:'no-store' });
        const arr = res.ok ? await res.json() : [];
        const fix = (Array.isArray(arr) ? arr : []).map(normalize);
        setAll(fix);
      }catch(e){
        setErr('Failed to load questions.json');
      }
    })();
  }, []);

  useEffect(()=>{
    let p = [...all];
    // narrow to selected if requested
    if (selectedOnly) {
      try{
        const ids = JSON.parse(localStorage.getItem(SELECTED_KEY) || '[]');
        if (Array.isArray(ids) && ids.length) {
          const s = new Set(ids);
          p = p.filter(x=> s.has(x.id));
        }
      }catch{}
    }
    if (!p.length) p = [...all]; // fallback to all
    setPool(p);
    setState(s=> ({ ...s, idx: Math.min(s.idx, Math.max(0, p.length-1)) }));
  }, [all, selectedOnly]);

  const idx = state.idx || 0;
  const q = pool[idx];
  const given = q ? state.answers[q.id] : undefined;

  function onAnswer(ans){
    if (!q) return;
    const ok = evaluate(q, ans);
    setState(s=>{
      const answers = { ...(s.answers||{}) };
      answers[q.id] = { ans, ok, ts: Date.now() };
      return { ...s, answers };
    });
  }
  function onNav(d){
    const n = Math.max(0, Math.min(pool.length-1, idx + d));
    setState(s=> ({ ...s, idx: n }));
  }

  function shuffle(){
    setPool(p=>{
      const arr = [...p];
      for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
      return arr;
    });
    setState(s=> ({ ...s, idx: 0 }));
  }
  function random25(){
    setPool(p=>{
      const arr = [...p];
      if (arr.length <= 25) return arr;
      const pick = new Set();
      while (pick.size < 25){ pick.add(Math.floor(Math.random()*arr.length)); }
      return [...pick].map(i=> arr[i]);
    });
    setState(s=> ({ ...s, idx: 0 }));
  }

  return (
    <div className="grid" style={{gap:12}}>
      <div className="card">
        <div className="toolbar">
          <button className="btn" onClick={()=> setSelectedOnly(false)}>Start All</button>
          <button className="btn alt" onClick={()=> setSelectedOnly(true)}>Start Selected</button>
          <button className="btn" onClick={shuffle}>Shuffle</button>
          <button className="btn alt" onClick={random25}>Random 25</button>
          <label className="pill">Selected only <input type="checkbox" checked={selectedOnly} onChange={e=> setSelectedOnly(e.target.checked)} /></label>
          <span style={{flex:1}} />
          <input className="pill" placeholder="Jump to ID…" onKeyDown={(e)=>{ if(e.key==='Enter'){ const id=e.currentTarget.value.trim(); const j=pool.findIndex(x=> x.id===id); if(j>=0) setState(s=>({...s, idx:j})); else alert('ID not found.'); }}} />
        </div>
      </div>

      {!pool.length && <div className="card"><div className="muted">Loading or no questions match the current filters.</div></div>}
      {q && <QuestionView q={q} given={given} idx={idx} total={pool.length} onAnswer={onAnswer} onNav={onNav} />}
    </div>
  );
}

export default QuestionPlayer;
export { QuestionPlayer };
