import React, { useEffect, useMemo, useState } from 'react';

const SELECTED_KEY='tp_selected_ids';

function unique(xs){ return [...new Set(xs.filter(Boolean))]; }

function QuestionList(){
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(()=>{
    try { return new Set(JSON.parse(localStorage.getItem(SELECTED_KEY) || '[]')); } catch { return new Set(); }
  });
  const [filters, setFilters] = useState({ exam:'', year:'', chapter:'', topic:'' });
  const [meta, setMeta] = useState({ exams:[], years:[], chapters:[], topics:[] });

  useEffect(()=>{ (async()=>{
    try{
      const arr = await fetch('/questions.json').then(r=> r.json());
      setRows(arr||[]);
      setMeta({
        exams: unique(arr.map(x=> x.exam)),
        years: unique(arr.map(x=> x.year)).sort(),
        chapters: unique(arr.map(x=> x.chapter)),
        topics: unique(arr.map(x=> x.topic)),
      });
    }catch{ setRows([]); }
  })(); }, []);

  const filtered = useMemo(()=>{
    let p = rows;
    if (filters.exam) p = p.filter(x=> String(x.exam).toUpperCase()===String(filters.exam).toUpperCase());
    if (filters.year) p = p.filter(x=> String(x.year)===String(filters.year));
    if (filters.chapter) p = p.filter(x=> String(x.chapter)===String(filters.chapter));
    if (filters.topic) p = p.filter(x=> String(x.topic)===String(filters.topic));
    return p;
  }, [rows, filters]);

  function toggle(id){
    setSel(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      try { localStorage.setItem(SELECTED_KEY, JSON.stringify([...s])); } catch {}
      return s;
    });
  }
  function selectAll(){
    const ids = filtered.map(r=> r.id);
    const s = new Set(sel); ids.forEach(x=> s.add(x));
    setSel(s); try { localStorage.setItem(SELECTED_KEY, JSON.stringify([...s])); } catch {}
  }
  function clearSel(){
    setSel(new Set()); try { localStorage.setItem(SELECTED_KEY, JSON.stringify([])); } catch {}
  }

  return (
    <div className="card">
      <h3>Select Questions</h3>
      <div className="grid" style={{gridTemplateColumns:'repeat(2,1fr)', gap:12}}>
        <label>Exam <select value={filters.exam} onChange={e=> setFilters(s=>({...s, exam:e.target.value}))}>
          <option value="">All</option>
          {meta.exams.map(x=> <option key={String(x)} value={x}>{String(x)}</option>)}
        </select></label>
        <label>Year <select value={filters.year} onChange={e=> setFilters(s=>({...s, year:e.target.value}))}>
          <option value="">All</option>
          {meta.years.map(x=> <option key={String(x)} value={x}>{String(x)}</option>)}
        </select></label>
        <label>Chapter <select value={filters.chapter} onChange={e=> setFilters(s=>({...s, chapter:e.target.value}))}>
          <option value="">All</option>
          {meta.chapters.map(x=> <option key={String(x)} value={x}>{String(x)}</option>)}
        </select></label>
        <label>Topic <select value={filters.topic} onChange={e=> setFilters(s=>({...s, topic:e.target.value}))}>
          <option value="">All</option>
          {meta.topics.map(x=> <option key={String(x)} value={x}>{String(x)}</option>)}
        </select></label>
      </div>
      <div className="toolbar" style={{marginTop:8}}>
        <button className="btn" onClick={selectAll}>Select All (Filtered)</button>
        <button className="btn alt" onClick={clearSel}>Clear</button>
        <a className="btn" href="/play">Start Practice</a>
        <span className="muted" style={{marginLeft:'auto'}}>Selected: <strong>{sel.size}</strong> • Showing: {filtered.length} / {rows.length}</span>
      </div>
      <div style={{maxHeight:'60vh', overflow:'auto', marginTop:8}}>
        {filtered.map(r=> (
          <label key={r.id} className="card" style={{display:'grid', gridTemplateColumns:'30px 1fr 60px 60px', gap:8, alignItems:'center'}}>
            <input type="checkbox" checked={sel.has(r.id)} onChange={()=> toggle(r.id)} />
            <div><div className="muted">{r.exam} {r.year} • {r.chapter} • {r.topic}</div><div>{r.question_text}</div></div>
            <div className="muted">{r.difficulty || 'M'}</div>
            <div className="muted">{r.type || 'MCQ'}</div>
          </label>
        ))}
      </div>
    </div>
  );
}

export default QuestionList;
export { QuestionList };
