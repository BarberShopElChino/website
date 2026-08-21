/* ==========================================================================
   Barber Shop El Chino — motor de scroll cinematográfico
   --------------------------------------------------------------------------
   Progresivo por diseño: si Lenis/GSAP no cargan (CDN caído, sin red) o el
   usuario prefiere movimiento reducido, el sitio sigue siendo 100% usable
   como una página normal — nada depende de JS para verse u operar.
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";

  /* ---------------------------------------------------------------------
     -1) Botón flotante de WhatsApp (estilo chatbot, esquina de la
         pantalla) — reemplaza al botón "Reservar" que vivía en el menú.
         Se inyecta solo: aparece en las 7 páginas sin tener que repetir
         el HTML en cada una. Independiente del motor de scroll.
     --------------------------------------------------------------------- */
  var waFab = document.createElement("a");
  waFab.className = "whatsapp-fab";
  waFab.href = "https://api.whatsapp.com/send?phone=593968606488&text=Hola%20Barber%20Shop%20El%20Chino%2C%20quiero%20reservar%20una%20cita";
  waFab.target = "_blank";
  waFab.rel = "noopener";
  waFab.setAttribute("aria-label", "Chatea por WhatsApp");
  waFab.innerHTML = '<img src="images/contactanos/ws.png" alt="">';
  document.body.appendChild(waFab);

  /* ---------------------------------------------------------------------
     0) Lightbox de galería — independiente del motor de scroll, funciona
        aunque GSAP/Lenis no carguen.
     --------------------------------------------------------------------- */
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var lightboxImg = document.getElementById("lightbox-img");
    var openLightbox = function (trigger) {
      lightboxImg.src = trigger.currentSrc || trigger.src;
      lightboxImg.alt = trigger.alt || "";
      lightbox.classList.add("is-open");
    };
    var closeLightbox = function () {
      lightbox.classList.remove("is-open");
      lightboxImg.src = "";
    };
    document.querySelectorAll("[data-lightbox]").forEach(function (trigger) {
      trigger.setAttribute("tabindex", "0");
      trigger.setAttribute("role", "button");
      trigger.addEventListener("click", function () { openLightbox(trigger); });
      trigger.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(trigger);
        }
      });
    });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target.closest("[data-lightbox-close]")) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLightbox();
    });
  }

  /* ---------------------------------------------------------------------
     0.05) Previsualización grande al pasar el mouse sobre las miniaturas
           de la mini-galería — un panel flotante, NO un modal. Solo en
           dispositivos con mouse real; en táctil no se activa (ahí el
           toque abre directo el lightbox de arriba). Independiente de
           GSAP/Lenis para que funcione siempre.
     --------------------------------------------------------------------- */
  var miniThumbs = document.querySelectorAll(".mini-gallery [data-lightbox]");
  if (miniThumbs.length && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var hoverPreview = document.createElement("div");
    hoverPreview.className = "hover-preview";
    hoverPreview.setAttribute("aria-hidden", "true");
    hoverPreview.innerHTML = '<img alt="">';
    document.body.appendChild(hoverPreview);
    var hoverPreviewImg = hoverPreview.querySelector("img");

    var positionPreview = function (trigger) {
      var r = trigger.getBoundingClientRect();
      var pw = hoverPreview.offsetWidth || 320;
      var ph = hoverPreview.offsetHeight || 420;
      var x = r.left + r.width / 2 - pw / 2;
      x = Math.max(12, Math.min(x, window.innerWidth - pw - 12));
      var y = r.top - ph - 18;
      if (y < 12) y = Math.min(r.bottom + 18, window.innerHeight - ph - 12);
      hoverPreview.style.transform = "translate(" + x + "px," + y + "px)";
    };

    miniThumbs.forEach(function (trigger) {
      trigger.addEventListener("mouseenter", function () {
        hoverPreviewImg.src = trigger.currentSrc || trigger.src;
        hoverPreviewImg.alt = trigger.alt || "";
        positionPreview(trigger);
        hoverPreview.classList.add("is-visible");
      });
      trigger.addEventListener("mouseleave", function () {
        hoverPreview.classList.remove("is-visible");
      });
    });
    window.addEventListener("scroll", function () {
      hoverPreview.classList.remove("is-visible");
    }, { passive: true });
  }

  /* ---------------------------------------------------------------------
     0.055) "Elige tu personaje": un cuadro al azar se ilumina cada tanto
            en cada mini-galería para invitar a hacer clic. Se apaga solo
            (para siempre) apenas alguien hace clic una vez en una foto.
     --------------------------------------------------------------------- */
  if (!reduceMotion) {
    var spotlightTimers = [];
    document.querySelectorAll(".mini-gallery").forEach(function (gallery) {
      var figures = gallery.querySelectorAll("figure");
      if (figures.length < 3) return;
      var current = null;
      var tick = function () {
        if (current) current.classList.remove("is-spotlight");
        var next = figures[Math.floor(Math.random() * figures.length)];
        next.classList.add("is-spotlight");
        current = next;
      };
      tick();
      spotlightTimers.push(setInterval(tick, 2600));
    });
    if (spotlightTimers.length) {
      var stopSpotlights = function () {
        spotlightTimers.forEach(function (t) { clearInterval(t); });
        document.querySelectorAll(".mini-gallery .is-spotlight").forEach(function (el) {
          el.classList.remove("is-spotlight");
        });
      };
      document.querySelectorAll(".mini-gallery [data-lightbox]").forEach(function (trigger) {
        trigger.addEventListener("click", stopSpotlights, { once: true });
      });
    }
  }

  /* ---------------------------------------------------------------------
     0.06) Tarjetas de categoría que se voltean (Servicios). En mouse se
           voltean solo con CSS (:hover); en táctil no hay hover, así que
           el toque alterna la clase que hace lo mismo.
     --------------------------------------------------------------------- */
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".category-card").forEach(function (card) {
      card.addEventListener("click", function () {
        card.classList.toggle("is-flipped");
      });
    });
  }

  /* ---------------------------------------------------------------------
     0.1) Formularios de registro/login — no hay backend todavía, así que
          en vez de recargar la página al vacío, validamos y confirmamos
          en pantalla. Los que llevan data-whatsapp-submit se manejan
          aparte (más abajo): arman un mensaje con los datos y abren
          WhatsApp en vez de solo mostrar un mensaje en pantalla.
     --------------------------------------------------------------------- */
  document.querySelectorAll(".auth-card:not([data-whatsapp-submit])").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var btn = form.querySelector("button[type=submit]");
      if (btn) {
        btn.textContent = "¡Listo! Te contactaremos pronto";
        btn.disabled = true;
      }
    });
  });

  /* ---------------------------------------------------------------------
     0.11) Formularios que envían sus datos como mensaje de WhatsApp
           (ej. "Regístrate"): arma el texto con lo que la persona llenó
           y abre WhatsApp con el mensaje ya escrito. WhatsApp no deja
           enviarlo solo por seguridad — la persona igual tiene que darle
           "Enviar" ahí, pero ya le llega todo redactado.
     --------------------------------------------------------------------- */
  document.querySelectorAll("[data-whatsapp-submit]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var phone = form.getAttribute("data-whatsapp-submit");
      var get = function (name) {
        var field = form.querySelector('[name="' + name + '"]');
        return field && field.value ? field.value.trim() : "";
      };
      var lines = ["Hola Barber Shop El Chino, quiero registrarme."];
      var nombre = get("nombre");
      var email = get("email");
      if (nombre) lines.push("Nombre: " + nombre + ".");
      if (email) lines.push("Correo: " + email + ".");
      var url = "https://api.whatsapp.com/send?phone=" + encodeURIComponent(phone) + "&text=" + encodeURIComponent(lines.join(" "));
      var btn = form.querySelector("button[type=submit]");
      if (btn) {
        btn.textContent = "Abriendo WhatsApp…";
        btn.disabled = true;
      }
      window.open(url, "_blank", "noopener");
    });
  });

  /* ---------------------------------------------------------------------
     0.12) Juego del cronómetro (Juegos): la persona detiene el reloj lo
           más cerca posible del tiempo que anuncia el barbero en vivo —
           si acierta, se gana el corte gratis. Independiente del motor de
           scroll: es funcionalidad real, no una animación decorativa.
     --------------------------------------------------------------------- */
  document.querySelectorAll("[data-stopwatch]").forEach(function (widget) {
    var timeEl = widget.querySelector("[data-stopwatch-time]");
    var startBtn = widget.querySelector("[data-stopwatch-start]");
    var stopBtn = widget.querySelector("[data-stopwatch-stop]");
    var resetBtn = widget.querySelector("[data-stopwatch-reset]");
    var targetInput = widget.querySelector("[data-stopwatch-target]");
    var resultEl = widget.querySelector("[data-stopwatch-result]");
    if (!timeEl || !startBtn || !stopBtn || !resetBtn) return;

    var running = false;
    var startedAt = 0;
    var elapsed = 0;
    var rafId = null;

    function pad(n) {
      return n < 10 ? "0" + n : "" + n;
    }
    function format(ms) {
      var cs = Math.floor(ms / 10);
      var centiseconds = cs % 100;
      var totalSeconds = Math.floor(cs / 100);
      var seconds = totalSeconds % 60;
      var minutes = Math.floor(totalSeconds / 60);
      // Punto decimal (no dos puntos) antes de las centésimas: son una
      // fracción de segundo, no otra unidad de reloj que "llegue a 59".
      return pad(minutes) + ":" + pad(seconds) + "." + pad(centiseconds);
    }
    function render() {
      timeEl.textContent = format(elapsed);
    }
    function tick() {
      if (!running) return;
      elapsed = performance.now() - startedAt;
      render();
      rafId = requestAnimationFrame(tick);
    }

    startBtn.addEventListener("click", function () {
      if (running) return;
      running = true;
      startedAt = performance.now() - elapsed;
      resultEl.textContent = "";
      widget.classList.remove("is-win", "is-lose");
      startBtn.disabled = true;
      stopBtn.disabled = false;
      tick();
    });

    stopBtn.addEventListener("click", function () {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
      startBtn.disabled = false;
      stopBtn.disabled = true;
      if (targetInput && targetInput.value.trim() !== "") {
        var targetSeconds = parseFloat(targetInput.value.replace(",", "."));
        if (!isNaN(targetSeconds)) {
          var diff = Math.abs(elapsed - targetSeconds * 1000);
          if (diff <= 100) {
            resultEl.textContent = "¡Justo ahí! Corte gratis 🎉";
            widget.classList.add("is-win");
          } else {
            resultEl.textContent = "Faltó poco — ¡otra vuelta!";
            widget.classList.add("is-lose");
          }
        }
      }
    });

    resetBtn.addEventListener("click", function () {
      running = false;
      cancelAnimationFrame(rafId);
      elapsed = 0;
      render();
      resultEl.textContent = "";
      widget.classList.remove("is-win", "is-lose");
      startBtn.disabled = false;
      stopBtn.disabled = true;
      if (targetInput) targetInput.value = "";
    });

    render();
    stopBtn.disabled = true;
  });

  /* ---------------------------------------------------------------------
     1) Navegación: menú móvil + header que se vuelve sólido al scrollear
     --------------------------------------------------------------------- */
  var header = document.querySelector("[data-header]");
  var navToggle = document.querySelector("[data-nav-toggle]");
  var siteNav = document.querySelector("[data-site-nav]");

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      var open = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      html.classList.toggle("nav-open", open);
    });
    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        html.classList.remove("nav-open");
      });
    });
  }

  if (header) {
    var toggleHeaderSolid = function () {
      header.classList.toggle("site-header--solid", window.scrollY > 40);
    };
    toggleHeaderSolid();
    window.addEventListener("scroll", toggleHeaderSolid, { passive: true });
  }

  /* ---------------------------------------------------------------------
     2) Video de fondo: solo reproduce cuando la escena está en pantalla
     --------------------------------------------------------------------- */
  var bgVideos = document.querySelectorAll("[data-bg-video] video");
  if ("IntersectionObserver" in window && bgVideos.length) {
    var videoObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var video = entry.target;
          if (entry.isIntersecting) {
            video.play().catch(function () {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    bgVideos.forEach(function (video) {
      videoObserver.observe(video);
    });
  }

  /* ---------------------------------------------------------------------
     3) Revelado al hacer scroll (fallback sin GSAP: IntersectionObserver)
     --------------------------------------------------------------------- */
  function fallbackReveal() {
    var items = document.querySelectorAll("[data-reveal], [data-reveal-group] > *");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );
    items.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------------------------------------------------------------------
     4) Split de texto para titulares con data-split-reveal.
        Recorre nodos (no solo texto plano) para poder splitear titulares
        que llevan <em> u otras etiquetas dentro sin perder el énfasis.
     --------------------------------------------------------------------- */
  function wrapWords(text) {
    return text
      .split(/\s+/)
      .filter(Boolean)
      .map(function (word) {
        return '<span class="word"><span class="word__inner">' + word + "</span></span>";
      })
      .join(" ");
  }
  function walkAndSplit(node) {
    var out = "";
    node.childNodes.forEach(function (child) {
      if (child.nodeType === 3) {
        out += wrapWords(child.textContent);
      } else if (child.nodeType === 1) {
        out += "<" + child.tagName.toLowerCase() + ">" + walkAndSplit(child) + "</" + child.tagName.toLowerCase() + ">";
      }
    });
    return out;
  }
  function splitWords(el) {
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = walkAndSplit(el);
  }

  document.querySelectorAll("[data-split-reveal]").forEach(splitWords);

  /* ---------------------------------------------------------------------
     5) Motion completo (Lenis + GSAP) — solo si todo cargó y no hay
        preferencia de movimiento reducido
     --------------------------------------------------------------------- */
  if (reduceMotion || !hasGSAP) {
    fallbackReveal();
    html.classList.add("motion-basic");
    return;
  }

  html.classList.add("motion-full");
  gsap.registerPlugin(ScrollTrigger);

  var lenis = null;
  if (hasLenis) {
    lenis = new Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 1.05 });
    lenis.on("scroll", ScrollTrigger.update);
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  var pointerFine = window.matchMedia("(pointer: fine)").matches;

  /* --- Barra de progreso de scroll (se inyecta sola, no requiere tocar el HTML) --- */
  var progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.innerHTML = '<div class="scroll-progress__bar" data-progress-bar></div>';
  document.body.appendChild(progress);
  var progressBar = progress.querySelector("[data-progress-bar]");
  gsap.set(progressBar, { scaleX: 0 });
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: function (self) {
      gsap.set(progressBar, { scaleX: self.progress });
    },
  });

  /* --- Revelado genérico (fade + leve escala) para [data-reveal] --- */
  document.querySelectorAll("[data-reveal]").forEach(function (el) {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 50, scale: 0.97 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
      }
    );
  });

  /* --- Revelado escalonado para grupos [data-reveal-group] --- */
  document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
    var children = group.children;
    gsap.fromTo(
      children,
      { autoAlpha: 0, y: 60, scale: 0.92 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: { trigger: group, start: "top 88%" },
      }
    );
  });

  /* --- Titulares palabra por palabra (de un solo golpe, no fijados) --- */
  document.querySelectorAll("[data-split-reveal]:not([data-pin-reveal])").forEach(function (el) {
    gsap.fromTo(
      el.querySelectorAll(".word__inner"),
      { autoAlpha: 0, yPercent: 100, rotate: 4 },
      {
        autoAlpha: 1,
        yPercent: 0,
        rotate: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.045,
        scrollTrigger: { trigger: el, start: "top 82%" },
      }
    );
  });

  /* --- Botones magnéticos: siguen ligeramente al cursor --- */
  if (pointerFine) {
    document.querySelectorAll(".btn").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        gsap.to(btn, {
          x: (e.clientX - r.left - r.width / 2) * 0.35,
          y: (e.clientY - r.top - r.height / 2) * 0.5,
          duration: 0.3,
          ease: "power2.out",
        });
      });
      btn.addEventListener("mouseleave", function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      });
    });

    /* --- Tarjetas con leve inclinación 3D al pasar el mouse --- */
    document.querySelectorAll(".service-card, .team-card, .contact-tile, .video-card, .service-tile").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, {
          rotateX: py * -6,
          rotateY: px * 6,
          transformPerspective: 700,
          duration: 0.4,
          ease: "power2.out",
        });
      });
      card.addEventListener("mouseleave", function () {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "power3.out" });
      });
    });
  }

  /* --- Comportamientos que solo tienen sentido con espacio de sobra
     (parallax, pines, scrub) — se desactivan por completo en móvil para
     no caer en scroll-jacking sobre pantallas táctiles. --- */
  ScrollTrigger.matchMedia({
    "(min-width: 768px)": function () {
      // Parallax con velocidad configurable: data-parallax="18" (% de yPercent)
      document.querySelectorAll("[data-parallax]").forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-parallax")) || 14;
        gsap.to(el, {
          yPercent: speed,
          ease: "none",
          scrollTrigger: { trigger: el, scrub: 0.4 },
        });
      });

      // Hero: el video hace zoom y el contenido se difumina al salir de escena
      document.querySelectorAll("[data-hero-scrub]").forEach(function (heroScene) {
        var media = heroScene.querySelector(".scene__media video, .scene__media img");
        var content = heroScene.querySelector(".scene__content");
        var tl = gsap.timeline({
          scrollTrigger: { trigger: heroScene, start: "top top", end: "bottom top", scrub: 0.5 },
        });
        if (media) tl.to(media, { scale: 1.18, ease: "none" }, 0);
        if (content) tl.to(content, { yPercent: -35, autoAlpha: 0.15, ease: "none" }, 0);

        // Parallax de cursor sutil sobre el contenido del hero
        if (pointerFine && content) {
          heroScene.addEventListener("mousemove", function (e) {
            var r = heroScene.getBoundingClientRect();
            var x = (e.clientX - r.left) / r.width - 0.5;
            var y = (e.clientY - r.top) / r.height - 0.5;
            gsap.to(content, { x: x * 26, y: y * 18, duration: 0.7, ease: "power2.out" });
          });
        }
      });

      // Declaración de marca: se fija en pantalla mientras el texto se
      // revela palabra por palabra, sincronizado con la velocidad del scroll.
      document.querySelectorAll("[data-pin-reveal]").forEach(function (el) {
        var scene = el.closest(".scene");
        var words = el.querySelectorAll(".word__inner");
        if (!scene || !words.length) return;
        gsap.set(words, { autoAlpha: 0.14 });
        gsap.to(words, {
          autoAlpha: 1,
          stagger: 0.4,
          ease: "none",
          scrollTrigger: {
            trigger: scene,
            start: "top top",
            end: "+=100%",
            scrub: 0.4,
            pin: true,
            invalidateOnRefresh: true,
          },
        });
      });

      // Servicios: scroll horizontal fijado + cada tarjeta crece al centrarse
      document.querySelectorAll("[data-pin-horizontal]").forEach(function (scene) {
        var track = scene.querySelector("[data-pin-track]");
        if (!track) return;
        var cards = track.querySelectorAll(".service-card");
        var distance = function () {
          return track.scrollWidth - scene.clientWidth;
        };
        var st = {
          trigger: scene,
          start: "top top",
          end: function () {
            return "+=" + distance();
          },
          scrub: 0.5,
          pin: true,
          invalidateOnRefresh: true,
          onUpdate: function () {
            var sceneRect = scene.getBoundingClientRect();
            var center = sceneRect.left + sceneRect.width / 2;
            cards.forEach(function (card) {
              var r = card.getBoundingClientRect();
              var cardCenter = r.left + r.width / 2;
              var dist = Math.min(Math.abs(cardCenter - center) / (sceneRect.width / 2), 1);
              gsap.set(card, { scale: 1.08 - dist * 0.16, opacity: 1 - dist * 0.35 });
            });
          },
        };
        gsap.to(track, { x: function () { return -distance(); }, ease: "none", scrollTrigger: st });
      });

      // Nosotros: el equipo se reproduce como un slide por persona, uno a
      // la vez, a medida que se hace scroll dentro de la sección fijada.
      document.querySelectorAll("[data-pin-slides]").forEach(function (scene) {
        var track = scene.querySelector("[data-slide-track]");
        var bgTrack = scene.querySelector("[data-team-bg-track]");
        var slides = scene.querySelectorAll(".team-slide");
        var dots = scene.querySelectorAll("[data-slide-dots] span");
        var bgs = scene.querySelectorAll(".team-bg");
        if (!track || slides.length < 2) return;
        scene.classList.add("team-slides--pinned");
        var setActive = function (idx) {
          slides.forEach(function (s, i) { s.classList.toggle("is-active", i === idx); });
          dots.forEach(function (d, i) { d.classList.toggle("is-active", i === idx); });
        };
        var bgDistance = function () {
          return bgTrack ? bgTrack.scrollWidth - bgTrack.clientWidth : 0;
        };
        ScrollTrigger.create({
          trigger: scene,
          start: "top top",
          end: "+=" + slides.length * 60 + "%",
          pin: true,
          scrub: 0.35,
          invalidateOnRefresh: true,
          onUpdate: function (self) {
            // El texto solo se cruza con opacity (no se mueve). Las fotos
            // sí se desplazan en X según la posición exacta del scroll
            // (misma técnica que las cards de Servicios) — al subir, el
            // desplazamiento se revierte solo, sin detectar la dirección.
            if (bgTrack) gsap.set(bgTrack, { x: -self.progress * bgDistance() });
            var raw = self.progress * slides.length;
            var idx = Math.min(slides.length - 1, Math.floor(raw));
            var local = Math.min(1, Math.max(0, raw - idx)); // 0→1 dentro de ese slide
            setActive(idx);
            // La foto que está en pantalla arranca un poco más grande y
            // se encoge a su tamaño real mientras se scrollea ese slide,
            // para verse completa.
            gsap.set(bgs, { scale: 1.12 - local * 0.12 });
          },
        });
      });
    },
    "(max-width: 767px)": function () {
      // En móvil el texto de la declaración no se fija: aparece igual que
      // cualquier otro titular, de un solo golpe.
      document.querySelectorAll("[data-pin-reveal]").forEach(function (el) {
        gsap.fromTo(
          el.querySelectorAll(".word__inner"),
          { autoAlpha: 0, yPercent: 60 },
          {
            autoAlpha: 1,
            yPercent: 0,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.05,
            scrollTrigger: { trigger: el, start: "top 80%" },
          }
        );
      });
    },
  });
})();
