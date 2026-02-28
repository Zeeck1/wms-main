# WMS - Warehouse Management System

A web-based Warehouse Management System for fish inventory, replacing Excel-based stock tracking with a fully automated database-driven solution.

## Features

- **Dashboard** - Total MC, Total KG, Total Stacks, Stock Status
- **Product Master** - Add/Edit fish products (name, size, weight, type, glazing)
- **Location Master** - Manage warehouse locations (line/place codes like A01R-1, A01L-1)
- **Stock IN (Receive)** - Receive stock into locations with lot tracking
- **Stock OUT (Loading)** - Remove stock with balance validation
- **Stock Table** - Excel-like view with same columns as your spreadsheet
- **Movement History** - Full audit trail of all stock movements
- **Excel Upload** - Import existing Excel data into the system
- **Excel Export** - Download stock table as .xlsx file

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend  | React 18   |
| Backend   | Node.js + Express |
| Database  | MySQL      |
| Excel     | SheetJS (xlsx) |

## Project Structure

```
WMS/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # MySQL connection pool
│   │   ├── database/
│   │   │   └── init.js            # Database initializer script
│   │   ├── routes/
│   │   │   ├── products.js        # Product CRUD API
│   │   │   ├── locations.js       # Location CRUD API
│   │   │   ├── lots.js            # Lot management API
│   │   │   ├── movements.js       # Stock IN/OUT API
│   │   │   ├── inventory.js       # Inventory view & dashboard API
│   │   │   └── upload.js          # Excel upload API
│   │   └── server.js              # Express server entry point
│   ├── uploads/                   # Uploaded Excel files
│   ├── .env                       # Environment config
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── Products.js
│   │   │   ├── Locations.js
│   │   │   ├── StockIn.js
│   │   │   ├── StockOut.js
│   │   │   ├── StockTable.js
│   │   │   ├── ExcelUpload.js
│   │   │   └── Movements.js
│   │   ├── services/
│   │   │   └── api.js             # Axios API client
│   │   ├── App.js                 # Router & layout
│   │   ├── index.js               # Entry point
│   │   └── index.css              # Global styles
│   └── package.json
├── database/
│   └── schema.sql                 # MySQL table schema
└── README.md
```

## Prerequisites

- **Node.js** v18+ (https://nodejs.org)
- **MySQL** 8.0+ (https://dev.mysql.com/downloads/)

## Setup Instructions

### 1. Clone / Download the Project

Place the `WMS` folder wherever you like.

### 2. Configure Database

Edit `backend/.env` with your MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=wms_db
PORT=5000
```

### 3. Initialize Database

Option A - Run the init script:
```bash
cd backend
npm install
npm run db:init
```

Option B - Run the SQL directly:
```bash
mysql -u root -p < database/schema.sql
```

### 4. Start Backend

```bash
cd backend
npm install
npm run dev
```

Backend will run on http://localhost:5000

**If you cannot connect to the backend (http://localhost:5000):**

1. **Start the backend** – In a separate terminal, from the project root run:
   ```bash
   cd wms/backend
   npm install
   npm start
   ```
   You should see: `WMS Backend Server` and `Running on http://localhost:5000`.

2. **Check if the server is running** – Open in browser or use curl:
   - http://localhost:5000/api/health  
   You should get JSON: `{"status":"OK","timestamp":"..."}`.

3. **Port 5000 already in use?** – Use a different port by creating `backend/.env` and adding:
   ```env
   PORT=5001
   ```
   Then the backend will run on http://localhost:5001. Update the frontend to use it: create `frontend/.env` with:
   ```env
   REACT_APP_API_URL=http://localhost:5001/api
   ```
   Restart both backend and frontend.

4. **MySQL not running** – The backend will still start on port 5000, but API calls (e.g. inventory, products) will fail until MySQL is running and `backend/.env` has correct `DB_*` values. Run `npm run db:init` from the `backend` folder after MySQL is up.

### 5. Start Frontend

```bash
cd frontend
npm install
npm start
```

Frontend will run on http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Deactivate product |
| GET | `/api/locations` | List all locations |
| POST | `/api/locations` | Create location |
| PUT | `/api/locations/:id` | Update location |
| DELETE | `/api/locations/:id` | Deactivate location |
| GET | `/api/lots` | List all lots |
| POST | `/api/lots` | Create lot |
| GET | `/api/movements` | List movements (with filters) |
| POST | `/api/movements/stock-in` | Record Stock IN |
| POST | `/api/movements/stock-out` | Record Stock OUT |
| GET | `/api/inventory` | Get inventory (Stock Table data) |
| GET | `/api/inventory/dashboard` | Get dashboard summary |
| POST | `/api/upload` | Upload Excel file |

## Business Rules

1. Every stock item must belong to a **Lot** and **Location**
2. **Cannot stock out** more than the Hand On balance
3. **Movement history** is recorded for every IN/OUT action
4. **Hand On Balance** = SUM(IN movements) - SUM(OUT movements)
5. **Old Balance** = balance carried forward from before today
6. **New Income** = IN movements recorded today
7. System automatically **validates stock correctness** (no negative balances)

## Excel Import Format

Your Excel file should include these column headers:

| Column | Required |
|--------|----------|
| Fish Name | Yes |
| Size | Yes |
| Bulk Weight (KG) | No |
| Type | No |
| Glazing | No |
| CS In Date | No |
| Sticker | No |
| Lines / Place | No |
| Stack No | No |
| Stack Total | No |
| Hand On Balance | No |

## Future Enhancements (Designed For)

- Barcode / QR code scanning
- Reports by fish, lot, location, date
- Multi-warehouse support
- Role-based user access
- Real-time notifications
