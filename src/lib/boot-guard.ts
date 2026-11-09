/**
 * Boot guard: an inline script (runs before any app chunk) that turns a
 * "white screen after a deploy" into a one-time automatic recovery, and a
 * friendly visible fallback if recovery does not help.
 *
 * Why inline: if the hashed JS/CSS files of an old build 404, no app code runs,
 * so the recovery code cannot live in a chunk.
 *
 * Flow:
 *  1. A <script>/<link> under /_next/static fails, or a ChunkLoadError is thrown
 *     -> recover(): unregister service workers, delete all caches, reload ONCE.
 *  2. If it already tried in the last 60s (or the page never hydrated within
 *     12s) -> show the fallback card with a manual refresh button.
 *  3. <BootReady/> marks the page hydrated, removes the fallback and resets the guard.
 */
export const BOOT_GUARD_SOURCE = `(function(){
  var KEY="bbs-recover-at", WINDOW_MS=60000, WATCHDOG_MS=12000;
  var CHUNK_RE=/ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;
  function now(){return Date.now();}
  function get(){try{return Number(sessionStorage.getItem(KEY)||0);}catch(e){return 0;}}
  function set(){try{sessionStorage.setItem(KEY,String(now()));}catch(e){}}
  function clean(){
    var p=[];
    try{ if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations){
      p.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister();}));}));
    }}catch(e){}
    try{ if(window.caches&&caches.keys){
      p.push(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k);}));}));
    }}catch(e){}
    return Promise.all(p).catch(function(){});
  }
  function hardReload(){ clean().then(function(){ var u=location.pathname+location.search; location.replace(u); }); }
  function fallback(){
    if(document.getElementById("bbs-fallback")) return;
    var d=document.createElement("div");
    d.id="bbs-fallback"; d.setAttribute("role","alert"); d.dir="rtl";
    d.style.cssText="position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:#FAFAF9;color:#1a1a1a;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;text-align:center";
    d.innerHTML='<div style="max-width:340px"><div style="font-size:48px" aria-hidden="true">\u{1F3E0}</div><h1 style="font-size:20px;margin:12px 0 8px">\u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05E6\u05E8\u05D9\u05DB\u05D4 \u05E8\u05E2\u05E0\u05D5\u05DF</h1><p style="font-size:15px;line-height:1.5;color:#57534e;margin:0 0 20px">\u05D9\u05E6\u05D0\u05D4 \u05D2\u05E8\u05E1\u05D4 \u05D7\u05D3\u05E9\u05D4 \u05D5\u05D7\u05DC\u05E7 \u05DE\u05D4\u05E7\u05D1\u05E6\u05D9\u05DD \u05DC\u05D0 \u05E0\u05D8\u05E2\u05DF. \u05DC\u05D7\u05E6\u05D5 \u05DC\u05E8\u05E2\u05E0\u05DF \u05D5\u05D6\u05D4 \u05D9\u05EA\u05D7\u05D1\u05E8 \u05DE\u05D7\u05D3\u05E9. \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E9\u05DC\u05DB\u05DD \u05E9\u05DE\u05D5\u05E8\u05D9\u05DD.</p><button id="bbs-fallback-btn" type="button" style="min-height:48px;padding:0 28px;border:0;border-radius:14px;background:#4F46E5;color:#fff;font-size:16px;font-weight:600;cursor:pointer">\u05E8\u05E2\u05E0\u05D5\u05DF</button></div>';
    // The broken page (often unstyled, so wider than the phone) is hidden: the card
    // is then the only content and is centered on what the user actually sees.
    if(document.body) document.body.style.display="none";
    document.documentElement.style.overflow="hidden";
    var sw=(window.screen&&window.screen.width)||0, iw=window.innerWidth||sw||360;
    d.style.width=(sw&&sw<iw?sw:iw)+"px"; // never wider than the physical screen (RTL: anchored right)
    var sh=(window.screen&&window.screen.height)||0, ih=window.innerHeight||sh||640;
    d.style.height=(sh&&sh<ih?sh:ih)+"px";
    document.documentElement.appendChild(d);
    var b=document.getElementById("bbs-fallback-btn");
    if(b) b.addEventListener("click",function(){ set(); hardReload(); });
  }
  function recover(){
    if(now()-get()<WINDOW_MS){ fallback(); return; }
    set(); hardReload();
  }
  window.__bbsRecover=recover;
  window.__bbsIsChunkError=function(e){ var m=(e&&(e.name+" "+e.message))||String(e||""); return CHUNK_RE.test(m); };
  window.addEventListener("error",function(ev){
    var t=ev&&ev.target;
    if(t&&t!==window&&(t.tagName==="SCRIPT"||t.tagName==="LINK")){
      var u=t.src||t.href||"";
      if(u.indexOf("/_next/static/")>-1) recover();
      return;
    }
    if(ev&&ev.error&&CHUNK_RE.test((ev.error.name||"")+" "+(ev.error.message||""))) recover();
  },true);
  window.addEventListener("unhandledrejection",function(ev){
    var r=ev&&ev.reason; if(r&&CHUNK_RE.test((r.name||"")+" "+(r.message||String(r)))) recover();
  });
  window.addEventListener("load",function(){
    setTimeout(function(){ if(document.documentElement.getAttribute("data-hydrated")!=="1") recover(); },WATCHDOG_MS);
  });
})();`;
