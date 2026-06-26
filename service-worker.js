// 每次你更新了 index.html 之後，只要來這裡把後面的數字改掉 (例如改 v5.7)，
// 瀏覽器就會知道有新版本，並自動清除舊的黑屏快取！
const CACHE_NAME = 'precision-brew-v5.6';

const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 1. 安裝階段：強制立刻接管，不等待
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. 啟動階段：無情刪除所有舊版本的快取 (破解黑屏的關鍵)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('發現新版本，清除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 立即控制所有頁面
  );
});

// 3. 攔截請求：採用「網路優先 (Network First)」策略
// 這樣只要有網路，一定會抓最新版；沒網路時，才會拿快取出來用 (完美離線)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
