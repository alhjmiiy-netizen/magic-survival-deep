import React from 'react'; import { createRoot } from 'react-dom/client';
import { GLYPH_KEYS, MagicGlyph } from '../src/components/MagicIcons';
createRoot(document.getElementById('r')!).render(
 <div style={{display:'grid',gridTemplateColumns:'repeat(8,120px)',gap:14,padding:20,fontFamily:'sans-serif'}}>
  {GLYPH_KEYS.map(k=><div key={k} style={{textAlign:'center',color:'#cde',fontSize:11}}><MagicGlyph k={k} size={72}/><div>{k}</div></div>)}
 </div>);
