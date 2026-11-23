(function () {
  "use strict";

  var toggle = document.getElementById("nav-toggle");
  var burger = document.querySelector(".burger");
  var nav = document.querySelector(".site-nav");

  var updateNav = function () {
    if (!nav) return;
    var open = toggle && toggle.checked;
    nav.classList.toggle("is-solid", open || window.scrollY > 8);
  };

  if (toggle && burger) {
    var syncMenu = function () {
      burger.setAttribute("aria-expanded", toggle.checked ? "true" : "false");
      updateNav();
    };

    syncMenu();
    toggle.addEventListener("change", syncMenu);

    document.querySelectorAll(".nav-links a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (!toggle.checked) return;
        toggle.checked = false;
        syncMenu();
      });
    });

    document.addEventListener("click", function (event) {
      if (!toggle.checked) return;
      if (event.target.closest(".site-nav")) return;
      toggle.checked = false;
      syncMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !toggle.checked) return;
      toggle.checked = false;
      syncMenu();
    });
  }

  updateNav();
  window.addEventListener("scroll", updateNav, { passive: true });

  var dock = document.querySelector(".dock");
  var heroPeople = document.getElementById("hero-people");
  var contacts = document.getElementById("contacts");

  if (dock && heroPeople && contacts) {
    var frame = 0;

    var updateDock = function () {
      frame = 0;
      var heroBox = heroPeople.getBoundingClientRect();
      var contactsBox = contacts.getBoundingClientRect();
      var heroVisible = heroBox.bottom > 72;
      var contactsVisible = contactsBox.top < window.innerHeight - 48 && contactsBox.bottom > 72;
      var show = !heroVisible && !contactsVisible;
      dock.classList.toggle("is-on", show);
      if ("inert" in dock) dock.inert = !show;
    };

    var requestDock = function () {
      if (frame) return;
      frame = window.requestAnimationFrame(updateDock);
    };

    updateDock();
    window.addEventListener("scroll", requestDock, { passive: true });
    window.addEventListener("resize", requestDock);
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  var nodes = document.querySelectorAll(".reveal");
  if (!nodes.length) return;

  var fold = window.innerHeight * 0.92;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: "0px 0px -10% 0px" });

  nodes.forEach(function (node) {
    if (node.getBoundingClientRect().top < fold) return;
    node.classList.add("wait");
    observer.observe(node);
  });
})();
