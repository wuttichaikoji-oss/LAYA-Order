import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const FIRESTORE_DATABASE_ID = String(window.LAYA_FIRESTORE_DATABASE_ID || "").trim();
const MENU_CROP = { x: 0.03, y: 0.33, width: 0.94, height: 0.44 };
const MENU_LINE_BLOCKLIST = /^(cover\b|table\b|room\b|guest\b|check\b|total\b|sub\s*total\b|grand\s*total\b|time\b|date\b|cash\b|change\b|vat\b|tax\b|service\b|waiter\b|cashier\b|invoice\b|receipt\b|discount\b|payment\b|amount\b|the taste\b|panadda\b|paraq?ee\b|cover\s*\d+|t\s*:\s*[a-z0-9-]+\b|#?\(?tt\d+\)?)/i;


const MENU_MASTER_SEED = [
  { name: "Deep-Fried Spring Rolls", category: "Appetizer", aliases: ["Deep Fried Spring Rolls", "Spring Rolls"] },
  { name: "Goong Sa-Rong", category: "Appetizer", aliases: ["Goong Sa Rong", "Goong Sarong"] },
  { name: "Tom Yum Goong", category: "Soup", aliases: ["Tomyum Goong"] },
  { name: "Tom Kha Gai", category: "Soup", aliases: ["Tom Kha Kai"] },
  { name: "Thai Seafood Salad", category: "Salad", aliases: [] },
  { name: "Thai Beef Salad", category: "Salad", aliases: [] },
  { name: "Clear Soup with Chicken Mince", category: "Soup", aliases: ["Clear Soup Mince Chicken", "Clear Soup Chicken", "Chicken Mince Clear Soup", "Clear Soup with Pork Mince or Chicken Mince", "Clear Soup Mince", "Clear Soup Mince Chicker", "Clear Soup Mince Chicker"] },
  { name: "Clear Soup with Pork Mince", category: "Soup", aliases: ["Clear Soup Mince Pork", "Clear Soup Pork", "Pork Mince Clear Soup", "Clear Soup with Pork Mince or Chicken Mince"] },
  { name: "French Onion Soup", category: "Soup", aliases: [] },
  { name: "Satay", category: "Appetizer", aliases: ["Satay Chicken", "Chicken Satay"] },
  { name: "Cream of Tomato Soup", category: "Soup", aliases: ["Tomato Soup"] },
  { name: "Cream of Mushroom Soup", category: "Soup", aliases: ["Mushroom Soup"] },
  { name: "Massaman Nue", category: "Main", aliases: ["Massaman Beef"] },
  { name: "Gang Phed Ped Yang", category: "Main", aliases: ["Red Curry Roasted Duck"] },
  { name: "Goong Ma-Kham", category: "Main", aliases: ["Goong Ma Kham"] },
  { name: "Nue Prik Thai Dum", category: "Main", aliases: ["Beef Black Pepper"] },
  { name: "Seabass on Yellow Curry Sauce", category: "Main", aliases: ["Seabass Yellow Curry"] },
  { name: "Panang Chicken Curry", category: "Main", aliases: ["Panang Chicken"] },
  { name: "Gai Phad Med Ma Muang", category: "Main", aliases: ["Chicken Cashew Nut", "Cashew Chicken"] },
  { name: "Pad Kaprow", category: "Main", aliases: ["Pad Kra Pao", "Kaprow"] },
  { name: "Gang Kheaw Waan Gai", category: "Main", aliases: ["Green Curry Chicken"] },
  { name: "Khao Phad", category: "Main", aliases: ["Thai Fried Rice"] },
  { name: "Phad Preaw Wann Moo", category: "Main", aliases: ["Sweet and Sour Pork"] },
  { name: "Wagyu Beef Burger", category: "Sandwich", aliases: ["Wagyu Burger"] },
  { name: "Club Sandwich", category: "Sandwich", aliases: [] },
  { name: "Fish & Chips", category: "Main", aliases: ["Fish and Chips"] },
  { name: "Bolognese", category: "Pasta", aliases: ["Bolognese Spaghetti", "Spaghetti Bolognese", "Bolognese Spaghetii", "Bolognese Spaghetti Pasta"] },
  { name: "Pesto", category: "Pasta", aliases: ["Pesto Spaghetti", "Spaghetti Pesto"] },
  { name: "French Fries", category: "Sides", aliases: ["Fries"] },
  { name: "Chicken Nugget", category: "Kids", aliases: ["Chicken Nuggets"] },
  { name: "Arrabbiata", category: "Pasta", aliases: ["Spaghetti Arrabbiata"] },
  { name: "Carbonara", category: "Pasta", aliases: ["Spaghetti Carbonara"] },
  { name: "Spaghetti Kee Mao", category: "Pasta", aliases: ["Kee Mao Spaghetti"] },
  { name: "Pad Thai Goong", category: "Main", aliases: ["Pad Thai Shrimp"] },
  { name: "Marinara", category: "Pasta", aliases: ["Spaghetti Marinara"] },
  { name: "Meatball", category: "Pasta", aliases: ["Spaghetti Meatball", "Meatballs"] },
  { name: "Tiramisu Cake", category: "Dessert", aliases: ["Tiramisu"] },
  { name: "Chocolate Brownie", category: "Dessert", aliases: ["Chocolate Brownies", "Brownie"] },
  { name: "Vanilla Crème Brûlée", category: "Dessert", aliases: ["Vanilla Creme Brulee", "Creme Brulee"] },
  { name: "Strawberry Panna Cotta", category: "Dessert", aliases: ["Panna Cotta"] },
  { name: "Passion Fruit Mousse", category: "Dessert", aliases: ["Passionfruit Mousse"] },
  { name: "Khao Niaow Ma Muang", category: "Dessert", aliases: ["Mango Sticky Rice"] },
  { name: "Tropical Fruit Plate", category: "Dessert", aliases: ["Fruit Plate"] },
  { name: "Fish Fingers", category: "Kids", aliases: [] },
  { name: "Tuna Sandwich", category: "Sandwich", aliases: [] },
  { name: "Fried Rice", category: "Main", aliases: [] },
  { name: "Kids Chicken Nuggets", category: "Kids", aliases: ["Kids Chicken Nugget"] },
  { name: "Napoletana", category: "Pasta", aliases: ["Spaghetti Napoletana"] },
];

const els = {
  orderForm: document.getElementById("orderForm"),
  photoInput: document.getElementById("photoInput"),
  photoPreviewWrap: document.getElementById("photoPreviewWrap"),
  photoPreview: document.getElementById("photoPreview"),
  ocrTextDraft: document.getElementById("ocrTextDraft"),
  submitBtn: document.getElementById("submitBtn"),
  formStatus: document.getElementById("formStatus"),
  ordersBoard: document.getElementById("ordersBoard"),
  orderCardTemplate: document.getElementById("orderCardTemplate"),
  activeCount: document.getElementById("activeCount"),
  overdueCount: document.getElementById("overdueCount"),
  completedCount: document.getElementById("completedCount"),
  trashZone: document.getElementById("trashZone"),
  voiceToggleBtn: document.getElementById("voiceToggleBtn"),
  testVoiceBtn: document.getElementById("testVoiceBtn"),
  openSetupBtn: document.getElementById("openSetupBtn"),
  setupDialog: document.getElementById("setupDialog"),
  setupNotice: document.getElementById("setupNotice"),
  cfgApiKey: document.getElementById("cfgApiKey"),
  cfgAuthDomain: document.getElementById("cfgAuthDomain"),
  cfgProjectId: document.getElementById("cfgProjectId"),
  cfgStorageBucket: document.getElementById("cfgStorageBucket"),
  cfgMessagingSenderId: document.getElementById("cfgMessagingSenderId"),
  cfgAppId: document.getElementById("cfgAppId"),
  saveConfigBtn: document.getElementById("saveConfigBtn"),
  clearConfigBtn: document.getElementById("clearConfigBtn"),
  imageDialog: document.getElementById("imageDialog"),
  imageDialogImg: document.getElementById("imageDialogImg"),
  imageDialogCaption: document.getElementById("imageDialogCaption"),
  closeImageDialogBtn: document.getElementById("closeImageDialogBtn"),
};

const state = {
  db: null,
  storage: null,
  orders: [],
  orderMap: new Map(),
  voiceEnabled: localStorage.getItem("laya_voice_enabled") === null ? true : loadBoolean("laya_voice_enabled", false),
  alertAudio: null,
  alertPrimed: false,
  alertPlaying: false,
  alertMap: new Map(),
  drag: null,
  ocrQueue: [],
  pendingExceeded30mWrites: new Set(),
  ocrRunning: false,
  ordersQuery: null,
  pollTimer: 0,
  lastSnapshotAt: 0,
  preparedMedia: null,
  menuMaster: new Map(),
  aliasMap: new Map(),
  knowledgeLoaded: false,
};

const hasForm = !!els.orderForm;
const hasBoard = !!els.ordersBoard && !!els.orderCardTemplate;
const hasVoiceControls = !!els.voiceToggleBtn && !!els.testVoiceBtn;
const hasSetupDialog = !!els.setupDialog;
const hasImageDialog = !!els.imageDialog && !!els.imageDialogImg;

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="700" viewBox="0 0 900 700">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="#0f172a"/>
        <stop offset="1" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g fill="#94a3b8" font-family="Arial, sans-serif" text-anchor="middle">
      <text x="450" y="310" font-size="46">Kitchen Order</text>
      <text x="450" y="370" font-size="28">กำลังอัปโหลดรูปหรือยังไม่มีรูปออเดอร์</text>
    </g>
  </svg>
`);

boot();

function boot() {
  registerServiceWorker();
  loadConfigIntoDialog();
  syncVoiceButton();
  bindStaticEvents();
  prepareAlertAudio();

  const config = getFirebaseConfig();
  if (isValidFirebaseConfig(config)) {
    initFirebase(config);
  } else {
    showSetupNotice();
    renderOrders();
  }

  if (hasBoard || hasVoiceControls) {
    setInterval(updateTimersAndAlerts, 1000);
  }
}

function bindStaticEvents() {
  if (hasForm) {
    els.photoInput?.addEventListener("change", handlePhotoPreview);
    els.orderForm.addEventListener("submit", handleOrderSubmit);
  }

  if (hasVoiceControls) {
    els.voiceToggleBtn.addEventListener("click", async () => {
      state.voiceEnabled = !state.voiceEnabled;
      localStorage.setItem("laya_voice_enabled", String(state.voiceEnabled));
      syncVoiceButton();
      if (state.voiceEnabled) {
        await primeAlertAudio();
        await playAlertSignal("ออเดอร์ยังไม่เสร็จนะคะเชฟ", { includeSpeech: false });
      } else {
        stopAlertAudio();
        window.speechSynthesis?.cancel();
      }
    });

    els.testVoiceBtn.addEventListener("click", async () => {
      await primeAlertAudio();
      await playAlertSignal("ออเดอร์ยังไม่เสร็จนะคะเชฟ", { includeSpeech: false });
    });

    const unlockOnce = async () => {
      await primeAlertAudio();
      document.removeEventListener("pointerdown", unlockOnce, true);
      document.removeEventListener("keydown", unlockOnce, true);
      document.removeEventListener("touchstart", unlockOnce, true);
    };
    document.addEventListener("pointerdown", unlockOnce, true);
    document.addEventListener("keydown", unlockOnce, true);
    document.addEventListener("touchstart", unlockOnce, true);
  }

  if (hasSetupDialog && els.openSetupBtn) {
    els.openSetupBtn.addEventListener("click", () => els.setupDialog.showModal());
  }
  els.saveConfigBtn?.addEventListener("click", saveConfigFromDialog);
  els.clearConfigBtn?.addEventListener("click", clearSavedConfig);

  if (hasImageDialog) {
    els.closeImageDialogBtn?.addEventListener("click", () => els.imageDialog.close());
    els.imageDialog.addEventListener("click", (event) => {
      const card = els.imageDialog.querySelector(".image-dialog__card");
      const rect = card?.getBoundingClientRect();
      if (!rect) return;
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) els.imageDialog.close();
    });
  }
}

function initFirebase(config) {
  try {
    const app = initializeApp(config);
    state.db = FIRESTORE_DATABASE_ID ? getFirestore(app, FIRESTORE_DATABASE_ID) : getFirestore(app);
    state.storage = getStorage(app);
    els.setupNotice?.classList.add("hidden");
    primeMenuKnowledge();
    if (hasBoard) initRealtimeOrders();
  } catch (error) {
    console.error(error);
    const hint = FIRESTORE_DATABASE_ID ? ` (Firestore database: ${FIRESTORE_DATABASE_ID})` : "";
    showSetupNotice(`เชื่อม Firebase ไม่สำเร็จ${hint}: ${error.message}`);
  }
}


function primeMenuKnowledge() {
  seedLocalMenuKnowledge();
  loadRemoteMenuKnowledge().catch((error) => {
    console.warn("Menu knowledge load skipped", error);
  });
}

function seedLocalMenuKnowledge() {
  const menuMap = new Map();
  const aliasMap = new Map();

  for (const entry of MENU_MASTER_SEED) {
    const menu = {
      name: String(entry.name || "").trim(),
      category: String(entry.category || "General").trim(),
      active: entry.active !== false,
      aliases: Array.isArray(entry.aliases)
        ? entry.aliases.map((value) => String(value || "").trim()).filter(Boolean)
        : [],
    };
    if (!menu.name) continue;
    menuMap.set(normalizeMenuKey(menu.name), menu);

    for (const alias of menu.aliases) {
      aliasMap.set(normalizeMenuKey(alias), menu.name);
    }
    aliasMap.set(normalizeMenuKey(menu.name), menu.name);
  }

  state.menuMaster = menuMap;
  state.aliasMap = aliasMap;
}

async function loadRemoteMenuKnowledge() {
  if (!state.db) return;

  const menuSnapshot = await getDocs(collection(state.db, "menu_master"));
  if (menuSnapshot.empty) {
    await seedRemoteMenuKnowledge();
  } else {
    for (const docSnap of menuSnapshot.docs) {
      mergeMenuEntry(docSnap.data());
    }
  }

  const aliasSnapshot = await getDocs(collection(state.db, "ocr_alias"));
  for (const docSnap of aliasSnapshot.docs) {
    const data = docSnap.data() || {};
    const raw = String(data.raw || "").trim();
    const menuName = String(data.menuName || "").trim();
    if (raw && menuName) {
      state.aliasMap.set(normalizeMenuKey(raw), menuName);
      ensureMenuExists(menuName);
    }
  }

  state.knowledgeLoaded = true;
}

async function seedRemoteMenuKnowledge() {
  if (!state.db) return;
  const jobs = MENU_MASTER_SEED.map((entry) => {
    const safeId = slugifyMenuId(entry.name);
    return setDoc(doc(state.db, "menu_master", safeId), {
      name: entry.name,
      category: entry.category || "General",
      active: entry.active !== false,
      aliases: Array.isArray(entry.aliases) ? entry.aliases : [],
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
  await Promise.allSettled(jobs);
}

function mergeMenuEntry(data) {
  const name = String(data?.name || "").trim();
  if (!name) return;
  const aliases = Array.isArray(data.aliases)
    ? data.aliases.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  const entry = {
    name,
    category: String(data.category || "General").trim(),
    active: data.active !== false,
    aliases,
  };
  state.menuMaster.set(normalizeMenuKey(name), entry);
  state.aliasMap.set(normalizeMenuKey(name), name);
  for (const alias of aliases) {
    state.aliasMap.set(normalizeMenuKey(alias), name);
  }
}

function ensureMenuExists(name, extra = {}) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return;
  const key = normalizeMenuKey(cleanName);
  if (!state.menuMaster.has(key)) {
    const entry = {
      name: cleanName,
      category: String(extra.category || "General").trim(),
      active: true,
      aliases: Array.isArray(extra.aliases) ? extra.aliases : [],
    };
    state.menuMaster.set(key, entry);
    state.aliasMap.set(key, cleanName);
  }
}

function normalizeMenuKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9ก-๙]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyMenuId(value) {
  return normalizeMenuKey(value).replace(/\s+/g, "-") || uid();
}

function canonicalizeMenuLine(line) {
  const cleaned = cleanupMenuName(line);
  if (!cleaned) return { name: "", raw: "", confidence: 0, matchType: "none" };

  const rawKey = normalizeMenuKey(cleaned);
  const aliasHit = state.aliasMap.get(rawKey);
  if (aliasHit) {
    ensureMenuExists(aliasHit);
    return { name: aliasHit, raw: cleaned, confidence: 1, matchType: rawKey === normalizeMenuKey(aliasHit) ? "exact" : "alias" };
  }

  const exact = state.menuMaster.get(rawKey);
  if (exact?.active !== false) {
    return { name: exact.name, raw: cleaned, confidence: 0.99, matchType: "exact" };
  }

  let best = { score: 0, name: cleaned, matchType: "raw" };
  for (const entry of state.menuMaster.values()) {
    if (entry.active === false) continue;
    const candidates = [entry.name, ...(entry.aliases || [])];
    for (const candidate of candidates) {
      const candidateKey = normalizeMenuKey(candidate);
      const score = scoreMenuSimilarity(rawKey, candidateKey);
      if (score > best.score) {
        best = { score, name: entry.name, matchType: candidateKey === normalizeMenuKey(entry.name) ? "fuzzy" : "alias-fuzzy" };
      }
    }
  }

  if (best.score >= 0.76) {
    ensureMenuExists(best.name);
    return { name: best.name, raw: cleaned, confidence: best.score, matchType: best.matchType };
  }

  return { name: cleaned, raw: cleaned, confidence: 0.2, matchType: "raw" };
}

function scoreMenuSimilarity(inputKey, candidateKey) {
  if (!inputKey || !candidateKey) return 0;
  if (inputKey === candidateKey) return 1;
  if (inputKey.includes(candidateKey) || candidateKey.includes(inputKey)) {
    return 0.93;
  }

  const inputTokens = inputKey.split(" ").filter(Boolean);
  const candidateTokens = candidateKey.split(" ").filter(Boolean);
  const tokenScore = tokenOverlapScore(inputTokens, candidateTokens);
  const editScore = normalizedLevenshteinScore(inputKey, candidateKey);
  return Math.max(editScore * 0.72 + tokenScore * 0.28, tokenScore * 0.9);
}

function tokenOverlapScore(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }
  return overlap / Math.max(a.size, b.size);
}

function normalizedLevenshteinScore(a, b) {
  const distance = levenshteinDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length, 1);
}

function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

async function saveOcrAlias(raw, menuName) {
  const cleanRaw = cleanupMenuName(raw);
  const cleanName = cleanupMenuName(menuName);
  if (!state.db || !cleanRaw || !cleanName) return;
  if (normalizeMenuKey(cleanRaw) === normalizeMenuKey(cleanName)) return;

  state.aliasMap.set(normalizeMenuKey(cleanRaw), cleanName);
  ensureMenuExists(cleanName);
  await setDoc(doc(state.db, "ocr_alias", slugifyMenuId(cleanRaw)), {
    raw: cleanRaw,
    menuName: cleanName,
    count: 1,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

function initRealtimeOrders() {
  state.ordersQuery = query(collection(state.db, "orders"), orderBy("createdAtMs", "desc"));
  onSnapshot(
    state.ordersQuery,
    (snapshot) => {
      state.lastSnapshotAt = Date.now();
      applyOrdersSnapshot(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.error(error);
      setFormStatus(`โหลดข้อมูลบอร์ดไม่สำเร็จ: ${error.message}`, "error");
    }
  );

  if (!state.pollTimer) {
    state.pollTimer = window.setInterval(() => {
      if (Date.now() - state.lastSnapshotAt > 8000) {
        refreshOrdersOnce();
      }
    }, 5000);

    window.addEventListener("focus", () => refreshOrdersOnce(), { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshOrdersOnce();
    });
  }

  refreshOrdersOnce();
}

function handlePhotoPreview(event) {
  const file = event.target.files?.[0];
  if (!file) {
    state.preparedMedia = null;
    els.photoPreviewWrap?.classList.add("hidden");
    setFormStatus("ยังไม่ได้เลือกรูปออเดอร์", "");
    return;
  }
  const url = URL.createObjectURL(file);
  if (els.photoPreview) {
    els.photoPreview.onload = () => URL.revokeObjectURL(url);
    els.photoPreview.src = url;
  }
  els.photoPreviewWrap?.classList.remove("hidden");
  primeSelectedMedia(file);
  setFormStatus(`เลือกรูปแล้ว: ${file.name} — กดปุ่มส่งเพื่อให้ออเดอร์ขึ้นครัวก่อน แล้วรูปกับ OCR จะตามหลัง`, "success");
}

async function handleOrderSubmit(event) {
  event.preventDefault();
  if (!state.db || !state.storage) {
    setFormStatus("กรุณาตั้งค่า Firebase ก่อนใช้งาน", "error");
    els.setupDialog?.showModal();
    return;
  }

  const draftText = cleanMenuText(els.ocrTextDraft?.value.trim() || "");
  const file = els.photoInput?.files?.[0];

  if (!file) {
    setFormStatus("กรุณาแนบรูปออเดอร์ก่อนส่งเข้าบอร์ด", "error");
    return;
  }

  try {
    setLoading(true, "กำลังสร้างบิลใหม่...");

    const createdAtMs = Date.now();
    const initialDoc = {
      billNo: "",
      tableNo: "",
      hostessName: "",
      guestName: "",
      notes: "",
      imageUrl: "",
      rawText: draftText || "กำลังอ่านชื่อเมนูจากรูป...",
      readingText: draftText || "",
      items: draftText ? buildItemsFromText(draftText) : [],
      ocrStatus: draftText ? "manual" : "queued",
      completed: false,
      softDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAtMs,
      completedAtMs: 0,
      completionDurationMs: 0,
      exceeded30m: false,
      exceeded30mAtMs: 0,
      alertPhrase: "ออเดอร์ยังไม่เสร็จนะคะเชฟ",
    };

    const orderRef = await addDoc(collection(state.db, "orders"), initialDoc);
    queueOrderProcessing(orderRef.id, file, draftText);

    resetForm();
    setLoading(false);
    setFormStatus(
      draftText
        ? "ส่งออเดอร์แล้ว รูปกำลังอัปโหลดเข้าระบบด้านหลัง"
        : "ส่งออเดอร์แล้ว รูปจะขึ้นก่อน และ OCR จะเติมชื่อเมนูให้ต่ออัตโนมัติ",
      "success"
    );
  } catch (error) {
    console.error(error);
    setLoading(false);
    setFormStatus(`ส่งออเดอร์ไม่สำเร็จ: ${error.message}`, "error");
  }
}

function queueOrderProcessing(orderId, file, draftText) {
  const preparedMedia = getPreparedMedia(file);
  window.setTimeout(() => {
    uploadOrderImage(orderId, file, draftText, preparedMedia).catch(async (error) => {
      console.error(error);
      await updateOrder(orderId, {
        rawText: "อัปโหลดรูปไม่สำเร็จ กรุณาลองส่งใหม่อีกครั้ง",
        readingText: "",
        ocrStatus: "error",
        updatedAt: serverTimestamp(),
      });
    });
  }, 20);
}

async function uploadOrderImage(orderId, file, draftText, preparedMedia) {
  const uploadBlob = await resolveUploadBlob(file, preparedMedia);
  const fileName = `${Date.now()}-${sanitizeFileName(file.name || "order.jpg")}`;
  const storageRef = ref(state.storage, `orders/${orderId}/${fileName}`);
  await uploadBytes(storageRef, uploadBlob, {
    contentType: uploadBlob.type || file.type || "image/jpeg",
  });
  const imageUrl = await getDownloadURL(storageRef);

  await updateDoc(doc(state.db, "orders", orderId), {
    imageUrl,
    updatedAt: serverTimestamp(),
    ocrStatus: draftText ? "manual" : "processing",
  });

  if (!draftText) {
    enqueueOcrJob(orderId, file, preparedMedia);
  }
}

function enqueueOcrJob(orderId, fileOrBlob, preparedMedia = null) {
  state.ocrQueue.push({ orderId, fileOrBlob, preparedMedia });
  pumpOcrQueue();
}

async function pumpOcrQueue() {
  if (state.ocrRunning || !state.ocrQueue.length) return;

  state.ocrRunning = true;
  const job = state.ocrQueue.shift();

  try {
    const ocrBlob = await resolveOcrBlob(job.fileOrBlob, job.preparedMedia);
    const rawText = await runOCR(ocrBlob);
    const menuText = cleanMenuText(rawText);
    const items = buildItemsFromText(menuText);
    const readingText = items.map((item) => item.text).join("\n");
    await updateDoc(doc(state.db, "orders", job.orderId), {
      rawText: menuText || "OCR อ่านชื่อเมนูไม่ชัด กรุณาเพิ่มรายการด้วยมือ",
      readingText: readingText || "",
      items,
      ocrStatus: menuText ? "done" : "error",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(error);
    await updateDoc(doc(state.db, "orders", job.orderId), {
      rawText: "OCR อ่านชื่อเมนูไม่สำเร็จ กรุณากด + เพิ่ม หรือแก้ไขชื่อเมนูด้วยมือ",
      readingText: "",
      items: [],
      ocrStatus: "error",
      updatedAt: serverTimestamp(),
    });
  } finally {
    state.ocrRunning = false;
    if (state.ocrQueue.length) {
      window.setTimeout(() => pumpOcrQueue(), 60);
    }
  }
}

function renderOrders() {
  if (!hasBoard) return;

  const visibleOrders = getVisibleOrders();
  els.ordersBoard.innerHTML = "";

  if (!visibleOrders.length) {
    els.ordersBoard.classList.add("empty-state");
    els.ordersBoard.innerHTML = `
      <div class="empty-card">
        <h3>ยังไม่มีออเดอร์</h3>
        <p>เมื่อมีการส่งออเดอร์ใหม่จากฝั่ง Hostess การ์ดจะเด้งขึ้นที่นี่แบบเรียลไทม์</p>
      </div>
    `;
    updateStats();
    return;
  }

  els.ordersBoard.classList.remove("empty-state");
  const fragment = document.createDocumentFragment();

  for (const order of visibleOrders) {
    const node = els.orderCardTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.orderId = order.id;

    node.querySelector(".js-title").textContent = "ออเดอร์ใหม่";
    node.querySelector(".js-meta").textContent = `เข้าบอร์ด ${formatDateTime(getOrderCreatedAtMs(order))}`;

    const statusEl = node.querySelector(".js-status");
    statusEl.textContent = "กำลังทำ";
    statusEl.classList.add("is-working");

    const imageEl = node.querySelector(".js-image");
    imageEl.src = order.imageUrl || PLACEHOLDER_IMAGE;

    node.querySelector(".js-ocr-state").textContent = describeOcrState(order.ocrStatus);

    const itemsWrap = node.querySelector(".js-items");
    const items = Array.isArray(order.items) ? order.items : [];
    if (!items.length) {
      itemsWrap.innerHTML = `<div class="muted small">ยังไม่มีชื่อเมนู กรุณากด + เพิ่ม</div>`;
    } else {
      items.forEach((item) => {
        const row = document.createElement("label");
        row.className = `item-row ${item.done ? "done" : ""}`;
        row.dataset.itemId = item.id;
        row.dataset.itemRaw = item.raw || "";
        row.innerHTML = `
          <input type="checkbox" ${item.done ? "checked" : ""} />
          <textarea class="item-textarea" rows="1">${escapeHtml(item.text || "")}</textarea>
        `;
        itemsWrap.appendChild(row);
      });
    }

    const completeBtn = node.querySelector(".js-mark-complete");
    const dragBtn = node.querySelector(".js-drag-delete");

    completeBtn.textContent = "ทำบิลนี้เสร็จแล้ว";
    completeBtn.disabled = false;
    dragBtn.hidden = true;

    autoResizeTextareas(node);
    attachCardEvents(node, order);
    fragment.appendChild(node);
  }

  els.ordersBoard.appendChild(fragment);
  updateTimersAndAlerts();
}

function attachCardEvents(card, order) {
  const addItemBtn = card.querySelector(".js-add-item");
  const completeBtn = card.querySelector(".js-mark-complete");
  const dragBtn = card.querySelector(".js-drag-delete");
  const itemsWrap = card.querySelector(".js-items");
  const imageOpenBtn = card.querySelector(".js-image-open");
  const imageEl = card.querySelector(".js-image");

  const syncItemsDebounced = debounce(async () => {
    const items = collectItemsFromCard(card);
    await syncItems(order.id, items);
  }, 450);

  imageOpenBtn?.addEventListener("click", () => {
    openImageDialog(
      imageEl?.src || "",
      `ออเดอร์ใหม่ • ${formatDateTime(getOrderCreatedAtMs(order))}`
    );
  });

  addItemBtn.addEventListener("click", () => {
    const emptyState = itemsWrap.querySelector(".muted.small");
    if (emptyState) emptyState.remove();

    const row = document.createElement("label");
    row.className = "item-row";
    row.dataset.itemId = uid();
    row.dataset.itemRaw = "";
    row.innerHTML = `
      <input type="checkbox" />
      <textarea class="item-textarea" rows="1" placeholder="พิมพ์ชื่อเมนู"></textarea>
    `;
    itemsWrap.appendChild(row);

    const textarea = row.querySelector("textarea");
    if (textarea) {
      autoResizeTextarea(textarea);
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  });

  completeBtn.addEventListener("click", async () => {
    const latestOrder = state.orderMap.get(order.id) || order;
    await updateOrder(order.id, buildCompletionPatch(latestOrder));
  });

  itemsWrap.addEventListener("change", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type === "checkbox") {
      const items = collectItemsFromCard(card);
      await syncItems(order.id, items);
    }
  });

  itemsWrap.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;
    autoResizeTextarea(target);
    syncItemsDebounced();
  });

  itemsWrap.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      target.blur();
    }
  });

  dragBtn.addEventListener("pointerdown", (event) => startDragDelete(event, order.id, card));
}

function collectItemsFromCard(card) {
  const rows = [...card.querySelectorAll(".item-row")];
  return rows
    .map((row) => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      const textInput = row.querySelector("textarea");
      return {
        id: row.dataset.itemId || uid(),
        text: textInput?.value?.trim() || "",
        done: !!checkbox?.checked,
        raw: row.dataset.itemRaw || "",
      };
    })
    .filter((item) => item.text);
}

async function syncItems(orderId, items) {
  const prevItems = Array.isArray(state.orderMap.get(orderId)?.items)
    ? state.orderMap.get(orderId).items
    : [];
  const prevById = new Map(prevItems.map((item) => [item.id, item]));

  const normalizedItems = items
    .map((item) => {
      const resolved = canonicalizeMenuLine(item.text || item.raw || "");
      return {
        id: item.id || uid(),
        text: resolved.name || String(item.text || "").trim(),
        done: !!item.done,
        raw: String(item.raw || "").trim(),
        matchType: resolved.matchType || "manual",
        confidence: Number(resolved.confidence || 0),
      };
    })
    .filter((item) => item.text);

  const completed = normalizedItems.length > 0 && normalizedItems.every((item) => item.done);
  const latestOrder = state.orderMap.get(orderId) || { id: orderId };
  const basePatch = {
    items: normalizedItems,
    readingText: normalizedItems.map((item) => item.text).join("\n"),
    rawText: normalizedItems.map((item) => item.raw || item.text).join("\n"),
    completed,
    updatedAt: serverTimestamp(),
  };
  const patch = completed
    ? buildCompletionPatch(latestOrder, normalizedItems)
    : {
        ...basePatch,
        completedAtMs: 0,
        completionDurationMs: 0,
      };
  await updateOrder(orderId, patch);

  const learnJobs = [];
  for (const item of normalizedItems) {
    const previous = prevById.get(item.id);
    if (!item.raw || !previous) continue;
    if (normalizeMenuKey(previous.text || "") === normalizeMenuKey(item.text || "")) continue;
    learnJobs.push(saveOcrAlias(item.raw, item.text));
  }
  if (learnJobs.length) {
    Promise.allSettled(learnJobs).catch(() => {});
  }
}


async function updateOrder(orderId, patch) {
  if (!state.db) return;
  try {
    await updateDoc(doc(state.db, "orders", orderId), patch);
  } catch (error) {
    console.error(error);
    setFormStatus(`อัปเดตบิลไม่สำเร็จ: ${error.message}`, "error");
  }
}

function applyOrdersSnapshot(orders) {
  state.orders = orders;
  state.orderMap = new Map(state.orders.map((order) => [order.id, order]));
  renderOrders();
  updateTimersAndAlerts();
}

async function refreshOrdersOnce() {
  if (!state.db || !state.ordersQuery || !hasBoard) return;
  try {
    const snapshot = await getDocs(state.ordersQuery);
    state.lastSnapshotAt = Date.now();
    applyOrdersSnapshot(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (error) {
    console.warn("Fallback refresh failed", error);
  }
}

function primeSelectedMedia(file) {
  if (!file) {
    state.preparedMedia = null;
    return null;
  }

  const key = getFileKey(file);
  if (state.preparedMedia?.key === key) return state.preparedMedia;

  state.preparedMedia = {
    key,
    uploadBlobPromise: optimizeImage(file, { maxSide: 1500, quality: 0.72 }),
    ocrBlobPromise: buildMenuCropBlob(file),
  };

  return state.preparedMedia;
}

function getPreparedMedia(file) {
  if (!file) return null;
  const key = getFileKey(file);
  if (state.preparedMedia?.key === key) return state.preparedMedia;
  return primeSelectedMedia(file);
}

async function resolveUploadBlob(file, preparedMedia) {
  try {
    return (await preparedMedia?.uploadBlobPromise) || file;
  } catch (error) {
    console.warn("Prepared upload blob failed", error);
    return file;
  }
}

async function resolveOcrBlob(file, preparedMedia) {
  try {
    return (await preparedMedia?.ocrBlobPromise) || (await buildMenuCropBlob(file));
  } catch (error) {
    console.warn("Prepared OCR blob failed", error);
    return await buildMenuCropBlob(file);
  }
}

function getFileKey(file) {
  if (!file) return "";
  return [file.name || "", file.size || 0, file.lastModified || 0].join("::");
}

function updateStats() {
  if (!els.activeCount || !els.overdueCount || !els.completedCount) return;
  const activeCount = state.orders.filter((order) => !order.softDeleted && !order.completed).length;
  const todaysOrders = state.orders.filter((order) => !order.softDeleted && isTodayOrder(order));
  const overdueCount = todaysOrders.filter((order) => hasExceeded30mRecord(order)).length;
  const completedCount = todaysOrders.filter((order) => !!order.completed).length;
  els.activeCount.textContent = String(activeCount);
  els.overdueCount.textContent = String(overdueCount);
  els.completedCount.textContent = String(completedCount);
}

function updateTimersAndAlerts() {
  if (!hasBoard) return;
  const visibleOrders = getVisibleOrders();

  for (const order of visibleOrders) {
    const card = els.ordersBoard.querySelector(`[data-order-id="${order.id}"]`);
    if (!card) continue;

    const elapsedMs = getElapsedMs(order);
    const timerState = getTimerState(order, elapsedMs);
    const elapsedText = formatElapsed(elapsedMs);

    card.querySelector(".js-elapsed").textContent = elapsedText;
    card.classList.remove("status-green", "status-yellow", "status-red", "status-critical");
    card.classList.add(timerState.className);
    card.dataset.timerState = timerState.className;

    if (elapsedMs > 30 * 60 * 1000 && !order.exceeded30m) {
      markOrderExceeded30m(order);
    }

    maybeTriggerAlert(order, elapsedMs);
  }

  updateStats();
}

function markOrderExceeded30m(order) {
  if (!state.db || !order?.id || order?.exceeded30m) return;
  const orderId = String(order.id);
  if (state.pendingExceeded30mWrites.has(orderId)) return;
  state.pendingExceeded30mWrites.add(orderId);
  updateDoc(doc(state.db, 'orders', orderId), {
    exceeded30m: true,
    exceeded30mAtMs: Number(order?.exceeded30mAtMs || 0) > 0 ? Number(order.exceeded30mAtMs) : Date.now(),
    updatedAt: serverTimestamp(),
  }).catch((error) => {
    console.warn('mark exceeded30m failed', error);
  }).finally(() => {
    state.pendingExceeded30mWrites.delete(orderId);
  });
}

function maybeTriggerAlert(order, elapsedMs) {
  if (!state.voiceEnabled || document.visibilityState !== "visible") return;
  if (elapsedMs < 30 * 60 * 1000) return;

  const lastAlertAt = state.alertMap.get(order.id) || 0;
  const now = Date.now();
  if (now - lastAlertAt < 5 * 60 * 1000) return;

  state.alertMap.set(order.id, now);
  playAlertSignal(order.alertPhrase || "ออเดอร์ยังไม่เสร็จนะคะเชฟ", { includeSpeech: false });
}

function prepareAlertAudio() {
  if (state.alertAudio) return state.alertAudio;
  try {
    const audio = new Audio(ALERT_AUDIO_URL);
    audio.preload = "auto";
    audio.playsInline = true;
    state.alertAudio = audio;
    return audio;
  } catch (error) {
    console.warn("prepareAlertAudio failed", error);
    return null;
  }
}

async function primeAlertAudio() {
  const audio = prepareAlertAudio();
  if (!audio || state.alertPrimed) return;
  try {
    audio.muted = true;
    audio.volume = 0;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = 1;
    state.alertPrimed = true;
  } catch (error) {
    audio.muted = false;
    audio.volume = 1;
    console.warn("primeAlertAudio failed", error);
  }
}

function stopAlertAudio() {
  if (!state.alertAudio) return;
  try {
    state.alertAudio.pause();
    state.alertAudio.currentTime = 0;
  } catch (error) {
    console.warn("stopAlertAudio failed", error);
  }
  state.alertPlaying = false;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function waitForAudioEnd(audio) {
  return new Promise((resolve) => {
    const done = () => {
      audio.removeEventListener("ended", done);
      audio.removeEventListener("error", done);
      resolve();
    };
    audio.addEventListener("ended", done, { once: true });
    audio.addEventListener("error", done, { once: true });
  });
}

async function playAlertAudioSequence(repeats = 3) {
  const audio = prepareAlertAudio();
  if (!audio) return false;
  if (state.alertPlaying) return true;

  state.alertPlaying = true;
  try {
    for (let i = 0; i < repeats; i += 1) {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = 1;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === "function") {
        await playPromise;
      }
      await waitForAudioEnd(audio);
      if (i < repeats - 1) {
        await wait(250);
      }
    }
    return true;
  } catch (error) {
    console.warn("playAlertAudioSequence failed", error);
    return false;
  } finally {
    state.alertPlaying = false;
  }
}

async function playAlertSignal(text = "ออเดอร์ยังไม่เสร็จนะคะเชฟ", options = {}) {
  const { includeSpeech = false } = options;
  const played = await playAlertAudioSequence(3);
  if (!played || includeSpeech) {
    speakAlertPhrase(text);
  }
}

function speakAlertPhrase(text = "ออเดอร์ยังไม่เสร็จนะคะเชฟ") {
  if (!("speechSynthesis" in window)) return;
  for (let i = 0; i < 3; i += 1) {
    window.setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "th-TH";
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }, i * 1400);
  }
}

function startDragDelete(event, orderId, sourceCard) {
  event.preventDefault();
  const order = state.orderMap.get(orderId);
  if (!order?.completed || !els.trashZone) return;

  const preview = sourceCard.cloneNode(true);
  preview.classList.add("drag-preview");
  document.body.appendChild(preview);
  sourceCard.style.opacity = "0.45";

  state.drag = { orderId, preview, sourceCard };
  moveDragPreview(event);

  const handleMove = (moveEvent) => {
    moveDragPreview(moveEvent);
    toggleTrashHover(moveEvent);
  };

  const handleUp = async (upEvent) => {
    const isOverTrash = isPointerOverTrash(upEvent);
    cleanupDrag();
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    if (isOverTrash) {
      await updateOrder(orderId, {
        softDeleted: true,
        updatedAt: serverTimestamp(),
      });
    }
  };

  window.addEventListener("pointermove", handleMove, { passive: true });
  window.addEventListener("pointerup", handleUp, { once: true });
}

function cleanupDrag() {
  if (!state.drag) return;
  state.drag.preview?.remove();
  state.drag.sourceCard?.style.removeProperty("opacity");
  els.trashZone?.classList.remove("drag-over");
  state.drag = null;
}

function moveDragPreview(event) {
  if (!state.drag?.preview) return;
  state.drag.preview.style.left = `${event.clientX}px`;
  state.drag.preview.style.top = `${event.clientY}px`;
}

function toggleTrashHover(event) {
  if (!els.trashZone) return;
  els.trashZone.classList.toggle("drag-over", isPointerOverTrash(event));
}

function isPointerOverTrash(event) {
  if (!els.trashZone) return false;
  const rect = els.trashZone.getBoundingClientRect();
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

function getVisibleOrders() {
  return [...state.orders]
    .filter((order) => !order.softDeleted && !order.completed)
    .sort((a, b) => getOrderCreatedAtMs(b) - getOrderCreatedAtMs(a));
}

function getOrderCreatedAtMs(order) {
  const createdAtMs = Number(order?.createdAtMs || 0);
  if (Number.isFinite(createdAtMs) && createdAtMs > 0) return createdAtMs;

  const createdAt = order?.createdAt;
  if (createdAt && typeof createdAt.toMillis === "function") {
    const millis = Number(createdAt.toMillis());
    if (Number.isFinite(millis) && millis > 0) return millis;
  }

  const seconds = Number(createdAt?.seconds || 0);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;

  return Date.now();
}

function getElapsedMs(order) {
  const completedAtMs = Number(order?.completedAtMs || 0);
  if (Number.isFinite(completedAtMs) && completedAtMs > 0) {
    return Math.max(0, completedAtMs - getOrderCreatedAtMs(order));
  }
  return Math.max(0, Date.now() - getOrderCreatedAtMs(order));
}

function getTodayStartMs() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function isTodayOrder(order) {
  return getOrderCreatedAtMs(order) >= getTodayStartMs();
}

function hasExceeded30mRecord(order) {
  if (order?.exceeded30m) return true;
  return !order?.completed && getElapsedMs(order) > 30 * 60 * 1000;
}

function buildCompletionPatch(order, itemsOverride = null) {
  const elapsedMs = getElapsedMs(order);
  const exceeded = hasExceeded30mRecord(order) || elapsedMs > 30 * 60 * 1000;
  const patch = {
    completed: true,
    updatedAt: serverTimestamp(),
    completedAtMs: Date.now(),
    completionDurationMs: elapsedMs,
    exceeded30m: exceeded,
  };

  if (exceeded && !Number(order?.exceeded30mAtMs || 0)) {
    patch.exceeded30mAtMs = Date.now();
  } else if (Number(order?.exceeded30mAtMs || 0)) {
    patch.exceeded30mAtMs = Number(order.exceeded30mAtMs);
  }

  if (Array.isArray(itemsOverride)) {
    patch.items = itemsOverride;
    patch.readingText = itemsOverride.map((item) => item.text).join('\n');
    patch.rawText = itemsOverride.map((item) => item.raw || item.text).join('\n');
  }

  return patch;
}

function getTimerState(order, elapsedMs) {
  if (order.completed) return { className: "status-green" };
  if (elapsedMs > 30 * 60 * 1000) return { className: "status-critical" };
  if (elapsedMs > 25 * 60 * 1000) return { className: "status-red" };
  if (elapsedMs > 15 * 60 * 1000) return { className: "status-yellow" };
  return { className: "status-green" };
}

function buildItemsFromText(text, options = {}) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 30);

  const items = lines.map((textLine) => {
    const match = canonicalizeMenuLine(textLine);
    return {
      id: uid(),
      text: match.name || textLine,
      done: false,
      raw: options.keepRaw === false ? "" : (match.raw || textLine),
      matchType: match.matchType || "raw",
      confidence: Number(match.confidence || 0),
    };
  });

  return items.filter((item) => item.matchType !== "raw" || filterLikelyMenuLines([item.raw || item.text]).length > 0);
}

async function runOCR(fileOrBlob) {
  const result = await window.Tesseract.recognize(fileOrBlob, "eng", {
    tessedit_pageseg_mode: window.Tesseract?.PSM?.SINGLE_BLOCK ?? 6,
  });
  return (result?.data?.text || "").trim();
}

async function buildMenuCropBlob(file) {
  try {
    if (!("createImageBitmap" in window)) return file;
    const bitmap = await createImageBitmap(file);
    const cropX = Math.round(bitmap.width * MENU_CROP.x);
    const cropY = Math.round(bitmap.height * MENU_CROP.y);
    const cropWidth = Math.round(bitmap.width * MENU_CROP.width);
    const cropHeight = Math.round(bitmap.height * MENU_CROP.height);

    const canvas = document.createElement("canvas");
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    ctx.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    const imageData = ctx.getImageData(0, 0, cropWidth, cropHeight);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const boosted = avg > 170 ? 255 : Math.max(0, avg - 28);
      data[i] = boosted;
      data[i + 1] = boosted;
      data[i + 2] = boosted;
    }
    ctx.putImageData(imageData, 0, 0);

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.86);
    });
  } catch (error) {
    console.warn("OCR crop skipped", error);
    return file;
  }
}

async function optimizeImage(file, options = {}) {
  try {
    if (!("createImageBitmap" in window)) return file;

    const bitmap = await createImageBitmap(file);
    const maxSide = Number(options.maxSide || 1280);
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(bitmap, 0, 0, width, height);

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", Number(options.quality || 0.8));
    });
  } catch (error) {
    console.warn("Image optimization skipped", error);
    return file;
  }
}

function cleanMenuText(text) {
  const sourceLines = String(text || "")
    .split(/\r?\n/)
    .map(normalizeOcrLine)
    .filter(Boolean);

  const strictLines = sourceLines
    .map(extractStrictMenuLine)
    .filter(Boolean);

  const relaxedLines = strictLines.length
    ? strictLines
    : sourceLines.map(extractRelaxedMenuLine).filter(Boolean);

  const mergedLines = mergeReceiptMenuLines(relaxedLines);
  const finalLines = filterLikelyMenuLines(mergedLines);
  return dedupeLines(finalLines).slice(0, 30).join("\n");
}

function mergeReceiptMenuLines(lines) {
  const cleaned = lines
    .map((line) => cleanupMenuName(line))
    .filter(Boolean);

  const merged = [];
  for (let i = 0; i < cleaned.length; i += 1) {
    const current = cleaned[i];
    const next = cleaned[i + 1] || "";
    const singleMatch = canonicalizeMenuLine(current);

    if (next) {
      const mergedCandidate = cleanupMenuName(`${current} ${stripContinuationPrefix(next)}`);
      const mergedMatch = canonicalizeMenuLine(mergedCandidate);
      if (shouldPreferMergedLine(current, next, singleMatch, mergedMatch)) {
        merged.push(mergedCandidate);
        i += 1;
        continue;
      }
    }

    merged.push(current);
  }

  return merged;
}

function stripContinuationPrefix(value) {
  return String(value || "").replace(/^[-–—:;]+\s*/, "").trim();
}

function shouldPreferMergedLine(current, next, singleMatch, mergedMatch) {
  if (!current || !next) return false;

  const currentTokens = normalizeMenuKey(current).split(" ").filter(Boolean);
  const nextTokens = normalizeMenuKey(next).split(" ").filter(Boolean);
  const continuationLike = /^[-–—]/.test(next) || nextTokens.length <= 3 || /^[a-z]/.test(stripContinuationPrefix(next));
  if (!continuationLike) return false;

  if (!mergedMatch?.name || mergedMatch.matchType === "raw") return false;
  if ((mergedMatch.confidence || 0) >= 0.9 && currentTokens.length <= 5) return true;
  if ((mergedMatch.confidence || 0) >= (singleMatch?.confidence || 0) + 0.12) return true;
  return false;
}

function filterLikelyMenuLines(lines) {
  return lines.filter((line) => {
    const match = canonicalizeMenuLine(line);
    if (match.matchType !== "raw") return true;

    const cleaned = cleanupMenuName(line);
    const words = cleaned.split(/\s+/).filter(Boolean);
    const longWords = words.filter((word) => word.length >= 3);
    const hasMenuLikeShape = words.length >= 2 && longWords.length >= 2;
    const hasDigits = /\d/.test(cleaned);
    const weirdCaps = /\b[A-Z]{2,}\b/.test(cleaned) && words.length <= 2;
    return hasMenuLikeShape && !hasDigits && !weirdCaps;
  });
}

function normalizeOcrLine(line) {
  return String(line || "")
    .replace(/[•●▪▶]/g, " ")
    .replace(/[|]/g, "1")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStrictMenuLine(line) {
  if (!line || MENU_LINE_BLOCKLIST.test(line)) return "";

  const patterns = [
    /^\d+\s+(.+?)\s+\d+(?:[.,]\d{1,2})?$/,
    /^\d+\s+(.+?)$/,
    /^(.+?)\s+\d+(?:[.,]\d{1,2})?$/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match) continue;
    const cleaned = cleanupMenuName(match[1] || "");
    if (cleaned) return cleaned;
  }

  return "";
}

function extractRelaxedMenuLine(line) {
  if (!line || MENU_LINE_BLOCKLIST.test(line)) return "";
  const cleaned = cleanupMenuName(
    line
      .replace(/^\d+\s+/, "")
      .replace(/\s+\d+(?:[.,]\d{1,2})?$/, "")
  );

  if (!cleaned) return "";
  if (!/[A-Za-zก-๙]/.test(cleaned)) return "";
  if (/^\d+$/.test(cleaned)) return "";
  return cleaned;
}

function cleanupMenuName(value) {
  const cleaned = String(value || "")
    .replace(/^[^A-Za-zก-๙]+/, "")
    .replace(/[^A-Za-zก-๙()&+/' -]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  if (MENU_LINE_BLOCKLIST.test(cleaned)) return "";
  if (cleaned.length < 2) return "";
  return cleaned;
}

function dedupeLines(lines) {
  const seen = new Set();
  const result = [];

  for (const line of lines) {
    const key = line.toLowerCase();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }

  return result;
}

function autoResizeTextareas(root = document) {
  root.querySelectorAll(".item-textarea").forEach((textarea) => autoResizeTextarea(textarea));
}

function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
}

function openImageDialog(src, caption = "") {
  if (!hasImageDialog || !src) return;
  els.imageDialogImg.src = src;
  if (els.imageDialogCaption) els.imageDialogCaption.textContent = caption;
  if (!els.imageDialog.open) {
    els.imageDialog.showModal();
  }
}

function saveConfigFromDialog() {
  const config = {
    apiKey: els.cfgApiKey?.value.trim() || "",
    authDomain: els.cfgAuthDomain?.value.trim() || "",
    projectId: els.cfgProjectId?.value.trim() || "",
    storageBucket: els.cfgStorageBucket?.value.trim() || "",
    messagingSenderId: els.cfgMessagingSenderId?.value.trim() || "",
    appId: els.cfgAppId?.value.trim() || "",
  };

  if (!isValidFirebaseConfig(config)) {
    alert("กรุณาใส่ค่า Firebase ให้ครบทุกช่อง");
    return;
  }

  localStorage.setItem("laya_firebase_config", JSON.stringify(config));
  els.setupDialog?.close();
  showSetupNotice("บันทึกค่า Firebase แล้ว กรุณารีเฟรชหน้าเว็บ 1 ครั้ง");
}

function clearSavedConfig() {
  localStorage.removeItem("laya_firebase_config");
  loadConfigIntoDialog();
  showSetupNotice("ล้างค่า Firebase ที่บันทึกไว้แล้ว");
}

function getFirebaseConfig() {
  if (isValidFirebaseConfig(window.LAYA_FIREBASE_CONFIG || {})) {
    return window.LAYA_FIREBASE_CONFIG;
  }

  try {
    const saved = JSON.parse(localStorage.getItem("laya_firebase_config") || "null");
    if (saved && isValidFirebaseConfig(saved)) return saved;
  } catch (_) {
    // ignore
  }
  return {};
}

function loadConfigIntoDialog() {
  if (!els.cfgApiKey) return;
  const config = getFirebaseConfig();
  els.cfgApiKey.value = config.apiKey || "";
  els.cfgAuthDomain.value = config.authDomain || "";
  els.cfgProjectId.value = config.projectId || "";
  els.cfgStorageBucket.value = config.storageBucket || "";
  els.cfgMessagingSenderId.value = config.messagingSenderId || "";
  els.cfgAppId.value = config.appId || "";
}

function isValidFirebaseConfig(config) {
  if (!config) return false;
  const keys = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];
  return keys.every((key) => String(config[key] || "").trim().length > 0);
}

function showSetupNotice(message) {
  if (!els.setupNotice) return;
  els.setupNotice.innerHTML =
    message ||
    `ยังไม่ได้ตั้งค่า Firebase — กดปุ่ม <strong>Firebase Setup</strong> มุมขวาบน แล้ววางค่า Web App Config ของโปรเจกต์คุณก่อนใช้งาน`;
  els.setupNotice.classList.remove("hidden");
}

function syncVoiceButton() {
  if (!els.voiceToggleBtn) return;
  els.voiceToggleBtn.textContent = state.voiceEnabled
    ? "🔕 ปิดเสียงแจ้งเตือน"
    : "🔔 เปิดเสียงแจ้งเตือน";
}

function setLoading(isLoading, message = "") {
  if (!els.submitBtn) return;
  els.submitBtn.disabled = isLoading;
  els.submitBtn.textContent = isLoading ? "กำลังส่งขึ้นบอร์ด..." : "อัปโหลดและส่งเข้าบอร์ดครัว";
  if (message) setFormStatus(message);
}

function resetForm() {
  if (!els.orderForm) return;
  els.orderForm.reset();
  if (els.photoPreview) els.photoPreview.src = "";
  els.photoPreviewWrap?.classList.add("hidden");
  if (els.ocrTextDraft) els.ocrTextDraft.value = "";
  state.preparedMedia = null;
}

function setFormStatus(message = "", type = "") {
  if (!els.formStatus) return;
  els.formStatus.textContent = message;
  els.formStatus.className = `status-text ${type}`.trim();
}

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDateTime(timestampMs) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(Number(timestampMs || Date.now())));
}

function describeOcrState(stateText) {
  switch (stateText) {
    case "manual":
      return "ใส่ข้อความเอง";
    case "queued":
      return "รอ OCR";
    case "processing":
      return "กำลังอ่านรูป";
    case "done":
      return "เทียบเมนูร้านแล้ว";
    case "error":
      return "รอตรวจชื่อเมนู";
    default:
      return "พร้อมใช้งาน";
  }
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function loadBoolean(key, fallback = false) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
}

function debounce(fn, wait = 300) {
  let timer = 0;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("./sw.js");
    registration.update?.();
  } catch (error) {
    console.warn("Service worker registration failed", error);
  }
}
