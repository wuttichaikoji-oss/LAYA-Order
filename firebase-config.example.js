// Build: defaultdb-no-sw-v2
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
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const FIRESTORE_DATABASE_ID = String(window.LAYA_FIRESTORE_DATABASE_ID || "").trim();
const PAGE_MODE = document.body?.dataset.page || "dashboard";
const MENU_CROP = { x: 0.02, y: 0.31, width: 0.96, height: 0.50 };
const MENU_CONTINUATION_BLOCKLIST = /^(the taste|mangrove|room service|laya|kitchen order)$/i;
const MENU_LINE_BLOCKLIST = /^(cover\b|table\b|room\b|guest\b|check\b|total\b|sub\s*total\b|grand\s*total\b|time\b|date\b|cash\b|change\b|vat\b|tax\b|service\b|waiter\b|cashier\b|invoice\b|receipt\b|discount\b|payment\b|amount\b|the taste\b|paraq?ee\b|cover\s*\d+)/i;
const ALERT_AUDIO_URL = "assets/alerts/chef-alert.mp3";
const MENU_CATALOG_SOURCE = [
  "Deep-Fried Spring Rolls",
  "Goong Sa-Rong",
  "Tom Yum Goong",
  "Tom Kha Gai",
  "Thai Seafood Salad",
  "Thai Beef Salad",
  "Clear Soup with Pork Mince or Chicken Mince",
  "Clear Soup with Chicken Mince",
  "Clear Soup with Pork Mince",
  "French Onion Soup",
  "Satay",
  "Cream of Tomato Soup",
  "Cream of Mushroom Soup",
  "Massaman Nue",
  "Gang Phed Ped Yang",
  "Goong Ma-Kham",
  "Nue Prik Thai Dum",
  "Seabass on Yellow Curry Sauce",
  "Panang Chicken Curry",
  "Gai Phad Med Ma Muang",
  "Pad Kaprow",
  "Gang Kheaw Waan Gai",
  "Khao Phad",
  "Phad Preaw Wann Moo",
  "Wagyu Beef Burger",
  "Club Sandwich",
  "Fish & Chips",
  "Bolognese",
  "Pesto",
  "French Fries",
  "Chicken Nugget",
  "Arrabbiata",
  "Carbonara",
  "Spaghetti Kee Mao",
  "Pad Thai Goong",
  "Marinara",
  "Meatball",
  "Tiramisu Cake",
  "Chocolate Brownie",
  "Vanilla Crème Brûlée",
  "Strawberry Panna Cotta",
  "Passion Fruit Mousse",
  "Khao Niaow Ma Muang",
  "Tropical Fruit Plate",
  "Fish Fingers",
  "Tuna Sandwich",
  "Fried Rice",
  "Kids Chicken Nuggets",
  "Napoletana",
];
const MENU_ALIAS_SOURCE = [
  ["deep fried spring roll", "Deep-Fried Spring Rolls"],
  ["spring rolls", "Deep-Fried Spring Rolls"],
  ["goong sarong", "Goong Sa-Rong"],
  ["thai sea food salad", "Thai Seafood Salad"],
  ["thai beef salad", "Thai Beef Salad"],
  ["clear soup mince chicken", "Clear Soup with Chicken Mince"],
  ["clear soup with chicken mince", "Clear Soup with Chicken Mince"],
  ["clear soup chicken mince", "Clear Soup with Chicken Mince"],
  ["clear soup mince pork", "Clear Soup with Pork Mince"],
  ["clear soup with pork mince", "Clear Soup with Pork Mince"],
  ["clear soup pork mince", "Clear Soup with Pork Mince"],
  ["clear soup pork or chicken mince", "Clear Soup with Pork Mince or Chicken Mince"],
  ["satay chicken", "Satay"],
  ["chicken satay", "Satay"],
  ["massaman nuea", "Massaman Nue"],
  ["goong ma kham", "Goong Ma-Kham"],
  ["goong ma-kham", "Goong Ma-Kham"],
  ["fish and chips", "Fish & Chips"],
  ["spaghetti bolognese", "Bolognese"],
  ["bolognese spaghetti", "Bolognese"],
  ["spaghetti pesto", "Pesto"],
  ["chicken nuggets", "Chicken Nugget"],
  ["kids chicken nugget", "Kids Chicken Nuggets"],
  ["kids chicken nuggets", "Kids Chicken Nuggets"],
  ["chocolate brownies", "Chocolate Brownie"],
  ["chocolate brownie", "Chocolate Brownie"],
  ["creme brulee", "Vanilla Crème Brûlée"],
  ["vanilla creme brulee", "Vanilla Crème Brûlée"],
  ["fanta orange", "Fanta Orange"],
];
const MENU_CATALOG = buildMenuCatalog(MENU_CATALOG_SOURCE, MENU_ALIAS_SOURCE);

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
  voiceEnabled: loadBoolean("laya_voice_enabled", PAGE_MODE === "kitchen"),
  audioContext: null,
  alertMap: new Map(),
  drag: null,
  ocrQueue: [],
  ocrRunning: false,
  ordersQuery: null,
  pollTimer: 0,
  lastSnapshotAt: 0,
  preparedMedia: null,
  alertAudioBufferPromise: null,
  alertAudioBuffer: null,
  lastGlobalAlertAt: 0,
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

  document.addEventListener("pointerdown", initAudioContextOnce, { passive: true, once: true });
  document.addEventListener("keydown", initAudioContextOnce, { passive: true, once: true });

  if (hasVoiceControls) {
    els.voiceToggleBtn.addEventListener("click", async () => {
      state.voiceEnabled = !state.voiceEnabled;
      localStorage.setItem("laya_voice_enabled", String(state.voiceEnabled));
      syncVoiceButton();
      if (state.voiceEnabled) {
        await initAudioContextOnce();
        await prepareAlertAudio();
        await playAlertSound();
      } else {
        window.speechSynthesis?.cancel();
      }
    });

    els.testVoiceBtn.addEventListener("click", async () => {
      await initAudioContextOnce();
      await prepareAlertAudio();
      await playAlertSound();
    });
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
    if (hasBoard) initRealtimeOrders();
  } catch (error) {
    console.error(error);
    showSetupNotice(`เชื่อม Firebase ไม่สำเร็จ: ${error.message}`);
  }
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
    return;
  }
  const url = URL.createObjectURL(file);
  if (els.photoPreview) els.photoPreview.src = url;
  els.photoPreviewWrap?.classList.remove("hidden");
  primeSelectedMedia(file);
  setFormStatus("รูปพร้อมส่งแล้ว — ระบบจะส่งเข้าบอร์ดก่อน แล้วค่อยอัปโหลดรูปและอ่าน OCR ต่อ", "success");
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
    const ocrResult = await runOCR(ocrBlob);
    const rawText = ocrResult.rawText || "";
    const menuText = ocrResult.menuText || cleanMenuText(rawText);
    const items = buildItemsFromText(menuText);
    await updateDoc(doc(state.db, "orders", job.orderId), {
      rawText: rawText || "OCR อ่านชื่อเมนูไม่ชัด กรุณาเพิ่มรายการด้วยมือ",
      readingText: menuText || "",
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

    node.querySelector(".js-title").textContent = order.completed ? "ออเดอร์เสร็จแล้ว" : "ออเดอร์ใหม่";
    node.querySelector(".js-meta").textContent = `เข้าบอร์ด ${formatDateTime(order.createdAtMs)}`;

    const statusEl = node.querySelector(".js-status");
    statusEl.textContent = order.completed ? "เสร็จแล้ว" : "กำลังทำ";
    statusEl.classList.add(order.completed ? "is-complete" : "is-working");

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
        row.innerHTML = `
          <input type="checkbox" ${item.done ? "checked" : ""} />
          <textarea class="item-textarea" rows="1">${escapeHtml(item.text || "")}</textarea>
        `;
        itemsWrap.appendChild(row);
      });
    }

    const completeBtn = node.querySelector(".js-mark-complete");
    const dragBtn = node.querySelector(".js-drag-delete");
    const addItemBtn = node.querySelector(".js-add-item");
    const canEditMenuText = PAGE_MODE !== "kitchen";
    const canManageStatus = PAGE_MODE !== "hostess";

    completeBtn.textContent = order.completed ? "บิลนี้เสร็จแล้ว" : "ทำบิลนี้เสร็จแล้ว";
    completeBtn.disabled = !!order.completed || !canManageStatus;
    dragBtn.hidden = !order.completed || !canManageStatus;
    if (addItemBtn) addItemBtn.hidden = !canEditMenuText;

    node.querySelectorAll(".item-textarea").forEach((textarea) => {
      textarea.readOnly = !canEditMenuText;
      if (!canEditMenuText) textarea.setAttribute("tabindex", "-1");
    });
    node.querySelectorAll('.item-row input[type="checkbox"]').forEach((checkbox) => {
      checkbox.disabled = !canManageStatus;
    });

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
      `${order.completed ? "ออเดอร์เสร็จแล้ว" : "ออเดอร์ใหม่"} • ${formatDateTime(order.createdAtMs)}`
    );
  });

  if (PAGE_MODE !== "kitchen") {
    addItemBtn?.addEventListener("click", async () => {
      const itemText = window.prompt("เพิ่มรายการอาหาร", "");
      if (!itemText || !itemText.trim()) return;
      const currentItems = Array.isArray(state.orderMap.get(order.id)?.items)
        ? [...state.orderMap.get(order.id).items]
        : [];
      currentItems.push({ id: uid(), text: itemText.trim(), done: false });
      await syncItems(order.id, currentItems);
    });
  }

  if (PAGE_MODE !== "hostess") {
    completeBtn?.addEventListener("click", async () => {
      await updateOrder(order.id, {
        completed: true,
        updatedAt: serverTimestamp(),
      });
    });
  }

  itemsWrap.addEventListener("change", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type === "checkbox") {
      if (PAGE_MODE === "hostess") return;
      const items = collectItemsFromCard(card);
      await syncItems(order.id, items);
    }
  });

  itemsWrap.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;
    autoResizeTextarea(target);
    if (PAGE_MODE !== "kitchen") syncItemsDebounced();
  });

  itemsWrap.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      target.blur();
    }
  });

  if (PAGE_MODE !== "hostess") {
    dragBtn?.addEventListener("pointerdown", (event) => startDragDelete(event, order.id, card));
  }
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
      };
    })
    .filter((item) => item.text);
}

async function syncItems(orderId, items) {
  const completed = items.length > 0 && items.every((item) => item.done);
  await updateOrder(orderId, {
    items,
    readingText: items.map((item) => item.text).join("\n"),
    rawText: items.map((item) => item.text).join("\n"),
    completed,
    updatedAt: serverTimestamp(),
  });
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
  const visibleOrders = getVisibleOrders();
  const activeCount = visibleOrders.filter((order) => !order.completed).length;
  const overdueCount = visibleOrders.filter((order) => !order.completed && getElapsedMs(order) > 30 * 60 * 1000).length;
  const completedCount = visibleOrders.filter((order) => order.completed).length;
  els.activeCount.textContent = String(activeCount);
  els.overdueCount.textContent = String(overdueCount);
  els.completedCount.textContent = String(completedCount);
}

function updateTimersAndAlerts() {
  if (!hasBoard) return;
  const visibleOrders = getVisibleOrders();
  let activeCount = 0;
  let overdueCount = 0;
  let completedCount = 0;
  let leadCriticalOrder = null;
  let leadCriticalElapsedMs = 0;

  for (const order of visibleOrders) {
    const card = els.ordersBoard.querySelector(`[data-order-id="${order.id}"]`);
    if (!card) continue;

    const elapsedMs = getElapsedMs(order);
    const timerState = getTimerState(order, elapsedMs);
    const elapsedText = formatElapsed(elapsedMs);

    card.querySelector(".js-elapsed").textContent = elapsedText;
    card.classList.remove("status-green", "status-yellow", "status-red", "status-critical");
    card.classList.add(timerState.className);

    if (order.completed) {
      completedCount += 1;
    } else {
      activeCount += 1;
      if (elapsedMs > 30 * 60 * 1000) {
        overdueCount += 1;
        if (!leadCriticalOrder) {
          leadCriticalOrder = order;
          leadCriticalElapsedMs = elapsedMs;
        }
      }
    }
  }

  if (els.activeCount) els.activeCount.textContent = String(activeCount);
  if (els.overdueCount) els.overdueCount.textContent = String(overdueCount);
  if (els.completedCount) els.completedCount.textContent = String(completedCount);

  if (leadCriticalOrder) {
    maybeTriggerAlert(leadCriticalOrder, leadCriticalElapsedMs);
  } else {
    state.lastGlobalAlertAt = 0;
  }
}

function maybeTriggerAlert(order, elapsedMs) {
  if (!state.voiceEnabled) return;
  if (elapsedMs < 30 * 60 * 1000) return;

  const now = Date.now();
  if (now - Number(state.lastGlobalAlertAt || 0) < 5 * 60 * 1000) return;

  state.lastGlobalAlertAt = now;
  playAlertSound(order.alertPhrase || "ออเดอร์ยังไม่เสร็จนะคะเชฟ");
}

async function initAudioContextOnce() {
  if (!("AudioContext" in window || "webkitAudioContext" in window)) return null;
  try {
    if (!state.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      state.audioContext = new AudioContextClass();
    }
    if (state.audioContext.state === "suspended") {
      await state.audioContext.resume();
    }
    return state.audioContext;
  } catch (error) {
    console.warn("AudioContext init failed", error);
    return null;
  }
}

async function prepareAlertAudio() {
  if (state.alertAudioBuffer) return state.alertAudioBuffer;
  if (state.alertAudioBufferPromise) return state.alertAudioBufferPromise;

  state.alertAudioBufferPromise = (async () => {
    const audioContext = await initAudioContextOnce();
    if (!audioContext) return null;
    const response = await fetch(ALERT_AUDIO_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`โหลดไฟล์เสียงไม่สำเร็จ (${response.status})`);
    const arrayBuffer = await response.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    state.alertAudioBuffer = decoded;
    return decoded;
  })().catch((error) => {
    console.warn("Custom alert audio failed", error);
    return null;
  });

  return state.alertAudioBufferPromise;
}

async function playAlertSound(fallbackText = "ออเดอร์ยังไม่เสร็จนะคะเชฟ") {
  try {
    const audioContext = await initAudioContextOnce();
    if (!audioContext) throw new Error("AudioContext unavailable");

    const buffer = await prepareAlertAudio();
    if (!buffer) throw new Error("Custom audio buffer unavailable");

    const gap = 0.35;
    const baseTime = audioContext.currentTime + 0.05;
    for (let index = 0; index < 3; index += 1) {
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      source.buffer = buffer;
      gainNode.gain.value = 1;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start(baseTime + index * (buffer.duration + gap));
    }
    return;
  } catch (error) {
    console.warn("Custom alert playback failed", error);
  }

  initAudioContextOnce().then((audioContext) => {
    if (!audioContext) return;
    const beeps = [0, 0.75, 1.5];
    const baseTime = audioContext.currentTime + 0.02;
    beeps.forEach((offset, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = index === 1 ? 920 : 780;
      gainNode.gain.setValueAtTime(0.0001, baseTime + offset);
      gainNode.gain.exponentialRampToValueAtTime(0.16, baseTime + offset + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, baseTime + offset + 0.28);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(baseTime + offset);
      oscillator.stop(baseTime + offset + 0.3);
    });
    speakAlertPhrase(fallbackText);
  }).catch((error) => console.warn("Alert sound failed", error));
}

function speakAlertPhrase(text = "ออเดอร์ยังไม่เสร็จนะคะเชฟ") {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch (_) {
    // ignore
  }
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
    .filter((order) => !order.softDeleted)
    .sort((a, b) => {
      if (!!a.completed !== !!b.completed) return Number(a.completed) - Number(b.completed);
      return Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
    });
}

function getElapsedMs(order) {
  return Math.max(0, Date.now() - Number(order.createdAtMs || Date.now()));
}

function getTimerState(order, elapsedMs) {
  if (order.completed) return { className: "status-green" };
  if (elapsedMs > 30 * 60 * 1000) return { className: "status-critical" };
  if (elapsedMs > 25 * 60 * 1000) return { className: "status-red" };
  if (elapsedMs > 15 * 60 * 1000) return { className: "status-yellow" };
  return { className: "status-green" };
}

function buildItemsFromText(text) {
  const lines = String(text || "")
    .split(/
?
/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 30);

  return lines.map((textLine) => ({ id: uid(), text: textLine, done: false }));
}

async function runOCR(fileOrBlob) {
  const result = await window.Tesseract.recognize(fileOrBlob, "eng", {
    logger: () => {},
  });
  const rawText = (result?.data?.text || "").trim();
  const menuText = extractMenuTextFromOcrResult(result) || cleanMenuText(rawText);
  return { rawText, menuText };
}

async function buildMenuCropBlob(file) {
  try {
    if (!("createImageBitmap" in window)) return file;
    const bitmap = await createImageBitmap(file);
    const cropX = Math.round(bitmap.width * MENU_CROP.x);
    const cropY = Math.round(bitmap.height * MENU_CROP.y);
    const cropWidth = Math.round(bitmap.width * MENU_CROP.width);
    const cropHeight = Math.round(bitmap.height * MENU_CROP.height);

    const scale = Math.max(2, Math.min(2.4, 1800 / Math.max(cropWidth, cropHeight)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(cropWidth * scale));
    canvas.height = Math.max(1, Math.round(cropHeight * scale));
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const boosted = gray > 175 ? 255 : gray < 120 ? 0 : Math.min(255, gray + 18);
      data[i] = boosted;
      data[i + 1] = boosted;
      data[i + 2] = boosted;
    }
    ctx.putImageData(imageData, 0, 0);

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.92);
    });
  } catch (error) {
    console.warn("OCR crop skipped", error);
    return file;
  }
}

function extractMenuTextFromOcrResult(result) {
  const lines = Array.isArray(result?.data?.lines) && result.data.lines.length
    ? result.data.lines.map((line) => ({
        text: normalizeOcrLine(line.text || ""),
        x0: Number(line.bbox?.x0 || 0),
        x1: Number(line.bbox?.x1 || 0),
        y0: Number(line.bbox?.y0 || 0),
        y1: Number(line.bbox?.y1 || 0),
      }))
    : String(result?.data?.text || "")
        .split(/
?
/)
        .map((line) => ({ text: normalizeOcrLine(line), x0: 0, x1: 0, y0: 0, y1: 0 }));

  const parsed = [];

  for (const line of lines) {
    const raw = line.text;
    if (!raw || shouldIgnoreOcrLine(raw)) continue;

    const stripped = stripQtyAndPrice(raw);
    if (!stripped || shouldIgnoreOcrLine(stripped)) continue;

    const continuation = isContinuationLine(raw, stripped, line, parsed.at(-1)?.meta);

    if (continuation && parsed.length) {
      const previous = parsed[parsed.length - 1];
      previous.text = cleanupMergedMenu(`${previous.text} ${stripped}`);
      previous.meta = line;
      continue;
    }

    parsed.push({ text: stripped, meta: line });
  }

  return dedupeLines(parsed.map((entry) => entry.text).filter(Boolean)).slice(0, 30).join("
");
}

function shouldIgnoreOcrLine(line) {
  const value = normalizeOcrLine(line).toLowerCase();
  if (!value) return true;
  if (MENU_LINE_BLOCKLIST.test(value)) return true;
  if (/^#?\(?tt\d+/i.test(value)) return true;
  if (/^t:\s*[a-z]?\d+/i.test(value)) return true;
  if (/^\d{2}-\d{2}-\d{4}/.test(value)) return true;
  if (/^panadda$|^parawee$/.test(value)) return true;
  if (/^[-_—=]{2,}/.test(value)) return true;
  if (/^\d+$/.test(value)) return true;
  if (/^\d+\s+\d+$/.test(value)) return true;
  if (!/[a-zก-๙]/i.test(value)) return true;
  return false;
}

function stripQtyAndPrice(line) {
  let value = normalizeOcrLine(line)
    .replace(/^\d+\s+/, "")
    .replace(/\s+\d{2,4}(?:[.,]\d{1,2})?$/, "")
    .replace(/^--+\s*/, "")
    .trim();

  value = cleanupMenuName(value);
  if (!value) return "";
  if (MENU_CONTINUATION_BLOCKLIST.test(value)) return "";
  return value;
}

function isContinuationLine(raw, stripped, currentMeta, previousMeta) {
  const normalizedRaw = normalizeOcrLine(raw);
  if (/^--+\s*/.test(normalizedRaw)) return true;
  if (!previousMeta) return false;

  const currentWords = stripped.split(/\s+/).filter(Boolean);
  const currentIndent = Number(currentMeta?.x0 || 0);
  const previousIndent = Number(previousMeta?.x0 || 0);
  const currentWidth = Math.max(0, Number(currentMeta?.x1 || 0) - Number(currentMeta?.x0 || 0));
  const previousWidth = Math.max(0, Number(previousMeta?.x1 || 0) - Number(previousMeta?.x0 || 0));

  if (currentWords.length <= 2 && currentIndent > previousIndent + 35) return true;
  if (currentWords.length <= 1 && currentIndent > previousIndent + 16) return true;
  if (currentWords.length <= 2 && previousWidth > 0 && currentWidth > 0 && currentWidth < previousWidth * 0.72 && currentIndent > previousIndent + 8) return true;
  return false;
}

function cleanupMergedMenu(value) {
  return cleanupMenuName(String(value || "").replace(/\s+/g, " ").trim());
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

  const finalLines = strictLines.length
    ? strictLines
    : sourceLines.map(extractRelaxedMenuLine).filter(Boolean);

  return dedupeLines(finalLines).slice(0, 30).join("\n");
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
    const key = normalizeMenuKey(line);
    if (!line || seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }

  return result;
}

function buildMenuCatalog(source, aliases = []) {
  const items = [];
  const directMap = new Map();

  source.forEach((name) => {
    const canonicalName = String(name || "").trim();
    if (!canonicalName) return;
    const key = normalizeMenuKey(canonicalName);
    if (!key || directMap.has(key)) return;
    const entry = { name: canonicalName, key, tokens: tokenizeMenuKey(key) };
    items.push(entry);
    directMap.set(key, canonicalName);
  });

  const aliasMap = new Map();
  aliases.forEach(([alias, canonicalName]) => {
    const aliasKey = normalizeMenuKey(alias);
    const canonical = directMap.get(normalizeMenuKey(canonicalName)) || String(canonicalName || "").trim();
    if (aliasKey && canonical) aliasMap.set(aliasKey, canonical);
  });

  return { items, directMap, aliasMap };
}

function canonicalizeMenuLine(value) {
  const cleaned = cleanupMenuName(value);
  if (!cleaned) return "";

  const direct = matchMenuNameToCatalog(cleaned);
  return direct || cleaned;
}

function matchMenuNameToCatalog(value) {
  const key = normalizeMenuKey(value);
  if (!key) return "";

  if (MENU_CATALOG.aliasMap.has(key)) return MENU_CATALOG.aliasMap.get(key);
  if (MENU_CATALOG.directMap.has(key)) return MENU_CATALOG.directMap.get(key);

  let best = { name: "", score: 0 };
  let second = 0;

  for (const entry of MENU_CATALOG.items) {
    const score = scoreMenuMatch(key, entry);
    if (score > best.score) {
      second = best.score;
      best = { name: entry.name, score };
    } else if (score > second) {
      second = score;
    }
  }

  const minScore = key.length <= 8 ? 0.82 : 0.72;
  if (best.score >= minScore && best.score - second >= 0.04) return best.name;
  return "";
}

function scoreMenuMatch(key, entry) {
  if (!key || !entry?.key) return 0;
  if (key === entry.key) return 1;

  const keyTokens = tokenizeMenuKey(key);
  const entryTokens = entry.tokens || tokenizeMenuKey(entry.key);
  const overlapCount = entryTokens.filter((token) => keyTokens.includes(token)).length;
  const overlapRatio = overlapCount / Math.max(1, entryTokens.length);
  const containsBonus = key.includes(entry.key) || entry.key.includes(key) ? 0.22 : 0;
  const startsBonus = keyTokens[0] && entryTokens[0] && keyTokens[0] === entryTokens[0] ? 0.06 : 0;
  const charSimilarity = similarityScore(key, entry.key);
  return overlapRatio * 0.54 + charSimilarity * 0.38 + containsBonus + startsBonus;
}

function similarityScore(left, right) {
  if (!left || !right) return 0;
  const maxLength = Math.max(left.length, right.length);
  if (!maxLength) return 1;
  return 1 - levenshteinDistance(left, right) / maxLength;
}

function levenshteinDistance(left, right) {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[left.length][right.length];
}

function tokenizeMenuKey(key) {
  return normalizeMenuKey(key)
    .split(" ")
    .filter((token) => token && !["with", "or", "and", "the", "a"].includes(token));
}

function normalizeMenuKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9ก-๙]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
      return "อ่านเมนูแล้ว";
    case "error":
      return "อ่านไม่ชัด";
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
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => /laya-order-tracker/i.test(key)).map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn("Service worker cleanup failed", error);
  }
}
