# رزرونو — فیچر چت مشتری ↔ رستوران (۲۰۲۶-۰۷-۲۰)

Polling-based (نه WebSocket — سازگار با Vercel serverless). کامل، تست‌شده روی DB زنده.

## دیتابیس (migration 024-chat.sql — اجراشده روی DB زنده)
- `chat_threads`: thread بین user و restaurant، اختیاری لینک به reservation. شمارنده‌ی unread دوطرفه.
- `chat_messages`: پیام‌ها با sender (user/staff)، read_at.
- یکتایی با partial unique index (نه @@unique — به‌خاطر رفتار NULL در Postgres).
- RLS روی هر دو جدول فعال.

## بک‌اند
- `api/src/lib/chat.ts` — منطق مشترک (getOrCreateThread, postMessage, markRead, serializeMessage).
- روت‌های مشتری: `me/chats`, `me/chats/[id]`, `restaurants/[slug]/chat`.
- روت‌های بیزنس: `restaurant/chats`, `restaurant/chats/[id]` (permission: canManageReservations).
- polling با `?after=<iso>` — فقط پیام‌های جدید (کارآمد).

## فرانت
- مشتری: `apps/customer/js/features/chat.js` + دکمه‌ی 💬 در صفحه‌ی رستوران + آیتم «پیام‌ها» در nav + CSS.
- بیزنس: `apps/business/js/chat.js` + view «پیام‌ها» در sidebar + مودال گفتگو + CSS.
- هر دو: optimistic UI، polling ۴ ثانیه‌ای فقط وقتی صفحه باز است.

## تست (روی DB زنده، PASS)
- flow پیام دوطرفه + شمارنده‌ی unread ✅
- منطق read (صفرشدن شمارنده) ✅
- cascade delete (پاک‌شدن پیام‌ها با thread) ✅
- بلاک‌شدن thread عمومی تکراری (partial unique index) ✅

## محدودیت (آگاهانه)
Polling یعنی تأخیر تا ۴ ثانیه — برای چت رستوران کاملاً کافی. اگر بعداً real-time واقعی
لازم شد، فقط لایه‌ی transport عوض می‌شود (منطق `lib/chat.ts` و روت‌ها دست‌نخورده می‌مانند).
