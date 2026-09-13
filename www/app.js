"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g,
  c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));

async function api(path, body){
  const opt = body ? { method:"POST", headers:{"Content-Type":"application/json"},
                       body:JSON.stringify(body) } : {};
  const r = await fetch(path, opt);
  const t = await r.text();
  let j = {};
  try { j = t ? JSON.parse(t) : {}; }
  catch(e){
    // Almost always a version mismatch: these pages were updated but whatever
    // is serving them was not, so the endpoint simply is not there.
    throw new Error(r.status === 404
      ? path + " is missing. The program serving this page is older than the "
             + "page itself — update PartsCrib.exe, or reflash the board."
      : "Unreadable reply from " + path + " (" + r.status + ")");
  }
  if(r.status === 401 && !path.startsWith("/api/login") && !path.startsWith("/api/me")){
    toLogin();                       // the session ran out mid-job
    throw new Error("Signed out");
  }
  if(!r.ok) throw new Error(j.error || ("Request failed (" + r.status + ")"));
  return j;
}

let ME = null;
function toLogin(){
  const here = location.pathname.replace(/^\//, "") + location.search;
  location.href = "login.html?next=" + encodeURIComponent(here || "index.html");
}
// Nothing renders until we know who is asking. The server enforces the rules
// regardless; this is only so the screen matches what you are allowed to do.
async function requireSession(){
  try{ ME = await api("/api/me"); }
  catch(e){ toLogin(); throw e; }
  // A temporary password gets you exactly one screen until you replace it.
  if(ME.mustChange && !location.pathname.endsWith("password.html")){
    location.replace("password.html");
    throw new Error("password change required");
  }
  startIdleGuard();
  return ME;
}
function isAdmin(){ return !!ME && ME.role === "admin"; }
async function signOut(){
  try{ await api("/api/logout", {}); }catch(e){}
  location.href = "login.html";
}

// Shared password policy for both the self-service change (password.html) and
// admin-assigned temporary passwords (settings.html). This is UX guidance only:
// nothing here stops a raw POST with a weak password, so the same policy must
// eventually be enforced server-side too.
const COMMON_PASSWORDS = new Set([
  "password","password1","password123","12345678","123456789","1234567890",
  "qwerty","qwerty123","letmein","welcome","welcome1","admin","admin123",
  "changeme","abc123456","iloveyou","monkey123","dragon123","master123",
  "football1","baseball1","sunshine1","princess1","passw0rd","starwars1",
  "maintenance","partscrib"
]);
function passwordProblem(pass, opts){
  opts = opts || {};
  const minLen = opts.minLen || 10;
  if(pass.length < minLen) return `At least ${minLen} characters, please.`;
  if(/^(.)\1+$/.test(pass)) return "Not just one character repeated.";
  if(/^[0-9]+$/.test(pass)) return "Add something other than digits.";
  if(COMMON_PASSWORDS.has(pass.toLowerCase())) return "That password is too easy to guess. Pick another.";
  if(opts.username && pass.toLowerCase().includes(opts.username.toLowerCase()))
    return "Don't use your user name in your password.";
  if(opts.notEqualTo && pass === opts.notEqualTo) return "Pick a password you haven't used before.";
  return "";
}

// Client-side login throttle. This is a speed bump for someone using the
// browser UI, NOT brute-force protection — this file is fully visible and the
// check is trivially bypassed by anyone posting to /api/login directly. Real
// protection has to be server-side rate limiting / account lockout.
const LOGIN_THROTTLE_KEY = "pc_login_throttle";
function loginThrottleState(){
  try{ return JSON.parse(localStorage.getItem(LOGIN_THROTTLE_KEY) || "{}"); }
  catch(e){ return {}; }
}
function loginThrottleMs(){
  const s = loginThrottleState();
  const fails = s.fails || 0;
  if(fails < 3) return 0;
  const waitSec = Math.min(30, Math.pow(2, fails - 3));
  const remaining = (s.last || 0) + waitSec * 1000 - Date.now();
  return remaining > 0 ? remaining : 0;
}
function recordLoginFailure(){
  const s = loginThrottleState();
  s.fails = (s.fails || 0) + 1;
  s.last = Date.now();
  localStorage.setItem(LOGIN_THROTTLE_KEY, JSON.stringify(s));
}
function recordLoginSuccess(){
  localStorage.removeItem(LOGIN_THROTTLE_KEY);
}

// Several people share one server and walk away from screens on a shop floor,
// so an idle authenticated tab signs itself out. This only tells the client to
// stop trusting its session and call /api/logout — if the server does not
// independently expire stale sessions, a copied session cookie stays valid
// regardless of what this does.
function startIdleGuard(minutes, warnSeconds){
  const idleMs = (minutes || 20) * 60000;
  const warnMs = (warnSeconds || 60) * 1000;
  let t1, t2;
  function reset(){
    clearTimeout(t1); clearTimeout(t2);
    t1 = setTimeout(() => toast("Signing out soon due to inactivity…", true), idleMs - warnMs);
    t2 = setTimeout(() => signOut(), idleMs);
  }
  ["mousedown","mousemove","keydown","touchstart","wheel","scroll"].forEach(evt =>
    addEventListener(evt, reset, { passive:true }));
  reset();
}

let toastT;
function toast(msg, bad){
  const el = $("toast");
  if(!el){ return; }
  el.textContent = msg;
  el.className = "toast on" + (bad ? " bad" : "");
  clearTimeout(toastT);
  toastT = setTimeout(() => el.className = "toast", 2400);
}

// Every page scrolls the document and nothing else, so the pull-to-refresh
// guard is unambiguous: if we start a drag at the very top and the finger goes
// down, swallow it. Decided on touchstart because the browser commits to the
// gesture on the first pixels of movement, well before any threshold would fire.
(function(){
  let y0 = 0, x0 = 0, armed = false;
  const scrollTop = () =>
    window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  addEventListener("touchstart", e => {
    armed = false;
    if(e.touches.length !== 1) return;
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX;
    armed = scrollTop() <= 0;
  }, { passive:true });
  addEventListener("touchmove", e => {
    if(!armed || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - y0;
    const dx = Math.abs(e.touches[0].clientX - x0);
    if(dy > 0 && dy >= dx) e.preventDefault();
  }, { passive:false });
})();

// Several people share one server, so a tab that has been sitting open is
// probably out of date. Re-check when it comes back to the front, and quietly
// in the background while it is visible.
function keepFresh(reload, seconds){
  let t = null;
  const tick = async () => { if(document.visibilityState === "visible") await reload(); };
  document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "visible") tick();
  });
  addEventListener("focus", tick);
  t = setInterval(tick, (seconds || 15) * 1000);
  return () => clearInterval(t);
}

// The desktop app hides its console once the crib is on screen, so it needs a
// way to tell the window is still open. The board answers the same call and
// ignores it.
(function(){
  const beat = () => fetch("/api/ping", {cache:"no-store"}).catch(()=>{});
  beat();
  setInterval(beat, 4000);
  // A tab that is hidden still counts as open, but beat again on return so a
  // long spell in another window cannot look like a closed one.
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) beat(); });
})();

// Where to go when a page is finished with. Holds a whole relative URL, so a
// form can return to the part it came from rather than always to the list.
function backTo(){
  const b = new URLSearchParams(location.search).get("back");
  return b ? decodeURIComponent(b) : "index.html";
}
function withBack(target, here){
  return target + (target.includes("?") ? "&" : "?") + "back=" + encodeURIComponent(here);
}
const STATE_WORD = { low:"Reorder", over:"Overstocked", ok:"In stock", off:"Not counted" };
