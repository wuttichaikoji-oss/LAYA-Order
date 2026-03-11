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
const MENU_CROP = { x: 0.03, y: 0.34, width: 0.94, height: 0.42 };
const MENU_LINE_BLOCKLIST = /^(cover\b|table\b|room\b|guest\b|check\b|total\b|sub\s*total\b|grand\s*total\b|time\b|date\b|cash\b|change\b|vat\b|tax\b|service\b|waiter\b|cashier\b|invoice\b|receipt\b|discount\b|payment\b|amount\b|the taste\b|paraq?ee\b|cover\s*\d+)/i;

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
  voiceEnabled: loadBoolean("laya_voice_enabled", false),
  alertMap: new Map(),
  drag: null,
  ocrQueue: [],
  ocrRunning: false,
  ordersQuery: null,
  pollTimer: 0,
  lastSnapshotAt: 0,
  preparedMedia: null,
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

  if (hasVoiceControls) {
    els.voiceToggleBtn.addEventListener("click", () => {
      state.voiceEnabled = !state.voiceEnabled;
      localStorage.setItem("laya_voice_enabled", String(state.voiceEnabled));
      syncVoiceButton();
      if (state.voiceEnabled) {
        speakAlertPhrase();
      } else {
        window.speechSynthesis?.cancel();
      }
    });

    els.testVoiceBtn.addEventListener("click", () => speakAlertPhrase());
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
    const hint = FIRESTORE_DATABASE_ID ? ` (Firestore database: ${FIRESTORE_DATABASE_ID})` : "";
    showSetupNotice(`เชื่อม Firebase ไม่สำเร็จ${hint}: ${error.message}`);
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
    const rawText = await runOCR(ocrBlob);
    const menuText = cleanMenuText(rawText);
    const items = buildItemsFromText(menuText);
    await updateDoc(doc(state.db, "orders", job.orderId), {
      rawText: menuText || "OCR อ่านชื่อเมนูไม่ชัด กรุณาเพิ่มรายการด้วยมือ",
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

    completeBtn.textContent = order.completed ? "บิลนี้เสร็จแล้ว" : "ทำบิลนี้เสร็จแล้ว";
    completeBtn.disabled = !!order.completed;
    dragBtn.hidden = !order.completed;

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

  addItemBtn.addEventListener("click", async () => {
    const itemText = window.prompt("เพิ่มรายการอาหาร", "");
    if (!itemText || !itemText.trim()) return;
    const currentItems = Array.isArray(state.orderMap.get(order.id)?.items)
      ? [...state.orderMap.get(order.id).items]
      : [];
    currentItems.push({ id: uid(), text: itemText.trim(), done: false });
    await syncItems(order.id, currentItems);
  });

  completeBtn.addEventListener("click", async () => {
    await updateOrder(order.id, {
      completed: true,
      updatedAt: serverTimestamp(),
    });
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
      state.alertMap.delete(order.id);
    } else {
      activeCount += 1;
      if (elapsedMs > 30 * 60 * 1000) overdueCount += 1;
      maybeTriggerAlert(order, elapsedMs);
    }
  }

  if (els.activeCount) els.activeCount.textContent = String(activeCount);
  if (els.overdueCount) els.overdueCount.textContent = String(overdueCount);
  if (els.completedCount) els.completedCount.textContent = String(completedCount);
}

function maybeTriggerAlert(order, elapsedMs) {
  if (!state.voiceEnabled || document.visibilityState !== "visible") return;
  if (elapsedMs < 30 * 60 * 1000) return;

  const lastAlertAt = state.alertMap.get(order.id) || 0;
  const now = Date.now();
  if (now - lastAlertAt < 5 * 60 * 1000) return;

  state.alertMap.set(order.id, now);
  speakAlertPhrase(order.alertPhrase || "ออเดอร์ยังไม่เสร็จนะคะเชฟ");
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
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 30);

  return lines.map((textLine) => ({ id: uid(), text: textLine, done: false }));
}

async function runOCR(fileOrBlob) {
  const result = await window.Tesseract.recognize(fileOrBlob, "eng");
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
    const registration = await navigator.serviceWorker.register("./sw.js");
    registration.update?.();
  } catch (error) {
    console.warn("Service worker registration failed", error);
  }
}
