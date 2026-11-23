// Rete di sicurezza della pagina del gioco: messaggi chiari invece di uno schermo nero o fermo.
(function () {
  "use strict";

  function messaggio(titolo, dettaglio) {
    if (document.getElementById("errore-gioco")) return;
    var box = document.createElement("div");
    box.id = "errore-gioco";
    box.setAttribute("role", "alert");
    box.style.cssText =
      "position:fixed;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;" +
      "justify-content:center;gap:14px;padding:24px;background:#140a10;color:#fff;" +
      "font:16px system-ui,sans-serif;text-align:center";
    var h = document.createElement("strong");
    h.textContent = titolo;
    h.style.cssText = "font-size:22px;color:#ff6a6a";
    var p = document.createElement("span");
    p.textContent = "Prova a ricaricare la pagina. Se il problema resta, prova un altro browser.";
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = "Ricarica";
    b.style.cssText = "font:16px system-ui,sans-serif;padding:10px 22px;border:0;border-radius:10px;background:#b41e1e;color:#fff;cursor:pointer";
    b.onclick = function () { location.reload(); };
    var d = document.createElement("small");
    d.textContent = dettaglio ? String(dettaglio).slice(0, 300) : "";
    d.style.cssText = "color:#9a9a9a;max-width:640px;word-break:break-word";
    box.append(h, p, b, d);
    document.body.appendChild(box);
  }

  // il gioco ha bisogno di WebGL e WebAssembly
  var prova = document.createElement("canvas");
  if (!(prova.getContext("webgl") || prova.getContext("experimental-webgl"))) {
    messaggio("Il browser non riesce a usare la grafica WebGL",
      "Attiva l'accelerazione hardware nelle impostazioni del browser, oppure prova un altro browser.");
  } else if (typeof WebAssembly !== "object") {
    messaggio("Il browser non supporta WebAssembly", "Aggiorna il browser all'ultima versione.");
  }

  // errori del gioco: il loader li scrive solo in console, qui diventano un messaggio a schermo
  var consoleErrore = console.error;
  console.error = function () {
    var testo = Array.prototype.map.call(arguments, String).join(" ");
    if (/WASM failed to load|Failed to fetch|NetworkError|Load failed|CompileError|LinkError/.test(testo)) {
      messaggio("Il gioco non è riuscito a partire", testo);
    } else if (/panicked at|RuntimeError|unreachable/.test(testo)) {
      messaggio("Il gioco si è interrotto", testo);
    }
    return consoleErrore.apply(console, arguments);
  };
  window.addEventListener("error", function (e) {
    if (e.error || e.message) messaggio("Il gioco si è interrotto", e.message || e.error);
  });
  window.addEventListener("unhandledrejection", function (e) {
    // un suono che non si decodifica non ferma il gioco (parte comunque, senza quel suono)
    var r = e.reason;
    if (r && (r.name === "EncodingError" || /decode audio/i.test(String(r.message || r)))) return;
    messaggio("Il gioco non è riuscito a partire", r);
  });

  // i tasti arrivano al gioco anche se il focus è finito fuori dal canvas
  var canvas = document.getElementById("glcanvas");
  if (canvas) {
    ["keydown", "keyup", "keypress"].forEach(function (tipo) {
      window.addEventListener(tipo, function (e) {
        var gestore = canvas["on" + tipo];
        if (e.target !== canvas && typeof gestore === "function") gestore.call(canvas, e);
      });
    });
    window.addEventListener("pointerdown", function () { canvas.focus(); });
  }
})();
