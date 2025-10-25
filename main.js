/* Kiki 横向滚动画廊交互（依赖 jQuery 3.7+） */
$(function () {
  const $scroller = $(".catView .cat-scroller");

  // 每次滚动的“步长”：80% 视口或至少 240px
  const step = () => Math.max($scroller.width() * 0.8, 240);

  // 左右按钮点击
  $(".catView .cat-prev").on("click", function () {
    $scroller.animate({ scrollLeft: $scroller.scrollLeft() - step() }, 260);
  });
  $(".catView .cat-next").on("click", function () {
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
$(function () {
  const $form = $("#contactForm");
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

  function hint(id) {
    return $("#" + id);
  }

  function setState($el, ok, msg, hintId) {
    $el.toggleClass("is-valid", ok);
    $el.toggleClass("is-invalid", !ok);
    hint(hintId).text(msg || "");
    if (msg) $live.text(msg);
  }

  function valName() {
    const v = $name.val().trim();
    const ok = v.length >= 2;
    setState(
      $name,
      ok,
      ok ? "" : "Name must be at least 2 characters.",
      "name-hint"
    );
    return ok;
  }

  function valMethod() {
    const ok = !!$method.val();
    setState(
      $method,
      ok,
      ok ? "" : "Please choose a preferred contact method.",
      "contact-method-hint"
    );
    return ok;
  }

  function valPhone() {
    const v = $phone.val().trim();
    const ok = phoneRe.test(v);
    setState(
      $phone,
      ok,
      ok ? "" : "Phone must be 10–15 digits (numbers only).",
      "phone-hint"
    );
    return ok;
  }

  function valEmail() {
    const method = $method.val();
    const v = $email.val().trim();

    if (method === "email") {
      const ok = emailRe.test(v);
      setState(
        $email,
        ok,
        ok ? "" : "Email is required and must be valid when method is Email.",
        "email-hint"
      );
      return ok;
    } else {
      // 非 email 方式：若用户填写了邮箱，也要校验格式；未填不报错
      if (v === "") {
        setState($email, true, "", "email-hint");
        return true;
      }
      const ok = emailRe.test(v);
      setState(
        $email,
        ok,
        ok ? "" : "Please enter a valid email address.",
        "email-hint"
      );
      return ok;
    }
  }

  function valSubject() {
    const v = $subject.val().trim();
    const ok = v.length > 0;
    setState($subject, ok, ok ? "" : "Subject is required.", "subject-hint");
    return ok;
  }

  function valMessage() {
    const v = $message.val().trim();
    const ok = v.length >= 10;
    setState(
      $message,
      ok,
      ok ? "" : "Message should be at least 10 characters.",
      "message-hint"
    );
    return ok;
  }

  function updateSubmit() {
    // 用位与 & 确保每一项都执行（不短路），同步刷新状态
    const allOk =
      valName() &
      valMethod() &
      valPhone() &
      valEmail() &
      valSubject() &
      valMessage();
    $submit.prop("disabled", !allOk);
    return !!allOk;
  }

  // 交互绑定：输入与失焦时校验；选择变化时重校验
  $name.on("input blur", updateSubmit);
  $method.on("change blur", function () {
    valMethod(); // 先校验选择
    valEmail(); // 方式变化时重新审查 email 是否必须
    updateSubmit();
  });
  $phone.on("input blur", updateSubmit);
  $email.on("input blur", updateSubmit);
  $subject.on("input blur", updateSubmit);
  $message.on("input blur", updateSubmit);

  // 初始化按钮状态
  updateSubmit();

  // 提交前拦截无效情况，定位第一个错误字段
  $form.on("submit", function (e) {
    if (!updateSubmit()) {
      e.preventDefault();
      const $firstErr = $(".is-invalid").first();
      if ($firstErr.length) {
        $firstErr.focus();
      }
      $live.text("Please correct the highlighted fields before submitting.");
    }
    // 通过时不阻止提交，继续跳转 thankyou.html
  });
});
