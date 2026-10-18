/* Runs before first paint (loaded as a blocking external script because the CSP forbids inline scripts).
   Light is the default and the system colour scheme is deliberately ignored. */
(function () {
  var theme = "light";
  try {
    var saved = localStorage.getItem("cv-theme");
    if (saved === "dark" || saved === "light") theme = saved;
  } catch (e) { /* storage blocked: keep light */ }
  var root = document.documentElement;
  root.setAttribute("data-theme", theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0a1318" : "#e3ecf0");
})();
