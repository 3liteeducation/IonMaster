const CACHE_NAME = 'ionmaster-cache-v1';

// 這裡列出我們希望第一次載入就先快取起來的核心檔案
const urlsToCache = [
  '/',
  '/index.html',
  '/3lite-style.css',
  '/data.js',
  '/app.js',
  '/manifest.json'
];

// 1. 安裝階段：將核心檔案存入快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('快取核心檔案成功！');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. 攔截請求階段：優先使用快取檔案
self.addEventListener('fetch', event => {
  // 注意：我們不要快取 /api/ 開頭的後端請求（例如登入、存檔），確保資料是最新狀態
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果快取裡有這個檔案，就直接回傳（秒開！）
        if (response) {
          return response;
        }

        // 如果快取沒有（例如新的圖片），就去網路抓取，並偷偷存進快取裡留給下次用
        return fetch(event.request).then(networkResponse => {
          // 只快取圖片資源 (png, jpg, etc.)
          if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
            let clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        });
      })
  );
});
