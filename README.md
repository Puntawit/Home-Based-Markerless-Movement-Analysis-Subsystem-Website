# Movement Analysis Subsystem

Frontend prototype for a home-based markerless movement analysis and tele-rehabilitation workflow. The app helps patients record or upload movement videos from home, while doctors can review movement quality, risk flags, event markers, and feedback summaries.

โปรเจคนี้เป็นส่วน frontend ของระบบวิเคราะห์การเคลื่อนไหว โดยเน้น workflow หลัก 2 ฝั่ง:

- Patient: ผู้ป่วยทำ tutorial, ตั้งกล้อง, บันทึกหรืออัปโหลดวิดีโอท่าทาง, กรอกอาการ, ส่ง session ให้แพทย์
- Doctor: แพทย์ดู dashboard, ตรวจ session, ดู metric/flag/event marker, และเขียน feedback กลับให้ผู้ป่วย

> Note: เวอร์ชันนี้เป็น prototype ฝั่ง frontend เป็นหลัก ข้อมูลหลายส่วนยังเป็น mock data และ mock API ที่เก็บใน memory ของ browser runtime

## Tech Stack

- Vite
- React 18
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS
- Recharts
- Lucide React icons

## Main Features

### Patient Flow

- Login แบบ prototype
- หน้า home สำหรับดู session ล่าสุดและ task ที่ต้องทำ
- Tutorial สำหรับแนะนำท่าทางก่อนถ่ายวิดีโอ
- Record page สำหรับ:
  - เปิดกล้อง webcam
  - ตรวจ checklist ก่อนบันทึก เช่น reference A4, framing, distance, lighting, safety
  - นับถอยหลังก่อน record
  - บันทึกวิดีโอผ่าน `MediaRecorder`
  - อัปโหลดไฟล์ `.mp4`, `.mov`, หรือ `.webm`
  - preview วิดีโอที่บันทึกหรืออัปโหลด
  - กรอก symptom report ตาม body part
  - save task เข้า draft session
- Status page สำหรับติดตามสถานะ session
- Feedback page สำหรับอ่านคำแนะนำจากแพทย์

### Doctor Flow

- Dashboard สำหรับดูรายชื่อผู้ป่วยและ session
- ค้นหา patient ID
- ดู risk level, quality score, flags, และ recommended action
- เลือก movement task แต่ละรายการ
- ดู chart ของ metric ตาม frame
- ดู event marker เช่น warning หรือ critical frame
- เขียน clinical summary และ patient-friendly summary

## Movement Tasks

ระบบมี movement task ตัวอย่าง 4 แบบ:

- Gait Walk: เดินตรง 5 เมตร
- Sit to Stand: ลุก-นั่งจากเก้าอี้ 5 ครั้ง
- Single Leg Stance: ยืนขาเดียว
- Shoulder Flexion: ยกแขนขึ้นเหนือหัว

แต่ละ task มีข้อมูลประกอบ เช่น มุมกล้องที่ต้องใช้, ระยะกล้อง, ระยะเวลาบันทึก, tutorial, safety note, และคำถามอาการเฉพาะส่วนของร่างกาย

## Project Structure

```text
src/
  app/
    providers.tsx        # รวม provider หลักของแอป เช่น React Query
    router.tsx           # กำหนด route ของ patient และ doctor flow
  components/
    layout/              # layout component ที่ใช้ซ้ำ
    ui/                  # UI primitive เช่น Button, Card, Badge, Input, ProgressBar
  features/
    analysis/            # component/data/API สำหรับ analysis workflow เดิม
    dashboard/           # dashboard component/page เดิม
    doctor/              # doctor review dashboard และ mock data
    patient/             # patient pages, mock API, movement task data, components
  hooks/                 # shared React hooks
  lib/                   # utility functions
  styles/
    globals.css          # global style และ Tailwind entry
```

ไฟล์สำคัญ:

- `src/main.tsx`: จุดเริ่มต้นของ React app
- `src/app/router.tsx`: route หลักทั้งหมด
- `src/features/patient/api/patientApi.ts`: mock API ของ patient flow
- `src/features/patient/data/movementTasks.ts`: รายการ movement task
- `src/features/patient/pages/PatientRecordPage.tsx`: flow การตั้งกล้อง บันทึกวิดีโอ อัปโหลด และบันทึก task
- `src/features/doctor/pages/DoctorDashboardPage.tsx`: dashboard สำหรับแพทย์
- `src/features/doctor/data/doctor.mock.ts`: mock data สำหรับ doctor dashboard

## Routes

| Path | Description |
| --- | --- |
| `/` | redirect ไป `/patient/login` |
| `/patient/login` | หน้า login ของผู้ป่วย |
| `/patient/home` | หน้า home ของผู้ป่วย |
| `/patient/tutorial` | หน้า tutorial ก่อนทำ movement task |
| `/patient/record` | หน้า record/upload movement video |
| `/patient/status` | หน้า status ของ session |
| `/patient/feedback` | หน้า feedback จากแพทย์ |
| `/doctor/dashboard` | dashboard ฝั่งแพทย์ |

ตัวอย่างการเปิดหน้า record พร้อมเลือก task:

```text
/patient/record?task=gait_walk
/patient/record?task=sit_to_stand
/patient/record?task=single_leg_stance
/patient/record?task=shoulder_flexion
```

## Getting Started

ติดตั้ง dependencies:

```bash
npm install
```

รัน development server:

```bash
npm run dev
```

จากนั้นเปิด URL ที่ Vite แสดงใน terminal โดยปกติจะเป็น:

```text
http://localhost:5173
```

Build production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Validation

ตอนนี้ยังไม่มี automated test script ใน `package.json` ให้ตรวจสอบด้วยคำสั่ง:

```bash
npm run build
```

ถ้าแก้ UI ควรเปิด dev server แล้วเช็ค route ที่เกี่ยวข้องด้วยตัวเอง เช่น:

- `/patient/home`
- `/patient/tutorial`
- `/patient/record`
- `/patient/status`
- `/patient/feedback`
- `/doctor/dashboard`

## Current Prototype Limitations

- ยังไม่มี backend จริง ข้อมูล patient/session/feedback ใช้ mock API ใน frontend
- ข้อมูลที่ save ผ่าน mock API จะอยู่ใน memory เท่านั้น refresh แล้วอาจกลับเป็นข้อมูลเริ่มต้น
- ระบบวิเคราะห์ pose estimation และ ML screening ยังไม่ได้เชื่อมจริงใน repo นี้
- ข้อความภาษาไทยบางส่วนใน source/mock data เดิมมีอาการ encoding เพี้ยน ควรแก้ encoding หรือแทนที่ด้วยข้อความ UTF-8 ที่ถูกต้องในรอบถัดไป
- ยังไม่มี test framework เช่น Vitest หรือ React Testing Library

## Future Work

- เชื่อม backend API สำหรับ upload video, session management, และ doctor feedback
- เชื่อม pose estimation pipeline เช่น MediaPipe หรือ backend service
- เพิ่มระบบ authentication และ role-based access
- เพิ่ม persistent storage แทน mock in-memory state
- แก้ข้อความภาษาไทยที่ encoding เพี้ยนใน mock data/source
- เพิ่ม automated tests สำหรับ patient flow และ doctor dashboard

## Privacy And Safety Notes

โปรเจคนี้เกี่ยวข้องกับวิดีโอการเคลื่อนไหวและข้อมูลสุขภาพของผู้ป่วย ซึ่งถือเป็นข้อมูลอ่อนไหว ควรระวังเรื่องต่อไปนี้เมื่อพัฒนาต่อ:

- ไม่เก็บวิดีโอหรือข้อมูลสุขภาพใน client storage แบบ plaintext
- ใช้ signed URL หรือ secure upload flow สำหรับไฟล์วิดีโอจริง
- แยกสิทธิ์การเข้าถึงระหว่างผู้ป่วย แพทย์ และ admin
- ใช้ patient ID แทนชื่อจริงเมื่อไม่จำเป็นต้องเปิดเผยตัวตน
- เพิ่ม audit log สำหรับการเข้าถึงข้อมูลสำคัญ

