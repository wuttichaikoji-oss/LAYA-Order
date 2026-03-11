# LAYA Order - GitHub Pages Ready

โปรเจกต์นี้เป็นเวอร์ชันพร้อมอัปขึ้น GitHub และให้ GitHub Pages build/deploy ให้อัตโนมัติ

## สิ่งที่มีให้แล้ว
- React + Vite
- ตั้งค่า `base` สำหรับ repo ชื่อ `LAYA-Order`
- GitHub Actions สำหรับ build และ deploy ไปที่ GitHub Pages
- ใช้งานแบบ local demo ได้ก่อน แม้ยังไม่ใส่ Firebase

## ก่อนใช้งาน GitHub Pages
1. อัปไฟล์ทั้งหมดขึ้น repo ชื่อ `LAYA-Order`
2. ไปที่ `Settings > Pages`
3. ที่ `Build and deployment > Source` เลือก `GitHub Actions`
4. push โค้ดขึ้น branch `main`
5. รอ workflow ในแท็บ `Actions` ทำงานเสร็จ

## รันในเครื่อง
```bash
npm install
npm run dev
```

## เชื่อม Firebase ภายหลัง
แก้ไฟล์ `src/firebaseConfig.js`

## หมายเหตุ
- ถ้าเปลี่ยนชื่อ repo ต้องแก้ `base` ใน `vite.config.js` ให้ตรงชื่อใหม่
- OCR จะอ่านได้ดีเมื่อรูปคมและแสงชัด
