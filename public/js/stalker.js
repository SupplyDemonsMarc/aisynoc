(function () {
  const form = document.getElementById("stForm");
  const resultBox = document.getElementById("stResult");
  const submitBtn = document.getElementById("stSubmitBtn");
  const targetInput = document.getElementById("targetInput");
  const targetLabel = document.getElementById("targetLabel");

  const LABELS = {
    tiktok: { label: "Username TikTok", placeholder: "mis. timothyronaldd" },
    whatsapp: { label: "Nomor WhatsApp", placeholder: "mis. 6281234567890" },
    instagram: { label: "Username Instagram", placeholder: "mis. timothyronaldd" }
  };

  form.querySelectorAll('input[name="platform"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const cfg = LABELS[radio.value];
      targetLabel.textContent = cfg.label;
      targetInput.placeholder = cfg.placeholder;
    });
  });

  function updateUsage(usage) {
    if (!usage) return;
    const usedEl = document.getElementById("usageUsed");
    const limitEl = document.getElementById("usageLimit");
    const pill = document.getElementById("usagePill");
    if (usedEl) usedEl.textContent = usage.used;
    if (limitEl) limitEl.textContent = usage.limit >= 999999 ? "∞" : usage.limit;
    if (pill && usage.remaining <= 0) pill.classList.add("limit-hit");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const platform = form.querySelector('input[name="platform"]:checked').value;
    const target = targetInput.value.trim();
    if (!target) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Mencari...";
    resultBox.innerHTML = `<div class="result-box" style="text-align:center; color:var(--text-muted);">Menelusuri profil, tunggu sebentar...</div>`;

    try {
      const res = await fetch("/stalker/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, target })
      });
      const data = await res.json();
      updateUsage(data.usage);

      if (!data.ok) {
        resultBox.innerHTML = `<div class="alert alert-error" style="margin-top:18px;">${data.error}</div>`;
      } else {
        renderResultCard(resultBox, data.data);
      }
    } catch (err) {
      resultBox.innerHTML = `<div class="alert alert-error" style="margin-top:18px;">Gagal terhubung ke server.</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Cari Profil";
    }
  });
})();
        
