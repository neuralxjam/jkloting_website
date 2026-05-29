// ============================================================
// J.Kloting — Barong Catalog
// Reads available Barongs from Firestore and renders cards.
// Writes are blocked at the security-rules layer; this is read-only.
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js'
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js'

// ---- CONFIG ----------------------------------------------------------------
const firebaseConfig = {
  apiKey: 'AIzaSyCLcgQZofD-rBfYyafEy4HQWz_NTJVAeK8',
  authDomain: 'jklothing-inventory.firebaseapp.com',
  projectId: 'jklothing-inventory',
  storageBucket: 'jklothing-inventory.firebasestorage.app',
  messagingSenderId: '613814178111',
  appId: '1:613814178111:web:08a930469d95e98248438a',
}

const MESSENGER_URL = 'https://m.me/jklotingofficial'
const PLACEHOLDER_IMG = 'img/dummy.png'

// ---- INIT ------------------------------------------------------------------
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ---- DOM REFS --------------------------------------------------------------
const $loading = document.getElementById('barong-catalog-loading')
const $empty = document.getElementById('barong-catalog-empty')
const $coloredSection = document.getElementById('colored-barong-section')
const $whiteSection = document.getElementById('white-barong-section')
const $coloredGrid = document.getElementById('colored-barong-grid')
const $whiteGrid = document.getElementById('white-barong-grid')

// ---- HELPERS ---------------------------------------------------------------
function peso(n) {
  return '₱' + Number(n).toLocaleString('en-PH')
}

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function messengerLinkFor(barong) {
  // Use custom fb_link if provided, otherwise default Messenger handle
  return barong.fb_link && barong.fb_link.trim() ? barong.fb_link : MESSENGER_URL
}

function renderCard(barong, index) {
  const images = Array.isArray(barong.images) && barong.images.length > 0
    ? barong.images
    : [PLACEHOLDER_IMG]
  const mainImg = images[0]
  const label = escapeHtml(barong.label || 'Barong')
  const size = escapeHtml(barong.size || '')
  const price = peso(barong.price || 0)
  const orderUrl = messengerLinkFor(barong)
  const cardId = 'barong-' + barong.id

  // Thumbnail strip (only shown when 2+ images)
  const thumbs = images.length > 1
    ? `<div class="barong-thumbs" data-card="${cardId}">
        ${images.map((url, i) => `
          <button type="button" class="barong-thumb${i === 0 ? ' is-active' : ''}"
                  data-src="${escapeHtml(url)}" aria-label="View image ${i + 1}">
            <img src="${escapeHtml(url)}" alt="${label} thumbnail ${i + 1}" />
          </button>
        `).join('')}
      </div>`
    : ''

  const wowDelay = (0.1 + (index % 3) * 0.15).toFixed(2)

  return `
    <div class="col-lg-4 col-md-6 col-sm-12 wow fadeInUp" data-wow-delay="${wowDelay}s">
      <div class="product-card barong-card" id="${cardId}">
        <div class="product-img barong-card-img">
          <img src="${escapeHtml(mainImg)}" alt="${label}" data-main-img />
          <div class="product-badge">${escapeHtml(price)}</div>
        </div>
        <div class="product-details">
          <h4>${label}</h4>
          <div class="size-badges">
            <span class="size-pill">Size ${size}</span>
          </div>
          ${thumbs}
          <a href="${escapeHtml(orderUrl)}" target="_blank" rel="noopener"
             class="btn btn-common btn-order">
            <i class="fa fa-facebook"></i> Message to Order
          </a>
        </div>
      </div>
    </div>
  `
}

function wireThumbnailSwitching(root) {
  root.querySelectorAll('.barong-thumbs').forEach((strip) => {
    const cardId = strip.dataset.card
    const card = document.getElementById(cardId)
    if (!card) return
    const mainImg = card.querySelector('[data-main-img]')
    strip.querySelectorAll('.barong-thumb').forEach((btn) => {
      btn.addEventListener('click', () => {
        const src = btn.dataset.src
        if (src && mainImg) mainImg.src = src
        strip.querySelectorAll('.barong-thumb').forEach((b) => b.classList.remove('is-active'))
        btn.classList.add('is-active')
      })
    })
  })
}

function showError(message) {
  if ($loading) $loading.style.display = 'none'
  if ($empty) {
    $empty.style.display = 'block'
    $empty.innerHTML = `<p style="color:#c0392b;">${escapeHtml(message)}</p>`
  }
}

// ---- LOAD ------------------------------------------------------------------
async function loadCatalog() {
  try {
    const q = query(
      collection(db, 'barongs'),
      where('status', '==', 'available'),
      orderBy('created_at', 'desc')
    )
    const snap = await getDocs(q)

    const colored = []
    const white = []
    snap.forEach((doc) => {
      const data = { id: doc.id, ...doc.data() }
      if (data.type === 'white') white.push(data)
      else colored.push(data)
    })

    if ($loading) $loading.style.display = 'none'

    if (colored.length === 0 && white.length === 0) {
      if ($empty) $empty.style.display = 'block'
      return
    }

    if (colored.length > 0) {
      $coloredGrid.innerHTML = colored.map(renderCard).join('')
      $coloredSection.style.display = 'block'
      wireThumbnailSwitching($coloredGrid)
    }
    if (white.length > 0) {
      $whiteGrid.innerHTML = white.map(renderCard).join('')
      $whiteSection.style.display = 'block'
      wireThumbnailSwitching($whiteGrid)
    }

    // Re-trigger WOW animations for newly inserted cards (if WOW.js is present)
    if (window.WOW) {
      try { new window.WOW().sync() } catch (_) { /* noop */ }
    }
  } catch (err) {
    console.error('[barong-catalog] failed to load:', err)
    showError("We couldn't load the catalog right now. Please refresh, or message us on Facebook.")
  }
}

loadCatalog()
