/* Service worker LFN : affiche les notifications push.
 * Le serveur envoie un signal sans contenu ; on récupère ici le texte de la dernière notification. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = { title: "LFN", body: "Nouvelle notification", url: "/", tag: "lfn" };
      try {
        const response = await fetch("/api/notifications/latest", { credentials: "same-origin", cache: "no-store" });
        if (response.ok) data = Object.assign(data, await response.json());
      } catch (error) {
        // hors-ligne ou session expirée : on garde le message générique
      }
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/LogoLFN.webp",
        badge: "/LogoLFN.webp",
        tag: data.tag,
        data: { url: data.url },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
