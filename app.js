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
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const els = {
  orderForm: document.getElementById("orderForm"),
  billNo: document.getElementById("billNo"),
  tableNo: document.getElementById("tableNo"),
  hostessName: document.getElementById("hostessName"),
  guestName: document.getElementById("guestName"),
  notes: document.getElementById("notes"),
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
};

const state = {
  db: null,
  storage: null,
  orders: [],
  orderMap: new Map(),
  voiceEnabled: loadBoolean("laya_voice_enabled", false),
  alertMap: new Map(),
  drag: null,
};

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
  bindStaticEvents();
  syncVoiceButton();
  loadConfigIntoDialog();

  const config = getFirebaseConfig();
  if (!isValidFirebaseConfig(config)) {
    showSetupNotice();
    renderOrders();
    return;
  }

  initFirebase(config);
}

function bindStaticEvents() {
  els.photoInput.addEventListener("change", handlePhotoPreview);
  els.orderForm.addEventListener("submit", handleOrderSubmit);

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
  els.openSetupBtn.addEventListener("click", () => els.setupDialog.showModal());
  els.saveConfigBtn.addEventListener("click", saveConfigFromDialog);
  els.clearConfigBtn.addEventListener("click", clearSavedConfig);

  setInterval(updateTimersAndAlerts, 1000);
}

function initFirebase(config) {
  try {
    const app = initializeApp(config);
    state.db = getFirestore(app);
    state.storage = getStorage(app);
    els.setupNotice.classList.add("hidden");
    initRealtimeOrders();
  } catch (error) {
    console.error(error);
    showSetupNotice(`เชื่อม Firebase ไม่สำเร็จ: ${error.message}`);
  }
}

function initRealtimeOrders() {
  const ordersQuery = query(collection(state.db, "orders"), orderBy("createdAtMs", "desc"));
  onSnapshot(
    ordersQuery,
    (snapshot) => {
      state.orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      state.orderMap = new Map(state.orders.map((order) => [order.id, order]));
      renderOrders();
      updateTimersAndAlerts();
    },
    (error) => {
      console.error(error);
      setFormStatus(`โหลดข้อมูลบอร์ดไม่สำเร็จ: ${error.message}`, "error");
    }
  );
}

function handlePhotoPreview(event) {
  const file = event.target.files?.[0];
  if (!file) {
    els.photoPreviewWrap.classList.add("hidden");
    return;
  }
  const url = URL.createObjectURL(file);
  els.photoPreview.src = url;
  els.photoPreviewWrap.classList.remove("hidden");
}

async function handleOrderSubmit(event) {
  event.preventDefault();
  if (!state.db || !state.storage) {
    setFormStatus("กรุณาตั้งค่า Firebase ก่อนใช้งาน", "error");
    els.setupDialog.showModal();
    return;
  }

  const billNo = els.billNo.value.trim();
  const tableNo = els.tableNo.value.trim();
  const hostessName = els.hostessName.value.trim();
  const guestName = els.guestName.value.trim();
  const notes = els.notes.value.trim();
  const draftText = els.ocrTextDraft.value.trim();
  const file = els.photoInput.files?.[0];

  if (!billNo && !tableNo) {
    setFormStatus("กรุณาใส่เลขบิลหรือโต๊ะ/ห้องอย่างน้อย 1 ช่อง", "error");
    return;
  }

  if (!file) {
    setFormStatus("กรุณาแนบรูปออเดอร์ก่อนส่งเข้าบอร์ด", "error");
    return;
  }

  try {
    setLoading(true, "กำลังสร้างบิลใหม่...");

    const createdAtMs = Date.now();
    const initialDoc = {
      billNo,
      tableNo,
      hostessName,
      guestName,
      notes,
      imageUrl: "",
      rawText: draftText || "กำลังอ่านข้อความจากรูป...",
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

    setLoading(true, "กำลังอัปโหลดรูปออเดอร์...");
    const optimizedBlob = await optimizeImage(file);
    const fileName = `${Date.now()}-${sanitizeFileName(file.name || "order.jpg")}`;
    const storageRef = ref(state.storage, `orders/${orderRef.id}/${fileName}`);
    await uploadBytes(storageRef, optimizedBlob, {
      contentType: optimizedBlob.type || file.type || "image/jpeg",
    });
    const imageUrl = await getDownloadURL(storageRef);
    await updateDoc(orderRef, {
      imageUrl,
      updatedAt: serverTimestamp(),
      ocrStatus: draftText ? "manual" : "processing",
    });

    if (!draftText) {
      setLoading(true, "กำลังอ่านตัวหนังสือจากรูป (OCR)...");
      const rawText = await runOCR(file);
      const items = buildItemsFromText(rawText);
      await updateDoc(orderRef, {
        rawText: rawText || "OCR อ่านข้อความไม่ชัด กรุณาแก้ไขด้วยมือ",
        readingText: rawText || "",
        items,
        ocrStatus: rawText ? "done" : "error",
        updatedAt: serverTimestamp(),
      });
    }

    resetForm();
    setFormStatus("ส่งออเดอร์เข้าบอร์ดครัวเรียบร้อยแล้ว", "success");
  } catch (error) {
    console.error(error);
    setFormStatus(`ส่งออเดอร์ไม่สำเร็จ: ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
}

function renderOrders() {
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

    const bill = order.billNo || "ไม่มีเลขบิล";
    const table = order.tableNo || "ไม่ระบุโต๊ะ/ห้อง";
    const title = order.guestName || order.tableNo || order.billNo || "บิลใหม่";
    const createdText = formatDateTime(order.createdAtMs);

    node.querySelector(".js-bill").textContent = `บิล ${bill}`;
    node.querySelector(".js-table").textContent = table;
    node.querySelector(".js-title").textContent = title;
    node.querySelector(".js-meta").textContent = [
      order.hostessName ? `Hostess: ${order.hostessName}` : null,
      `สร้างเมื่อ ${createdText}`,
    ]
      .filter(Boolean)
      .join(" • ");

    const statusEl = node.querySelector(".js-status");
    statusEl.textContent = order.completed ? "บิลเสร็จแล้ว" : "กำลังทำ";
    statusEl.classList.add(order.completed ? "is-complete" : "is-working");

    const imageEl = node.querySelector(".js-image");
    imageEl.src = order.imageUrl || PLACEHOLDER_IMAGE;

    node.querySelector(".js-raw").textContent = order.rawText || "ยังไม่มีข้อความจาก OCR";
    node.querySelector(".js-reading").value = order.readingText || "";
    node.querySelector(".js-ocr-state").textContent = describeOcrState(order.ocrStatus);
    node.querySelector(".js-notes").textContent = order.notes || "ไม่มีโน้ตเพิ่มเติม";

    const itemsWrap = node.querySelector(".js-items");
    const items = Array.isArray(order.items) ? order.items : [];
    if (!items.length) {
      itemsWrap.innerHTML = `<div class="muted small">ยังไม่มีรายการอาหาร กรุณาเพิ่มรายการด้วยมือ</div>`;
    } else {
      items.forEach((item) => {
        const row = document.createElement("label");
        row.className = `item-row ${item.done ? "done" : ""}`;
        row.dataset.itemId = item.id;
        row.innerHTML = `
          <input type="checkbox" ${item.done ? "checked" : ""} />
          <input type="text" value="${escapeAttribute(item.text || "")}" />
        `;
        itemsWrap.appendChild(row);
      });
    }

    const completeBtn = node.querySelector(".js-mark-complete");
    const dragBtn = node.querySelector(".js-drag-delete");

    completeBtn.textContent = order.completed ? "บิลนี้เสร็จแล้ว" : "ทำบิลนี้เสร็จแล้ว";
    completeBtn.disabled = !!order.completed;
    dragBtn.hidden = !order.completed;

    attachCardEvents(node, order);
    fragment.appendChild(node);
  }

  els.ordersBoard.appendChild(fragment);
  updateTimersAndAlerts();
}

function attachCardEvents(card, order) {
  const saveReadingBtn = card.querySelector(".js-save-reading");
  const saveItemsBtn = card.querySelector(".js-save-items");
  const addItemBtn = card.querySelector(".js-add-item");
  const completeBtn = card.querySelector(".js-mark-complete");
  const dragBtn = card.querySelector(".js-drag-delete");
  const itemsWrap = card.querySelector(".js-items");

  saveReadingBtn.addEventListener("click", async () => {
    const readingText = card.querySelector(".js-reading").value.trim();
    await updateOrder(order.id, { readingText, updatedAt: serverTimestamp() });
  });

  saveItemsBtn.addEventListener("click", async () => {
    const items = collectItemsFromCard(card);
    await syncItems(order.id, items);
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
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
    const items = collectItemsFromCard(card);
    await syncItems(order.id, items);
  });

  dragBtn.addEventListener("pointerdown", (event) => startDragDelete(event, order.id, card));
}

function collectItemsFromCard(card) {
  const rows = [...card.querySelectorAll(".item-row")];
  return rows
    .map((row) => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      const textInput = row.querySelector('input[type="text"]');
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


function updateStats() {
  const visibleOrders = getVisibleOrders();
  const activeCount = visibleOrders.filter((order) => !order.completed).length;
  const overdueCount = visibleOrders.filter((order) => !order.completed && getElapsedMs(order) > 30 * 60 * 1000).length;
  const completedCount = visibleOrders.filter((order) => order.completed).length;
  els.activeCount.textContent = String(activeCount);
  els.overdueCount.textContent = String(overdueCount);
  els.completedCount.textContent = String(completedCount);
}

function updateTimersAndAlerts() {
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

  els.activeCount.textContent = String(activeCount);
  els.overdueCount.textContent = String(overdueCount);
  els.completedCount.textContent = String(completedCount);
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
  if (!order?.completed) return;

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
  els.trashZone.classList.remove("drag-over");
  state.drag = null;
}

function moveDragPreview(event) {
  if (!state.drag?.preview) return;
  state.drag.preview.style.left = `${event.clientX}px`;
  state.drag.preview.style.top = `${event.clientY}px`;
}

function toggleTrashHover(event) {
  els.trashZone.classList.toggle("drag-over", isPointerOverTrash(event));
}

function isPointerOverTrash(event) {
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
    .map((line) => line.replace(/[•●▪▶]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => line.length > 1)
    .filter((line) => !/^table\b|^bill\b|^guest\b|^room\b|^check\b|^total\b|^time\b|^date\b/i.test(line))
    .slice(0, 30);

  return lines.map((textLine) => ({ id: uid(), text: textLine, done: false }));
}

async function runOCR(file) {
  const result = await window.Tesseract.recognize(file, "tha+eng", {
    logger: (message) => {
      if (message.status === "recognizing text") {
        const pct = Math.round((message.progress || 0) * 100);
        setLoading(true, `กำลังอ่านตัวหนังสือจากรูป ${pct}%`);
      }
    },
  });

  return (result?.data?.text || "").trim();
}

async function optimizeImage(file) {
  try {
    if (!("createImageBitmap" in window)) return file;

    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(bitmap, 0, 0, width, height);

    return await new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob || file),
        "image/jpeg",
        0.84
      );
    });
  } catch (error) {
    console.warn("Image optimization skipped", error);
    return file;
  }
}

function saveConfigFromDialog() {
  const config = {
    apiKey: els.cfgApiKey.value.trim(),
    authDomain: els.cfgAuthDomain.value.trim(),
    projectId: els.cfgProjectId.value.trim(),
    storageBucket: els.cfgStorageBucket.value.trim(),
    messagingSenderId: els.cfgMessagingSenderId.value.trim(),
    appId: els.cfgAppId.value.trim(),
  };

  if (!isValidFirebaseConfig(config)) {
    alert("กรุณาใส่ค่า Firebase ให้ครบทุกช่อง");
    return;
  }

  localStorage.setItem("laya_firebase_config", JSON.stringify(config));
  els.setupDialog.close();
  showSetupNotice("บันทึกค่า Firebase แล้ว กรุณารีเฟรชหน้าเว็บ 1 ครั้ง");
}

function clearSavedConfig() {
  localStorage.removeItem("laya_firebase_config");
  loadConfigIntoDialog();
  showSetupNotice("ล้างค่า Firebase ที่บันทึกไว้แล้ว");
}

function getFirebaseConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem("laya_firebase_config") || "null");
    if (saved && isValidFirebaseConfig(saved)) return saved;
  } catch (_) {
    // ignore
  }
  return window.LAYA_FIREBASE_CONFIG || {};
}

function loadConfigIntoDialog() {
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
  els.setupNotice.innerHTML =
    message ||
    `ยังไม่ได้ตั้งค่า Firebase — กดปุ่ม <strong>Firebase Setup</strong> มุมขวาบน แล้ววางค่า Web App Config ของโปรเจกต์คุณก่อนใช้งาน`;
  els.setupNotice.classList.remove("hidden");
}

function syncVoiceButton() {
  els.voiceToggleBtn.textContent = state.voiceEnabled
    ? "🔕 ปิดเสียงแจ้งเตือน"
    : "🔔 เปิดเสียงแจ้งเตือน";
}

function setLoading(isLoading, message = "") {
  els.submitBtn.disabled = isLoading;
  els.submitBtn.textContent = isLoading ? "กำลังประมวลผล..." : "อัปโหลดและส่งเข้าบอร์ดครัว";
  if (message) setFormStatus(message);
}

function resetForm() {
  els.orderForm.reset();
  els.photoPreview.src = "";
  els.photoPreviewWrap.classList.add("hidden");
  els.ocrTextDraft.value = "";
}

function setFormStatus(message = "", type = "") {
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
      return "ใส่ข้อความด้วยมือ";
    case "queued":
      return "รอ OCR";
    case "processing":
      return "กำลังอ่านภาพ";
    case "done":
      return "OCR เสร็จแล้ว";
    case "error":
      return "OCR ไม่ชัด";
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

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function loadBoolean(key, fallback = false) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.warn("Service worker registration failed", error);
  }
}
