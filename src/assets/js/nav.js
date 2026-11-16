(function () {
  const header = document.querySelector("header.top");
  const button = document.getElementById("nav-toggle");
  const menu = document.getElementById("site-menu");
  if (!header || !button || !menu) return;

  const setOpen = (open) => {
    header.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) menu.removeAttribute("inert");
    else menu.setAttribute("inert", "");
  };

  setOpen(false);

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", (event) => {
    if (button.getAttribute("aria-expanded") !== "true") return;
    if (!header.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (button.getAttribute("aria-expanded") !== "true") return;
    setOpen(false);
    button.focus();
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
})();
