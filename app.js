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
const GEOCODER_SEARCH_ENDPOINT = "https://nominatim.openstreetmap.org/search";

const copy = {
  en: { confirm: "Railway Station to Darbar Sahib on foot. Is that right?", found: "I found the route. Shall we start?", saved: "Thank you. Local people can now verify it.", review: "Your review is saved.", listen: "Listening. Release when you finish." },
  hi: { confirm: "रेलवे स्टेशन से दरबार साहिब तक पैदल रास्ता ढूँढूँ?", found: "रास्ता मिल गया। शुरू करूँ?", saved: "शुक्रिया। अब स्थानीय लोग इसे सत्यापित कर सकते हैं।", review: "आपकी समीक्षा सेव हो गई।", listen: "सुन रहा हूँ। बोलकर बटन छोड़ें।" },
  pa: { confirm: "ਰੇਲਵੇ ਸਟੇਸ਼ਨ ਤੋਂ ਦਰਬਾਰ ਸਾਹਿਬ ਤੱਕ ਪੈਦਲ ਰਸਤਾ ਲੱਭਾਂ?", found: "ਰਸਤਾ ਮਿਲ ਗਿਆ। ਸ਼ੁਰੂ ਕਰਾਂ?", saved: "ਸ਼ੁਕਰੀਆ। ਹੁਣ ਸਥਾਨਕ ਲੋਕ ਇਸਦੀ ਪੁਸ਼ਟੀ ਕਰ ਸਕਦੇ ਹਨ।", review: "ਤੁਹਾਡੀ ਸਮੀਖਿਆ ਸੇਵ ਹੋ ਗਈ।", listen: "ਸੁਣ ਰਿਹਾ ਹਾਂ। ਬੋਲ ਕੇ ਬਟਨ ਛੱਡੋ।" }
};

const state = {
  lang: localStorage.getItem("kidhr-lang") || "en",
  script: localStorage.getItem("kidhr-script") || "roman",
  routeGeometry: null,
  routeOrigin: null,
  routeDestination: null,
  routeAvailable: false,
  routeRequestId: 0,
  originQuery: "",
  destinationQuery: "",
  originCandidates: [],
  destinationCandidates: [],
  activeRouteSteps: [],
  routeInstructionLanguage: "en-US",
  geocodeCache: new Map(),
  lastGeocodeAt: 0,
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

function speak(message, language = state.lang === "pa" ? "pa-IN" : state.lang === "hi" ? "hi-IN" : "en-IN") {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = language;
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
  state.routeRequestId += 1;
  $("#place-choices").replaceChildren();
  const text = query.trim();
  const leadingFrom = text.match(/^from\s+(.+?)\s+(?:to|ton)\s+(.+)$/i);
  const fromPhrase = text.match(/^(.+?)\s+from\s+(.+)$/i);
  const split = text.match(/\s+(?:ton|to|se|से|ਤੋਂ)\s+/i);
  const originText = leadingFrom ? leadingFrom[1].trim() : fromPhrase ? fromPhrase[2].trim() : split ? text.slice(0, split.index).trim() : "";
  const destinationText = leadingFrom ? leadingFrom[2].trim() : fromPhrase ? fromPhrase[1].trim() : split ? text.slice(split.index + split[0].length).trim() : text;
  const matchPlace = value => {
    const normalize = value => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    let normalized = normalize(value);
    let cleaned;
    do {
      cleaned = normalized.replace(/\s+(?:tak|kidhar hai|where is it|jana hai|paidal|walking)$/i, "").trim();
      if (cleaned === normalized) break;
      normalized = cleaned;
    } while (true);
    return places
      .flatMap(place => [place.name, ...place.alias.split("·").map(alias => alias.trim())].map(alias => ({ place, alias })))
      .sort((a, b) => b.alias.length - a.alias.length)
      .find(({ alias }) => {
        const key = alias.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        return normalized === key;
      })?.place || null;
  };
  const originPlace = originText ? matchPlace(originText) : null;
  const destinationPlace = matchPlace(destinationText);
  const currentLocationRequested = !originText || ["my location", "current location", "current position"].includes(originText.toLocaleLowerCase());
  state.routeOrigin = originPlace;
  state.routeDestination = destinationPlace;
  state.originQuery = currentLocationRequested ? "My location" : originText;
  state.destinationQuery = destinationText;
  state.originCandidates = originPlace ? [originPlace] : [];
  state.destinationCandidates = destinationPlace ? [destinationPlace] : [];
  state.routeAvailable = Boolean(originPlace && destinationPlace && originPlace !== destinationPlace);
  state.routeGeometry = null;
  state.activeRouteSteps = [];
  Object.values(state.maps).forEach(syncRouteMap);
  state.requestMode = state.routeAvailable ? "mapped" : currentLocationRequested && destinationText ? "current" : originText && destinationText ? "lookup" : originPlace || destinationPlace ? "unavailable" : "unknown";
  const origin = originPlace?.name || (originText || "Your starting point is not identified");
  const destination = destinationPlace?.name || destinationText || "Destination not identified";
  $("#transcript").value = text;
  $("#origin-value").textContent = origin;
  $("#destination-value").textContent = destination;
  const aliasTitle = $(".alias-note strong");
  const aliasCopy = $(".alias-note span");
  if (state.requestMode === "mapped") {
    aliasTitle.textContent = "Places matched";
    aliasCopy.textContent = "Both endpoints are mapped. I’ll request a pedestrian route between these pins.";
    $("#readback").textContent = `Walking route from ${origin} to ${destination}. Is that right?`;
    $("#confirm-route").textContent = "Haan, yahi hai";
  } else if (state.requestMode === "lookup") {
    aliasTitle.textContent = "Searching the map if needed";
    aliasCopy.textContent = "Known local names are matched first. Other endpoint names will be searched in OpenStreetMap.";
    $("#readback").textContent = `I heard ${originText} to ${destinationText}. I’ll look for both places on the map. Is that right?`;
    $("#confirm-route").textContent = "Search map and route";
  } else if (state.requestMode === "current") {
    aliasTitle.textContent = "Starting from your location";
    aliasCopy.textContent = "Your location is requested only after you confirm this route.";
    $("#readback").textContent = `Use your current location as the start and walk to ${destination}?`;
    $("#confirm-route").textContent = "Use my location";
  } else if (state.requestMode === "unavailable") {
    aliasTitle.textContent = "Place matched";
    aliasCopy.textContent = "I found one place, but need both a start and destination to calculate a route.";
    $("#readback").textContent = `I found ${destination}. Tell me the starting landmark as well so I can find a walking route.`;
    $("#confirm-route").textContent = "Edit request";
  } else {
    aliasTitle.textContent = "Place not matched yet";
    aliasCopy.textContent = "Your words are preserved. Try another name or teach this route to the community.";
    $("#readback").textContent = `I could not safely match “${text}” to a mapped place. Would you like to add it?`;
    $("#confirm-route").textContent = "Teach this route";
  }
  showView("voice");
  speak($("#readback").textContent);
}

async function geocodeEndpoint(query, requestId) {
  const key = query.toLocaleLowerCase().trim();
  if (state.geocodeCache.has(key)) return state.geocodeCache.get(key);
  const wait = Math.max(0, 1100 - (Date.now() - state.lastGeocodeAt));
  if (wait) await new Promise(resolve => setTimeout(resolve, wait));
  if (requestId !== state.routeRequestId) return [];
  state.lastGeocodeAt = Date.now();
  const params = new URLSearchParams({
    q: `${query}, Amritsar, Punjab, India`,
    format: "jsonv2",
    limit: "5",
    countrycodes: "in",
    viewbox: "74.70,31.80,75.02,31.50",
    bounded: "1"
  });
  const response = await fetch(`${GEOCODER_SEARCH_ENDPOINT}?${params}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Place search is unavailable");
  const results = await response.json();
  const placesFound = results.map(result => ({
    name: result.name || result.display_name.split(",")[0],
    alias: result.display_name,
    lat: Number(result.lat),
    lng: Number(result.lon),
    source: "OpenStreetMap"
  })).filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lng));
  state.geocodeCache.set(key, placesFound);
  return placesFound;
}

function renderPlaceChoices() {
  const container = $("#place-choices");
  container.replaceChildren();
  const ambiguous = [
    { key: "origin", label: "Starting point", candidates: state.originCandidates },
    { key: "destination", label: "Destination", candidates: state.destinationCandidates }
  ].filter(item => item.candidates.length > 1);
  if (!ambiguous.length) return;
  const heading = document.createElement("strong");
  heading.textContent = "Choose the matching place";
  container.append(heading);
  ambiguous.forEach(item => {
    const label = document.createElement("p");
    label.textContent = item.label;
    container.append(label);
    item.candidates.forEach((place, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "place-choice";
      button.dataset.endpoint = item.key;
      button.dataset.candidate = String(index);
      button.textContent = `${place.name} · ${place.alias}`;
      container.append(button);
    });
  });
}

function addRouteAction(label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn secondary";
  button.textContent = label;
  button.addEventListener("click", action);
  $("#place-choices").append(button);
}

function renderRouteSteps(steps) {
  const list = $("#preview-steps");
  list.replaceChildren();
  steps.forEach(step => {
    const item = document.createElement("li");
    const content = document.createElement("span");
    const title = document.createElement("strong");
    const detail = document.createElement("small");
    title.textContent = step.title;
    detail.textContent = step.detail;
    content.append(title, detail);
    item.append(content);
    list.append(item);
  });
  list.hidden = steps.length === 0;
  $("#route-summary-cues").textContent = `${steps.length}`;
}

function decodeRouteShape(encoded) {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const points = [];
  const readDelta = () => {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += readDelta();
    lng += readDelta();
    points.push([lat / 1e6, lng / 1e6]);
  }
  return points;
}

async function resolveAndRoute() {
  const requestId = state.routeRequestId;
  $("#place-choices").replaceChildren();
  $("#route-status").textContent = "Looking for these places in OpenStreetMap…";
  $("#route-badge").textContent = "Finding map locations";
  $("#route-badge").className = "state-pill";
  try {
    if (state.requestMode === "current" || ["my location", "current location", "current position"].includes(state.originQuery.toLocaleLowerCase())) {
      if (!navigator.geolocation) throw new Error("Location is unavailable in this browser");
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }));
      if (requestId !== state.routeRequestId) return;
      const locationPlace = { name: "Your current location", alias: "Device location", lat: position.coords.latitude, lng: position.coords.longitude, source: "GPS" };
      state.originCandidates = [locationPlace];
      state.routeOrigin = locationPlace;
    }
    if (!state.originCandidates.length) state.originCandidates = await geocodeEndpoint(state.originQuery, requestId);
    if (requestId !== state.routeRequestId) return;
    if (!state.destinationCandidates.length) state.destinationCandidates = await geocodeEndpoint(state.destinationQuery, requestId);
    if (requestId !== state.routeRequestId) return;
    if (!state.originCandidates.length || !state.destinationCandidates.length) {
      const missing = !state.originCandidates.length ? state.originQuery : state.destinationQuery;
      $("#route-status").textContent = `I couldn’t find “${missing}” in the Amritsar map results. Edit the name or add a public landmark.`;
      $("#route-badge").textContent = "Place not found";
      const back = document.createElement("button");
      back.type = "button";
      back.className = "btn secondary";
      back.dataset.view = "home";
      back.textContent = "Edit the request";
      back.addEventListener("click", () => showView("home"));
      $("#place-choices").append(back);
      const contribute = document.createElement("button");
      contribute.type = "button";
      contribute.className = "btn secondary";
      contribute.textContent = "Teach kidhr this place";
      contribute.addEventListener("click", () => {
        $("#contrib-origin").value = state.originQuery;
        $("#contrib-destination").value = state.destinationQuery;
        showView("contribute");
      });
      $("#place-choices").append(contribute);
      return;
    }
    if (state.originCandidates.length === 1) state.routeOrigin = state.originCandidates[0];
    if (state.destinationCandidates.length === 1) state.routeDestination = state.destinationCandidates[0];
    renderPlaceChoices();
    Object.values(state.maps).forEach(syncRouteMap);
    const hasAmbiguity = state.originCandidates.length > 1 || state.destinationCandidates.length > 1;
    if (hasAmbiguity) {
      $("#route-status").textContent = "More than one place matched. Choose the right start and destination before routing.";
      $("#route-badge").textContent = "Choose map pins";
      return;
    }
    if (state.routeOrigin.lat === state.routeDestination.lat && state.routeOrigin.lng === state.routeDestination.lng) {
      $("#route-status").textContent = "The start and destination resolved to the same map pin. Edit one endpoint and try again.";
      $("#route-badge").textContent = "Choose different places";
      return;
    }
    state.routeAvailable = true;
    loadMappedRoute();
  } catch (error) {
    if (requestId !== state.routeRequestId) return;
    $("#route-status").textContent = "Couldn’t get your location or find a place just now. Your request is still here; edit it to enter both landmarks manually.";
    $("#route-badge").textContent = "Search unavailable";
    addRouteAction("Retry map search", resolveAndRoute);
    const back = document.createElement("button");
    back.type = "button";
    back.className = "btn secondary";
    back.dataset.view = "home";
    back.textContent = "Edit the request";
    back.addEventListener("click", () => showView("home"));
    $("#place-choices").append(back);
  }
}

async function loadMappedRoute() {
  const requestId = state.routeRequestId;
  const origin = state.routeOrigin;
  const destination = state.routeDestination;
  if (!state.routeAvailable || !origin || !destination) return;
  $("#route-distance").textContent = "—";
  $("#route-time").textContent = "—";
  $("#route-status").textContent = "Checking mapped walking streets…";
  $("#start-navigation").disabled = true;
  $("#preview-steps").hidden = true;
  $("#route-note").hidden = true;
  $("#route-title").textContent = `${origin.name} to ${destination.name}`;
  $("#route-description").textContent = "Pedestrian route and turn instructions from mapped OpenStreetMap streets.";
  $("#route-key-start").textContent = origin.name;
  $("#route-key-end").textContent = destination.name;
  const curated = origin.name === "Amritsar Railway Station" && destination.name === "Harmandir Sahib";
  $("#route-badge").textContent = curated ? "◆ Curated route" : "OpenStreetMap walking route";
  $("#route-badge").className = curated ? "verified-badge" : "state-pill";
  const request = {
    locations: [{ lat: origin.lat, lon: origin.lng }, { lat: destination.lat, lon: destination.lng }],
    costing: "pedestrian",
    units: "kilometers",
    language: state.lang === "hi" ? "hi-IN" : "en-US"
  };
  try {
    let response = await fetch(`https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(request))}`);
    let instructionLanguage = request.language;
    if (!response.ok && instructionLanguage !== "en-US") {
      request.language = "en-US";
      instructionLanguage = "en-US";
      response = await fetch(`https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(request))}`);
    }
    if (!response.ok) throw new Error("Routing unavailable");
    const data = await response.json();
    if (requestId !== state.routeRequestId) return;
    const leg = data.trip?.legs?.[0];
    const summary = data.trip?.summary;
    if (!leg || !summary || !leg.shape) throw new Error("No walkable path was returned");
    const coordinates = Array.isArray(leg.shape?.coordinates)
      ? leg.shape.coordinates.map(([lng, lat]) => [lat, lng])
      : typeof leg.shape === "string" ? decodeRouteShape(leg.shape) : [];
    if (coordinates.length < 2) throw new Error("No walkable path was returned");
    state.routeGeometry = coordinates;
    const maneuvers = leg.maneuvers || [];
    state.routeInstructionLanguage = instructionLanguage;
    const maneuverSteps = maneuvers.map(maneuver => ({
          title: maneuver.instruction || "Continue along the mapped route",
          detail: maneuver.length > 0 ? `For ${(maneuver.length * 1000 < 100 ? `${Math.round(maneuver.length * 1000)} m` : `${maneuver.length.toFixed(1)} km`)}.` : ""
        }));
    state.activeRouteSteps = maneuverSteps.length ? maneuverSteps : curated ? routeSteps : [];
    renderRouteSteps(state.activeRouteSteps);
    $("#route-distance").textContent = `${summary.length.toFixed(1)} km`;
    $("#route-time").textContent = `${Math.max(1, Math.round(summary.time / 60))} min`;
    $("#route-status").textContent = instructionLanguage === "en-US" && state.lang !== "en"
      ? "Mapped walking route loaded. Turn instructions are in English because local-language instructions were unavailable."
      : "Mapped pedestrian route loaded from OpenStreetMap data.";
    $("#start-navigation").disabled = false;
    $("#route-note").hidden = !curated;
    if (!state.activeRouteSteps.length) {
      $("#route-status").textContent = "The mapped path is available, but turn-by-turn instructions were not returned. You can view and share the map route.";
      $("#start-navigation").disabled = true;
    }
    Object.values(state.maps).forEach(drawRoute);
  } catch (error) {
    if (requestId !== state.routeRequestId) return;
    if (curated) {
      state.activeRouteSteps = routeSteps;
      renderRouteSteps(state.activeRouteSteps);
      $("#route-status").textContent = "Live routing is unavailable. Stored text directions are available, but no route line is shown.";
      $("#route-badge").textContent = "Curated text directions";
      $("#route-note").hidden = false;
      $("#start-navigation").disabled = false;
    } else {
      $("#route-status").textContent = "Live routing is unavailable. No walking path is shown. Retry the request or choose another destination.";
      $("#route-badge").textContent = "Routing unavailable";
      $("#route-badge").className = "state-pill";
      $("#start-navigation").disabled = true;
    }
    addRouteAction("Retry route", loadMappedRoute);
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
  state.maps[id] = map;
  syncRouteMap(map);
}

function drawRoute(map) {
  syncRouteMap(map);
}

function syncRouteMap(map) {
  map.kidhrLayers?.forEach(layer => map.removeLayer(layer));
  map.kidhrLayers = [];
  const points = [state.routeOrigin, state.routeDestination].filter(Boolean);
  const candidatePins = [state.originCandidates.length > 1 ? state.originCandidates : [], state.destinationCandidates.length > 1 ? state.destinationCandidates : []].flat();
  points.forEach((place, index) => {
    const marker = L.marker([place.lat, place.lng]).addTo(map).bindPopup(`${index === 0 ? "Start" : "Destination"}: ${place.name}`);
    map.kidhrLayers.push(marker);
  });
  candidatePins.forEach(place => {
      const marker = L.marker([place.lat, place.lng]).addTo(map).bindPopup(`Map match: ${place.name}`);
      map.kidhrLayers.push(marker);
    });
  if (state.routeGeometry?.length) {
    const line = L.polyline(state.routeGeometry, { color: "#16352d", weight: 6, opacity: .9 }).addTo(map);
    map.kidhrLayers.push(line);
    map.fitBounds(line.getBounds(), { padding: [30, 30] });
  } else if (points.length || candidatePins.length) {
    const allPoints = [...points, ...candidatePins];
    map.fitBounds(L.latLngBounds(allPoints.map(place => [place.lat, place.lng])), { padding: [30, 30], maxZoom: 15 });
  }
}

function bindHoldToTalk(buttonId, targetId) {
  const button = document.getElementById(buttonId);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition;
  const start = event => {
    event.preventDefault();
    if (!Recognition) {
      toast("Voice recognition is not available here. You can type instead.");
      document.getElementById(targetId)?.focus();
      return;
    }
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
    recognition.onend = () => button.classList.remove("listening");
    try {
      recognition.start();
      button.classList.add("listening");
      toast(copy[state.lang].listen);
      speak(copy[state.lang].listen);
    } catch (_) {}
  };
  const stop = event => {
    event.preventDefault();
    if (recognition) recognition.stop();
    button.classList.remove("listening");
  };
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("pointerleave", event => { if (event.buttons) stop(event); });
  button.addEventListener("contextmenu", event => event.preventDefault());
}

function updateLanguage() {
  localStorage.setItem("kidhr-lang", state.lang);
  $("#language-select").value = state.lang;
  $("#readback").textContent = copy[state.lang].confirm;
  toast(`Reply language changed to ${$("#language-select").selectedOptions[0].textContent}.`);
  speak($("#readback").textContent);
}

function updateNavigation() {
  const steps = state.activeRouteSteps;
  const step = steps[state.navStep];
  if (!step) return;
  $("#navigate-title").textContent = step.title;
  $("#nav-detail").textContent = step.detail;
  $("#step-count").textContent = `Step ${state.navStep + 1} of ${steps.length}`;
  $("#progress-fill").style.width = `${((state.navStep + 1) / steps.length) * 100}%`;
  $("#remaining").textContent = state.navStep === steps.length - 1 ? "Destination ahead" : `${steps.length - state.navStep - 1} steps remaining`;
  speak(`${step.title}. ${step.detail}`, state.routeInstructionLanguage);
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
    if (state.requestMode === "unavailable") {
      const message = "Add both a start and destination, then try again.";
      toast(message); speak(message); showView("home"); return;
    }
    showView("route");
    $("#place-choices").replaceChildren();
    $("#route-summary-cues").textContent = "—";
    $("#preview-steps").hidden = true;
    $("#route-note").hidden = true;
    if (state.requestMode === "lookup" || state.requestMode === "current") {
      $("#start-navigation").disabled = true;
      $("#route-distance").textContent = "—";
      $("#route-time").textContent = "—";
      $("#route-title").textContent = `${state.originQuery} to ${state.destinationQuery}`;
      $("#route-description").textContent = "Looking up the place names and routing between the selected map pins.";
      $("#route-key-start").textContent = state.routeOrigin?.name || state.originQuery;
      $("#route-key-end").textContent = state.routeDestination?.name || state.destinationQuery;
      resolveAndRoute();
      const message = "Searching the map for both places.";
      toast(message); speak(message); return;
    }
    if (state.routeAvailable) {
      loadMappedRoute();
      const message = copy[state.lang].found;
      toast(message); speak(message);
    } else {
      $("#route-title").textContent = `${state.routeOrigin?.name || "Starting point"} to ${state.routeDestination?.name || "Unmatched place"}`;
      $("#route-description").textContent = "Enter a starting point and destination to find a mapped pedestrian route.";
      $("#route-key-start").textContent = state.routeOrigin?.name || "Starting point not identified";
      $("#route-key-end").textContent = state.routeDestination?.name || "Destination not identified";
      $("#route-badge").textContent = "Route unavailable";
      $("#route-badge").className = "state-pill";
      $("#route-status").textContent = "Both endpoint locations are required. Return to Find and enter a start and destination.";
      $("#route-distance").textContent = "—";
      $("#route-time").textContent = "—";
      $("#preview-steps").hidden = true;
      $("#route-note").hidden = true;
      $("#start-navigation").disabled = true;
      Object.values(state.maps).forEach(syncRouteMap);
      const message = "This prototype has no checked walking route for that request. No route has been drawn.";
      toast(message); speak(message);
    }
  });
  $("#place-choices").addEventListener("click", event => {
    const button = event.target.closest("[data-endpoint][data-candidate]");
    if (!button) return;
    const candidates = button.dataset.endpoint === "origin" ? state.originCandidates : state.destinationCandidates;
    const chosen = candidates[Number(button.dataset.candidate)];
    if (!chosen) return;
    if (button.dataset.endpoint === "origin") {
      state.routeOrigin = chosen;
      state.originCandidates = [chosen];
    } else {
      state.routeDestination = chosen;
      state.destinationCandidates = [chosen];
    }
    $("#route-key-start").textContent = state.routeOrigin?.name || "Starting point";
    $("#route-key-end").textContent = state.routeDestination?.name || "Destination";
    $("#route-title").textContent = `${state.routeOrigin?.name || "Starting point"} to ${state.routeDestination?.name || "Destination"}`;
    renderPlaceChoices();
    Object.values(state.maps).forEach(syncRouteMap);
    if (state.routeOrigin && state.routeDestination && state.originCandidates.length === 1 && state.destinationCandidates.length === 1) {
      if (state.routeOrigin.lat === state.routeDestination.lat && state.routeOrigin.lng === state.routeDestination.lng) {
        $("#route-status").textContent = "The start and destination are the same place. Choose a different endpoint.";
        return;
      }
      state.routeAvailable = true;
      loadMappedRoute();
    }
  });
  $("#start-navigation").addEventListener("click", () => { state.navStep = 0; showView("navigate"); updateNavigation(); });
  $("#repeat-step").addEventListener("click", updateNavigation);
  $("#next-step").addEventListener("click", () => { if (state.navStep < state.activeRouteSteps.length - 1) { state.navStep += 1; updateNavigation(); } else { toast("You have reached the destination area."); speak("You have reached the destination area."); } });
  $("#wrong-way").addEventListener("click", () => { const message = "This step is flagged for review. A new route will appear only when a mapped alternative is available."; toast(message); speak(message); });
  $("#stop-nav").addEventListener("click", () => { showView("route"); toast("Navigation stopped. Your route is still here."); });
  $("#share-route").addEventListener("click", async () => { const text = `kidhr route: ${state.routeOrigin?.name || "Unknown start"} to ${state.routeDestination?.name || "Unknown destination"}${state.routeGeometry ? " · mapped walking route" : " · no mapped route available"}`; if (navigator.share) { try { await navigator.share({ title: "kidhr route", text, url: location.href }); return; } catch (_) {} } window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${location.href}`)}`, "_blank", "noopener"); });
  $("#memory-search").addEventListener("input", event => { const query = event.target.value.toLowerCase(); renderMemory(memory.filter(item => `${item.was} ${item.now} ${item.note}`.toLowerCase().includes(query))); });
  $("#memory-grid").addEventListener("click", event => { const button = event.target.closest("[data-view]"); if (button) showView(button.dataset.view); });
  $("#language-select").addEventListener("change", event => { state.lang = event.target.value; updateLanguage(); });
  $$('[data-script]').forEach(button => button.addEventListener("click", () => { state.script = button.dataset.script; localStorage.setItem("kidhr-script", state.script); $$('[data-script]').forEach(item => item.classList.toggle("active", item === button)); $("#readback").textContent = state.script === "native" ? copy[state.lang].confirm : "Railway Station ton Darbar Sahib tak paidal raasta labhan?"; toast("Script changed. Place names remain the same."); }));
  $("#large-text-btn").addEventListener("click", () => { document.body.classList.toggle("large-text"); localStorage.setItem("kidhr-large-text", document.body.classList.contains("large-text")); });
  $("#contribute-form").addEventListener("submit", event => { event.preventDefault(); const claim = { id: crypto.randomUUID(), author: state.deviceUser, origin: $("#contrib-origin").value.trim(), destination: $("#contrib-destination").value.trim(), steps: $("#contrib-steps").value.trim() }; const claims = JSON.parse(localStorage.getItem("kidhr-claims") || "[]"); claims.unshift(claim); localStorage.setItem("kidhr-claims", JSON.stringify(claims)); renderClaim(); event.target.reset(); toast(copy[state.lang].saved); speak(copy[state.lang].saved); setTimeout(() => showView("verify"), 500); });
  $$("[data-vote]").forEach(button => button.addEventListener("click", () => reviewClaim(button.dataset.vote)));
  $("#begin-btn").addEventListener("click", () => { $("#welcome").hidden = true; localStorage.setItem("kidhr-welcomed", "yes"); updateLanguage(); });
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
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js");
}

document.addEventListener("DOMContentLoaded", init);
