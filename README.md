# MOS_WEB_STUDY

Web for study MOS Word.

## Frontend

MOS Word Learning Hub duoc dung trong thu muc `FE` bang Vite + React + TypeScript.

```bash
cd FE
npm install
npm run dev
```

Tinh nang chinh:

- Sidebar lo trinh MOS Word theo cac nhom bai hoc.
- Bai hoc dang checklist thuc hanh, co tien do theo tung bai.
- Ly thuyet MOS Word 2021 chi tiet theo lesson.
- Flashcard, sequence matching, shortcut master va test trac nghiem.
- Panel `Lo trinh ca nhan hoa` goi y bai nen hoc tiep dua tren tien do va quiz.

## Backend ca nhan hoa hoc vien

Backend nam trong thu muc `BE`, dung Node.js + Express + TypeScript. Scope hien tai tap trung vao mot hoc vien tu hoc theo lo trinh, khong lam phan he giang vien/lop hoc.

```bash
cd BE
npm install
npm run dev
```

API mac dinh chay tai `http://localhost:4000`. Frontend se tu goi `VITE_API_URL` neu co cau hinh, neu khong se dung `http://localhost:4000`.

API chinh:

- `GET /api/students/u-student-1/personalization`: tra ve bai nen hoc tiep, ky nang yeu, ly do goi y va rule hoc ca nhan hoa.
- `GET /api/students/u-student-1/analytics`: tra ve mastery theo domain/skill tag va diem MOS gan nhat.
- `POST /api/exam-blueprints/:blueprintId/start`: tao attempt luyen de tu blueprint.
- `POST /api/attempts/:attemptId/submit`: nop bai, cham dung/sai, quy doi MOS score.

Most value cua do an o phase nay:

- Hoc vien khong chi xem bai tinh ma duoc goi y bai tiep theo dua tren checklist, quiz va attempt.
- Moi cau hoi gan `skillTags`, khi sai he thong biet hoc vien yeu ky nang nao.
- Frontend co fallback local de demo duoc ke ca khi chua bat backend.
