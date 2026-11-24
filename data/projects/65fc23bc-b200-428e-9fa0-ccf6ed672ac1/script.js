// Script Interativo Vanilla JS (Sem dependências, offline-ready)
document.addEventListener("DOMContentLoaded", () => {
  // 1. Accordion
  document.querySelectorAll(".acc-header").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      const isOpen = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });

  // 2. Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const parent = btn.closest(".block-tabs");
      const targetId = btn.getAttribute("data-tab-target");
      parent.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      parent.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPane = parent.querySelector("#" + targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // 3. Quiz Interativo
  document.querySelectorAll(".block-quiz").forEach(quiz => {
    const opts = quiz.querySelectorAll(".quiz-opt");
    const feedback = quiz.querySelector(".quiz-feedback");
    const explanation = quiz.querySelector(".quiz-explanation");

    opts.forEach(btn => {
      btn.addEventListener("click", () => {
        opts.forEach(b => b.classList.remove("selected-correct", "selected-wrong"));
        const isCorrect = btn.getAttribute("data-correct") === "true";
        if (isCorrect) {
          btn.classList.add("selected-correct");
          feedback.textContent = "✅ Parabéns, resposta correta!";
          feedback.style.color = "#15803d";
        } else {
          btn.classList.add("selected-wrong");
          feedback.textContent = "❌ Resposta incorreta. Tente novamente!";
          feedback.style.color = "#b91c1c";
        }
        if (explanation) explanation.classList.remove("hidden");
      });
    });
  });

  // 4. Modal de Zoom de Imagens
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("modal-image");
  const modalCaption = document.getElementById("modal-caption");
  const closeBtn = document.getElementById("modal-close-btn");

  document.querySelectorAll(".block-image img.can-zoom").forEach(img => {
    img.addEventListener("click", () => {
      if (modal && modalImg) {
        modalImg.src = img.src;
        if (modalCaption) modalCaption.textContent = img.getAttribute("data-caption") || img.alt || "";
        modal.classList.add("active");
      }
    });
  });

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  // 5. Alternar Tema Claro/Escuro
  const themeBtn = document.getElementById("btn-theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
    });
  }

  // 6. Imprimir
  const printBtn = document.getElementById("btn-print");
  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }
});
