/* eslint-disable no-empty -- storage access can be blocked by browser policy */
(() => {
        const $ = (id) => document.getElementById(id);
        const storageKey = "roma320.labelsHidden.v1";
        let labelsHidden = false, uiHidden = false;
        try { labelsHidden = localStorage.getItem(storageKey) === "true"; } catch {}
        function apply() {
          document.body.classList.toggle("labels-hidden", labelsHidden);
          document.body.classList.toggle("ui-hidden", uiHidden);
          $("toggle-labels").setAttribute("aria-pressed", String(!labelsHidden));
          $("labels-toggle-text").textContent = labelsHidden ? "地名を表示" : "地名を隠す";
          $("toggle-ui").setAttribute("aria-pressed", String(uiHidden));
          $("ui-toggle-text").textContent = uiHidden ? "UIを戻す" : "UIを隠す";
          // Only the UI restore control remains in clean view; label preference is preserved.
          $("toggle-labels").hidden = uiHidden;
          window.dispatchEvent(new CustomEvent("roma-display-change"));
        }
        function toggleLabels() {
          labelsHidden = !labelsHidden;
          try { localStorage.setItem(storageKey, String(labelsHidden)); } catch {}
          apply();
        }
        function toggleUI() { uiHidden = !uiHidden; apply(); }
        $("toggle-labels").addEventListener("click", toggleLabels);
        $("toggle-ui").addEventListener("click", toggleUI);
        window.addEventListener("keydown", (event) => {
          if (event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
              event.target?.isContentEditable || event.target?.closest?.("input,textarea,select") ||
              $("source-dialog").open || $("discover-dialog").open) return;
          const key = event.key.toLowerCase();
          if (key === "l" && !uiHidden) { event.preventDefault(); toggleLabels(); }
          if (key === "h") { event.preventDefault(); toggleUI(); }
          if (key === "escape" && uiHidden) { uiHidden = false; apply(); }
        });
        apply();
      })();

window.romaLoadFailure = function (message) {
        document.getElementById("load-error").hidden = false;
        document.getElementById("load-error").textContent = message;
        document.getElementById("retry").hidden = false;
        document.querySelector(".loading-line").hidden = true;
        document.getElementById("load-detail").hidden = true;
      };
      window.addEventListener("error", function (e) {
        if (!window.romaReady && e.message)
          window.romaLoadFailure("描画を開始できませんでした。\n" + e.message);
      });
      window.addEventListener("unhandledrejection", function (e) {
        if (!window.romaReady)
          window.romaLoadFailure(
            "ライブラリまたは3D描画の読み込みに失敗しました。\nネットワーク接続とWebGL 2の利用可否をご確認ください。\n" +
              (e.reason?.message || e.reason),
          );
      });
      window.romaLoadTimer = setTimeout(function () {
        if (!window.romaReady)
          window.romaLoadFailure(
            "読み込みに時間がかかっています。WebGL 2が有効か確認して再読み込みしてください。",
          );
      }, 60000);
