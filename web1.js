'use strict';

/* ---------- shared helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const get = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const esc = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));
const inr = amount => '₹' + Number(amount).toLocaleString('en-IN');
const validImageUrl = url => !url || /^https?:\/\//i.test(url);
const STEPS = ['Placed', 'Packed', 'Shipped', 'Delivered'];
const ORDER_STAGE_DELAY_MS = 10_000;
const LEGACY_COFFEE_IMAGES = new Set([
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=85',
  'https://www.nespresso.com/in/media/catalog/product/e/m/em-b1.png?optimize=high&fit=bounds&height=500&width=500&canvas=500:500'
]);
const LEGACY_CRICKET_BAT_IMAGE = 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=85';

/* ---------- seed data ---------- */
const seedProducts = [
  { id: 1, name: 'Wireless Headphones', cat: 'Electronics', price: 3499, stock: 25, rating: 4.6, icon: '🎧', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85' },
  { id: 2, name: 'Smart Watch', cat: 'Electronics', price: 3299, stock: 14, rating: 4.4, icon: '⌚', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=85' },
  { id: 3, name: 'Bluetooth Speaker', cat: 'Electronics', price: 1599, stock: 30, rating: 4.3, icon: '🔊', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=85' },
  { id: 4, name: 'Cotton T-Shirt', cat: 'Fashion', price: 799, stock: 80, rating: 4.1, icon: '👕', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85' },
  { id: 5, name: 'Running Shoes', cat: 'Sports', price: 3499, stock: 22, rating: 4.7, icon: '👟', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=85' },
  { id: 6, name: 'Leather Backpack', cat: 'Fashion', price: 3299, stock: 18, rating: 4.5, icon: '🎒', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=85' },
  { id: 7, name: 'Table Lamp', cat: 'Home', price: 899, stock: 40, rating: 4.2, icon: '💡', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=85' },
  { id: 8, name: 'Coffee Maker', cat: 'Home', price: 8999, stock: 9, rating: 4.6, icon: '☕', image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Nespresso_coffee_machine_makes_espresso_in_a_kitchen_setting_on_a_bright_morning_while_other_kitchen_items_are_visible_on_the_countertop.jpg/960px-Nespresso_coffee_machine_makes_espresso_in_a_kitchen_setting_on_a_bright_morning_while_other_kitchen_items_are_visible_on_the_countertop.jpg' },
  { id: 9, name: 'Yoga Mat', cat: 'Sports', price: 799, stock: 55, rating: 4.4, icon: '🧘', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=85' },
  { id: 10, name: 'Sunglasses', cat: 'Fashion', price: 799, stock: 35, rating: 4.0, icon: '🕶️', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=85' },
  { id: 11, name: 'Cricket Bat', cat: 'Sports', price: 1799, stock: 12, rating: 4.5, icon: '🏏', image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Bat_and_helmet_at_Great_Canfield_Cricket_Club%2C_Essex%2C_England.jpg/960px-Bat_and_helmet_at_Great_Canfield_Cricket_Club%2C_Essex%2C_England.jpg' },
  { id: 12, name: 'Desk Organizer', cat: 'Home', price: 699, stock: 60, rating: 4.3, icon: '🗂️', image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=85' }
];
function initializeData() {
  const savedProducts = get('products');
  if (!savedProducts) {
    set('products', seedProducts);
  } else {
    migrateProductImages(savedProducts);
    migrateSamplePrices(savedProducts);
  }

  if (!get('users')) {
    set('users', [
      { name: 'Demo Customer', email: 'customer@gmail.com', password: 'demo123', role: 'customer' },
      { name: 'Demo Merchant', email: 'merchant@gmail.com', password: 'demo123', role: 'merchant' }
    ]);
  } else {
    migrateDemoEmails(get('users', []));
  }

  if (!get('orders')) set('orders', []);
}

function migrateDemoEmails(users) {
  const demoEmails = new Map([
    ['customer@demo.com', 'customer@gmail.com'],
    ['merchant@demo.com', 'merchant@gmail.com']
  ]);
  let changed = false;

  users.forEach(user => {
    const updatedEmail = demoEmails.get(user.email);
    if (updatedEmail) {
      user.email = updatedEmail;
      changed = true;
    }
  });

  if (changed) set('users', users);
}

function migrateSamplePrices(products) {
  const samplePriceHistory = new Map([
    [1, [2499, 2999]],
    [2, [1999, 2499]],
    [3, [1999, 2799]],
    [4, [699, 899]],
    [5, [1999, 2499]],
    [6, [1599, 1999]],
    [7, [599, 899]],
    [8, [6999, 8499, 8999]],
    [9, [699, 799]],
    [10, [499, 699]],
    [11, [299, 399, 1999]],
    [12, [499, 649]]
  ]);
  const seedPrices = new Map(seedProducts.map(product => [product.id, product.price]));
  let changed = false;

  products.forEach(product => {
    const knownSamplePrice = samplePriceHistory.get(product.id)?.includes(product.price);

    if (knownSamplePrice) {
      product.price = seedPrices.get(product.id);
      changed = true;
    }
  });

  if (changed) set('products', products);
}

function migrateProductImages(products) {
  const seedImages = new Map(seedProducts.map(product => [product.id, product.image]));
  let changed = false;

  products.forEach(product => {
    const needsDefaultImage = !product.image && seedImages.has(product.id);
    const needsCoffeeMakerImage = product.id === 8 && LEGACY_COFFEE_IMAGES.has(product.image);
    const needsCricketBatImage = product.id === 11 && product.image === LEGACY_CRICKET_BAT_IMAGE;

    if (needsDefaultImage || needsCoffeeMakerImage || needsCricketBatImage) {
      product.image = seedImages.get(product.id);
      changed = true;
    }
  });

  if (changed) set('products', products);
}

function advanceOrderStatuses() {
  const orders = get('orders', []);
  const now = Date.now();
  let changed = false;

  orders.forEach(order => {
    if (order.status >= STEPS.length - 1) return;

    const statusUpdatedAt = Date.parse(order.statusUpdatedAt || '');
    if (!Number.isFinite(statusUpdatedAt)) {
      order.statusUpdatedAt = new Date(now).toISOString();
      changed = true;
      return;
    }

    const stagesToAdvance = Math.min(
      STEPS.length - 1 - order.status,
      Math.floor((now - statusUpdatedAt) / ORDER_STAGE_DELAY_MS)
    );
    if (stagesToAdvance < 1) return;

    order.status += stagesToAdvance;
    order.statusUpdatedAt = new Date(statusUpdatedAt + stagesToAdvance * ORDER_STAGE_DELAY_MS).toISOString();
    changed = true;
  });

  if (changed) set('orders', orders);
  return changed;
}

initializeData();

if (document.body.dataset.page === 'login') initLogin();
else initStore();

/* ---------- login page ---------- */
function initLogin() {
  if (get('session')) return location.replace('index.html');
  $$('.tab').forEach(tab => {
    tab.onclick = () => selectLoginTab(tab);
  });
  $('#loginForm').onsubmit = handleLogin;
  $('#registerForm').onsubmit = handleRegistration;
}

function selectLoginTab(selectedTab) {
  $$('.tab').forEach(tab => {
    const isSelected = tab === selectedTab;
    tab.classList.toggle('active', isSelected);
    tab.setAttribute('aria-selected', isSelected);
  });
  $('#loginForm').hidden = selectedTab.dataset.tab !== 'login';
  $('#registerForm').hidden = selectedTab.dataset.tab !== 'register';
}

function startSession(user) {
  set('session', { name: user.name, email: user.email, role: user.role });
  location.href = 'index.html';
}

function handleLogin(event) {
  event.preventDefault();

  const form = new FormData(event.target);
  const email = form.get('email').trim().toLowerCase();
  const user = get('users', []).find(account =>
    account.email === email && account.password === form.get('password')
  );

  if (user) {
    startSession(user);
  } else {
    $('#loginErr').textContent = 'Email or password is incorrect. Check both and try again.';
  }
}

function handleRegistration(event) {
  event.preventDefault();

  const form = new FormData(event.target);
  const name = form.get('name').trim();
  const email = form.get('email').trim().toLowerCase();
  const users = get('users', []);
  const error = $('#regErr');

  if (!name) return error.textContent = 'Enter your full name.';
  if (!/^\S+@\S+\.\S+$/.test(email)) return error.textContent = 'Enter a valid email address.';
  if (form.get('password').length < 6) return error.textContent = 'Password must be at least 6 characters.';
  if (users.some(user => user.email === email)) {
    return error.textContent = 'An account with this email already exists. Sign in instead.';
  }

  const user = { name, email, password: form.get('password'), role: form.get('role') };
  users.push(user);
  set('users', users);
  startSession(user);
}

/* ---------- store ---------- */
function initStore() {
  const me = get('session');
  if (!me) return location.replace('login.html');

  const isMerchant = me.role === 'merchant';
  const cartKey = `cart_${me.email}`;
  const state = { cat: 'All', q: '', sort: '' };
  const products = () => get('products', []);
  const cart = () => get(cartKey, []);
  const toast = message => {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => element.classList.remove('show'), 2200);
  };
  $('#drawer').inert = true;

  $('#userName').textContent = me.name;
  $('#merchantLink').hidden = !isMerchant;
  $('#logout').onclick = () => {
    localStorage.removeItem('session');
    location.replace('login.html');
  };

  /* routing */
  function route() {
    let view = location.hash.slice(1) || 'shop';
    if (view === 'merchant' && !isMerchant) view = 'shop';

    $$('.view').forEach(section => {
      section.hidden = section.id !== view;
    });
    $$('nav a').forEach(link => {
      link.classList.toggle('active', link.dataset.view === view);
    });

    if (view === 'orders') renderOrders();
    if (view === 'merchant') renderMerchant();
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  $('[data-scroll-products]').addEventListener('click', e => {
    e.preventDefault();
    $('#productGrid').scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    });
  });

  /* product cards */
  const card = product => {
    const stockLabel = !product.stock
      ? 'Out of stock'
      : product.stock < 10
        ? `Only ${product.stock} left`
        : 'In stock';

    return `<article class="card">
      <div class="thumb">
        <span aria-hidden="true">${esc(product.icon || '🛍️')}</span>
        ${product.image ? `<img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy">` : ''}
      </div>
      <div class="card-body">
        <h3>${esc(product.name)}</h3>
        <span class="meta">${esc(product.cat)} · ★ ${product.rating}</span>
        <span class="price">${inr(product.price)}</span>
        <span class="meta ${product.stock < 10 ? 'low' : ''}">${stockLabel}</span>
        <button class="btn primary" data-add="${product.id}" ${product.stock ? '' : 'disabled'}>Add to cart</button>
      </div>
    </article>`;
  };

  function renderShop() {
    const allProducts = products();
    const categories = ['All', ...new Set(allProducts.map(product => product.cat))];
    const categoryButtons = categories.map(category =>
      `<button class="pill ${category === state.cat ? 'active' : ''}" data-cat="${esc(category)}">${esc(category)}</button>`
    );

    $('#cats').innerHTML = categoryButtons.join('');

    const filteredProducts = allProducts.filter(product =>
      (state.cat === 'All' || product.cat === state.cat) &&
      product.name.toLowerCase().includes(state.q)
    );
    const sorters = {
      lo: (a, b) => a.price - b.price,
      hi: (a, b) => b.price - a.price,
      rate: (a, b) => b.rating - a.rating
    };
    const sortProducts = sorters[state.sort];
    if (sortProducts) filteredProducts.sort(sortProducts);

    $('#productGrid').innerHTML = filteredProducts.length
      ? filteredProducts.map(card).join('')
      : '<p class="empty">No products match your search. Try a different word or category.</p>';

    const purchasedCategories = get('orders', [])
      .filter(order => order.email === me.email)
      .flatMap(order => order.items.map(item => item.cat));
    const cartProductIds = cart().map(item => item.id);
    const recommendations = allProducts
      .filter(product => product.stock && !cartProductIds.includes(product.id))
      .filter(product => !purchasedCategories.length || purchasedCategories.includes(product.cat))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);

    $('#recoWrap').hidden = !recommendations.length;
    $('#reco').innerHTML = recommendations.map(card).join('');
  }

  $('#shop').addEventListener('click', e => {
    const addButton = e.target.closest('[data-add]');
    const categoryButton = e.target.closest('[data-cat]');

    if (addButton) addToCart(+addButton.dataset.add);
    if (categoryButton) {
      state.cat = categoryButton.dataset.cat;
      renderShop();
    }
  });
  $('#search').oninput = e => {
    state.q = e.target.value.trim().toLowerCase();
    location.hash = '#shop';
    renderShop();
  };
  $('#sort').onchange = e => {
    state.sort = e.target.value;
    renderShop();
  };

  /* cart */
  function addToCart(id) {
    const product = products().find(item => item.id === id);
    const items = cart();
    const cartItem = items.find(item => item.id === id);

    if (!product) return;
    if ((cartItem?.qty || 0) >= product.stock) {
      return toast(`No more stock available for ${product.name}`);
    }

    if (cartItem) {
      cartItem.qty++;
    } else {
      items.push({ id, qty: 1 });
    }

    set(cartKey, items);
    renderCart();
    toast(`${product.name} added to cart`);
  }

  function renderCart() {
    const productsById = new Map(products().map(product => [product.id, product]));
    const rows = cart()
      .map(item => ({ ...productsById.get(item.id), qty: item.qty }))
      .filter(item => item.name);
    const itemCount = rows.reduce((total, item) => total + item.qty, 0);
    const total = rows.reduce((sum, item) => sum + item.price * item.qty, 0);

    $('#cartCount').textContent = itemCount;
    $('#cartItems').innerHTML = rows.length
      ? rows.map(item => `<div class="line">
          <div><strong>${esc(item.name)}</strong><div class="meta">${inr(item.price)} each</div></div>
          <strong>${inr(item.price * item.qty)}</strong>
          <div class="qty">
            <button data-dec="${item.id}" aria-label="Decrease quantity">−</button>
            <span>${item.qty}</span>
            <button data-inc="${item.id}" aria-label="Increase quantity">+</button>
          </div>
          <button class="btn ghost" data-rm="${item.id}">Remove</button>
        </div>`).join('')
      : '<p class="empty">Your cart is empty. Add a product to get started.</p>';
    $('#cartTotal').textContent = inr(total);
    $('#checkoutBtn').disabled = rows.length === 0;
    renderShop();
  }

  $('#cartItems').onclick = e => {
    const button = e.target.closest('[data-inc], [data-dec], [data-rm]');
    if (!button) return;

    const items = cart();
    const id = +(button.dataset.inc || button.dataset.dec || button.dataset.rm);
    const item = items.find(cartItem => cartItem.id === id);
    const product = products().find(cartProduct => cartProduct.id === id);
    if (!item || !product) return;

    if (button.dataset.inc) {
      if (item.qty < product.stock) {
        item.qty++;
      } else {
        toast('Stock limit reached');
      }
    } else if (button.dataset.dec) {
      item.qty--;
    }

    const updatedItems = items.filter(cartItem =>
      cartItem.qty > 0 && !(button.dataset.rm && cartItem.id === id)
    );
    set(cartKey, updatedItems);
    renderCart();
  };

  const toggleCart = open => {
    const drawer = $('#drawer');
    drawer.classList.toggle('open', open);
    $('#scrim').classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    drawer.inert = !open;
    document.body.classList.toggle('no-scroll', open);
    $('#cartBtn').setAttribute('aria-expanded', String(open));

    if (open) {
      $('#closeCart').focus();
    } else {
      $('#cartBtn').focus();
    }
  };
  $('#cartBtn').onclick = () => toggleCart(true);
  $('#closeCart').onclick = $('#scrim').onclick = () => toggleCart(false);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#drawer').classList.contains('open')) {
      toggleCart(false);
    }
  });

  /* checkout */
  function validateCheckout(form, paymentMethod) {
    if (!/^\d{10}$/.test(form.phone.value)) return 'Enter a 10-digit phone number.';
    if (paymentMethod === 'card' && form.card.value.replace(/\s/g, '').length !== 16) {
      return 'Enter a valid 16-digit card number.';
    }
    if (paymentMethod === 'upi' && !/^[\w.-]+@[\w]+$/.test(form.upi.value)) {
      return 'Enter a valid UPI ID, like name@bank.';
    }
    return '';
  }
  const dlg = $('#checkout');
  $('#checkoutBtn').onclick = () => {
    $('#checkoutForm').name.value = me.name;
    $('#coErr').textContent = '';
    dlg.showModal();
  };
  $('#cancelCo').onclick = () => dlg.close();
  $('#pay').onchange = e => {
    $('#cardRow').hidden = e.target.value !== 'card';
    $('#upiRow').hidden = e.target.value !== 'upi';
  };
  $('#checkoutForm').onsubmit = e => {
    e.preventDefault();
    const form = e.target;
    const paymentMethod = form.pay.value;
    const error = validateCheckout(form, paymentMethod);
    if (error) {
      $('#coErr').textContent = error;
      return;
    }

    const allProducts = products();
    const productById = new Map(allProducts.map(product => [product.id, product]));
    const items = cart().map(item => {
      const product = productById.get(item.id);
      return {
        id: product.id,
        name: product.name,
        cat: product.cat,
        price: product.price,
        qty: item.qty
      };
    });
    items.forEach(item => {
      productById.get(item.id).stock -= item.qty;
    });

    const order = {
      id: `BS${Date.now().toString().slice(-7)}`,
      email: me.email,
      customer: form.name.value,
      address: form.address.value,
      pay: paymentMethod,
      items,
      total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
      status: 0,
      date: new Date().toISOString(),
      statusUpdatedAt: new Date().toISOString()
    };
    const orders = get('orders', []);
    orders.unshift(order);
    set('orders', orders);
    set('products', allProducts);
    set(cartKey, []);

    dlg.close();
    form.reset();
    toggleCart(false);
    renderCart();
    toast(`Order ${order.id} placed`);
    location.hash = '#orders';
  };

  /* orders + tracking */
  function renderOrders() {
    const myOrders = get('orders', []).filter(order => order.email === me.email);
    $('#orderList').innerHTML = myOrders.length
      ? myOrders.map(order => `<article class="order">
          <div class="order-head">
            <div>
              <strong>Order ${order.id}</strong>
              <div class="meta">
                ${new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                · Paid by ${order.pay.toUpperCase()}
              </div>
            </div>
            <strong>${inr(order.total)}</strong>
          </div>
          <div class="meta">${order.items.map(item => `${esc(item.name)} × ${item.qty}`).join(', ')}</div>
          <ol class="track">
            ${STEPS.map((step, index) => `<li class="${index <= order.status ? 'done' : ''}">${step}</li>`).join('')}
          </ol>
          <div class="meta">Delivering to ${esc(order.address)}</div>
        </article>`).join('')
      : '<p class="empty">You have no orders yet. Your purchases and their delivery status will appear here.</p>';
  }

  /* merchant */
  function renderMerchant() {
    const allProducts = products();
    const orders = get('orders', []);
    const stats = [
      ['Revenue', inr(orders.reduce((sum, order) => sum + order.total, 0))],
      ['Orders', orders.length],
      ['Products', allProducts.length],
      ['Low stock', allProducts.filter(product => product.stock < 10).length]
    ];

    $('#stats').innerHTML = stats.map(([label, value]) =>
      `<div class="stat"><span class="meta">${label}</span><strong>${value}</strong></div>`
    ).join('');
    $('#inventory').innerHTML = `
      <tr><th>Product</th><th>Category</th><th>Image URL</th><th>Price (₹)</th><th>Stock</th><th></th></tr>
      ${allProducts.map(product => `<tr>
        <td>${esc(product.icon || '')} ${esc(product.name)}</td>
        <td>${esc(product.cat)}</td>
        <td><input type="url" value="${esc(product.image || '')}" data-f="image" data-id="${product.id}" aria-label="Image URL for ${esc(product.name)}"></td>
        <td><input type="number" min="1" value="${product.price}" data-f="price" data-id="${product.id}" aria-label="Price for ${esc(product.name)}"></td>
        <td><input type="number" min="0" value="${product.stock}" data-f="stock" data-id="${product.id}" aria-label="Stock for ${esc(product.name)}"></td>
        <td><button class="btn ghost" data-del="${product.id}">Delete</button></td>
      </tr>`).join('')}`;
    $('#allOrders').innerHTML = `
      <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr>
      ${orders.length
        ? orders.map(order => `<tr>
            <td>${order.id}</td>
            <td>${esc(order.customer)}</td>
            <td>${order.items.reduce((sum, item) => sum + item.qty, 0)}</td>
            <td>${inr(order.total)}</td>
            <td><select data-st="${order.id}" aria-label="Status for order ${order.id}">
              ${STEPS.map((step, index) => `<option value="${index}" ${index === order.status ? 'selected' : ''}>${step}</option>`).join('')}
            </select></td>
          </tr>`).join('')
        : '<tr><td colspan="5" class="empty">No orders yet.</td></tr>'}`;
  }

  $('#inventory').onchange = e => {
    const id = +e.target.dataset.id;
    if (!id) return;

    const allProducts = products();
    const product = allProducts.find(item => item.id === id);
    const field = e.target.dataset.f;
    if (!product) return;

    if (field === 'image') {
      const image = e.target.value.trim();
      if (!validImageUrl(image)) {
        toast('Image URL must start with http:// or https://');
        renderMerchant();
        return;
      }
      product.image = image;
    } else {
      const value = Math.max(0, +e.target.value || 0);
      product[field] = field === 'price' ? Math.max(1, value) : value;
    }
    set('products', allProducts);
    toast(`Updated ${product.name}`);
    renderMerchant();
    renderCart();
  };

  $('#inventory').onclick = e => {
    const button = e.target.closest('[data-del]');
    if (!button) return;

    const id = +button.dataset.del;
    set('products', products().filter(product => product.id !== id));
    renderMerchant();
    renderCart();
    toast('Product deleted');
  };

  $('#allOrders').onchange = e => {
    const orderId = e.target.dataset.st;
    if (!orderId) return;

    const orders = get('orders', []);
    const order = orders.find(item => item.id === orderId);
    if (!order) return;

    order.status = +e.target.value;
    order.statusUpdatedAt = new Date().toISOString();
    set('orders', orders);
    toast(`Order ${orderId} set to ${STEPS[order.status]}`);
  };

  $('#addForm').onsubmit = e => {
    e.preventDefault();
    const form = e.target;
    const image = form.image.value.trim();
    if (!validImageUrl(image)) {
      toast('Image URL must start with http:// or https://');
      return;
    }

    const icons = { Electronics: '📱', Fashion: '👗', Home: '🏠', Sports: '⚽' };
    const allProducts = products();
    allProducts.push({
      id: Date.now(),
      name: form.name.value.trim(),
      cat: form.cat.value,
      price: +form.price.value,
      stock: +form.stock.value,
      rating: 4.0,
      icon: icons[form.cat.value],
      image
    });

    set('products', allProducts);
    form.reset();
    renderMerchant();
    renderCart();
    toast('Product added');
  };

  renderCart();
  route();
  setInterval(() => {
    if (!advanceOrderStatuses()) return;

    const currentView = location.hash.slice(1);
    if (currentView === 'orders') renderOrders();
    if (currentView === 'merchant' && isMerchant) renderMerchant();
  }, 1000);
}