import React, { useState } from 'react';

function PdfImporter(){
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [count, setCount] = useState(0);

  async function onFile(e){
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg('Reading PDF…');
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    try { pdfjsLib.GlobalWorkerOptions.workerSrc = ''; } catch {}
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf, useWorkerFetch:false, isEvalSupported:false, disableFontFace:true }).promise;
    let text = '';
    for (let i=1;i<=pdf.numPages;i++){
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      text += '\n' + tc.items.map(it=> it.str).join(' ');
    }
    // naive parse: split by options (a)
    const blocks = text.split(/(?=\b\(?a\)\s)/i).filter(s=> s.trim().length>40);
    setCount(blocks.length);
    setMsg('Parsed. Download JSON to review and merge.');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(blocks, null, 2)], {type:'application/json'}));
    a.download = 'pdf_blocks.json';
    a.click();
    setBusy(false);
  }

  return (
    <div className="card">
      <h3>Import PDF → Questions (Client-side)</h3>
      <input type="file" accept="application/pdf" onChange={onFile} disabled={busy} />
      <div className="muted" style={{marginTop:6}}>{msg}</div>
      <div className="muted" style={{marginTop:6}}>Extracted blocks: {count}</div>
    </div>
  );
}

export default PdfImporter;
export { PdfImporter };
