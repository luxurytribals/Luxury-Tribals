# Luxury Tribals Backend + Frontend Deployment Guide

## 1) Backend setup
1. `cd backend`
2. `npm install`
3. `cp .env.example .env` and fill all values.
4. Seed initial admin + products (clears DB): `npm run seed`
5. Run API in dev: `npm run dev`
6. Production run: `npm start`

## 2) Frontend deployment on GitHub Pages
1. Create a GitHub repo named `luxury-tribals`.
2. Upload `index.html`, `admin.html`, `api.js` in root.
3. Go to **Settings → Pages**.
4. Set **Deploy from branch** = `main` and folder = `/root`.
5. Site URL: `https://yourusername.github.io/luxury-tribals`

## 3) Connect frontend to deployed backend
Set this before loading pages:
```html
<script>
  window.LT_API_URL = 'https://your-backend-host.example.com/api';
</script>
<script src="api.js"></script>
```

## 4) Product management (3 ways)
1. **Admin UI:** Login to `admin.html` → Products → `+ Add Product`.
2. **Seed file:** Edit `src/config/seed.js` PRODUCTS and run `npm run seed`.
   - **Warning:** seed clears all data, use before launch.
3. **API:** `POST /api/products` with `Authorization: Bearer <token>`.

## 5) Endpoints summary
- Auth: `/api/auth/login`, `/me`, `/change-password`, `/logout`
- Products: `/api/products` CRUD + `/api/products/:id/stock`
- Payments: `/api/payments/create-order`, `/verify`, `/webhook`
- Orders: `/api/orders/:orderId`, `/api/orders`, `/api/orders/:id/status`
- Shipping: `/api/shipping/track/:awb`, `/reship/:orderId`, `/cancel/:id`
- Admin: `/api/admin/dashboard`
- Customers: `/api/customers`, `/api/customers/:id`
