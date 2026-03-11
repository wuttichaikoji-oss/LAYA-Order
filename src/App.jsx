import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ChefHat,
  CheckCircle2,
  Clock3,
  Trash2,
  Upload,
  Volume2,
  AlertTriangle,
  RefreshCcw,
  ScanText
} from "lucide-react";
import Tesseract from "tesseract.js";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc
} from "firebase/firestore";
import {
  getStorage,
  getDownloadURL,
  ref,
  uploadBytes
} from "firebase/storage";
import { firebaseConfig, isFirebaseConfigured } from "./firebaseConfig";

const FIREBASE_ENABLED = isFirebaseConfigured();

let db = null;
let storage = null;

if (FIREBASE_ENABLED) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
}

const COLLECTION_NAME = "foodOrders";
const STORAGE_FOLDER = "food-order-images";
const ALERT_MESSAGE = "ออเดอร์ยังไม่เสร็จนะคะเชฟ";

const WORD_READING_MAP = {
  grilled: "กริลด์",
  fried: "ฟรายด์",
  stir: "สเตียร์",
  wok: "ว็อก",
  roasted: "โรสต์",
  baked: "เบค",
  steamed: "สตีม",
  braised: "เบรส",
  chicken: "ชิคเก้น",
  beef: "บีฟ",
  pork: "พอร์ค",
  duck: "ดัก",
  lamb: "แลมบ์",
  fish: "ฟิช",
  salmon: "แซลมอน",
  tuna: "ทูน่า",
  seabass: "ซีบาส",
  shrimp: "ชริมพ์",
  prawn: "พรอน",
  squid: "สควิด",
  pasta: "พาสต้า",
  spaghetti: "สปาเกตตี",
  penne: "เพนเน",
  risotto: "ริซอตโต",
  pizza: "พิซซ่า",
  burger: "เบอร์เกอร์",
  steak: "สเต๊ก",
  soup: "ซุป",
  salad: "สลัด",
  rice: "ไรซ์",
  noodle: "นู้ดเดิล",
  noodles: "นู้ดเดิลส์",
  curry: "เคอร์รี่",
  garlic: "การ์ลิก",
  butter: "บัตเตอร์",
  lemon: "เลมอน",
  pepper: "เปปเปอร์",
  black: "แบล็ก",
  spicy: "สไปซี่",
  crispy: "คริสปี้",
  thai: "ไทย",
  basil: "เบซิล",
  mushroom: "มัชรูม",
  cheese: "ชีส",
  cream: "ครีม",
  sauce: "ซอส",
  tom: "ต้ม",
  yum: "ยำ",
  goong: "กุ้ง",
  pad: "ผัด",
  krapow: "กะเพรา",
  kaprao: "กะเพรา"
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function getOrderVisualState(ageMs, done) {
  if (done) {
    return {
      ring: "#38bdf8",
      badge: "พร้อมเสิร์ฟ / เสร็จทั้งบิล",
      badgeBg: "#e0f2fe",
      badgeColor: "#0369a1",
      pulse: false
    };
  }

  const mins = ageMs / 60000;

  if (mins < 15) {
    return {
      ring: "#22c55e",
      badge: "อยู่ในเวลา",
      badgeBg: "#dcfce7",
      badgeColor: "#15803d",
      pulse: false
    };
  }

  if (mins < 25) {
    return {
      ring: "#facc15",
      badge: "เริ่มใกล้ช้า",
      badgeBg: "#fef9c3",
      badgeColor: "#854d0e",
      pulse: false
    };
  }

  if (mins < 30) {
    return {
      ring: "#ef4444",
      badge: "ล่าช้า",
      badgeBg: "#fee2e2",
      badgeColor: "#b91c1c",
      pulse: false
    };
  }

  return {
    ring: "#dc2626",
    badge: "เกิน 30 นาที",
    badgeBg: "#dc2626",
    badgeColor: "#ffffff",
    pulse: true
  };
}

function normalizeText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/\t/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

function toThaiReading(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\s/-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return text;

  return words
    .map((word) => WORD_READING_MAP[word] || word)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeNoise(line) {
  const clean = line.trim();
  if (!clean) return true;
  if (clean.length <= 1) return true;
  if (
    /^(table|tab|qty|no|bill|check|time|date|total|subtotal|cashier|vat|room)$/i.test(
      clean
    )
  ) {
    return true;
  }
  if (/^[0-9 .,:/-]+$/.test(clean)) return true;
  return false;
}

function parseOrderItems(rawText) {
  const cleaned = normalizeText(rawText);
  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !looksLikeNoise(line));

  const deduped = [];
  const seen = new Set();

  for (const line of lines) {
    const normalized = line.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(line);
  }

  const limited = deduped.slice(0, 12);

  return limited.map((line) => ({
    id: uid(),
    text: line,
    reading: toThaiReading(line),
    done: false
  }));
}

async function compressImage(file, maxWidth = 1400, quality = 0.78) {
  const imageUrl = URL.createObjectURL(file);

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageUrl;
  });

  const ratio = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  URL.revokeObjectURL(imageUrl);

  return new File(
    [blob],
    `${file.name.replace(/\.[^.]+$/, "")}-compressed.jpg`,
    {
      type: "image/jpeg"
    }
  );
}

async function runOCR(file, setProgress) {
  const result = await Tesseract.recognize(file, "eng+tha", {
    logger: (m) => {
      if (m.status === "recognizing text") {
        setProgress(Math.round((m.progress || 0) * 100));
      }
    }
  });

  return normalizeText(result?.data?.text || "");
}

function speakAlertThreeTimes(message) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  for (let i = 0; i < 3; i += 1) {
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = "th-TH";
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.volume = 1;

    setTimeout(() => {
      window.speechSynthesis.speak(utter);
    }, i * 2200);
  }
}

function cardStyle(visual, allDone) {
  return {
    background: "#ffffff",
    border: `4px solid ${visual.ring}`,
    borderRadius: 24,
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
    cursor: allDone ? "grab" : "default",
    animation: visual.pulse && !allDone ? "alertBlink 0.65s linear infinite" : "none"
  };
}

function fieldStyle() {
  return {
    width: "100%",
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    padding: "12px 14px",
    outline: "none",
    background: "#ffffff"
  };
}

function buttonStyle(bg, color = "#fff") {
  return {
    border: "none",
    borderRadius: 16,
    padding: "12px 14px",
    background: bg,
    color,
    fontWeight: 600,
    cursor: "pointer"
  };
}

export default function App() {
  const [orders, setOrders] = useState([]);
  const [billNo, setBillNo] = useState("");
  const [tableNo, setTableNo] = useState("");
  const [note, setNote] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [draggingId, setDraggingId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    FIREBASE_ENABLED
      ? "โหมดออนไลน์เรียลไทม์: เปิดใช้งาน"
      : "โหมดตัวอย่างในเครื่อง: ยังไม่ใส่ Firebase"
  );

  const alertedRef = useRef(new Set());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!FIREBASE_ENABLED) return undefined;

    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAtMs", "asc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));
      setOrders(rows);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!soundEnabled) return;

    const interval = setInterval(async () => {
      const overdue = orders.filter((order) => {
        const allDone =
          (order.items || []).length > 0 &&
          (order.items || []).every((item) => item.done);

        if (allDone) return false;

        const age = now - (order.createdAtMs || Date.now());
        if (age < 30 * 60 * 1000) return false;

        const lastAlert = order.lastAlertAtMs || 0;
        return Date.now() - lastAlert >= 5 * 60 * 1000;
      });

      for (const order of overdue) {
        const key = `${order.id}-${Math.floor(Date.now() / (5 * 60 * 1000))}`;
        if (alertedRef.current.has(key)) continue;

        alertedRef.current.add(key);
        speakAlertThreeTimes(ALERT_MESSAGE);
        await patchOrder(order.id, { lastAlertAtMs: Date.now() });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [orders, now, soundEnabled]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
  }, [orders]);

  async function patchOrder(id, patch) {
    if (FIREBASE_ENABLED) {
      await updateDoc(doc(db, COLLECTION_NAME, id), patch);
    } else {
      setOrders((prev) =>
        prev.map((order) => (order.id === id ? { ...order, ...patch } : order))
      );
    }
  }

  async function removeOrder(id) {
    if (FIREBASE_ENABLED) {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } else {
      setOrders((prev) => prev.filter((order) => order.id !== id));
    }
  }

  function resetForm() {
    setBillNo("");
    setTableNo("");
    setNote("");
    setImageFile(null);
    setPreviewUrl("");
    setOcrProgress(0);
  }

  async function uploadImageIfNeeded(file, orderId) {
    if (!FIREBASE_ENABLED) {
      return URL.createObjectURL(file);
    }

    const storageRef = ref(storage, `${STORAGE_FOLDER}/${orderId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  async function handleAddOrder() {
    if (!imageFile) {
      setStatusMessage("กรุณาเลือกรูปออเดอร์ก่อน");
      return;
    }

    try {
      setProcessing(true);
      setStatusMessage("กำลังย่อรูปและสแกน OCR...");
      setOcrProgress(0);

      const orderId = uid();
      const compressed = await compressImage(imageFile);
      const extractedText = await runOCR(compressed, setOcrProgress);
      const imageUrl = await uploadImageIfNeeded(compressed, orderId);
      const items = parseOrderItems(extractedText);

      const payload = {
        id: orderId,
        billNo: billNo.trim() || `BILL-${String(Date.now()).slice(-6)}`,
        tableNo: tableNo.trim() || "-",
        note: note.trim(),
        imageUrl,
        extractedText,
        items,
        createdAtMs: Date.now(),
        lastAlertAtMs: 0,
        source: "hostess"
      };

      if (FIREBASE_ENABLED) {
        await setDoc(doc(db, COLLECTION_NAME, orderId), payload);
      } else {
        setOrders((prev) => [...prev, payload]);
      }

      setStatusMessage(`เพิ่มออเดอร์แล้ว ${payload.billNo} (${items.length} รายการ)`);
      resetForm();
    } catch (error) {
      console.error(error);
      setStatusMessage("สแกนรูปไม่สำเร็จ กรุณาลองใหม่ หรือเปลี่ยนรูปที่คมชัดขึ้น");
    } finally {
      setProcessing(false);
    }
  }

  async function toggleItem(order, itemId) {
    const nextItems = (order.items || []).map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    await patchOrder(order.id, { items: nextItems });
  }

  async function markAllDone(order) {
    const nextItems = (order.items || []).map((item) => ({
      ...item,
      done: true
    }));
    await patchOrder(order.id, { items: nextItems });
  }

  async function rerunReading(order) {
    const nextItems = (order.items || []).map((item) => ({
      ...item,
      reading: toThaiReading(item.text)
    }));
    await patchOrder(order.id, { items: nextItems });
  }

  async function updateItemText(order, itemId, field, value) {
    const nextItems = (order.items || []).map((item) =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    await patchOrder(order.id, { items: nextItems });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", color: "#0f172a" }}>
      <style>{`
        @keyframes alertBlink {
          0%, 100% {
            box-shadow: 0 0 0 rgba(220,38,38,0.08);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(220,38,38,0.18);
            transform: scale(1.01);
          }
        }

        details > summary {
          cursor: pointer;
        }

        img {
          display: block;
        }

        @media (max-width: 1024px) {
          .page-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 700px) {
          .order-grid {
            grid-template-columns: 1fr !important;
          }
          .order-card-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: 16
        }}
      >
        <div
          className="page-grid"
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "420px 1fr"
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 1px 4px rgba(15,23,42,0.08)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  borderRadius: 18,
                  background: "#0f172a",
                  color: "#fff",
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <ChefHat size={20} />
              </div>

              <div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>Food Order Tracker</div>
                <div style={{ color: "#64748b", fontSize: 14 }}>
                  Hostess → OCR → Kitchen Board
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
                  เลขบิล / Bill No.
                </div>
                <input
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  placeholder="เช่น MGR-24001"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
                  โต๊ะ / ห้อง / จุดส่ง
                </div>
                <input
                  value={tableNo}
                  onChange={(e) => setTableNo(e.target.value)}
                  placeholder="เช่น Table 8 / Room A105"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>หมายเหตุ</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น No spicy / VIP / Allergy"
                  style={{ ...fieldStyle(), minHeight: 92, resize: "vertical" }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                  รูปออเดอร์จาก Hostess
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    borderRadius: 16,
                    border: "1px dashed #cbd5e1",
                    background: "#f8fafc",
                    padding: "20px 12px",
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  <Upload size={16} />
                  เลือกรูป / ถ่ายรูปออเดอร์
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImageFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }}
                  />
                </label>
              </div>

              {previewUrl ? (
                <div
                  style={{
                    overflow: "hidden",
                    borderRadius: 16,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc"
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="preview"
                    style={{
                      maxHeight: 260,
                      width: "100%",
                      objectFit: "contain"
                    }}
                  />
                </div>
              ) : null}

              <button
                onClick={handleAddOrder}
                disabled={processing}
                style={{
                  ...buttonStyle("#0f172a"),
                  opacity: processing ? 0.6 : 1
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {processing ? <RefreshCcw size={16} /> : <ScanText size={16} />}
                  {processing ? `กำลังสแกน OCR ${ocrProgress}%` : "สแกนและเพิ่มออเดอร์"}
                </span>
              </button>

              <button
                onClick={() => setSoundEnabled((prev) => !prev)}
                style={buttonStyle(soundEnabled ? "#dc2626" : "#e2e8f0", soundEnabled ? "#fff" : "#1e293b")}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Volume2 size={16} />
                  {soundEnabled
                    ? "เปิดเสียงเตือนบนเครื่องนี้"
                    : "กดเพื่อเปิดเสียงเตือนเครื่องครัวนี้"}
                </span>
              </button>

              <div
                style={{
                  borderRadius: 16,
                  background: "#f8fafc",
                  padding: 14,
                  border: "1px solid #e2e8f0",
                  color: "#475569",
                  fontSize: 14
                }}
              >
                <div style={{ marginBottom: 8, color: "#0f172a", fontWeight: 700 }}>
                  กติกาสีของออเดอร์
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  <div>🟢 0–15 นาที = ปกติ</div>
                  <div>🟡 เกิน 15 นาที = เริ่มช้า</div>
                  <div>🔴 เกิน 25 นาที = ล่าช้า</div>
                  <div>🚨 เกิน 30 นาที = แดงกระพริบ + เสียงทุก 5 นาที</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                background: "#fff",
                borderRadius: 24,
                padding: 16,
                boxShadow: "0 1px 4px rgba(15,23,42,0.08)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>Kitchen Live Board</div>
                  <div style={{ color: "#64748b", fontSize: 14 }}>
                    ออเดอร์ใหม่จะขึ้นทันทีบนหน้าจอเดียวกัน
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 16,
                    background: "#f8fafc",
                    padding: "10px 12px",
                    color: "#475569",
                    border: "1px solid #e2e8f0",
                    fontSize: 14
                  }}
                >
                  <Clock3 size={16} />
                  {statusMessage}
                </div>
              </div>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                const orderId = e.dataTransfer.getData("text/plain");
                const order = orders.find((item) => item.id === orderId);
                const allDone =
                  (order?.items || []).length > 0 &&
                  (order?.items || []).every((item) => item.done);

                if (orderId && allDone) {
                  await removeOrder(orderId);
                  setStatusMessage(`ลบบิล ${order?.billNo || ""} แล้ว`);
                } else {
                  setStatusMessage("ลากลงถังขยะได้เฉพาะบิลที่เสร็จทั้งบิลแล้ว");
                }

                setDraggingId(null);
              }}
              style={{
                position: "sticky",
                top: 16,
                zIndex: 5,
                borderRadius: 24,
                border: `2px dashed ${draggingId ? "#f87171" : "#cbd5e1"}`,
                background: draggingId ? "#fef2f2" : "#ffffff",
                textAlign: "center",
                padding: 16
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "#334155"
                }}
              >
                <Trash2 size={18} />
                ลากบิลที่เสร็จทั้งบิลแล้วมาทิ้งตรงนี้
              </div>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
                ใช้เพื่อลบออเดอร์ออกจากบอร์ด
              </div>
            </div>

            {sortedOrders.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 24,
                  padding: 40,
                  textAlign: "center",
                  boxShadow: "0 1px 4px rgba(15,23,42,0.08)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <Camera size={40} color="#94a3b8" />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>ยังไม่มีออเดอร์</div>
                <div style={{ marginTop: 4, color: "#64748b", fontSize: 14 }}>
                  เมื่อ Hostess อัปโหลดรูป บิลจะขึ้นที่นี่ทันที
                </div>
              </div>
            ) : (
              <div
                className="order-grid"
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))"
                }}
              >
                {sortedOrders.map((order) => {
                  const items = order.items || [];
                  const allDone = items.length > 0 && items.every((item) => item.done);
                  const ageMs = now - (order.createdAtMs || now);
                  const visual = getOrderVisualState(ageMs, allDone);

                  return (
                    <div
                      key={order.id}
                      draggable={allDone}
                      onDragStart={(e) => {
                        setDraggingId(order.id);
                        e.dataTransfer.setData("text/plain", order.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      style={cardStyle(visual, allDone)}
                    >
                      <div
                        className="order-card-grid"
                        style={{
                          display: "grid",
                          gap: 16,
                          padding: 16,
                          gridTemplateColumns: "180px 1fr"
                        }}
                      >
                        <div style={{ display: "grid", gap: 12 }}>
                          <div
                            style={{
                              overflow: "hidden",
                              borderRadius: 16,
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0"
                            }}
                          >
                            {order.imageUrl ? (
                              <img
                                src={order.imageUrl}
                                alt={order.billNo}
                                style={{
                                  height: 180,
                                  width: "100%",
                                  objectFit: "cover"
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  height: 180,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#94a3b8"
                                }}
                              >
                                No Image
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              borderRadius: 16,
                              background: "#f8fafc",
                              padding: 12,
                              border: "1px solid #e2e8f0"
                            }}
                          >
                            <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>
                              เวลาเดินบิล
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 28,
                                fontWeight: 700,
                                fontVariantNumeric: "tabular-nums"
                              }}
                            >
                              {formatElapsed(ageMs)}
                            </div>
                            <div
                              style={{
                                marginTop: 8,
                                display: "inline-flex",
                                borderRadius: 999,
                                padding: "6px 10px",
                                fontSize: 12,
                                fontWeight: 700,
                                background: visual.badgeBg,
                                color: visual.badgeColor
                              }}
                            >
                              {visual.badge}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: 12 }}>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 12
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 26, fontWeight: 700 }}>{order.billNo}</div>
                              <div style={{ color: "#64748b", fontSize: 14 }}>
                                {order.tableNo || "-"}
                              </div>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              <button
                                onClick={() => rerunReading(order)}
                                style={buttonStyle("#e2e8f0", "#334155")}
                              >
                                รีคำอ่าน
                              </button>
                              <button
                                onClick={() => markAllDone(order)}
                                style={buttonStyle("#16a34a")}
                              >
                                เสร็จทั้งบิล
                              </button>
                            </div>
                          </div>

                          {order.note ? (
                            <div
                              style={{
                                borderRadius: 16,
                                padding: 12,
                                background: "#fffbeb",
                                border: "1px solid #fde68a",
                                color: "#92400e",
                                fontSize: 14
                              }}
                            >
                              <strong>หมายเหตุ:</strong> {order.note}
                            </div>
                          ) : null}

                          <div
                            style={{
                              borderRadius: 16,
                              background: "#f8fafc",
                              padding: 12,
                              border: "1px solid #e2e8f0"
                            }}
                          >
                            <div
                              style={{
                                marginBottom: 12,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                color: "#1e293b",
                                fontSize: 14,
                                fontWeight: 700
                              }}
                            >
                              <AlertTriangle size={16} />
                              รายการอาหาร / คำเขียน / คำอ่าน
                            </div>

                            <div style={{ display: "grid", gap: 12 }}>
                              {items.length === 0 ? (
                                <div style={{ color: "#64748b", fontSize: 14 }}>
                                  OCR ยังจับรายการไม่ได้ กรุณาใช้รูปที่ชัดขึ้น
                                </div>
                              ) : (
                                items.map((item, idx) => (
                                  <div
                                    key={item.id}
                                    style={{
                                      borderRadius: 16,
                                      border: `1px solid ${
                                        item.done ? "#86efac" : "#e2e8f0"
                                      }`,
                                      background: item.done ? "#f0fdf4" : "#ffffff",
                                      padding: 12
                                    }}
                                  >
                                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                      <button
                                        onClick={() => toggleItem(order, item.id)}
                                        title="ทำเสร็จ / ยกเลิก"
                                        style={{
                                          border: "none",
                                          background: "transparent",
                                          color: item.done ? "#16a34a" : "#cbd5e1",
                                          cursor: "pointer",
                                          padding: 0,
                                          marginTop: 2
                                        }}
                                      >
                                        <CheckCircle2 size={22} />
                                      </button>

                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                          style={{
                                            marginBottom: 8,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: "#94a3b8",
                                            letterSpacing: "0.08em"
                                          }}
                                        >
                                          ITEM #{idx + 1}
                                        </div>

                                        <input
                                          value={item.text}
                                          onChange={(e) =>
                                            updateItemText(order, item.id, "text", e.target.value)
                                          }
                                          style={{
                                            ...fieldStyle(),
                                            marginBottom: 8,
                                            fontWeight: 600
                                          }}
                                        />

                                        <input
                                          value={item.reading}
                                          onChange={(e) =>
                                            updateItemText(order, item.id, "reading", e.target.value)
                                          }
                                          style={{
                                            ...fieldStyle(),
                                            background: "#f8fafc",
                                            color: "#475569"
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <details
                            style={{
                              borderRadius: 16,
                              background: "#f8fafc",
                              padding: 12,
                              border: "1px solid #e2e8f0",
                              fontSize: 14
                            }}
                          >
                            <summary style={{ fontWeight: 600, color: "#1e293b" }}>
                              ดูข้อความ OCR ดิบ
                            </summary>
                            <pre
                              style={{
                                marginTop: 12,
                                whiteSpace: "pre-wrap",
                                fontFamily: "Arial, Helvetica, sans-serif",
                                color: "#475569"
                              }}
                            >
                              {order.extractedText || "-"}
                            </pre>
                          </details>

                          {allDone ? (
                            <div
                              style={{
                                borderRadius: 16,
                                background: "#f0fdf4",
                                padding: 12,
                                border: "1px solid #86efac",
                                color: "#15803d",
                                fontSize: 14,
                                fontWeight: 600
                              }}
                            >
                              บิลนี้เสร็จแล้ว — สามารถลากลงถังขยะเพื่อลบออกจากหน้าจอได้
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
