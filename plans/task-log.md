# Task Log - Note Timer Plugin

<!-- Next Session: 2 | Next Task: 3 -->

## Session 1 | 2026-05-24 13:19 - 14:38

### Task #1: Plugin Enhancement & Refactoring

**Time:** 13:19 - 14:38 (79 phút)
**Status:** done

---

## Context

### Problem
Plugin note-timer ban đầu có nhiều tính năng nhưng logic phức tạp và không phù hợp với workflow "1 task = 1 session". User đang dùng Templater template đơn giản hơn và muốn so sánh/cải tiến plugin.

### Brainstorm & Decisions

#### 1. So sánh Plugin vs Templater
**Câu hỏi:** Plugin có ưu điểm gì so với Templater template?

**Phân tích:**
| Tiêu chí | Plugin | Templater |
|----------|--------|-----------|
| Start timer | 1 click/hotkey | Phải tự gõ start_time |
| Nhiều session | Cộng dồn timed | Chỉ tính 1 session |
| Extra time | Có modal | Không có |
| Time Log | Auto append | Không có |
| UI | Ribbon icons, buttons | Không có |

**Kết luận:** Plugin mạnh hơn cho time tracking nghiêm túc.

#### 2. Thiếu `done?` property
**Câu hỏi:** Plugin thiếu gì so với Templater?

**Phát hiện:** Templater template có `done? = true` khi stop, plugin không có.

**Giải pháp:** Thêm `doneProp` setting + auto set `done? = true` khi stop.

#### 3. Logic Start/Stop nhiều lần
**Câu hỏi:** Nếu user Start → Stop → Start → Stop, logic nào hợp lý?

**Options đã xem xét:**
- Option A: Block khi đang chạy
- Option B: Auto stop cũ, start mới
- Option C: Ghi đè (hiện tại)

**Brainstorm insight:** User cho rằng "Task lớn thì nên chia nhỏ" → 1 task = 1 session là hợp lý.

**Quyết định:** 
- Khi Start mà đã có `start_time` → hiện modal hỏi Restart/Continue
- Khi Stop mà đã có `end_time` → hiện modal hỏi Recalculate/Dismiss
- Căn cứ vào `end_time` thay vì `done?` để check trạng thái

#### 4. Logic tính toán elapsed time
**Câu hỏi:** Stop lấy dữ liệu từ đâu để tính?

**Vấn đề phát hiện:** 
- Code cũ: `elapsed = Date.now() - start_time` → sai nếu Recalculate
- Nếu đã có `end_time`, nên dùng nó thay vì `Date.now()`

**Giải pháp:** 
```js
endTime = end_time property || Date.now()
elapsed = endTime - start_time
```

#### 5. Bỏ Time Log
**Câu hỏi:** Còn cần Time Log không?

**Reasoning:** Vì giờ chỉ còn 1 session/task, Time Log không còn ý nghĩa.

**Quyết định:** Bỏ:
- `appendLog` setting
- `appendSessionLog` method
- Log button
- Reason field trong AddExtraModal

**Giữ lại:** `logNow` (chèn timestamp) vì user vẫn cần.

#### 6. UI Modal iOS-style
**Câu hỏi:** Làm sao style modal giống iOS?

**Iterations:**
1. Lần 1: Buttons xếp dọc → User: "xấu"
2. Lần 2: Buttons ngang với border → User: "còn border, button quá rộng"
3. Lần 3: Tham khảo iOS reference → buttons ngang, text-only, right-aligned
4. Lần 4: Fix selector `.modal:has(.timer-modal)` thay vì `.modal-content`
5. Lần 5: Thêm icon, tăng padding, border-radius 24px, bỏ close button

**CSS Debug insight:** Dùng DevTools Obsidian (`Cmd+Option+I`) để inspect và thử CSS trực tiếp.

**Selector issue:** 
- Sai: `.modal:has(.timer-modal) .modal-content { width: 300px }` → target sai element
- Đúng: `.modal:has(.timer-modal) { width: 300px }` → target `.modal` trực tiếp

#### 7. AddExtraModal redesign
**Vấn đề:** AddExtraModal dùng Obsidian Setting component, không match iOS style.

**Giải pháp:** Redesign với custom input, icon, và iOS-style buttons.

#### 8. Log Now format
**Câu hỏi:** Làm sao tùy chỉnh format? Làm sao xuống hàng?

**Giải pháp:**
- Thêm `logNowFormat` setting với tokens: `YYYY`, `MM`, `DD`, `HH`, `mm`
- Thêm `\n` support: `.replace(/\\n/g, "\n")`

---

## Changes Made

### Code Changes
1. Thêm `doneProp` setting + auto set `done? = true` khi stop
2. Thêm ConfirmRestartModal khi Start mà đã có `start_time`
3. Thêm ConfirmRestopModal khi Stop mà đã có `end_time`
4. Sửa logic tính elapsed: dùng `end_time` nếu có
5. Đổi `totaltime` → `total_time` (snake_case consistent)
6. Bỏ Time Log feature (appendLog, appendSessionLog, Log button)
7. Giữ lại logNow với format setting
8. Thêm `\n` support trong logNowFormat

### UI Changes
1. iOS-style modals: border-radius 24px, shadow nhẹ, bỏ close button
2. Icon + text layout (icon trái, text phải)
3. Buttons: text-only, right-aligned, hover state subtle
4. AddExtraModal: custom input với border-radius 12px, focus state xanh
5. Button labels: "Replace" → "Recalculate", "Keep" → "Dismiss"

### Files Modified
- `src/main.ts` - logic + UI
- `styles.css` - iOS-style modal CSS

---

## Lessons Learned

1. **CSS Selector specificity:** Obsidian modal structure là `.modal > .modal-content`. Target đúng element khi set width/height.

2. **DevTools debugging:** `Cmd+Option+I` trong Obsidian để inspect + live edit CSS.

3. **Workflow design:** "1 task = 1 session" đơn giản hóa logic đáng kể. Task lớn nên chia nhỏ thay vì track nhiều session.

4. **Property-based logic:** Căn cứ vào frontmatter properties (`end_time`) thay vì derived state (`done?`) để check trạng thái.

5. **iOS design patterns:** 
   - Buttons text-only, không border
   - Primary action bên phải, màu xanh
   - Secondary action bên trái, màu xám
   - Icon + text horizontal layout

6. **Feature removal:** Khi workflow thay đổi (1 session), mạnh dạn bỏ features không còn phù hợp (Time Log) nhưng giữ những phần vẫn hữu ích (logNow).

---

### Task #2: Fix Recalculate không cập nhật end_time

**Time:** 14:44 - 14:46 (2 phút)
**Status:** done

**Problem:** Khi bấm Recalculate, `end_time` vẫn giữ giá trị cũ (14:05) thay vì cập nhật thành thời gian hiện tại (14:43).

**Root cause:** Logic `doStopTimer` ưu tiên dùng `end_time` cũ nếu đã tồn tại:
```js
const endTime = endStr ? this.parseDateTime(endStr) : Date.now();
if (!endStr) { fm[endtimeProp] = now; }
```

**Fix:** Thêm param `forceNow` để Recalculate luôn dùng `Date.now()`:
```js
async doStopTimer(file: TFile, forceNow = false) {
  const endTime = (!forceNow && endStr) ? parseDateTime(endStr) : Date.now();
  if (!endStr || forceNow) { fm[endtimeProp] = now; }
}
```

**Lesson:** Phân biệt 2 use cases:
- Stop lần đầu: set end_time mới
- Recalculate: override end_time cũ với thời gian hiện tại
