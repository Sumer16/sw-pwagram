// Service Worker
var deferredPrompt;
var enableNotificationsButtons = document.querySelectorAll('.enable-notifications');

if(!window.Promise) {
  window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(function () {
      'Service Worker registered!'
    })
    .catch(function (err) {
      console.log(err);
    });
}

window.addEventListener('beforeinstallprompt', function(e) {
  console.log('beforeinstallprompt fired');
  e.preventDefault();
  deferredPrompt = e;
  return false;
});

function displayConfirmNotification() {
  if ('serviceWorker' in navigator) {
    var options = {
      body: 'You successfully subscribed to our notification service!',
      icon: '/src/images/icons/app-icon-96x96.png',
      image: '/src/images/sf-boat.jpg',
      dir: 'ltr',
      lang: 'en-US', //BCP 47,
      vibrate: [100, 50, 200],
      badge: '/src/images/icons/app-icon-96x96.png',
      tag: 'confirm-notification',
      renotify: true,
      actions: [
        { action: 'confirm', title: 'Okay', icon: '/src/images/icons/app-icon-96x96.png' },
        { action: 'cancel', title: 'Cancel', icon: '/src/images/icons/app-icon-96x96.png' },
      ]
    };

    navigator.serviceWorker.ready
    .then(function (swreg) {
      swreg.showNotification('Successfully Subscribed!', options);
    })
  }
}

function configurePushSub() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  var reg;
  navigator.serviceWorker.ready
  .then(function(swreg) {
    reg = swreg;
    return swreg.pushManager.getSubscription()
  }).then(function(sub) {
    if (sub === null) {
      var vapidPublicKey = 'VAPID_PUBLIC_KEY';
      var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidPublicKey
      });
    } else {

    }
  }).then(function(newSub) {
    return fetch('https://YOUR_PROJECT_ID.firebaseio.com/subscriptions.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(newSub)
    })
  }).then(function(res) {
    if(res.ok) {
      displayConfirmNotification();
    }
  }).catch(function(err) {
    console.log(err);
  });
}

function askForNotificationPermission() {
  Notification.requestPermission(function (result) {
    console.log('User Choice', result);
    if (result !== 'granted') {
      console.log('No Notification permission granted');
    } else {
      // for (var i = 0; i < enableNotificationsButtons.length; i++) {
      //   enableNotificationsButtons[i].style.display = 'none';
      // }
      configurePushSub();
      // displayConfirmNotification();
    }
  })
}

if ('Notification' in window && 'serviceWorker' in navigator) {
  for (var i = 0; i < enableNotificationsButtons.length; i++) {
    enableNotificationsButtons[i].style.display = 'inline-block';
    enableNotificationsButtons[i].addEventListener('click', askForNotificationPermission);
  }
}