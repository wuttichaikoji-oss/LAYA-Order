# Laya Kitchen Order Tracker

เว็บแอพสำหรับติดตามออเดอร์อาหารแบบเรียลไทม์ ใช้งานได้บน GitHub Pages + Firebase โดยไม่ต้องมีเซิร์ฟเวอร์เพิ่ม

## สิ่งที่ทำได้

- Hostess อัปโหลดรูปออเดอร์จากมือถือ / iPad / คอม
- บิลใหม่ขึ้นบนบอร์ดครัวทันทีแบบ Realtime
- OCR อ่านเฉพาะโซนเมนูจากรูปด้วย Tesseract.js (ไทย + อังกฤษ)
- ตัดหัวบิลออก แล้วสร้างรายการอาหารจากชื่อเมนูอัตโนมัติ
- ครัวติ๊กว่าเมนูไหนทำเสร็จแล้วได้ทันที
- สีกรอบตามเวลา
  - 0–15 นาที = สีเขียว
  - >15 นาที = สีเหลือง
  - >25 นาที = สีแดง
  - >30 นาที = สีแดงกระพริบ + เสียงพูดเตือน 3 รอบ ทุก 5 นาที
- เมื่อทั้งบิลเสร็จแล้ว จะมีปุ่ม “ลากไปถังขยะ” เพื่อลบบิลออกจากบอร์ด
- รองรับ PWA ติดเป็นไอคอนบนมือถือได้

## โครงสร้างไฟล์

- `index.html` หน้าเว็บหลัก
- `styles.css` รูปแบบหน้าจอ
- `app.js` ระบบหลักทั้งหมด
- `firebase-config.js` ไฟล์ config Firebase
- `firebase/firestore.rules` กฎ Firestore
- `firebase/storage.rules` กฎ Storage
- `manifest.webmanifest` และ `sw.js` สำหรับ PWA

## วิธีใช้แบบเร็วที่สุด

### 1) สร้าง Firebase Project

ใน Firebase Console ให้สร้างโปรเจกต์ใหม่ แล้วเปิดบริการต่อไปนี้

- Firestore Database
- Storage
- Hosting ไม่จำเป็น ถ้าจะใช้ GitHub Pages

### 2) สร้าง Web App ใน Firebase

ไปที่ Project Settings > General > Your apps > Add app > Web app

คุณจะได้ค่า config ประมาณนี้

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

มี 2 วิธีใส่ค่า

#### วิธี A: ใส่ผ่านหน้าเว็บ
- เปิดเว็บ
- กดปุ่ม `Firebase Setup`
- วางค่าทั้ง 6 ช่อง
- กดบันทึก
- รีเฟรชหน้า 1 ครั้ง

#### วิธี B: แก้ไฟล์ `firebase-config.js`

```js
window.LAYA_FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## ตั้งค่า Firestore และ Storage Rules

### Firestore Rules
คัดลอกไฟล์ `firebase/firestore.rules` ไปใช้ใน Firestore Rules

### Storage Rules
คัดลอกไฟล์ `firebase/storage.rules` ไปใช้ใน Storage Rules

> หมายเหตุ: ชุด rules นี้เน้นให้เริ่มใช้งานได้เร็ว หากจะใช้จริงระยะยาว แนะนำเพิ่ม Authentication หรือ App Check ภายหลัง

## โครงสร้างข้อมูล Firestore

Collection: `orders`

ตัวอย่างเอกสาร

```json
{
  "billNo": "B-240311-01",
  "tableNo": "Table 6",
  "hostessName": "Noi",
  "guestName": "VIP Guest",
  "notes": "No spicy",
  "imageUrl": "https://...",
  "rawText": "Pad Thai\nTom Yum",
  "readingText": "Pad Thai\nTom Yum",
  "items": [
    {"id": "1", "text": "Pad Thai", "done": false},
    {"id": "2", "text": "Tom Yum", "done": true}
  ],
  "ocrStatus": "done",
  "completed": false,
  "softDeleted": false,
  "createdAtMs": 1773240000000
}
```

## วิธีอัปขึ้น GitHub Pages

### วิธีง่าย
1. สร้าง repository ใหม่บน GitHub
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น repository
3. ไปที่ `Settings > Pages`
4. เลือก `Deploy from a branch`
5. เลือก branch = `main` และ folder = `/root`
6. Save

จากนั้น GitHub จะสร้างลิงก์เว็บให้

## วิธีใช้งานจริง

### ฝั่ง Hostess
1. ถ่ายรูปบิล
2. ระบบจะโฟกัสอ่านเฉพาะกรอบเมนูในภาพตัวอย่าง
3. ถ้าต้องการ สามารถพิมพ์ชื่อเมนูเองก่อนส่งได้
4. กด `อัปโหลดและส่งเข้าบอร์ดครัว`

### ฝั่งครัว
1. เปิดหน้าเว็บเดียวกันบนจอครัว
2. ดูออเดอร์ใหม่แบบเรียลไทม์
3. ติ๊กเมนูที่ทำเสร็จแล้ว
4. ถ้าทั้งบิลเสร็จ ระบบจะมองว่า completed ทันที
5. ลากบิลที่เสร็จแล้วไปไว้ที่ถังขยะเพื่อลบออกจากบอร์ด

## หมายเหตุสำคัญ

### เรื่องฐาน Firestore
เวอร์ชันนี้ตั้งค่าให้เชื่อมกับ Firestore database ชื่อ `laya` อยู่แล้วใน `app.js`

ถ้าในโปรเจกต์ของคุณใช้ `(default)` แทน ให้แก้บรรทัดนี้ใน `app.js`

```js
state.db = getFirestore(app, "laya");
```

เป็น

```js
state.db = getFirestore(app);
```

### เรื่องเสียงเตือน
เสียงเตือนใช้ Web Speech API ของเบราว์เซอร์ ดังนั้นครั้งแรกควรกดปุ่ม `เปิดเสียงแจ้งเตือน` ก่อน เพื่อให้เบราว์เซอร์อนุญาตเสียง

### เรื่อง OCR
OCR อ่านได้ดีที่สุดเมื่อ:
- รูปสว่าง
- ตัวหนังสือคม
- ไม่เอียงมาก
- พื้นหลังไม่รก

## สิ่งที่แนะนำทำต่อในเวอร์ชันถัดไป

- แยกหน้าจอ Hostess / Kitchen คนละหน้า
- เพิ่ม Login ตามตำแหน่งงาน
- เพิ่มหมวดสถานะ เช่น Waiting / Cooking / Ready to Serve
- เพิ่มเสียงแจ้งเตือนเป็นไฟล์เสียงจริงของร้าน
- เพิ่ม Dashboard สรุปเวลาทำอาหารเฉลี่ยต่อบิล
- เพิ่มการพิมพ์ใบคิว
- เพิ่มการอ่านชื่อเมนูให้แม่นขึ้นด้วย AI OCR / menu dictionary

