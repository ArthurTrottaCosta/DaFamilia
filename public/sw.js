// Network-only data. No private records, API responses or authenticated HTML in caches.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("dafamilia-")) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("push", (event) => {
  event.waitUntil(
    self.registration.showNotification("DaFamília", {
      body: "Você tem um novo lembrete no seu grupo.",
      icon: "/logo192.png",
      tag: "df-reminder",
      data: { url: "/app" },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      for (const client of await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      })) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.navigate("/app");
          return client.focus();
        }
      }
      return clients.openWindow("/app");
    })(),
  );
});
