const API_BASE = '/api';

const getToken = () => localStorage.getItem('skillmart_token');
const getUser = () => {
  const raw = localStorage.getItem('skillmart_user');
  return raw ? JSON.parse(raw) : null;
};

const setAuth = (token, user) => {
  localStorage.setItem('skillmart_token', token);
  localStorage.setItem('skillmart_user', JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem('skillmart_token');
  localStorage.removeItem('skillmart_user');
};

const getCart = () => JSON.parse(localStorage.getItem('skillmart_cart') || '[]');
const setCart = (items) => localStorage.setItem('skillmart_cart', JSON.stringify(items));
const getEntityId = (item) => String(item?.id ?? item?._id ?? '');
const isAuthenticated = () => Boolean(getToken() && getUser());
const isBuyerUser = () => {
  const user = getUser();
  return Boolean(user && user.role === 'buyer');
};

let favoriteServiceIds = new Set();

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
};

const downloadInvoiceForOrder = async (orderId) => {
  const token = getToken();
  if (!token) {
    alert('Please login first.');
    return;
  }

  const response = await fetch(`${API_BASE}/invoices/${orderId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Unable to download invoice');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const nameMatch = disposition.match(/filename="([^"]+)"/i);
  const fileName = nameMatch?.[1] || `invoice_order_${orderId}.pdf`;
  const blobUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
};

const sendInvoiceToBuyer = async (orderId) => {
  await apiRequest(`/invoices/${orderId}/send`, { method: 'POST' });
};

const completeMilestoneForOrder = async (orderId, milestoneId) => {
  await apiRequest(`/orders/${orderId}/milestones/${milestoneId}/complete`, { method: 'PUT' });
};

let currentCoupon = null;

const loadCategories = async (elementId = 'categorySelect') => {
  const target = document.getElementById(elementId);
  if (!target) return;
  try {
    const data = await apiRequest('/categories');
    const categories = data.categories || [];
    if (target.tagName === 'SELECT') {
      target.innerHTML =
        categories.map((c) => `<option value="${getEntityId(c)}">${c.name}</option>`).join('') ||
        '<option value="">No categories</option>';
    } else if (target.tagName === 'DATALIST') {
      target.innerHTML =
        categories.map((c) => `<option value="${c.name}"></option>`).join('') ||
        '<option value="No categories"></option>';
    }
  } catch (error) {
    if (target.tagName === 'SELECT') {
      target.innerHTML = '<option value="">Failed to load categories</option>';
    } else if (target.tagName === 'DATALIST') {
      target.innerHTML = '<option value="Failed to load categories"></option>';
    }
  }
};

const showAlert = (containerId, message, type = 'danger') => {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
};

const renderNotificationsBell = async () => {
  const bellHost = document.getElementById('notificationArea');
  if (!bellHost || !isAuthenticated()) return;

  try {
    const data = await apiRequest('/notifications');
    const notifications = data.notifications || [];
    const unreadCount = Number(data.unreadCount || 0);

    bellHost.innerHTML = `
      <div class="notification-shell me-2">
        <button class="btn btn-outline-secondary btn-sm position-relative" type="button" id="notificationToggleBtn">
          Notifications
          ${unreadCount > 0 ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger">${unreadCount}</span>` : ''}
        </button>
        <div id="notificationPanel" class="notification-panel p-2">
          <div class="d-flex justify-content-between align-items-center mb-2 px-1">
            <strong class="small">Recent Notifications</strong>
            <button class="btn btn-sm btn-link p-0" id="markAllNotificationsRead">Mark all read</button>
          </div>
          <ul class="list-group list-group-flush" id="notificationList"></ul>
        </div>
      </div>
    `;

    const list = document.getElementById('notificationList');
    list.innerHTML =
      notifications
        .map(
          (n) => `
        <li class="list-group-item px-1 py-2">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div class="fw-semibold small">${n.title}</div>
              <div class="small text-muted">${n.message}</div>
            </div>
            ${!n.isRead ? `<button class="btn btn-sm btn-outline-primary mark-notification-read" data-id="${n.id}">Read</button>` : '<span class="badge text-bg-light border">Read</span>'}
          </div>
        </li>`
        )
        .join('') || '<li class="list-group-item small text-muted">No notifications yet.</li>';

    list.querySelectorAll('.mark-notification-read').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiRequest(`/notifications/${btn.dataset.id}/read`, { method: 'PUT' });
          await renderNotificationsBell();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    const markAllBtn = document.getElementById('markAllNotificationsRead');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', async () => {
        try {
          await apiRequest('/notifications/read-all', { method: 'PUT' });
          await renderNotificationsBell();
        } catch (error) {
          alert(error.message);
        }
      });
    }

    const panel = document.getElementById('notificationPanel');
    const toggleBtn = document.getElementById('notificationToggleBtn');
    if (panel && toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });

      document.addEventListener('click', (e) => {
        if (!bellHost.contains(e.target)) {
          panel.style.display = 'none';
        }
      });
    }
  } catch (error) {
    bellHost.innerHTML = '';
  }
};

const renderNavbarState = () => {
  const authArea = document.getElementById('authArea');
  if (!authArea) return;
  authArea.classList.add('d-flex', 'align-items-center');

  const user = getUser();
  if (!user) {
    authArea.innerHTML = `
      <a class="btn btn-outline-primary btn-sm" href="login.html">Login</a>
      <a class="btn btn-brand btn-sm" href="register.html">Register</a>
    `;
    return;
  }

  authArea.innerHTML = `
    <div id="notificationArea"></div>
    <span class="me-2 badge text-bg-secondary badge-role">${user.role}</span>
    ${user.role === 'buyer' ? '<a class="btn btn-outline-secondary btn-sm me-2" href="favorites.html">Favorites</a>' : ''}
    <a class="btn btn-outline-dark btn-sm me-2" href="${user.role === 'admin' ? 'admin.html' : 'dashboard.html'}">${user.role === 'admin' ? 'Admin' : 'Dashboard'}</a>
    <button class="btn btn-danger btn-sm" id="logoutBtn">Logout</button>
  `;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearAuth();
    window.location.href = 'login.html';
  });

  renderNotificationsBell();
};

const loadFavoriteServiceIds = async () => {
  if (!isAuthenticated()) {
    favoriteServiceIds = new Set();
    return;
  }

  try {
    const data = await apiRequest('/favorites');
    const ids = (data.services || []).map((service) => getEntityId(service));
    favoriteServiceIds = new Set(ids);
  } catch (error) {
    favoriteServiceIds = new Set();
  }
};

const toggleFavorite = async (serviceId, btn) => {
  if (!isAuthenticated()) {
    alert('Please login to save favorites.');
    return;
  }

  try {
    const alreadySaved = favoriteServiceIds.has(String(serviceId));
    if (alreadySaved) {
      await apiRequest(`/favorites/${serviceId}`, { method: 'DELETE' });
      favoriteServiceIds.delete(String(serviceId));
      if (btn) {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline-secondary');
        btn.textContent = 'Save';
      }
      return;
    }

    await apiRequest(`/favorites/${serviceId}`, { method: 'POST' });
    favoriteServiceIds.add(String(serviceId));
    if (btn) {
      btn.classList.remove('btn-outline-secondary');
      btn.classList.add('btn-success');
      btn.textContent = 'Saved';
    }
  } catch (error) {
    alert(error.message);
  }
};

const requireAuth = (allowedRoles = []) => {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    window.location.href = 'login.html';
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    window.location.href = 'index.html';
    return null;
  }

  return user;
};

const addToCart = (service) => {
  if (!isBuyerUser()) return false;
  const cart = getCart();
  const serviceId = getEntityId(service);
  const exists = cart.some((item) => getEntityId(item) === serviceId);
  if (exists) return false;
  cart.push(service);
  setCart(cart);
  return true;
};

const initHomePage = async () => {
  const servicesGrid = document.getElementById('servicesGrid');
  if (!servicesGrid) return;

  try {
    const heroSection = document.querySelector('.hero');
    if (heroSection && !heroSection.querySelector('.hero-image')) {
      const heroImage = document.createElement('img');
      heroImage.src = 'assets/hero-marketplace.svg';
      heroImage.alt = 'SkillMart hero visual';
      heroImage.className = 'img-fluid rounded hero-image mt-3';
      heroSection.appendChild(heroImage);
    }

    await loadFavoriteServiceIds();
    const data = await apiRequest('/services');
    if (!data.services.length) {
      servicesGrid.innerHTML = '<p class="text-muted">No approved services available yet.</p>';
      return;
    }

    servicesGrid.innerHTML = data.services
      .map(
        (service) => `
        <div class="col-md-6 col-lg-4">
          <div class="card h-100 card-hover">
            <img src="assets/service-card.svg" class="service-thumb" alt="Service visual" />
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${service.title}</h5>
              <p class="card-text text-muted">${service.description.slice(0, 120)}...</p>
              <p class="mb-1"><strong>Category:</strong> ${service.category}</p>
              <p class="mb-1"><strong>Seller:</strong> ${service.seller?.name || 'N/A'}</p>
              <p class="mb-3"><strong>Rating:</strong> ${service.rating} (${service.ratingCount})</p>
              <div class="mt-auto d-flex justify-content-between align-items-center">
                <span class="fw-bold">$${service.price}</span>
                <div class="service-card-actions">
                  <a class="btn btn-outline-dark btn-sm" href="service.html?id=${getEntityId(service)}">View</a>
                  <button class="btn btn-sm ${favoriteServiceIds.has(getEntityId(service)) ? 'btn-success' : 'btn-outline-secondary'} save-favorite" data-id="${getEntityId(service)}">${favoriteServiceIds.has(getEntityId(service)) ? 'Saved' : 'Save'}</button>
                  ${isBuyerUser() ? `<button class="btn btn-brand btn-sm add-cart" data-id="${getEntityId(service)}">Add to Cart</button>` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>`
      )
      .join('');

    servicesGrid.querySelectorAll('.add-cart').forEach((btn) => {
      btn.addEventListener('click', () => {
        const service = data.services.find((s) => getEntityId(s) === btn.dataset.id);
        const added = addToCart(service);
        alert(added ? 'Added to cart' : 'Only buyers can add services to cart, or service is already in cart.');
      });
    });

    servicesGrid.querySelectorAll('.save-favorite').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await toggleFavorite(btn.dataset.id, btn);
      });
    });
  } catch (error) {
    showAlert('homeAlert', error.message);
  }
};

const initTrendingSection = async () => {
  let trendingGrid = document.getElementById('trendingGrid');
  if (!trendingGrid) {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) return;
    const section = document.createElement('section');
    section.className = 'mt-5';
    section.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h4 mb-0">Trending Services</h2>
        <span class="text-muted small">Top rated picks</span>
      </div>
      <div class="row g-3" id="trendingGrid"></div>
    `;
    servicesGrid.parentElement?.appendChild(section);
    trendingGrid = document.getElementById('trendingGrid');
  }

  try {
    const data = await apiRequest('/services/trending');
    if (!data.services?.length) {
      trendingGrid.innerHTML = '<p class="text-muted">No trending services available yet.</p>';
      return;
    }

    trendingGrid.innerHTML = data.services
      .map(
        (service) => `
        <div class="col-md-6 col-lg-4">
          <div class="card h-100">
            <img src="assets/service-card.svg" class="service-thumb" alt="Trending service visual" />
            <div class="card-body">
              <h5 class="card-title">${service.title}</h5>
              <p class="card-text text-muted mb-2">${service.category}</p>
              <p class="mb-2"><strong>Rating:</strong> ${service.rating} (${service.ratingCount})</p>
              <div class="d-flex justify-content-between align-items-center">
                <span class="fw-bold">$${service.price}</span>
                <a class="btn btn-outline-dark btn-sm" href="service.html?id=${getEntityId(service)}">Open</a>
              </div>
            </div>
          </div>
        </div>`
      )
      .join('');
  } catch (error) {
    trendingGrid.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
};

const initLoginPage = () => {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      email: form.email.value,
      password: form.password.value
    };

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setAuth(data.token, data.user);
      window.location.href = data.user.role === 'admin' ? 'admin.html' : 'dashboard.html';
    } catch (error) {
      showAlert('loginAlert', error.message);
    }
  });
};

const initRegisterPage = () => {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.value,
      email: form.email.value,
      password: form.password.value,
      role: form.role.value
    };

    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setAuth(data.token, data.user);
      window.location.href = 'dashboard.html';
    } catch (error) {
      showAlert('registerAlert', error.message);
    }
  });
};

const initDashboardPage = async () => {
  if (!document.getElementById('userInfo')) return;
  const user = requireAuth(['buyer', 'seller', 'admin']);
  if (!user) return;
  await loadDashboardServices();

  document.getElementById('userInfo').innerHTML = `
    <p class="mb-1"><strong>Name:</strong> ${user.name}</p>
    <p class="mb-1"><strong>Email:</strong> ${user.email}</p>
    <p class="mb-1"><strong>Role:</strong> ${user.role}</p>
    <p class="mb-1"><strong>Seller Level:</strong> ${user.sellerLevel || 'New'}</p>
    <p class="mb-1"><strong>Reputation:</strong> ${Number(user.reputationScore || 0).toFixed(2)}</p>
    <p class="mb-1"><strong>Wallet:</strong> $${user.wallet?.toFixed ? user.wallet.toFixed(2) : user.wallet}</p>
  `;

  const sellerSection = document.getElementById('sellerSection');
  const quickFavoritesCard = document.getElementById('quickFavoritesCard');
  if (user.role === 'seller') {
    sellerSection.classList.remove('d-none');
  }
  if (quickFavoritesCard && user.role !== 'buyer') {
    quickFavoritesCard.classList.add('d-none');
  }

  if (user.role === 'buyer' || user.role === 'admin') {
    await loadBuyerOrders();
  } else {
    const buyerOrders = document.getElementById('buyerOrders');
    if (buyerOrders) {
      buyerOrders.innerHTML = '<li class="list-group-item">Buyer orders are available for buyer/admin.</li>';
    }
  }

  if (user.role === 'seller') {
    await loadCategories('categoryOptions');
    await loadSellerAnalytics();
    await loadSellerPerformance();
    await loadSellerOrders();
    await loadMyServices();
    await loadPortfolio();
    bindPortfolioForm();
    bindCreateService();
  }

  await loadSubscriptionInfo();
  bindSubscriptionButtons();
  await loadWalletTransactions();
  bindWithdrawForm();
  await loadDisputes();
  bindRaiseDisputeForm();

  const hashMatch = window.location.hash.match(/raise-dispute-(\d+)/);
  if (hashMatch) {
    const form = document.getElementById('raiseDisputeForm');
    if (form) {
      form.orderId.value = hashMatch[1];
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
};

const loadSubscriptionInfo = async () => {
  const info = document.getElementById('subscriptionInfo');
  if (!info) return;
  try {
    const data = await apiRequest('/subscriptions/my');
    const sub = data.subscription || {};
    info.innerHTML = `
      <div><strong>Plan:</strong> ${sub.planName || 'Free'}</div>
      <div><strong>Status:</strong> ${sub.status || 'Active'}</div>
      <div><strong>Price:</strong> $${Number(sub.price || 0).toFixed(2)}</div>
    `;
  } catch (error) {
    info.textContent = error.message;
  }
};

const bindSubscriptionButtons = () => {
  const alertId = 'subscriptionAlert';
  ['upgradeFreeBtn', 'upgradeProBtn', 'upgradePremiumBtn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      try {
        await apiRequest('/subscriptions/upgrade', {
          method: 'POST',
          body: JSON.stringify({ planName: btn.dataset.plan })
        });
        const label = btn.dataset.plan === 'Free' ? 'Switched to Free.' : `Upgraded to ${btn.dataset.plan}.`;
        showAlert(alertId, label, 'success');
        await loadSubscriptionInfo();
      } catch (error) {
        showAlert(alertId, error.message);
      }
    });
  });
};

const renderMilestones = (order) => {
  const milestones = Array.isArray(order.milestones) ? order.milestones : [];
  if (!milestones.length) return '';
  return `
    <div class="small text-muted mt-1">
      ${milestones
        .map(
          (m) =>
            `<div class="d-flex justify-content-between align-items-center gap-2 mt-1">
              <span>${m.title} - $${Number(m.amount || 0).toFixed(2)} (${m.status})</span>
              ${
                m.status === 'Pending'
                  ? `<button class="btn btn-xs btn-outline-success complete-milestone" data-order="${getEntityId(order)}" data-milestone="${getEntityId(m)}">Complete</button>`
                  : '<span class="badge text-bg-success">Done</span>'
              }
            </div>`
        )
        .join('')}
    </div>
  `;
};

const bindMilestoneButtons = (scope = document) => {
  scope.querySelectorAll('.complete-milestone').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await completeMilestoneForOrder(btn.dataset.order, btn.dataset.milestone);
        await loadSellerOrders();
        await loadSellerPerformance();
      } catch (error) {
        alert(error.message);
      }
    });
  });
};

const loadSellerAnalytics = async () => {
  const container = document.getElementById('sellerAnalytics');
  if (!container) return;
  try {
    const data = await apiRequest('/analytics/seller');
    container.innerHTML = `
      <div class="col-md-3"><div class="border rounded p-2"><small class="text-muted">Revenue</small><div class="fw-bold">$${Number(data.totalRevenue || 0).toFixed(2)}</div></div></div>
      <div class="col-md-3"><div class="border rounded p-2"><small class="text-muted">Orders</small><div class="fw-bold">${data.totalOrders || 0}</div></div></div>
      <div class="col-md-3"><div class="border rounded p-2"><small class="text-muted">Conversion</small><div class="fw-bold">${Number(data.conversionRate || 0).toFixed(2)}%</div></div></div>
      <div class="col-md-3"><div class="border rounded p-2"><small class="text-muted">Top Service</small><div class="fw-bold">${data.topService?.title || 'N/A'}</div></div></div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="col-12 text-danger small">${error.message}</div>`;
  }
};

const loadWalletTransactions = async () => {
  const list = document.getElementById('walletTransactions');
  const badge = document.getElementById('walletBalanceBadge');
  if (!list || !badge) return;
  try {
    const user = getUser();
    badge.textContent = `$${Number(user?.wallet || 0).toFixed(2)}`;
    const data = await apiRequest('/wallet/transactions');
    list.innerHTML =
      (data.transactions || [])
        .slice(0, 10)
        .map(
          (tx) => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <span>${tx.reason} <span class="small text-muted">(${tx.type})</span></span>
              <strong>${tx.type === 'Credit' ? '+' : '-'}$${Number(tx.amount || 0).toFixed(2)}</strong>
            </li>`
        )
        .join('') || '<li class="list-group-item">No transactions yet.</li>';
  } catch (error) {
    list.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
  }
};

const bindWithdrawForm = () => {
  const form = document.getElementById('withdrawForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/withdrawals/request', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(form.amount.value) })
      });
      showAlert('walletAlert', 'Withdrawal request submitted (pending admin review).', 'success');
      form.reset();
      await loadWalletTransactions();
    } catch (error) {
      showAlert('walletAlert', error.message);
    }
  });
};

const loadDisputes = async () => {
  const list = document.getElementById('disputeList');
  const form = document.getElementById('raiseDisputeForm');
  if (!list) return;
  try {
    const user = getUser();
    if (form && user?.role !== 'buyer' && user?.role !== 'admin') {
      form.classList.add('d-none');
    }

    const data = await apiRequest('/disputes');
    const disputes = data.disputes || [];
    list.innerHTML =
      disputes
        .map(
          (d) => `
            <li class="list-group-item">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <strong>Dispute #${d.id}</strong> - Order #${d.orderId} - <span class="badge text-bg-light border">${d.status}</span>
                  <div class="small text-muted">${d.reason}</div>
                  <div class="small text-muted">Decision: ${d.adminDecision || 'none'}</div>
                </div>
                ${
                  user?.role === 'admin'
                    ? `<button class="btn btn-sm btn-outline-primary review-dispute" data-id="${d.id}">Review</button>`
                    : ''
                }
              </div>
            </li>`
        )
        .join('') || '<li class="list-group-item">No disputes found.</li>';

    if (user?.role === 'admin') {
      list.querySelectorAll('.review-dispute').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const status = prompt('Set status: UnderReview / Resolved / Rejected', 'UnderReview');
          if (!status) return;
          let decision = 'none';
          if (status === 'Resolved') {
            decision = prompt('Decision: refund_buyer / release_seller / none', 'refund_buyer') || 'none';
          }
          try {
            await apiRequest(`/disputes/${btn.dataset.id}/review`, {
              method: 'PUT',
              body: JSON.stringify({ status, decision })
            });
            await loadDisputes();
          } catch (error) {
            alert(error.message);
          }
        });
      });
    }
  } catch (error) {
    list.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
  }
};

const bindRaiseDisputeForm = () => {
  const form = document.getElementById('raiseDisputeForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/disputes', {
        method: 'POST',
        body: JSON.stringify({
          orderId: Number(form.orderId.value),
          reason: form.reason.value,
          proofUrl: form.proofUrl.value || undefined
        })
      });
      showAlert('disputeAlert', 'Dispute raised successfully.', 'success');
      form.reset();
      await loadDisputes();
    } catch (error) {
      showAlert('disputeAlert', error.message);
    }
  });
};

const loadSellerPerformance = async () => {
  const container = document.getElementById('sellerPerformance');
  if (!container) return;

  try {
    const data = await apiRequest('/orders/seller/performance');
    container.innerHTML = `
      <div class="col-md-4"><div class="border rounded p-2"><small class="text-muted">Total Orders</small><div class="fw-bold">${data.totalOrders}</div></div></div>
      <div class="col-md-4"><div class="border rounded p-2"><small class="text-muted">Completion Rate</small><div class="fw-bold">${data.completionRate}%</div></div></div>
      <div class="col-md-4"><div class="border rounded p-2"><small class="text-muted">Active Orders</small><div class="fw-bold">${data.activeOrders}</div></div></div>
      <div class="col-md-6"><div class="border rounded p-2"><small class="text-muted">Escrow Held</small><div class="fw-bold">$${Number(data.totalEscrowHeld || 0).toFixed(2)}</div></div></div>
      <div class="col-md-3"><div class="border rounded p-2"><small class="text-muted">Revenue Released</small><div class="fw-bold">$${Number(data.totalRevenueReleased || 0).toFixed(2)}</div></div></div>
      <div class="col-md-3"><div class="border rounded p-2"><small class="text-muted">Platform Commission</small><div class="fw-bold">$${Number(data.totalCommission || 0).toFixed(2)}</div></div></div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="col-12 text-danger small">${error.message}</div>`;
  }
};

const loadDashboardServices = async () => {
  const container = document.getElementById('dashboardServices');
  if (!container) return;

  try {
    if (!isBuyerUser()) {
      container.innerHTML = '<li class="list-group-item">Favorites are available for buyer accounts.</li>';
      return;
    }
    await loadFavoriteServiceIds();
    const data = await apiRequest('/services');
    const services = (data.services || []).slice(0, 6);

    container.innerHTML =
      services
        .map(
          (service) => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${service.title}</strong>
          <div class="text-muted small">${service.category} | $${service.price}</div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm ${favoriteServiceIds.has(getEntityId(service)) ? 'btn-success' : 'btn-outline-secondary'} dash-save-favorite" data-id="${getEntityId(service)}">${favoriteServiceIds.has(getEntityId(service)) ? 'Saved' : 'Add to Favorites'}</button>
          ${
            isBuyerUser()
              ? `<button class="btn btn-sm btn-brand dash-buy-now" data-id="${getEntityId(service)}">Buy</button>
                 <button class="btn btn-sm btn-outline-primary dash-add-cart" data-id="${getEntityId(service)}">Add to Cart</button>`
              : ''
          }
        </div>
      </li>`
        )
        .join('') || '<li class="list-group-item">No approved services available yet.</li>';

    container.querySelectorAll('.dash-save-favorite').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await toggleFavorite(btn.dataset.id, btn);
      });
    });

    container.querySelectorAll('.dash-add-cart').forEach((btn) => {
      btn.addEventListener('click', () => {
        const service = services.find((item) => getEntityId(item) === btn.dataset.id);
        if (!service) return;
        const added = addToCart(service);
        showAlert('dashboardFavoriteAlert', added ? 'Added to cart.' : 'Only buyers can add services to cart, or service is already in cart.', added ? 'success' : 'warning');
      });
    });

    container.querySelectorAll('.dash-buy-now').forEach((btn) => {
      btn.addEventListener('click', () => {
        const service = services.find((item) => getEntityId(item) === btn.dataset.id);
        if (!service) return;
        const added = addToCart(service);
        if (!added) {
          showAlert('dashboardFavoriteAlert', 'Only buyers can buy services, or service is already in cart.', 'warning');
          return;
        }
        window.location.href = 'cart.html';
      });
    });
  } catch (error) {
    showAlert('dashboardFavoriteAlert', error.message);
  }
};

const loadMyServices = async () => {
  const container = document.getElementById('myServices');
  if (!container) return;

  try {
    const data = await apiRequest('/services/my/list');
    container.innerHTML = data.services
      .map(
        (s) => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span>${s.title} - $${s.price} <small class="text-muted">(${s.approvalStatus})</small></span>
        <button class="btn btn-sm btn-danger delete-service" data-id="${getEntityId(s)}">Delete</button>
      </li>`
      )
      .join('') || '<li class="list-group-item">No services yet</li>';

    container.querySelectorAll('.delete-service').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this service?')) return;
        try {
          await apiRequest(`/services/${btn.dataset.id}`, { method: 'DELETE' });
          await loadMyServices();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  } catch (error) {
    container.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
  }
};

const loadPortfolio = async () => {
  const list = document.getElementById('portfolioList');
  if (!list) return;
  try {
    const user = getUser();
    const data = await apiRequest(`/portfolio/${user.id}`);
    const items = data.portfolio || [];
    list.innerHTML =
      items
        .map(
          (p) => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>${p.title}</strong>
                <div class="small text-muted">${p.description || ''}</div>
              </div>
              <button class="btn btn-sm btn-outline-danger delete-portfolio" data-id="${getEntityId(p)}">Delete</button>
            </li>`
        )
        .join('') || '<li class="list-group-item">No portfolio items yet.</li>';

    list.querySelectorAll('.delete-portfolio').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiRequest(`/portfolio/${btn.dataset.id}`, { method: 'DELETE' });
          await loadPortfolio();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  } catch (error) {
    list.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
  }
};

const bindPortfolioForm = () => {
  const form = document.getElementById('portfolioForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/portfolio', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.value,
          description: form.description.value,
          imageUrl: form.imageUrl.value
        })
      });
      showAlert('portfolioAlert', 'Portfolio item created.', 'success');
      form.reset();
      await loadPortfolio();
    } catch (error) {
      showAlert('portfolioAlert', error.message);
    }
  });
};

const bindCreateService = () => {
  const form = document.getElementById('createServiceForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tags = (form.tags?.value || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const packages = {};
    const basicPrice = Number(form.basicPrice?.value || 0);
    const basicDescription = form.basicDescription?.value?.trim() || '';
    if (basicPrice || basicDescription) {
      packages.basic = { price: basicPrice || null, description: basicDescription };
    }

    const standardPrice = Number(form.standardPrice?.value || 0);
    const standardDescription = form.standardDescription?.value?.trim() || '';
    if (standardPrice || standardDescription) {
      packages.standard = { price: standardPrice || null, description: standardDescription };
    }

    const premiumPrice = Number(form.premiumPrice?.value || 0);
    const premiumDescription = form.premiumDescription?.value?.trim() || '';
    if (premiumPrice || premiumDescription) {
      packages.premium = { price: premiumPrice || null, description: premiumDescription };
    }

    const payload = {
      title: form.title.value,
      description: form.description.value,
      category: form.category.value,
      price: Number(form.price.value),
      tags: tags.length ? tags : undefined,
      packages: Object.keys(packages).length ? packages : undefined
    };

    try {
      await apiRequest('/services', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showAlert('serviceCreateAlert', 'Service submitted. Awaiting admin approval.', 'success');
      form.reset();
      await loadMyServices();
    } catch (error) {
      showAlert('serviceCreateAlert', error.message);
    }
  });
};

const loadBuyerOrders = async () => {
  const container = document.getElementById('buyerOrders');
  if (!container) return;

  try {
    const data = await apiRequest('/orders/buyer');
    container.innerHTML = data.orders
      .map(
        (order) => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span>${order.service?.title || 'Service'} - $${order.amount} - <strong>${order.status}</strong></span>
        ${
          order.status === 'Completed' && order.invoice?.sentToBuyer
            ? `<button class="btn btn-sm btn-outline-dark download-invoice" data-id="${getEntityId(order)}">Download Invoice</button>`
            : order.status === 'Completed'
              ? '<span class="badge text-bg-secondary">Waiting invoice from seller</span>'
              : `<button class="btn btn-sm btn-outline-danger raise-dispute-inline" data-id="${getEntityId(order)}">Raise Dispute</button>`
        }
      </li>`
      )
      .join('') || '<li class="list-group-item">No buyer orders yet.</li>';

    container.querySelectorAll('.download-invoice').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await downloadInvoiceForOrder(btn.dataset.id);
        } catch (error) {
          alert(error.message);
        }
      });
    });

    container.querySelectorAll('.raise-dispute-inline').forEach((btn) => {
      btn.addEventListener('click', () => {
        const orderId = btn.dataset.id;
        const form = document.getElementById('raiseDisputeForm');
        if (!form) return;
        form.orderId.value = orderId;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  } catch (error) {
    container.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
  }
};

const loadSellerOrders = async () => {
  const container = document.getElementById('sellerOrders');
  if (!container) return;

  try {
    const data = await apiRequest('/orders/seller');

    container.innerHTML = data.orders
      .map((order) => {
        const status = String(order.status || '').toLowerCase();

        const nextStatus =
          status === 'pending'
            ? 'Accepted'
            : status === 'accepted'
            ? 'Completed'
            : null;

        const completedActions =
          order.invoice?.sentToBuyer
            ? `
              <button class="btn btn-sm btn-outline-dark download-invoice" data-id="${getEntityId(order)}">
                Download Invoice
              </button>
              <span class="badge text-bg-success">Invoice sent</span>
            `
            : `
              <button class="btn btn-sm btn-brand send-invoice" data-id="${getEntityId(order)}">
                Send Invoice
              </button>
            `;

        return `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <span>
              ${order.service?.title || 'Service'} - 
              Buyer: ${order.buyer?.name || 'N/A'} - 
              <strong>${order.status}</strong>
            </span>
            ${renderMilestones(order)}
          </div>
          ${
            nextStatus
              ? `<button class="btn btn-sm btn-outline-primary update-order"
                   data-id="${getEntityId(order)}"
                   data-status="${nextStatus}">
                   Mark ${nextStatus}
                 </button>`
              : status === 'completed'
              ? completedActions
              : ''
          }
        </li>`;
      })
      .join('') || '<li class="list-group-item">No seller orders yet.</li>';

    container.querySelectorAll('.update-order').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiRequest(`/orders/${btn.dataset.id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: btn.dataset.status })
          });
          await loadSellerOrders();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    container.querySelectorAll('.send-invoice').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await sendInvoiceToBuyer(btn.dataset.id);
          await loadSellerOrders();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    container.querySelectorAll('.download-invoice').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await downloadInvoiceForOrder(btn.dataset.id);
        } catch (error) {
          alert(error.message);
        }
      });
    });

    bindMilestoneButtons(container);
  } catch (error) {
    container.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
  }
};

const initServicePage = async () => {
  const detail = document.getElementById('serviceDetail');
  if (!detail) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    detail.innerHTML = '<p class="text-danger">Service id is missing.</p>';
    return;
  }

  try {
    const [serviceData, reviewData] = await Promise.all([
      apiRequest(`/services/${id}`),
      apiRequest(`/reviews/${id}`)
    ]);

    const service = serviceData.service;
    detail.innerHTML = `
      <h2>${service.title}</h2>
      <p>${service.description}</p>
      <p><strong>Category:</strong> ${service.category}</p>
      <p><strong>Price:</strong> $${service.price}</p>
      <p><strong>Seller:</strong> ${service.seller?.name || 'N/A'}</p>
      <p><strong>Rating:</strong> ${service.rating} (${service.ratingCount})</p>
      <div class="d-flex gap-2">
        ${isBuyerUser() ? '<button class="btn btn-brand" id="serviceAddCart">Add to Cart</button>' : ''}
        <button class="btn btn-outline-secondary" id="serviceSaveFavorite">Save</button>
      </div>
    `;

    const cartBtn = document.getElementById('serviceAddCart');
    if (cartBtn) {
      cartBtn.addEventListener('click', () => {
        const added = addToCart(service);
        alert(added ? 'Added to cart' : 'Only buyers can add services to cart, or service is already in cart.');
      });
    }

    const saveBtn = document.getElementById('serviceSaveFavorite');
    saveBtn.addEventListener('click', async () => {
      await loadFavoriteServiceIds();
      await toggleFavorite(getEntityId(service), saveBtn);
    });

    const reviewList = document.getElementById('reviewList');
    reviewList.innerHTML = reviewData.reviews
      .map((r) => `<li class="list-group-item"><strong>${r.user?.name || 'User'}</strong> (${r.rating}/5): ${r.comment || ''}</li>`)
      .join('') || '<li class="list-group-item">No reviews yet.</li>';

    const reviewForm = document.getElementById('reviewForm');
    if (!isBuyerUser()) {
      reviewForm.classList.add('d-none');
      showAlert('reviewAlert', 'Only buyers can submit reviews.', 'warning');
    } else {
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await apiRequest('/reviews', {
            method: 'POST',
            body: JSON.stringify({
              service: id,
              rating: Number(reviewForm.rating.value),
              comment: reviewForm.comment.value
            })
          });
          showAlert('reviewAlert', 'Review submitted successfully.', 'success');
        } catch (error) {
          showAlert('reviewAlert', error.message);
        }
      });
    }
  } catch (error) {
    detail.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
};

const initFavoritesPage = async () => {
  const list = document.getElementById('favoritesList');
  if (!list) return;
  const user = requireAuth(['buyer']);
  if (!user) return;

  try {
    const data = await apiRequest('/favorites');
    const services = data.services || [];

    list.innerHTML =
      services
        .map(
          (service) => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${service.title}</strong>
          <div class="text-muted small">${service.category} | $${service.price}</div>
        </div>
        <div class="d-flex gap-2">
          <a class="btn btn-sm btn-outline-dark" href="service.html?id=${getEntityId(service)}">View</a>
          ${isBuyerUser() ? `<button class="btn btn-sm btn-outline-primary favorite-cart" data-id="${getEntityId(service)}">Add to Cart</button>` : ''}
          <button class="btn btn-sm btn-outline-danger favorite-remove" data-id="${getEntityId(service)}">Remove</button>
        </div>
      </li>`
        )
        .join('') || '<li class="list-group-item">No favorites yet.</li>';

    list.querySelectorAll('.favorite-cart').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const target = services.find((service) => getEntityId(service) === btn.dataset.id);
        if (!target) return;
        const added = addToCart(target);
        alert(added ? 'Added to cart' : 'Only buyers can add services to cart, or service is already in cart.');
      });
    });

    list.querySelectorAll('.favorite-remove').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiRequest(`/favorites/${btn.dataset.id}`, { method: 'DELETE' });
          await initFavoritesPage();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  } catch (error) {
    list.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
  }
};

const initCartPage = () => {
  const list = document.getElementById('cartList');
  if (!list) return;
  const user = requireAuth(['buyer']);
  if (!user) return;

  const render = () => {
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const discountedTotal = currentCoupon ? Number(currentCoupon.finalAmount || total) : total;

    list.innerHTML = cart
      .map(
        (item) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>${item.title} - $${item.price}</span>
          <button class="btn btn-sm btn-outline-danger remove-item" data-id="${getEntityId(item)}">Remove</button>
        </li>`
      )
      .join('') || '<li class="list-group-item">Cart is empty.</li>';

    document.getElementById('cartTotal').textContent = `$${discountedTotal.toFixed(2)}`;
    const couponSummary = document.getElementById('couponSummary');
    if (couponSummary) {
      couponSummary.textContent = currentCoupon
        ? `Coupon ${currentCoupon.code} applied. Discount: $${Number(currentCoupon.discount || 0).toFixed(2)}`
        : '';
    }

    list.querySelectorAll('.remove-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = getCart().filter((item) => getEntityId(item) !== btn.dataset.id);
        setCart(next);
        render();
      });
    });
  };

  render();

  const applyBtn = document.getElementById('applyCouponBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      const code = (document.getElementById('couponCodeInput')?.value || '').trim();
      if (!code) {
        showAlert('couponAlert', 'Enter coupon code first.', 'warning');
        return;
      }
      const amount = getCart().reduce((sum, item) => sum + Number(item.price || 0), 0);
      if (!amount) {
        showAlert('couponAlert', 'Cart is empty.', 'warning');
        return;
      }
      try {
        currentCoupon = await apiRequest('/orders/apply-coupon', {
          method: 'POST',
          body: JSON.stringify({ code, amount })
        });
        showAlert('couponAlert', 'Coupon applied successfully.', 'success');
        render();
      } catch (error) {
        currentCoupon = null;
        showAlert('couponAlert', error.message);
      }
    });
  }

  const checkoutBtn = document.getElementById('checkoutBtn');
  checkoutBtn.addEventListener('click', async () => {
    const cart = getCart();
    if (!cart.length) {
      alert('Cart is empty');
      return;
    }

    try {
      await apiRequest('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          serviceIds: cart.map((item) => Number(getEntityId(item))),
          couponCode: currentCoupon?.code || undefined
        })
      });
      setCart([]);
      currentCoupon = null;
      render();
      showAlert('cartAlert', 'Checkout successful (mock payment).', 'success');
    } catch (error) {
      showAlert('cartAlert', error.message);
    }
  });
};

const initOrdersPage = async () => {
  if (!document.getElementById('ordersBuyerList')) return;
  const user = requireAuth(['buyer', 'seller', 'admin']);
  if (!user) return;

  const buyerContainer = document.getElementById('ordersBuyerList');
  const sellerContainer = document.getElementById('ordersSellerList');

  if (user.role === 'buyer' || user.role === 'admin') {
    try {
      const buyerData = await apiRequest('/orders/buyer');
      buyerContainer.innerHTML = buyerData.orders
        .map(
          (o) => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <span>${o.service?.title || 'Service'} - ${o.status} - $${o.amount}</span>
                ${renderMilestones(o)}
              </div>
              ${
                o.status === 'Completed' && o.invoice?.sentToBuyer
                  ? `<button class="btn btn-sm btn-outline-dark download-invoice" data-id="${getEntityId(o)}">Download Invoice</button>`
                  : o.status === 'Completed'
                    ? '<span class="badge text-bg-secondary">Waiting invoice from seller</span>'
                    : `<button class="btn btn-sm btn-outline-danger raise-dispute-inline" data-id="${getEntityId(o)}">Raise Dispute</button>`
              }
            </li>`
        )
        .join('') || '<li class="list-group-item">No buyer orders.</li>';
    } catch (error) {
      buyerContainer.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
    }
  } else {
    buyerContainer.innerHTML = '<li class="list-group-item">Buyer orders are available for buyer/admin.</li>';
  }

  if (user.role === 'seller' || user.role === 'admin') {
    try {
      const sellerData = await apiRequest('/orders/seller');
      sellerContainer.innerHTML = sellerData.orders
        .map(
          (o) => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <span>${o.service?.title || 'Service'} - ${o.status} - Buyer: ${o.buyer?.name || 'N/A'}</span>
                ${renderMilestones(o)}
              </div>
              ${
                o.status === 'Completed'
                  ? o.invoice?.sentToBuyer
                    ? `<button class="btn btn-sm btn-outline-dark download-invoice" data-id="${getEntityId(o)}">Download Invoice</button>`
                    : `<button class="btn btn-sm btn-brand send-invoice" data-id="${getEntityId(o)}">Send Invoice</button>`
                  : ''
              }
            </li>`
        )
        .join('') || '<li class="list-group-item">No seller orders.</li>';
    } catch (error) {
      sellerContainer.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
    }
  } else {
    sellerContainer.innerHTML = '<li class="list-group-item">Seller view available only for seller/admin.</li>';
  }

  document.querySelectorAll('.download-invoice').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await downloadInvoiceForOrder(btn.dataset.id);
      } catch (error) {
        alert(error.message);
      }
    });
  });

  document.querySelectorAll('.send-invoice').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await sendInvoiceToBuyer(btn.dataset.id);
        await initOrdersPage();
      } catch (error) {
        alert(error.message);
      }
    });
  });

  document.querySelectorAll('.raise-dispute-inline').forEach((btn) => {
    btn.addEventListener('click', () => {
      const orderId = btn.dataset.id;
      window.location.href = `dashboard.html#raise-dispute-${orderId}`;
    });
  });

  bindMilestoneButtons(document);
};

const loadAdminCategories = async () => {
  const list = document.getElementById('adminCategoryList');
  if (!list) return;
  try {
    const data = await apiRequest('/categories');
    const categories = data.categories || [];
    list.innerHTML =
      categories
        .map(
          (c) => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <span>${c.name} <span class="small text-muted">${c.description || ''}</span></span>
              <button class="btn btn-sm btn-outline-danger delete-category" data-id="${getEntityId(c)}">Delete</button>
            </li>`
        )
        .join('') || '<li class="list-group-item">No categories yet.</li>';
    list.querySelectorAll('.delete-category').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiRequest(`/categories/${btn.dataset.id}`, { method: 'DELETE' });
          await loadAdminCategories();
        } catch (error) {
          showAlert('categoryAlert', error.message);
        }
      });
    });
  } catch (error) {
    list.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
  }
};

const bindCategoryForm = () => {
  const form = document.getElementById('categoryForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.value,
          description: form.description.value,
          icon: form.icon.value
        })
      });
      showAlert('categoryAlert', 'Category created.', 'success');
      form.reset();
      await loadAdminCategories();
    } catch (error) {
      showAlert('categoryAlert', error.message);
    }
  });
};

const loadAdminCoupons = async () => {
  const list = document.getElementById('adminCouponList');
  if (!list) return;
  try {
    const data = await apiRequest('/coupons');
    const coupons = data.coupons || [];
    list.innerHTML =
      coupons
        .map(
          (c) => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <span>${c.code} - ${c.discountType} ${c.discountValue} - Used ${c.usedCount}/${c.maxUsage}</span>
              <span class="badge ${c.isActive ? 'text-bg-success' : 'text-bg-secondary'}">${c.isActive ? 'Active' : 'Inactive'}</span>
            </li>`
        )
        .join('') || '<li class="list-group-item">No coupons yet.</li>';
  } catch (error) {
    list.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
  }
};

const bindCouponForm = () => {
  const form = document.getElementById('couponForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code.value,
          discountType: form.discountType.value,
          discountValue: Number(form.discountValue.value),
          expiryDate: form.expiryDate.value,
          maxUsage: Number(form.maxUsage.value)
        })
      });
      showAlert('couponAdminAlert', 'Coupon created.', 'success');
      form.reset();
      await loadAdminCoupons();
    } catch (error) {
      showAlert('couponAdminAlert', error.message);
    }
  });
};

const loadAdminWithdrawalRequests = async () => {
  const list = document.getElementById('adminWithdrawalList');
  if (!list) return;
  try {
    const data = await apiRequest('/withdrawals/admin/pending');
    const pending = data.requests || [];
    list.innerHTML =
      pending
        .map(
          (r) => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <span>Request #${r.id} - ${r.seller?.name || 'Seller'} - $${Number(r.amount).toFixed(2)}</span>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-success process-withdrawal" data-id="${r.id}" data-status="Approved">Approve</button>
                <button class="btn btn-sm btn-outline-danger process-withdrawal" data-id="${r.id}" data-status="Rejected">Reject</button>
              </div>
            </li>`
        )
        .join('') || '<li class="list-group-item">No pending withdrawal requests.</li>';

    list.querySelectorAll('.process-withdrawal').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiRequest(`/admin/withdrawals/${btn.dataset.id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: btn.dataset.status })
          });
          await loadAdminWithdrawalRequests();
        } catch (error) {
          showAlert('adminAlert', error.message);
        }
      });
    });
  } catch (error) {
    list.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
  }
};

const initAdminPage = async () => {
  if (!document.getElementById('analytics')) return;
  const user = requireAuth(['admin']);
  if (!user) return;

  try {
    const [analytics, usersData, servicesData] = await Promise.all([
      apiRequest('/admin/analytics'),
      apiRequest('/admin/users'),
      apiRequest('/admin/services')
    ]);
    const users = Array.isArray(usersData?.users) ? usersData.users : [];
    const services = Array.isArray(servicesData?.services) ? servicesData.services : [];

    document.getElementById('analytics').innerHTML = `
      <div class="col-md-3"><div class="card"><div class="card-body"><h6>Total Users</h6><p>${analytics.totalUsers || 0}</p></div></div></div>
      <div class="col-md-3"><div class="card"><div class="card-body"><h6>Total Sellers</h6><p>${analytics.totalSellers || 0}</p></div></div></div>
      <div class="col-md-3"><div class="card"><div class="card-body"><h6>Total Services</h6><p>${analytics.totalServices || 0}</p></div></div></div>
      <div class="col-md-3"><div class="card"><div class="card-body"><h6>Total Orders</h6><p>${analytics.totalOrders || 0}</p></div></div></div>
      <div class="col-md-3"><div class="card"><div class="card-body"><h6>Total Revenue</h6><p>$${Number(analytics.totalRevenue || 0).toFixed(2)}</p></div></div></div>
      <div class="col-md-3"><div class="card"><div class="card-body"><h6>Total Commission</h6><p>$${Number(analytics.totalCommission || 0).toFixed(2)}</p></div></div></div>
      <div class="col-md-3"><div class="card"><div class="card-body"><h6>Open Disputes</h6><p>${analytics.openDisputes || 0}</p></div></div></div>
      <div class="col-md-3"><div class="card"><div class="card-body"><h6>Top Category</h6><p>${analytics.topCategory || 'N/A'}</p></div></div></div>
    `;

    const usersTableBody = document.getElementById('usersTableBody');
    usersTableBody.innerHTML =
      users
        .map(
          (u) => `
      <tr>
        <td>${u.name}</td>
        <td><span class="status-pill">${u.role}</span></td>
        <td>${u.email}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger delete-user" data-id="${getEntityId(u)}">Delete</button>
        </td>
      </tr>`
        )
        .join('') || '<tr><td colspan="4" class="text-muted">No users found.</td></tr>';

    usersTableBody.querySelectorAll('.delete-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this user?')) return;
        try {
          await apiRequest(`/admin/user/${btn.dataset.id}`, { method: 'DELETE' });
          window.location.reload();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    const servicesTableBody = document.getElementById('servicesTableBody');
    servicesTableBody.innerHTML =
      services
        .map(
          (s) => `
      <tr>
        <td class="service-row-label">${s.title}</td>
        <td><span class="status-pill status-${s.approvalStatus}">${s.approvalStatus}</span></td>
        <td>${s.seller?.name || 'N/A'}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-success approve-service" data-id="${getEntityId(s)}" ${s.approvalStatus === 'approved' ? 'disabled' : ''}>Approve</button>
          <button class="btn btn-sm btn-outline-danger delete-service" data-id="${getEntityId(s)}">Delete</button>
        </td>
      </tr>`
        )
        .join('') || '<tr><td colspan="4" class="text-muted">No services found.</td></tr>';

    servicesTableBody.querySelectorAll('.approve-service').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          if (btn.disabled) return;
          const payload = await apiRequest(`/admin/service/${btn.dataset.id}/approve`, { method: 'PUT' });
          btn.disabled = true;

          const row = btn.closest('tr');
          const label = row?.querySelector('.service-row-label');
          const statusPill = row?.querySelector('.status-pill');
          if (label && payload?.service) {
            label.textContent = payload.service.title;
          }
          if (statusPill && payload?.service?.approvalStatus) {
            statusPill.textContent = payload.service.approvalStatus;
            statusPill.className = `status-pill status-${payload.service.approvalStatus}`;
          } else if (statusPill) {
            statusPill.textContent = 'approved';
            statusPill.className = 'status-pill status-approved';
          }

          showAlert('adminAlert', 'Service approved successfully.', 'success');
        } catch (error) {
          showAlert('adminAlert', error.message);
        }
      });
    });

    servicesTableBody.querySelectorAll('.delete-service').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this service?')) return;
        try {
          await apiRequest(`/admin/service/${btn.dataset.id}`, { method: 'DELETE' });
          window.location.reload();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    await loadAdminCategories();
    bindCategoryForm();
    await loadAdminCoupons();
    bindCouponForm();
    await loadAdminWithdrawalRequests();
  } catch (error) {
    showAlert('adminAlert', error.message);
  }
};

/*const enforceEntryRoute = () => {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const user = getUser();
  const token = getToken();
  const isAuthPage = page === 'login.html' || page === 'register.html';

  if (!token || !user) {
    if (page === 'index.html') {
      window.location.replace('login.html');
      return true;
    }
    return false;
  }

  if (isAuthPage || page === 'index.html') {
    window.location.replace(user.role === 'admin' ? 'admin.html' : 'dashboard.html');
    return true;
  }

  return false;
};*/
const enforceEntryRoute = () => {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const user = getUser();
  const token = getToken();
  const isAuthPage = page === 'login.html' || page === 'register.html';

  // ✅ Always redirect root (/) or index.html to login page
  if (page === '' || page === 'index.html') {
    window.location.replace('login.html');
    return true;
  }

  // ✅ If user is NOT logged in and trying to access protected pages
  if (!token || !user) {
    if (!isAuthPage) {
      window.location.replace('login.html');
      return true;
    }
    return false;
  }

  // ✅ If logged in and trying to access login/register again
  if (token && user && isAuthPage) {
    window.location.replace(
      user.role === 'admin' ? 'admin.html' : 'dashboard.html'
    );
    return true;
  }

  return false;
};

document.addEventListener('DOMContentLoaded', () => {
  if (enforceEntryRoute()) return;
  if (!isBuyerUser()) {
    document.querySelectorAll('a[href=\"cart.html\"]').forEach((link) => {
      link.style.display = 'none';
    });
  }
  renderNavbarState();
  initHomePage();
  initTrendingSection();
  initLoginPage();
  initRegisterPage();
  initDashboardPage();
  initServicePage();
  initFavoritesPage();
  initCartPage();
  initOrdersPage();
  initAdminPage();
});
