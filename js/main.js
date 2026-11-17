/* =============================================================
   КУЛЬТУРНЫЙ КОД РБ — общая логика
   -------------------------------------------------------------
   Модули: Preload · Header · Menu · Reveal · Counters · Hero-video
           Timeline (history.html) · Filters + Modal (now.html)
   ============================================================= */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 860px)");

  /* ---------- 1. PRELOADER + СТАРТ АНИМАЦИЙ ---------- */
  const boot = () => {
    document.body.classList.add("is-loaded");
    const pre = $(".preloader");
    if (!pre) return;
    const delay = reduced ? 0 : 550;
    window.setTimeout(() => {
      pre.classList.add("is-done");
      window.setTimeout(() => pre.remove(), 700);
    }, delay);
  };

  if (document.readyState === "complete") {
    boot();
  } else {
    window.addEventListener("load", boot);
    /* Страховка: не держим прелоадер дольше 2.6 с */
    window.setTimeout(() => {
      if (!document.body.classList.contains("is-loaded")) boot();
    }, 2600);
  }

  /* ---------- 2. HEADER: прокрутка, автоскрытие, прогресс ---------- */
  const header = $(".header");
  const progressBar = $(".progress i");
  const toTop = $(".to-top");
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const doc = document.documentElement;

    /* Классы шапки */
    if (header) {
      const threshold = header.dataset.threshold ? parseInt(header.dataset.threshold, 10) : 40;
      const style = header.dataset.style || "solid"; // solid | light
      header.classList.toggle(style === "light" ? "header--light" : "header--solid", y > threshold);
      header.classList.toggle("header--hidden", !document.body.classList.contains("menu-open") && y > lastY && y > 460);
    }

    /* Прогресс чтения */
    if (progressBar) {
      const max = doc.scrollHeight - window.innerHeight;
      progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }

    /* Кнопка «наверх» */
    if (toTop) toTop.classList.toggle("is-visible", y > window.innerHeight * 0.9);

    lastY = y;
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));
  }

  /* ---------- 3. МОБИЛЬНОЕ МЕНЮ ---------- */
  const burger = $(".header__burger");
  const menu = $(".menu");
  let lastFocus = null;

  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    document.body.classList.toggle("is-locked", open);
    if (burger) burger.setAttribute("aria-expanded", String(open));
    if (menu) menu.setAttribute("aria-hidden", String(!open));
    if (open) {
      lastFocus = document.activeElement;
      const first = menu && $(".menu__link", menu);
      if (first) window.setTimeout(() => first.focus(), 320);
    } else if (lastFocus) {
      lastFocus.focus();
    }
  };

  if (burger) burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));

  if (menu) {
    $$(".menu__link", menu).forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href") || "";
        const isAnchor = href.startsWith("#");
        if (isAnchor) {
          const target = href === "#" ? null : $(href);
          if (target) {
            e.preventDefault();
            setMenu(false);
            window.setTimeout(() => {
              const top = target.getBoundingClientRect().top + window.scrollY - 20;
              window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
            }, 380);
            return;
          }
        }
        setMenu(false);
      });
    });
  }

  /* Esc + блокировка фокуса в меню */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false);
    if (e.key === "Tab" && document.body.classList.contains("menu-open") && menu) {
      const items = $$("a, button", menu).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* Закрыть меню при ресайзе на десктоп */
  mobile.addEventListener("change", (e) => {
    if (!e.matches && document.body.classList.contains("menu-open")) setMenu(false);
  });

  /* ---------- 4. REVEAL-АНИМАЦИИ ПРИ СКРОЛЛЕ ---------- */
  /* Автостаггер: контейнеры .stagger задают задержку детям */
  $$(".stagger").forEach((wrap) => {
    $$(":scope > *", wrap).forEach((child, i) => {
      if (!child.hasAttribute("data-reveal")) child.setAttribute("data-reveal", "");
      child.style.setProperty("--reveal-delay", (i * 0.08).toFixed(2) + "s");
    });
  });

  const revealEls = $$("[data-reveal]");
  if (revealEls.length) {
    if (reduced || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("is-in"));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = el.dataset.revealDelay;
          if (delay) el.style.setProperty("--reveal-delay", /[sm]$/.test(delay) ? delay : delay + "s");
          el.classList.add("is-in");
          io.unobserve(el);
        });
      }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });

      revealEls.forEach((el) => io.observe(el));
    }
  }


  /* ---------- 5. СЧЁТЧИКИ ЦИФР ---------- */
  const counters = $$("[data-count]");
  if (counters.length) {
    const animateCounter = (el) => {
      const target = parseFloat(el.dataset.count);
      const duration = parseInt(el.dataset.countDuration || "1600", 10);
      const decimals = (el.dataset.countDecimals && parseInt(el.dataset.countDecimals, 10)) || 0;
      const prefix = el.dataset.countPrefix || "";
      const suffix = el.dataset.countSuffix || "";
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const value = target * eased;
        el.textContent = prefix + value.toLocaleString("ru-RU", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }) + suffix;
        if (p < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };

    if (reduced || !("IntersectionObserver" in window)) {
      counters.forEach((el) => {
        el.textContent = (el.dataset.countPrefix || "") +
          parseFloat(el.dataset.count).toLocaleString("ru-RU") +
          (el.dataset.countSuffix || "");
      });
    } else {
      const cio = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          cio.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      counters.forEach((el) => {
        el.textContent = (el.dataset.countPrefix || "") + "0" + (el.dataset.countSuffix || "");
        cio.observe(el);
      });
    }
  }

  /* ---------- 6. HERO-ВИДЕО ---------- */
  const hero = $("#hero");
  const heroVideo = hero && $("video", hero);
  const videoToggle = hero && $(".hero__video-toggle");

  const syncVideoBtn = (playing) => {
    if (!videoToggle) return;
    const label = $(".js-video-label", videoToggle);
    const icon = $(".js-video-icon", videoToggle);
    if (label) label.textContent = playing ? "Пауза" : "Видео";
    if (icon) icon.innerHTML = playing
      ? '<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="1.5" y="1" width="3" height="10" rx="1"/><rect x="7.5" y="1" width="3" height="10" rx="1"/></svg>'
      : '<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 1l8 5-8 5z"/></svg>';
  };

  if (heroVideo) {
    const onFail = () => { if (hero) hero.classList.add("no-video"); if (videoToggle) videoToggle.hidden = true; };
    heroVideo.addEventListener("error", onFail);
    if (heroVideo.networkState === 3) onFail();

    const tryPlay = () => {
      const p = heroVideo.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          /* Автоплей заблокирован (экономия трафика / политика браузера) */
          syncVideoBtn(false);
          if (hero) hero.classList.add("no-video");
        });
      }
    };

    if (reduced) {
      heroVideo.pause();
      heroVideo.removeAttribute("autoplay");
      syncVideoBtn(false);
    } else {
      tryPlay();
      syncVideoBtn(true);
    }

    if (videoToggle) {
      videoToggle.addEventListener("click", () => {
        if (heroVideo.paused) {
          heroVideo.play().then(() => syncVideoBtn(true)).catch(() => syncVideoBtn(false));
        } else {
          heroVideo.pause();
          syncVideoBtn(false);
        }
      });
    }

    /* Не крутим видео во вкладке, которой нет фокуса */
    document.addEventListener("visibilitychange", () => {
      if (reduced) return;
      if (document.hidden && !heroVideo.paused) {
        heroVideo.pause();
        heroVideo.dataset.resume = "1";
      } else if (!document.hidden && heroVideo.dataset.resume) {
        heroVideo.play().catch(() => {});
        delete heroVideo.dataset.resume;
      }
    });
  }

  /* Мягкий параллакс hero */
  const parallax = $("[data-parallax]");
  if (parallax && !reduced && !mobile.matches) {
    let raf = null;
    const move = () => {
      const el = parallax.firstElementChild || parallax;
      el.style.transform = `translate3d(0, ${window.scrollY * 0.12}px, 0) scale(1.02)`;
      raf = null;
    };
    window.addEventListener("scroll", () => { if (!raf) raf = window.requestAnimationFrame(move); }, { passive: true });
  }

  /* ---------- 7. ТАЙМЛАЙН (history.html) ---------- */
  const timeline = $(".timeline");
  if (timeline) {
    const rail = $(".timeline__progress");
    const eras = $$(".era", timeline);

    /* Прогресс-рейка заполняется по мере скролла */
    const updateRail = () => {
      if (!rail) return;
      const rect = timeline.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height;
      const passed = Math.min(Math.max(vh * 0.5 - rect.top, 0), total);
      rail.style.height = (total ? (passed / total) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", updateRail, { passive: true });
    updateRail();

    /* Навигация по эпохам */
    const nav = $(".era-nav");
    if (nav) {
      const items = $$(".era-nav__item", nav);
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          items.forEach((it) => {
            const active = it.getAttribute("href") === "#" + id;
            it.classList.toggle("is-active", active);
            if (active) it.setAttribute("aria-current", "true");
            else it.removeAttribute("aria-current");
          });
        });
      }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });
      eras.forEach((era) => { if (era.id) obs.observe(era); });
    }
  }

  /* ---------- 8. NOW.HTML: ФИЛЬТРЫ ---------- */
  const bento = $(".bento");
  if (bento) {
    const buttons = $$(".filter");
    const cards = $$(".bento__item", bento);
    const counter = $(".js-visible-count");
    const empty = $(".bento-empty");

    const applyFilter = (cat, trigger) => {
      buttons.forEach((b) => {
        const active = b === trigger;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });

      let visible = 0;
      cards.forEach((card) => {
        const match = cat === "all" || (card.dataset.category || "").split(" ").includes(cat);
        card.classList.toggle("is-hidden", !match);
        card.setAttribute("aria-hidden", String(!match));
        if (match) {
          visible += 1;
          if (!reduced) {
            card.animate(
              [{ opacity: 0, transform: "translateY(18px) scale(0.98)" }, { opacity: 1, transform: "none" }],
              { duration: 520, easing: "cubic-bezier(0.22,1,0.36,1)", delay: Math.min(visible * 45, 400), fill: "both" }
            );
          }
        }
      });

      if (counter) counter.textContent = String(visible);
      if (empty) empty.classList.toggle("is-visible", visible === 0);
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => applyFilter(btn.dataset.filter || "all", btn));
    });

    /* Deep-link: now.html?cat=music */
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("cat");
    if (initial) {
      const matchBtn = buttons.find((b) => b.dataset.filter === initial);
      if (matchBtn) applyFilter(initial, matchBtn);
    }
  }

  /* ---------- 9. NOW.HTML: HOVER-ПРЕВЬЮ ВИДЕО ---------- */
  if (bento && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduced) {
    let hoverTimer = null;
    let activeCard = null;

    const stopPreview = (card) => {
      if (!card) return;
      const v = $(".bento__preview-video", card);
      card.classList.remove("is-previewing");
      if (v) { v.pause(); try { v.currentTime = 0; } catch (e) {} }
    };

    $$(".bento__item", bento).forEach((card) => {
      const previewSrc = card.dataset.preview;
      if (!previewSrc) return;

      card.addEventListener("mouseenter", () => {
        hoverTimer = window.setTimeout(() => {
          if (activeCard && activeCard !== card) stopPreview(activeCard);
          let v = $(".bento__preview-video", card);
          if (!v) {
            v = document.createElement("video");
            v.className = "bento__preview-video";
            v.muted = true;
            v.loop = true;
            v.playsInline = true;
            v.setAttribute("playsinline", "");
            v.setAttribute("muted", "");
            v.preload = "none";
            v.setAttribute("aria-hidden", "true");
            card.insertBefore(v, card.querySelector(".bento__content"));
          }
          if (v.getAttribute("src") !== previewSrc) v.setAttribute("src", previewSrc);
          card.classList.add("is-previewing");
          v.play().catch(() => {});
          activeCard = card;
        }, 320);
      });

      const leave = () => {
        window.clearTimeout(hoverTimer);
        if (activeCard === card) {
          stopPreview(card);
          activeCard = null;
        }
      };
      card.addEventListener("mouseleave", leave);
      card.addEventListener("focus", () => card.classList.add("is-focus-visible"));
      card.addEventListener("blur", leave);
    });

    /* Останавливаем превью при скролле — экономия ресурсов */
    window.addEventListener("scroll", () => {
      if (activeCard) { stopPreview(activeCard); activeCard = null; }
    }, { passive: true });
  }

  /* ---------- 10. NOW.HTML: МОДАЛЬНОЕ ОКНО ВИДЕО ---------- */
  const modal = $("#videoModal");
  if (modal && bento) {
    const cards = $$(".bento__item", bento);
    const dialog = $(".modal__dialog", modal);
    const video = $("video", modal);
    const fallback = $(".video-fallback", modal);
    const elCat = $(".js-modal-cat", modal);
    const elTitle = $(".js-modal-title", modal);
    const elDesc = $(".js-modal-desc", modal);
    const elFact = $(".js-modal-fact", modal);
    let current = -1;
    let opener = null;

    const visibleCards = () => cards.filter((c) => !c.classList.contains("is-hidden"));

    const loadCard = (card) => {
      if (!card || !video) return;
      const src = card.dataset.video;
      if (elCat) elCat.textContent = card.dataset.catLabel || "";
      if (elTitle) elTitle.textContent = (card.querySelector("h3") ? card.querySelector("h3").textContent.replace(/\s+/g, " ").trim() : "") || "";
      if (elDesc) elDesc.textContent = card.dataset.desc || "";
      if (elFact) elFact.textContent = card.dataset.fact || "";

      if (fallback) fallback.style.display = "none";
      video.style.display = "";
      if (src) {
        if (video.getAttribute("src") !== src) video.setAttribute("src", src);
        video.play().catch(() => {
          if (fallback) {
            fallback.style.display = "grid";
            fallback.innerHTML = "Видео недоступно офлайн<br>Проверьте соединение и попробуйте снова";
          }
        });
      } else {
        video.pause();
        video.style.display = "none";
        if (fallback) {
          fallback.style.display = "grid";
          fallback.innerHTML = "Видеофрагмент скоро появится<br>Пока — смотрите другие карточки";
        }
      }
    };

    const openModal = (card, index) => {
      opener = card;
      current = index;
      loadCard(card);
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-locked");
      const closeBtn = $(".modal__close", modal);
      if (closeBtn) window.setTimeout(() => closeBtn.focus(), 120);
    };

    const closeModal = () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-locked");
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      if (opener) opener.focus();
      current = -1;
    };

    const step = (dir) => {
      const list = visibleCards();
      if (!list.length) return;
      let idx = list.indexOf(cards[current]);
      idx = (idx + dir + list.length) % list.length;
      const next = list[idx];
      current = cards.indexOf(next);
      loadCard(next);
    };

    cards.forEach((card) => {
      card.addEventListener("click", () => openModal(card, cards.indexOf(card)));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(card, cards.indexOf(card));
        }
      });
    });

    $$("[data-close]", modal).forEach((el) => el.addEventListener("click", closeModal));
    const prevBtn = $("[data-prev]", modal);
    const nextBtn = $("[data-next]", modal);
    if (prevBtn) prevBtn.addEventListener("click", () => step(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => step(1));

    document.addEventListener("keydown", (e) => {
      if (!modal.classList.contains("is-open")) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    });

    /* Фокус-ловушка */
    modal.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focusables = $$("button, [href], video, [tabindex]:not([tabindex='-1'])", modal)
        .filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- 11. ГОД В ФУТЕРЕ ---------- */
  $$(".js-year").forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- 12. КНОПКИ «НАВЕРХ» ---------- */
  $$(".js-to-top").forEach((btn) => {
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));
  });
})();
