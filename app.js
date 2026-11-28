const places = [
  { name: "Harmandir Sahib", alias: "Darbar Sahib · Golden Temple", icon: "ੴ", lat: 31.6200, lng: 74.8765 },
  { name: "Jallianwala Bagh", alias: "Jallianwala wala bagh", icon: "J", lat: 31.6206, lng: 74.8806 },
  { name: "Hall Gate", alias: "Gandhi Gate", icon: "H", lat: 31.6288, lng: 74.8727 },
  { name: "Amritsar Railway Station", alias: "Railway station", icon: "R", lat: 31.6338, lng: 74.8673 },
  { name: "Akal Takht", alias: "Sri Akal Takht Sahib", icon: "A", lat: 31.6196, lng: 74.8760 },
  { name: "Partition Museum", alias: "Town Hall museum", icon: "P", lat: 31.6254, lng: 74.8794 },
  { name: "Durgiana Temple", alias: "Durgiana Mandir", icon: "D", lat: 31.6294, lng: 74.8661 }
];

const prompts = [
  "Railway station ton Darbar Sahib",
  "Hall Gate se Jallianwala Bagh",
  "Town Hall museum kidhar hai?",
  "Darbar Sahib de kol langar hall",
  "Bus stand ton Hall Bazaar",
  "Durgiana Mandir tak paidal",
  "Akal Takht Sahib jana hai",
  "Hall Gate ke andar purani market",
  "Golden Temple from railway station",
  "Jallianwala Bagh de pichhe wali gali",
  "Katra Ahluwalia market",
  "Partition Museum se Darbar Sahib"
];

const memory = [
  { type: "LOCAL NAME", was: "Darbar Sahib", now: "Harmandir Sahib", note: "A widely used local and devotional name for the present mapped place." },
  { type: "ALSO CALLED", was: "Golden Temple", now: "Harmandir Sahib", note: "English name commonly used by visitors." },
  { type: "OLD NAME", was: "Gandhi Gate", now: "Hall Gate", note: "The historic gateway is still commonly described with both names." },
  { type: "LOCAL REFERENCE", was: "Town Hall", now: "Partition Museum", note: "The museum is located in Amritsar's historic Town Hall complex." },
  { type: "LOCAL NAME", was: "Station", now: "Amritsar Junction", note: "Locals often shorten the railway station name in spoken directions." },
  { type: "NEARBY REFERENCE", was: "Jallianwala wala bagh", now: "Jallianwala Bagh", note: "Colloquial phrasing connected to the current mapped memorial." }
];

const routeSteps = [
  { title: "Walk towards Hall Gate", detail: "Continue on the mapped walking route for about 450 metres." },
  { title: "Pass through Hall Gate", detail: "Enter the old city and continue towards Hall Bazaar." },
  { title: "Continue along Hall Bazaar", detail: "Stay on the pedestrian route through the market." },
  { title: "Follow signs for Heritage Street", detail: "Continue towards Jallianwala Bagh and the pedestrian plaza." },
  { title: "Arrive near Darbar Sahib", detail: "Use the signed public entrance shown on the live map." }
];

const copy = {
  en: { confirm: "Railway Station to Darbar Sahib on foot. Is that right?", found: "I found the route. Shall we start?", saved: "Thank you. Local people can now verify it.", review: "Your review is saved.", listen: "Listening. Release when you finish." },
  hi: { confirm: "रेलवे स्टेशन से दरबार साहिब तक पैदल रास्ता ढूँढूँ?", found: "रास्ता मिल गया। शुरू करूँ?", saved: "शुक्रिया। अब स्थानीय लोग इसे सत्यापित कर सकते हैं।", review: "आपकी समीक्षा सेव हो गई।", listen: "सुन रहा हूँ। बोलकर बटन छोड़ें।" },
  pa: { confirm: "ਰੇਲਵੇ ਸਟੇਸ਼ਨ ਤੋਂ ਦਰਬਾਰ ਸਾਹਿਬ ਤੱਕ ਪੈਦਲ ਰਸਤਾ ਲੱਭਾਂ?", found: "ਰਸਤਾ ਮਿਲ ਗਿਆ। ਸ਼ੁਰੂ ਕਰਾਂ?", saved: "ਸ਼ੁਕਰੀਆ। ਹੁਣ ਸਥਾਨਕ ਲੋਕ ਇਸਦੀ ਪੁਸ਼ਟੀ ਕਰ ਸਕਦੇ ਹਨ।", review: "ਤੁਹਾਡੀ ਸਮੀਖਿਆ ਸੇਵ ਹੋ ਗਈ।", listen: "ਸੁਣ ਰਿਹਾ ਹਾਂ। ਬੋਲ ਕੇ ਬਟਨ ਛੱਡੋ।" }
};

const state = {
  lang: localStorage.getItem("kidhr-lang") || "en",
  script: localStorage.getItem("kidhr-script") || "roman",
  routeGeometry: null,
  maps: {},
  navStep: 0,
  requestMode: "curated",
  deferredInstall: null,
  deviceUser: localStorage.getItem("kidhr-user") || crypto.randomUUID()
};
localStorage.setItem("kidhr-user", state.deviceUser);

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2800);
}

function speak(message) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = state.lang === "pa" ? "pa-IN" : state.lang === "hi" ? "hi-IN" : "en-IN";
  speechSynthesis.speak(utterance);
}

function showView(name, updateHash = true) {
  $$(".view").forEach(view => view.classList.toggle("active", view.dataset.screen === name));
  $$('[data-view]').forEach(button => button.classList.toggle("active", button.dataset.view === name));
  if (updateHash) history.replaceState(null, "", `#${name}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "route") setTimeout(() => initMap("route-map"), 40);
  if (name === "navigate") setTimeout(() => initMap("nav-map"), 40);
}

function renderStaticData() {
  $("#nearby-list").innerHTML = places.slice(0, 4).map(place => `<button class="place-item" data-place="${place.name}"><span class="place-icon">${place.icon}</span><span><strong>${place.name}</strong><small>${place.alias}</small></span><span>›</span></button>`).join("");
  $("#prompt-grid").innerHTML = prompts.map(prompt => `<button class="prompt-chip">“${prompt}”</button>`).join("");
  $("#preview-steps").innerHTML = routeSteps.map(step => `<li><span><strong>${step.title}</strong><small>${step.detail}</small></span></li>`).join("");
  renderMemory(memory);
}

function renderMemory(items) {
  $("#memory-grid").innerHTML = items.length
    ? items.map(item => `<article class="memory-card"><span class="memory-type">${item.type}</span><h2>${item.was}</h2><span>was / is known as</span><div class="now"><span>⌖</span><strong>${item.now}</strong></div><p>${item.note}</p></article>`).join("")
    : '<article class="memory-card"><span class="memory-type">NO MATCH YET</span><h2>Try another local name</h2><p>Your search is still in the box. You can also teach this place from the Teach screen.</p><button class="btn primary" data-view="contribute">Add this place</button></article>';
}

function parseRequest(query) {
  const text = query.trim();
  const lower = text.toLowerCase();
  const hasStation = lower.includes("railway") || lower.includes("station");
  const hasDarbar = lower.includes("darbar") || lower.includes("golden temple") || lower.includes("harmandir");
  let origin = "Your chosen starting point";
  let destination = text;
  let recognized = false;
  if (hasStation) origin = "Amritsar Railway Station";
  if (hasDarbar) { destination = "Harmandir Sahib"; recognized = true; }
  else if (lower.includes("jallianwala")) destination = "Jallianwala Bagh";
  else if (lower.includes("hall gate")) destination = lower.startsWith("hall gate") ? "Jallianwala Bagh" : "Hall Gate";
  else if (lower.includes("partition") || lower.includes("town hall")) destination = "Partition Museum";
  else if (lower.includes("akal takht")) destination = "Akal Takht";
  else if (lower.includes("durgiana")) destination = "Durgiana Temple";
  if (places.some(place => place.name === destination)) recognized = true;
  state.requestMode = hasStation && hasDarbar ? "curated" : recognized ? "nearby" : "unknown";
  $("#transcript").value = text;
  $("#origin-value").textContent = origin;
  $("#destination-value").textContent = destination;
  const aliasTitle = $(".alias-note strong");
  const aliasCopy = $(".alias-note span");
  if (state.requestMode === "curated") {
    aliasTitle.textContent = "“Darbar Sahib” remembered";
    aliasCopy.textContent = "Local name for Harmandir Sahib";
    $("#readback").textContent = copy[state.lang].confirm;
    $("#confirm-route").textContent = "Haan, yahi hai";
  } else if (state.requestMode === "nearby") {
    aliasTitle.textContent = "Place matched";
    aliasCopy.textContent = "A mapped landmark is known, but this pilot has no checked walking route for the full request.";
    $("#readback").textContent = `I found ${destination}. Would you like the nearby curated Station to Darbar Sahib route instead?`;
    $("#confirm-route").textContent = "Show nearby route";
  } else {
    aliasTitle.textContent = "Place not matched yet";
    aliasCopy.textContent = "Your words are preserved. Try another name or teach this route to the community.";
    $("#readback").textContent = `I could not safely match “${text}” to a mapped place. Would you like to add it?`;
    $("#confirm-route").textContent = "Teach this route";
  }
  showView("voice");
  speak($("#readback").textContent);
}

async function loadMappedRoute() {
  const origin = places.find(place => place.name.includes("Railway"));
  const destination = places[0];
  const request = {
    locations: [{ lat: origin.lat, lon: origin.lng }, { lat: destination.lat, lon: destination.lng }],
    costing: "pedestrian",
    units: "kilometers",
    shape_format: "geojson"
  };
  try {
    const response = await fetch(`https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(request))}`);
    if (!response.ok) throw new Error("Routing unavailable");
    const data = await response.json();
    const coordinates = data.trip.legs[0].shape.coordinates.map(([lng, lat]) => [lat, lng]);
    state.routeGeometry = coordinates;
    const summary = data.trip.summary;
    $("#route-distance").textContent = `${summary.length.toFixed(1)} km`;
    $("#route-time").textContent = `${Math.max(1, Math.round(summary.time / 60))} min`;
    $("#route-status").textContent = "Mapped pedestrian route loaded from OpenStreetMap data.";
    Object.values(state.maps).forEach(drawRoute);
  } catch (error) {
    $("#route-status").textContent = "Live routing is unavailable. Stored landmark cues remain visible, and no path has been invented.";
  }
}

function initMap(id) {
  if (state.maps[id]) {
    state.maps[id].invalidateSize();
    return;
  }
  const target = document.getElementById(id);
  if (!target) return;
  if (!window.L) {
    target.innerHTML = '<div style="padding:24px">Map tiles need a network connection. The route steps are still available.</div>';
    return;
  }
  const map = L.map(id, { zoomControl: true }).setView([31.627, 74.872], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
  const origin = places.find(place => place.name.includes("Railway"));
  const destination = places[0];
  L.marker([origin.lat, origin.lng]).addTo(map).bindPopup(origin.name);
  L.marker([destination.lat, destination.lng]).addTo(map).bindPopup(`${destination.name} · ${destination.alias}`);
  state.maps[id] = map;
  drawRoute(map);
}

function drawRoute(map) {
  if (!state.routeGeometry || map.kidhrRoute) return;
  map.kidhrRoute = L.polyline(state.routeGeometry, { color: "#16352d", weight: 6, opacity: .9 }).addTo(map);
  map.fitBounds(map.kidhrRoute.getBounds(), { padding: [30, 30] });
}

function bindHoldToTalk(buttonId, targetId) {
  const button = document.getElementById(buttonId);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition;
  let promptUtterance;
  let promptDelay;
  let isHeld = false;

  const startRecognition = () => {
    if (!isHeld) return;
    recognition = new Recognition();
    recognition.lang = state.lang === "pa" ? "pa-IN" : state.lang === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = event => {
      const transcript = [...event.results].map(result => result[0].transcript).join(" ");
      const target = document.getElementById(targetId);
      if (target) target.value = transcript;
    };
    recognition.onerror = event => {
      button.classList.remove("listening");
      const message = event.error === "not-allowed" ? "Microphone permission was denied. Please type your request." : "I couldn't hear that clearly. Your typed details are still here.";
      toast(message);
      speak(message);
    };
    recognition.onend = () => {
      recognition = null;
      button.classList.remove("listening");
    };
    try {
      recognition.start();
      button.classList.add("listening");
      toast(copy[state.lang].listen);
    } catch (_) {
      recognition = null;
    }
  };

  const start = event => {
    event.preventDefault();
    if (isHeld) return;
    if (!Recognition) {
      toast("Voice recognition is not available here. You can type instead.");
      document.getElementById(targetId)?.focus();
      return;
    }
    isHeld = true;
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      startRecognition();
      return;
    }
    speechSynthesis.cancel();
    promptUtterance = new SpeechSynthesisUtterance(copy[state.lang].listen);
    promptUtterance.lang = state.lang === "pa" ? "pa-IN" : state.lang === "hi" ? "hi-IN" : "en-IN";
    promptUtterance.onend = () => {
      promptUtterance = null;
      promptDelay = setTimeout(startRecognition, 150);
    };
    promptUtterance.onerror = () => {
      promptUtterance = null;
      startRecognition();
    };
    speechSynthesis.speak(promptUtterance);
  };
  const stop = event => {
    event.preventDefault();
    isHeld = false;
    clearTimeout(promptDelay);
    promptDelay = null;
    if (promptUtterance) {
      promptUtterance.onend = null;
      promptUtterance.onerror = null;
      promptUtterance = null;
      speechSynthesis.cancel();
    }
    if (recognition) recognition.stop();
    button.classList.remove("listening");
  };
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("pointerleave", event => { if (event.buttons) stop(event); });
  button.addEventListener("contextmenu", event => event.preventDefault());
}

function updateLanguage(announce = true) {
  localStorage.setItem("kidhr-lang", state.lang);
  $("#language-select").value = state.lang;
  $("#readback").textContent = copy[state.lang].confirm;
  if (!announce) return;
  toast(`Reply language changed to ${$("#language-select").selectedOptions[0].textContent}.`);
  speak($("#readback").textContent);
}

function updateNavigation() {
  const step = routeSteps[state.navStep];
  $("#navigate-title").textContent = step.title;
  $("#nav-detail").textContent = step.detail;
  $("#step-count").textContent = `Step ${state.navStep + 1} of ${routeSteps.length}`;
  $("#progress-fill").style.width = `${((state.navStep + 1) / routeSteps.length) * 100}%`;
  $("#remaining").textContent = state.navStep === routeSteps.length - 1 ? "Destination ahead" : `${Math.max(.2, 2.2 - state.navStep * .5).toFixed(1)} km remaining`;
  speak(`${step.title}. ${step.detail}`);
}

function getClaims() {
  const saved = JSON.parse(localStorage.getItem("kidhr-claims") || "[]");
  return saved.length ? saved : [{ id: "seed-hall-katra", author: "amritsar-neighbour", origin: "Hall Gate", destination: "Katra Ahluwalia", steps: "Enter through Hall Gate, continue along Hall Bazaar and follow the public lane towards Katra Ahluwalia." }];
}

function renderClaim() {
  const claim = getClaims()[0];
  $("#claim-title").textContent = `${claim.origin} to ${claim.destination}`;
  $("#claim-steps").textContent = claim.steps;
  $("#claim-author").textContent = claim.author === state.deviceUser ? "Shared by you" : "Shared by a neighbour";
  $("#claim-card").dataset.claimId = claim.id;
  $("#claim-card").dataset.author = claim.author;
  $("#claim-count").textContent = `${getClaims().length} route${getClaims().length === 1 ? "" : "s"} to check`;
}

function reviewClaim(vote) {
  const card = $("#claim-card");
  if (card.dataset.author === state.deviceUser) {
    const message = "You cannot verify your own route. Another local person needs to review it.";
    toast(message); speak(message); return;
  }
  const reviews = JSON.parse(localStorage.getItem("kidhr-reviews") || "{}");
  if (reviews[card.dataset.claimId]) {
    const message = "You already reviewed this route. Duplicate reviews are not counted.";
    toast(message); speak(message); return;
  }
  reviews[card.dataset.claimId] = { vote, walked: $("#walked-it").checked, note: $("#review-note").value, savedAt: new Date().toISOString() };
  localStorage.setItem("kidhr-reviews", JSON.stringify(reviews));
  toast(copy[state.lang].review);
  speak(copy[state.lang].review);
  $$("[data-vote]").forEach(button => button.disabled = true);
}

function bindEvents() {
  $$('[data-view]').forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
  $$('[data-view-link]').forEach(link => link.addEventListener("click", event => { event.preventDefault(); showView(link.dataset.viewLink); }));
  $("#find-form").addEventListener("submit", event => { event.preventDefault(); parseRequest($("#find-input").value); });
  $("#prompt-grid").addEventListener("click", event => { const button = event.target.closest("button"); if (!button) return; $("#find-input").value = button.textContent.replaceAll("“", "").replaceAll("”", ""); parseRequest($("#find-input").value); });
  $("#nearby-list").addEventListener("click", event => { const button = event.target.closest("button"); if (!button) return; $("#find-input").value = `My location to ${button.dataset.place}`; parseRequest($("#find-input").value); });
  $$('[data-alt]').forEach(button => button.addEventListener("click", () => { $("#transcript").value = button.dataset.alt; parseRequest(button.dataset.alt); }));
  $$('[data-edit-detail]').forEach(button => button.addEventListener("click", () => { $("#transcript").focus(); toast(`Edit only the ${button.dataset.editDetail} words, then confirm again.`); }));
  $("#confirm-route").addEventListener("click", () => {
    if (state.requestMode === "unknown") {
      $("#contrib-destination").value = $("#transcript").value;
      showView("contribute");
      const message = "Your request is preserved. Add public landmarks when you know them.";
      toast(message); speak(message); return;
    }
    showView("route");
    const message = state.requestMode === "nearby" ? "Showing the nearest curated pilot route." : copy[state.lang].found;
    toast(message); speak(message);
  });
  $("#start-navigation").addEventListener("click", () => { state.navStep = 0; showView("navigate"); updateNavigation(); });
  $("#repeat-step").addEventListener("click", updateNavigation);
  $("#next-step").addEventListener("click", () => { if (state.navStep < routeSteps.length - 1) { state.navStep += 1; updateNavigation(); } else { toast("You have reached the destination area."); speak("You have reached the destination area."); } });
  $("#wrong-way").addEventListener("click", () => { const message = "This step is flagged for review. A new route will appear only when a mapped alternative is available."; toast(message); speak(message); });
  $("#stop-nav").addEventListener("click", () => { showView("route"); toast("Navigation stopped. Your route is still here."); });
  $("#share-route").addEventListener("click", async () => { const text = "kidhr route: Amritsar Railway Station to Darbar Sahib · walking route"; if (navigator.share) { try { await navigator.share({ title: "kidhr route", text, url: location.href }); return; } catch (_) {} } window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${location.href}`)}`, "_blank", "noopener"); });
  $("#memory-search").addEventListener("input", event => { const query = event.target.value.toLowerCase(); renderMemory(memory.filter(item => `${item.was} ${item.now} ${item.note}`.toLowerCase().includes(query))); });
  $("#memory-grid").addEventListener("click", event => { const button = event.target.closest("[data-view]"); if (button) showView(button.dataset.view); });
  $("#language-select").addEventListener("change", event => { state.lang = event.target.value; updateLanguage(); });
  $$('[data-script]').forEach(button => button.addEventListener("click", () => { state.script = button.dataset.script; localStorage.setItem("kidhr-script", state.script); $$('[data-script]').forEach(item => item.classList.toggle("active", item === button)); $("#readback").textContent = state.script === "native" ? copy[state.lang].confirm : "Railway Station ton Darbar Sahib tak paidal raasta labhan?"; toast("Script changed. Place names remain the same."); }));
  $("#large-text-btn").addEventListener("click", () => { document.body.classList.toggle("large-text"); localStorage.setItem("kidhr-large-text", document.body.classList.contains("large-text")); });
  $("#contribute-form").addEventListener("submit", event => { event.preventDefault(); const claim = { id: crypto.randomUUID(), author: state.deviceUser, origin: $("#contrib-origin").value.trim(), destination: $("#contrib-destination").value.trim(), steps: $("#contrib-steps").value.trim() }; const claims = JSON.parse(localStorage.getItem("kidhr-claims") || "[]"); claims.unshift(claim); localStorage.setItem("kidhr-claims", JSON.stringify(claims)); renderClaim(); event.target.reset(); toast(copy[state.lang].saved); speak(copy[state.lang].saved); setTimeout(() => showView("verify"), 500); });
  $$("[data-vote]").forEach(button => button.addEventListener("click", () => reviewClaim(button.dataset.vote)));
  $("#begin-btn").addEventListener("click", () => { $("#welcome").hidden = true; localStorage.setItem("kidhr-welcomed", "yes"); updateLanguage(false); });
  $$('[data-welcome-lang]').forEach(button => button.addEventListener("click", () => { $$('[data-welcome-lang]').forEach(item => item.classList.toggle("selected", item === button)); state.lang = button.dataset.welcomeLang; }));
  $("#install-btn").addEventListener("click", async () => { if (state.deferredInstall) { state.deferredInstall.prompt(); await state.deferredInstall.userChoice; state.deferredInstall = null; } else toast("Use your browser menu and choose “Install app” or “Add to Home Screen”."); });
  window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); state.deferredInstall = event; });
}

function init() {
  renderStaticData();
  bindEvents();
  bindHoldToTalk("home-mic", "find-input");
  bindHoldToTalk("voice-mic", "transcript");
  bindHoldToTalk("contribute-mic", "contrib-steps");
  $("#language-select").value = state.lang;
  $$('[data-script]').forEach(button => button.classList.toggle("active", button.dataset.script === state.script));
  if (localStorage.getItem("kidhr-large-text") === "true") document.body.classList.add("large-text");
  if (!localStorage.getItem("kidhr-welcomed")) $("#welcome").hidden = false;
  renderClaim();
  showView(location.hash.slice(1) || "home", false);
  loadMappedRoute();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js");
}

document.addEventListener("DOMContentLoaded", init);
