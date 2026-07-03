(function () {
  const form = document.getElementById("dlForm");
  const resultBox = document.getElementById("dlResult");
  const submitBtn = document.getElementById("dlSubmitBtn");

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
    const url = document.getElementById("urlInput").value.trim();
    if (!url) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Memproses...";
    resultBox.innerHTML = `<div class="result-box" style="text-align:center; color:var(--text-muted);">Mengambil data video, tunggu sebentar...</div>`;

    try {
      const res = await fetch("/downloader/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, url })
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
      submitBtn.textContent = "Proses Video";
    }
  });
})();
