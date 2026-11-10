// Measurements are heuristics, not an accessibility audit.
export async function measure(page) {
  return page.evaluate(() => {
    const findings=[];
    const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&Number(s.opacity)>0;};
    const selector=e=>{if(e.id)return '#'+CSS.escape(e.id);const parts=[];while(e&&e.nodeType===1){let s=e.localName;if(e.parentElement){const siblings=[...e.parentElement.children].filter(x=>x.localName===s);if(siblings.length>1)s+=`:nth-of-type(${siblings.indexOf(e)+1})`;}parts.unshift(s);e=e.parentElement;}return parts.join(' > ');};
    if(document.documentElement.scrollWidth>innerWidth+1)findings.push({type:'overflow',selector:'html',width:document.documentElement.scrollWidth,viewport:innerWidth});
    for(const e of document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=link],[tabindex]:not([tabindex="-1"])')){if(!visible(e))continue;const r=e.getBoundingClientRect();if(r.width<44||r.height<44)findings.push({type:'target',selector:selector(e),name:e.getAttribute('aria-label')||e.getAttribute('title')||e.labels?.[0]?.innerText||e.innerText?.trim()||e.getAttribute('placeholder')||'',width:Math.round(r.width),height:Math.round(r.height)});}
    for(const e of document.querySelectorAll('img:not([alt])'))if(visible(e))findings.push({type:'image-alt',selector:selector(e)});
    const rgb=s=>{const m=s.match(/[\d.]+/g);return m?m.map(Number):[0,0,0,0];};
    const lum=c=>{const a=c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
    for(const e of document.querySelectorAll('body *')){if(!visible(e)||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;const s=getComputedStyle(e),fg=rgb(s.color);if(fg[3]!==undefined&&fg[3]<1)continue;let p=e,bg;while(p){const c=rgb(getComputedStyle(p).backgroundColor);if((c[3]??1)>=1){bg=c;break;}p=p.parentElement;}bg??=[255,255,255];const l1=lum(fg),l2=lum(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);const size=parseFloat(s.fontSize),bold=parseInt(s.fontWeight,10)>=700,minimum=size>=24||(size>=18.6667&&bold)?3:4.5;if(ratio+0.001<minimum)findings.push({type:'contrast',selector:selector(e),text:e.textContent.trim().slice(0,100),ratio:Number(ratio.toFixed(2)),minimum});}
    return findings;
  });
}
export function newViolations(oldReport, report) {
  const key=x=>JSON.stringify([x.type,x.selector,x.name,x.text,x.message]);
  return {screens:report.screens.map(s=>{const old=oldReport.screens.find(x=>x.name===s.name&&x.width===s.width);const keys=new Set((old?.findings||[]).map(key));return {...s,findings:s.findings.filter(x=>!keys.has(key(x)))};})};
}
