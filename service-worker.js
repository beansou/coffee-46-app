// 注意：未來只要你更新了 index.html 的功能，請記得把這裡的 v5.6 改成 v5.7、v5.8...
// 這樣瀏覽器才會知道有新版本，主動幫你清除舊快取！
const CACHE_NAME = 'precision-brew-v5.6';

// 你的本地資源
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './my_coffee_logo.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 你的外部資源
const EXTERNAL_ASSETS = [
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.tailwindcss.com'
];

// 1. 安裝階段：立刻接管
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(LOCAL_ASSETS);
      // 外部 CDN 用 allSettled 避免單一檔案載入失敗導致整個 SW 崩潰
      await Promise.allSettled(
        EXTERNAL_ASSETS.map((url) => cache.add(url))
      );
    })()
  );
});

// 2. 啟動階段：無情刪除舊版本 (解決黑屏的關鍵)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('清除舊版本快取:', key);
            return caches.delete(key);
          }
        })
      );
      self.clients.claim(); 
    })()
  );
});

// 3. 攔截請求：採用混合策略
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // 策略 A：針對網頁本體 (index.html) -> 【網路優先 (Network First)】
  // 確保你每次打開只要有網路，一定能看到最新的配方介面
  if (event.request.mode === 'navigate' || event.request.url.includes('index.html')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const networkResponse = await fetch(event.request);
          cache.put(event.request, networkResponse.clone()); // 抓到新版，偷偷更新快取
          return networkResponse;
        } catch (err) {
          // 斷網時 (Offline)，才退回去拿快取的舊版
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) return cachedResponse;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // 策略 B：針對 CDN 腳本與圖片 -> 【快取優先 (Cache First)】
  // 這些檔案不會常常變動，直接從快取拿最快，也能節省流量
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse; // 找到了就直接秒速回傳
      
      try {
        const networkResponse = await fetch(event.request);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (err) {
        return new Response('Resource Offline', { status: 503 });
      }
    })()
  );
});
