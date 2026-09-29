# Risaala Media Management System

## Local Setup

### Backend
1. Open a terminal in `backend`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Make sure MongoDB is running locally.
4. Use the `.env` file in `backend`:
   - `PORT=5000`
   - `MONGO_URI=mongodb://127.0.0.1:27017/risaala-media`
   - `JWT_SECRET=replace-with-secure-secret`
   - `CLIENT_URL=http://localhost:3000`
5. Start backend:
   ```bash
   npm run dev
   ```

The backend API will run on:
- `http://localhost:5000`
- API base URL: `http://localhost:5000/api`

### Frontend
1. Open a terminal in `frontend`
2. Install dependencies:
   ```bash
   npm install
   ```
3. The frontend environment file `frontend/.env` is configured with:
   - `REACT_APP_API_URL=http://localhost:5000/api`
4. Start frontend:
   ```bash
   npm start
   ```

The frontend app will run on:
- `http://localhost:3000`

### How it works
- Frontend requests are sent to `http://localhost:5000/api`
- Backend uses MongoDB at `mongodb://127.0.0.1:27017/risaala-media`
- Authentication uses JWT tokens stored in `localStorage`

### Notes
- If you use a different MongoDB URL, update `backend/.env`.
- To change the frontend API address, update `frontend/.env`.
