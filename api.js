(() => {
  const BASE_URL = () => window.LT_API_URL || 'http://localhost:5000/api';

  const request = async (path, options = {}, admin = false) => {
    const token = localStorage.getItem('lt_admin_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (admin && token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL()}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    if (response.status === 204) return null;
    return response.json();
  };

  window.API = {
    auth: {
      login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
      me: () => request('/auth/me', {}, true),
      changePassword: (payload) => request('/auth/change-password', { method: 'PATCH', body: JSON.stringify(payload) }, true),
      logout: () => request('/auth/logout', { method: 'POST' }, true),
    },
    products: {
      list: (query = '') => request(`/products${query}`),
      get: (idOrSlug) => request(`/products/${idOrSlug}`),
      create: (payload) => request('/products', { method: 'POST', body: JSON.stringify(payload) }, true),
      update: (id, payload) => request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, true),
      remove: (id) => request(`/products/${id}`, { method: 'DELETE' }, true),
      toggleStock: (id, inStock) => request(`/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ inStock }) }, true),
    },
    payments: {
      createOrder: (payload) => request('/payments/create-order', { method: 'POST', body: JSON.stringify(payload) }),
      verify: (payload) => request('/payments/verify', { method: 'POST', body: JSON.stringify(payload) }),
    },
    orders: {
      track: (orderId) => request(`/orders/${orderId}`),
      list: (query = '') => request(`/orders${query}`, {}, true),
      updateStatus: (id, payload) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }, true),
    },
    shipping: {
      trackAwb: (awb) => request(`/shipping/track/${awb}`, {}, true),
      reship: (orderId) => request(`/shipping/reship/${orderId}`, { method: 'POST' }, true),
      cancel: (id) => request(`/shipping/cancel/${id}`, { method: 'DELETE' }, true),
    },
    admin: {
      dashboard: () => request('/admin/dashboard', {}, true),
    },
    customers: {
      list: () => request('/customers', {}, true),
      get: (id) => request(`/customers/${id}`, {}, true),
    },
  };
})();
