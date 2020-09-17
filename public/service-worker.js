importScripts('workbox-sw.prod.v2.1.3.js');
importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

const workboxSW = new self.WorkboxSW();

workboxSW.router.registerRoute(/.*(?:googleapis|gstatic)\.com.*$/, workboxSW.strategies.staleWhileRevalidate({
  cacheName: 'google-fonts',
  cacheExpiration: {
    maxEntries: 3,
    maxAgeSeconds: 60 * 60 * 24 * 28
  }
}));

workboxSW.router.registerRoute('https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css', workboxSW.strategies.staleWhileRevalidate({
  cacheName: 'material-css'
}));

workboxSW.router.registerRoute(/.*(?:firebasestorage\.googleapis)\.com.*$/, workboxSW.strategies.staleWhileRevalidate({
  cacheName: 'firebase-images'
}));

workboxSW.router.registerRoute('https://YOUR_PROJECT_ID.firebaseio.com/posts.json', function (args) {
  return fetch(args.event.request)
  .then(function (res) {
    var clonedRes = res.clone();
    clearData('posts')
    .then(function() {
      return clonedRes.json();
    })
    .then(function(data) {
      for (var key in data) {
        writeData('posts', data[key]);
      }
    });
    return res;
  })
});

workboxSW.router.registerRoute(function (routeData) {
  return (routeData.event.request.headers.get('accept').includes('text/html'));
}, function (args) {
  return caches.match(args.event.request)
  .then(function (response) {
    if (response) {
      return response;
    } else {
      return fetch(args.event.request)
        .then(function (res) {
          return caches.open('dynamic')
            .then(function (cache) {
              // trimCache(DYNAMIC_VERSION_NAME, 3);
              cache.put(args.event.request.url, res.clone());
              return res;
            })
        })
        .catch(function (err) {
          return caches.match('/offline.html')
            .then(function (res) {
                return res;
            });
        });
    }
  })
});

workboxSW.precache([
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "716dcea1c9b86d3752f4fe3d74544ba7"
  },
  {
    "url": "manifest.json",
    "revision": "f363e6e3df74afb02b9b178ab5ffc9d3"
  },
  {
    "url": "offline.html",
    "revision": "d6ad309f6a53a459c07ba5a6448a5552"
  },
  {
    "url": "src/css/app.css",
    "revision": "2099803914a5e3f6f08a6a76e5f58f4a"
  },
  {
    "url": "src/css/feed.css",
    "revision": "0bdefc0cf15ce6ad8c46862cd5dd04e7"
  },
  {
    "url": "src/css/help.css",
    "revision": "1c6d81b27c9d423bece9869b07a7bd73"
  },
  {
    "url": "src/images/main-image-lg.jpg",
    "revision": "31b19bffae4ea13ca0f2178ddb639403"
  },
  {
    "url": "src/images/main-image-sm.jpg",
    "revision": "c6bb733c2f39c60e3c139f814d2d14bb"
  },
  {
    "url": "src/images/main-image.jpg",
    "revision": "5c66d091b0dc200e8e89e56c589821fb"
  },
  {
    "url": "src/images/sf-boat.jpg",
    "revision": "0f282d64b0fb306daf12050e812d6a19"
  },
  {
    "url": "src/js/app.min.js",
    "revision": "a0f461b453ddc5e6958e8852604f0b30"
  },
  {
    "url": "src/js/feed.min.js",
    "revision": "f4c89f5052909b447e946dc55fd1e901"
  },
  {
    "url": "src/js/fetch.min.js",
    "revision": "4174e53d81ed161be169bc7981cf6d49"
  },
  {
    "url": "src/js/idb.min.js",
    "revision": "88ae80318659221e372dd0d1da3ecf9a"
  },
  {
    "url": "src/js/material.min.js",
    "revision": "713af0c6ce93dbbce2f00bf0a98d0541"
  },
  {
    "url": "src/js/promise.min.js",
    "revision": "abe12e93553296bf22d99b57a03ab62d"
  },
  {
    "url": "src/js/utility.min.js",
    "revision": "f40833a55bd7e74f83bc00a2aaa0b153"
  }
]);

self.addEventListener('sync', function (e) {
  console.log('[Service Worker] Background syncing', e);
  if (e.tag === 'sync-new-post') {
    console.log('[Service Worker] Syncing new Posts');
    e.waitUntil(
      readAllData('sync-posts').then(function(data) {
        for (var dt of data) {
          var postData = new FormData();
          postData.append('id', dt.id);
          postData.append('title', dt.title);
          postData.append('location', dt.location);
          postData.append('rawLocationLat', dt.rawLocation.lat);
          postData.append('rawLocationLng', dt.rawLocation.lng);
          postData.append('file', dt.picture, dt.id + '.png');

          fetch('https://YOUR_PROJECT_ID.cloudfunctions.net/storePostData', {
            method: 'POST',
            body: postData
          }).then(function(res) {
            console.log('Sent Data', res);
            if(res.ok) {
              res.json().then(function(resData) {
                deleteItemData('sync-posts', resData.id);
              })              
            }
          }).catch(function (err) {
            console.log('Error while sending data', err);
          });
        }
      })
    );
  }
});

self.addEventListener('notificationclick', function (e) {
  var notification = e.notification;
  var action = e.action;

  console.log(notification);

  if (action === 'confirm') { // ID assigned in app.js
    console.log('Confirm was chosen!');
    notification.close();
  } else {
    console.log(action);
    e.waitUntil(
      clients.matchAll()
      .then(function(clis) {
        var client = clis.find(function(c) {
          return c.visibilityState === 'visible';
        });
        if(client !== undefined) {
          client.navigate(notification.data.url);
          client.focus();
        } else {
          clients.openWindow(notification.data.url);
        }
        notification.close();
      })
    );
  }
});

self.addEventListener('notificationclose', function (e) {
  console.log('Notification was closed', e);
});

self.addEventListener('push', function (e) {
  console.log('Push Notification received', e);
  
  var data = {title: 'New!', content: 'Something new happened!', openUrl: '/'};
  if(e.data) {
    data = JSON.parse(e.data.text());
  }

  var options = {
    body: data.content,
    icon: '/src/images/icons/app-icon-96x96.png',
    badge: '/src/images/icons/app-icon-96x96.png',
    data: {
      url: data.openUrl,
    }
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  )
});