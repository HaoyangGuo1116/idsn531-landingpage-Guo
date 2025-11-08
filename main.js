/* Kiki 横向滚动画廊交互（依赖 jQuery 3.7+） */
$(function () {
  // 顶部滚动进度条（所有页面通用）
  const $progress = $(
    '<div class="scroll-progress" aria-hidden="true"><div class="scroll-progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Scroll progress"></div></div>'
  );
  const $header = $(".site-header");
  if ($header.length) {
    $header.append($progress);
  } else {
    $("body").prepend($progress);
  }

  const $progressBar = $progress.find(".scroll-progress__bar");
  function updateScrollProgress() {
    const doc = document.documentElement;
    const scrollTop = window.pageYOffset || doc.scrollTop || document.body.scrollTop || 0;
    const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
    const pct = Math.min(100, Math.max(0, (scrollTop / max) * 100));
    $progressBar.css("width", pct + "%").attr("aria-valuenow", Math.round(pct));
  }
  $(window).on("scroll resize", updateScrollProgress);
  updateScrollProgress();

  // Back to Top（所有页面通用）
  const $backTop = $(
    '<button class="back-to-top" type="button" aria-label="Back to top" title="Back to top">▲</button>'
  );
  $("body").append($backTop);

  function toggleBackTop() {
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    if ( y > 200 ) {
      $backTop.addClass("show");
    } else {
      $backTop.removeClass("show");
    }
  }
  $(window).on("scroll resize", toggleBackTop);
  toggleBackTop();

  $backTop.on("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // 移动端下拉菜单点击切换
  function setupDropdown() {
    $(".dropdown > .nav-link").off("click.dropdown-mobile");
    if (window.innerWidth <= 768) {
      $(".dropdown > .nav-link").on("click.dropdown-mobile", function(e) {
        e.preventDefault();
        e.stopPropagation();
        const $dropdown = $(this).parent(".dropdown");
        $(".dropdown").not($dropdown).removeClass("active");
        $dropdown.toggleClass("active");
      });
      
      // 点击其他地方关闭下拉菜单
      $(document).off("click.close-dropdown").on("click.close-dropdown", function(e) {
        if (!$(e.target).closest(".dropdown").length) {
          $(".dropdown").removeClass("active");
        }
      });
    } else {
      // 桌面端移除active类
      $(".dropdown").removeClass("active");
    }
  }
  
  // 初始化
  setupDropdown();
  
  // 窗口大小改变时重新设置
  $(window).on("resize", setupDropdown);
});

$(function () {
  // 每个catView独立处理
  $(".catView").each(function () {
    const $container = $(this);
    const $scroller = $container.find(".cat-scroller");

    // 每次滚动的"步长"：80% 视口或至少 240px
    const step = () => Math.max($scroller.width() * 0.8, 240);

    // 左右按钮点击 - 只影响当前容器内的滚动器
    $container.find(".cat-prev").on("click", function () {
      $scroller.animate({ scrollLeft: $scroller.scrollLeft() - step() }, 260);
    });
    $container.find(".cat-next").on("click", function () {
      $scroller.animate({ scrollLeft: $scroller.scrollLeft() + step() }, 260);
    });

    // 键盘左右键：在 scroller 聚焦时也能滚动（无障碍增强）
    $scroller.on("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        $scroller.animate({ scrollLeft: $scroller.scrollLeft() - step() }, 200);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        $scroller.animate({ scrollLeft: $scroller.scrollLeft() + step() }, 200);
      }
    });

    // 桌面端：把垂直滚轮意图转为横向滚动（体验增强）
    $scroller.on("wheel", function (e) {
      const ev = e.originalEvent;
      // 仅当纵向滚动量明显大于横向时拦截，避免和触控板自然横滑冲突
      if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) {
        e.preventDefault();
        this.scrollLeft += ev.deltaY;
      }
    });
  });

  // 仅在 gallery 页面启用"丝滑连续"自动滚动（requestAnimationFrame）
  const isGallery = /gallery\.html$/i.test(window.location.pathname);
  if (isGallery) {
    $(".catView.cat-auto .cat-scroller").each(function () {
      const $one = $(this);
      const container = $one.closest(".catView.cat-auto");
      const el = this;

      // 检测滚动方向：cat section从右向左，travel section从左向右
      const sectionId = container.closest("section").attr("id");
      const isReverse = sectionId === "cat"; // cat从右向左（反向），travel从左向右（正向）

      // 克隆内容（每个滚动容器只处理一次）
      if (!$one.data("cloned")) {
        const cloned = $one.children().clone(true);
        $one.append(cloned);
        $one.data("cloned", true);
      }

      let originalWidth = 0;
      let running = false;
      let lastTs = 0;
      const speedPxPerSec = 40;
      
      // 等待所有图片加载完成
      function waitForImages(callback) {
        const $images = $one.find('img');
        let loadedCount = 0;
        const totalImages = $images.length;
        
        if (totalImages === 0) {
          callback();
          return;
        }
        
        $images.each(function() {
          const img = this;
          if (img.complete) {
            loadedCount++;
            if (loadedCount === totalImages) {
              callback();
            }
          } else {
            $(img).on('load error', function() {
              loadedCount++;
              if (loadedCount === totalImages) {
                callback();
              }
            });
          }
        });
      }
      
      function computeOriginalWidth(callback) {
        // 强制重新计算布局
        el.scrollLeft = 0;
        // 等待一帧确保布局已更新
        requestAnimationFrame(function() {
          const newWidth = el.scrollWidth / 2;
          if (newWidth > 0) {
            originalWidth = newWidth;
            // 反向滚动需要从originalWidth位置开始
            if (isReverse) {
              el.scrollLeft = originalWidth;
            } else {
              el.scrollLeft = 0;
            }
            if (callback) callback();
          }
        });
      }
      
      function rafLoop(ts) {
        if (!running) return;
        if (originalWidth === 0) {
          // 如果宽度还未计算，尝试重新计算
          computeOriginalWidth();
          requestAnimationFrame(rafLoop);
          return;
        }
        if (!lastTs) lastTs = ts;
        const dt = (ts - lastTs) / 1000;
        lastTs = ts;

        if (isReverse) {
          // 从右向左滚动：scrollLeft从originalWidth开始向0递减
          // 这样视觉上图片从右边向左移动
          el.scrollLeft -= speedPxPerSec * dt;
          if (el.scrollLeft <= 0) {
            el.scrollLeft = originalWidth;
          }
        } else {
          // 从左向右滚动：scrollLeft从0开始向originalWidth递增
          el.scrollLeft += speedPxPerSec * dt;
          if (el.scrollLeft >= originalWidth) {
            el.scrollLeft -= originalWidth;
          }
        }
        requestAnimationFrame(rafLoop);
      }
      
      function start() {
        if (!running) {
          running = true;
          lastTs = 0;
          requestAnimationFrame(rafLoop);
        }
      }
      
      function stop() {
        running = false;
      }

      // 初始化滚动：等待图片加载完成后再启动
      function initScrolling() {
        waitForImages(function() {
          // 图片加载完成后，计算宽度并启动滚动
          computeOriginalWidth(function() {
            // 宽度计算完成后，再等待一帧确保布局稳定
            requestAnimationFrame(function() {
              if (originalWidth > 0 && !running) {
                start();
              }
            });
          });
        });
      }
      
      // 立即开始初始化过程
      initScrolling();
      
      // 如果图片加载较慢，额外的延迟保障
      setTimeout(function() {
        if (originalWidth === 0 || !running) {
          initScrolling();
        }
      }, 1000);
      
      $(window).on("resize", function() {
        const wasRunning = running;
        stop();
        computeOriginalWidth(function() {
          if (wasRunning && originalWidth > 0) {
            setTimeout(function() {
              start();
            }, 100);
          }
        });
      });
      
      // 悬停/聚焦暂停
      container.on("mouseenter focusin", stop);
      container.on("mouseleave focusout", function() {
        // 恢复滚动
        if (originalWidth > 0) {
          start();
        }
      });
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          stop();
        } else if (originalWidth > 0) {
          start();
        }
      });
    });
  }
});

// Bio 卡片展开/收起
$(function () {
  $(document).on("click", ".bio-card .more-btn", function () {
    const $card = $(this).closest(".bio-card");
    const expanded = $card.hasClass("expanded");
    if (expanded) {
      $card.removeClass("expanded").attr("aria-expanded", "false");
      $(this).text("More").attr("aria-label", "Expand");
    } else {
      $card.addClass("expanded").attr("aria-expanded", "true");
      $(this).text("Less").attr("aria-label", "Collapse");
    }
  });
});

/* ============================
 * Contact 实时校验（jQuery 3.7+）
 * 规则：
 *  - name：>= 2 字符
 *  - contact-method：必选
 *  - phone：必须为 10~15 位数字
 *  - email：当联系方法为 email 时必填且格式正确；否则若填写也需合法
 *  - subject：非空
 *  - message：>= 10 字符
 * 提交：若不通过则阻止提交并聚焦到第一个错误项；通过则交给表单 action 处理
 * ============================ */
/* main.js — Contact 实时校验（jQuery 3.7+） */
$(function () {
  const $form = $(".form-card");
  const $name = $("#name");
  const $method = $("#contact-method");
  const $phone = $("#phone");
  const $email = $("#email");
  const $subject = $("#subject");
  const $message = $("#message");
  const $submit = $("#submitBtn");
  const $live = $("#form-live");

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRe = /^\d{10,15}$/;

  // 记录用户是否“触碰过”该字段
  const touched = {
    name: false,
    contact: false,
    phone: false,
    email: false,
    subject: false,
    message: false,
  };

  function setState($el, ok, msg, hintId, showNow) {
    // 只在 showNow 为真时才加红/绿（即：触碰过 或 提交时）
    if (showNow) {
      $el.toggleClass("is-valid", ok);
      $el.toggleClass("is-invalid", !ok);
      $("#" + hintId).text(msg || "");
    } else {
      // 静默检查：不改变现有提示与样式，避免把刚展示的提示清空
    }
  }

  // —— 各字段校验 —— //
  function checkName(show) {
    const ok = $name.val().trim().length >= 2;
    setState(
      $name,
      ok,
      ok ? "Name looks good." : "Name must be at least 2 characters.",
      "name-hint",
      show
    );
    return ok;
  }
  function checkMethod(show) {
    const ok = !!$method.val();
    setState(
      $method,
      ok,
      ok ? "Contact method selected." : "Please choose a preferred contact method.",
      "contact-method-hint",
      show
    );
    return ok;
  }
  function checkPhone(show) {
    const raw = $phone.val();
    const digitsOnly = (raw || "").replace(/\D/g, "");
    const ok = /^\d{10,15}$/.test(digitsOnly);
    setState(
      $phone,
      ok,
      ok ? "Phone number looks valid." : "Phone must be 10–15 digits (numbers only).",
      "phone-hint",
      show
    );
    return ok;
  }
  function checkEmail(show) {
    const v = $email.val().trim();
    const requireEmail = $method.val() === "email";
    const ok = requireEmail ? emailRe.test(v) : (!v || emailRe.test(v));
    const msg = ok
      ? (v ? "Valid email address." : (requireEmail ? "Valid email address." : ""))
      : (requireEmail ? "Email is required and must be valid." : "Please enter a valid email address.");
    setState(
      $email,
      ok,
      msg,
      "email-hint",
      show
    );
    return ok;
  }
  function checkSubject(show) {
    const ok = $subject.val().trim().length > 0;
    setState(
      $subject,
      ok,
      ok ? "Subject looks good." : "Subject is required.",
      "subject-hint",
      show
    );
    return ok;
  }
  function checkMessage(show) {
    const ok = $message.val().trim().length >= 10;
    setState(
      $message,
      ok,
      ok ? "Message length looks good." : "Message should be at least 10 characters.",
      "message-hint",
      show
    );
    return ok;
  }

  // 统一更新提交按钮（不强行显示红色）
  function updateSubmit() {
    const allOk =
      checkName(false) &&
      checkMethod(false) &&
      checkPhone(false) &&
      checkEmail(false) &&
      checkSubject(false) &&
      checkMessage(false);
    $submit.prop("disabled", !allOk);
  }

  // —— 交互绑定：首次“触碰”后才显示红色 —— //
  $name.on("input blur", function () {
    touched.name = true;
    checkName(true);
    updateSubmit();
  });
  $method.on("change blur", function () {
    touched.contact = true;
    checkMethod(true);
    updateSubmit();
  });
  $phone.on("input blur", function () {
    // 实时清理非数字字符，避免因为破折号/空格等导致误判
    const v = $phone.val();
    const cleaned = (v || "").replace(/\D/g, "");
    if (v !== cleaned) $phone.val(cleaned);
    touched.phone = true;
    checkPhone(true);
    updateSubmit();
  });
  $email.on("input blur", function () {
    touched.email = true;
    checkEmail(true);
    updateSubmit();
  });
  $subject.on("input blur", function () {
    touched.subject = true;
    checkSubject(true);
    updateSubmit();
  });
  $message.on("input blur", function () {
    touched.message = true;
    checkMessage(true);
    updateSubmit();
  });

  // 初始：按钮按是否可提交决定启用，但不标红
  updateSubmit();

  // 提交：对所有字段“强制显示”校验；若有错，阻止并聚焦第一个错误
  $form.on("submit", function (e) {
    const ok =
      checkName(true) &
      checkMethod(true) &
      checkPhone(true) &
      checkEmail(true) &
      checkSubject(true) &
      checkMessage(true);

    if (!ok) {
      e.preventDefault();
      const $firstErr = $(".is-invalid").first();
      if ($firstErr.length) $firstErr.focus();
      $live.text("Please correct the highlighted fields before submitting.");
    }
  });
});
