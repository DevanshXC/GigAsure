# 🛠️ GigaSure: Complete Local Setup Guide (No Docker)

This guide provides step-by-step instructions to run GigaSure locally with Backend, Frontend, and Mock API.

---

## 📋 1. Prerequisites

Ensure the following are installed:

- **Python 3.12** (recommended, NOT 3.13 due to dependency compatibility)
- **Node.js v18+**
- **MongoDB Atlas (Recommended - Free Cluster)**

---

## 🧾 2. MongoDB Setup (Atlas - Free)

Instead of running MongoDB locally, use a free cloud cluster:

1. Go to **MongoDB Atlas**
2. Create a **free cluster**
3. Create a database user (username + password)
4. Get your connection string:

Example:

```
mongodb+srv://user:pass@cluster.mongodb.net
```

---

## 🔐 3. Environment Configuration

### Step 1 — Copy env file

run:

```bash
cd backend
copy .env.example .env   # Windows
# OR
cp .env.example .env     # Mac/Linux
```

---

### Step 2 — Update `.env`

Edit `.env` and replace values:

```env
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net
MONGO_DB=gigasure

REDIS_URL=redis://localhost:6379/0

JWT_SECRET=gigsure-super-secret-key-2026-devtrails

OPENWEATHER_API_KEY=your_key_here
NEWSDATA_API_KEY=your_key_here

MOCK_ZOMATO_URL=http://localhost:8001
```

---

## ⚙️ 4. Backend Setup (FastAPI)

### Step 1 — Navigate

```bash
cd backend
```

---

### Step 2 — Create virtual environment

```bash
python -m venv venv
```

---

### Step 3 — Activate

- **Windows**:

```bash
venv\Scripts\activate
```

- **Mac/Linux**:

```bash
source venv/bin/activate
```

---

### Step 4 — Install dependencies

```bash
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

---

## 🤖 5. ML Model Training

**Important:** Train before running backend in another terminal

```bash
cd backend
python -m ml.train_nlp_classifier --csv Paths/nlp_classifier_data.csv
```

---

## 🚀 6. Run Backend

```bash
uvicorn main:app --reload --port 8000
```

API Docs:

```
http://localhost:8000/docs
```

---

## 🍕 7. Mock Zomato API Setup

Open a **new terminal**:

```bash
cd mock_zomato_api
pip install fastapi uvicorn
uvicorn main:app --reload --port 8001
```

Mock API:

```
http://localhost:8001/docs
```

---

### 🧪 Valid Test Partner IDs

| Partner ID   | Name         | Zone            | Tier | Avg Income | Case         |
| ------------ | ------------ | --------------- | ---- | ---------- | ------------ |
| ZMT-MUM-4872 | Arjun        | MUM-ANDHERI-W   | 3    | ₹4,500     | Standard     |
| ZMT-MUM-3341 | Ravi         | MUM-DHARAVI     | 4    | ₹3,800     | High Risk    |
| ZMT-DEL-5511 | Priya        | DEL-CONNAUGHT   | 3    | ₹5,200     | Standard     |
| ZMT-MUM-9910 | Sarthak      | MUM-ANDHERI-W   | 3    | ₹4,200     | Low Activity |
| ZMT-MUM-1122 | Neha Sharma  | MUM-BANDRA-W    | 1    | ₹6,200     | Safe Zone    |
| ZMT-MUM-2233 | Vikram Patil | MUM-POWAI       | 2    | ₹4,800     | Standard     |
| ZMT-BLR-8844 | Kiran Rao    | BLR-WHITEFIELD  | 1    | ₹7,000     | Top Earner   |
| ZMT-BLR-9955 | Divya Nair   | BLR-KORAMANGALA | 2    | ₹5,800     | Standard     |

---

## 🖥️ 8. Frontend Setup (Next.js)

Open another **new terminal**:

```bash
cd gigsure-frontend
npm install
npm run dev
```

Frontend:

```
http://localhost:3000
```

---

## 🔄 9. Run Order (Important)

Start services in this order:

1. Mock API → `8001`
2. Backend → `8000`
3. Frontend → `3000`

---

## ✅ 10. Final Verification

1. Open: `http://localhost:3000`
2. Register using a test partner ID
3. Go to `/simulate`
4. Trigger disruption
5. Check dashboard for payout

---

## ⚠️ Common Issues

- Python 3.13 → causes dependency crashes ❌
- Redis not running → connection fails ❌
- Wrong Mongo URL → backend won't connect ❌
- Model not trained → missing predictions ❌

---

## 🧠 Notes

- MongoDB Atlas is recommended over local setup
- spaCy is optional (can be skipped safely)
- Warnings are normal — only crashes matter

---
