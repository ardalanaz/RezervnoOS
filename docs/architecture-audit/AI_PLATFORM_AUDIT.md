# AI_PLATFORM_AUDIT — رزرونو

> ممیزیِ لایه‌ی «هوش/AI». مبتنی بر خواندنِ واقعیِ کد. تاریخ: ۲۰۲۶-۰۷-۳۰.
> مکملِ `docs/INTELLIGENCE-PLATFORM-ARCHITECTURE.md`.

---

## ۰) حکمِ صادقانه
آن‌چه امروز «AI» نامیده می‌شود، در واقع **موتورهای heuristic/آماریِ مبتنی بر قاعده** است — نه مدلِ
یادگیریِ ماشینِ آموزش‌دیده. این برای مقیاسِ فعلی **آگاهانه و منطقی** است (بدونِ نیازِ ML-infra)، ولی
اگر هدفِ محصول «AI واقعی» است، این یک **شکافِ قابلیت** است، نه باگ.

**نمره‌ی بلوغِ AI: ۵.۵ / ۱۰** (heuristicهای خوب، بدونِ لایه‌ی مدل).

## ۱) آن‌چه هست (با شواهد)
- **No-show risk** (`lib/customer-insights.ts`): امتیازدهیِ heuristicِ وزن‌دار — پایه بر نرخِ no-show
  تاریخی + lead-time + party-size + source؛ خروجی `{score, tier: low/medium/high}`. کامنتِ خودِ کد:
  «بدونِ نیاز به ML infra: مدل امتیازدهی heuristic». تزریق‌پذیر (DIP) در موتورِ رزرو.
- **RFM** (`lib/rfm.ts`): محاسبه‌ی Recency/Frequency/Monetary با **SQL خالص** (window functions/ntile)،
  ذخیره در ستون‌های `r_score/f_score/m_score`. آماری، نه ML.
- **Fraud signals** (`lib/fraud.ts`): قواعدِ ساده (سیگنال‌های سوءاستفاده). rule-based.
- **توصیه‌ی «هوشمند»** (اپ مشتری، AI-strip): در حالِ حاضر متنِ نمونه‌ی hard-coded (به FULLSTACK §۸) —
  موتورِ توصیه‌ی شخصیِ واقعی وجود ندارد.

## ۲) آن‌چه نیست (شکاف‌ها نسبت به «AI Platform»)
| مؤلفه | وضعیت |
|-------|-------|
| Inference/Serving layer | ندارد (توابعِ محلی) |
| Prompt management / LLM | ندارد |
| Embeddings / بردار | ندارد |
| Recommendation engine (شخصی) | ندارد (heuristic top-rated) |
| Feature engineering pipeline | جزئی (RFM/no-show inputs)، نه سیستماتیک |
| Training data / training pipeline | ندارد (بدونِ مدل) |
| Model versioning / registry | ندارد |
| Feedback loop | ندارد (خروجی مصرف می‌شود، بازخورد بازآموزش نمی‌شود) |
| Explainability | تا حدی (score قابلِ‌ردیابی چون قاعده‌محور است) — نقطه‌ی قوتِ heuristic |
| Isolation | خوب (منطق در `lib/*` جدا، تزریق‌پذیر) |

## ۳) قوت‌ها
- منطق **منزوی و تزریق‌پذیر** (پورت `NoShowPredictor`) → جایگزینیِ آینده با مدلِ واقعی آسان است.
- **توضیح‌پذیریِ ذاتی** (قاعده‌محور) — برخلافِ جعبه‌سیاهِ ML.
- بدونِ داده‌ی جعلی: خروجی از دیتای واقعیِ رزرو/بازدید مشتق می‌شود.

## ۴) توصیه‌ها (evidence-based، بدونِ over-engineering)
| # | توصیه | شدت | پیچیدگی |
|---|-------|-----|---------|
| AI1 | اتصالِ AI-stripِ اپ مشتری به یک endpointِ توصیه (حتی heuristicِ سروری) یا حالتِ خالیِ صادقانه | متوسط | کم |
| AI2 | اگر «AI واقعی» هدف است: افزودنِ لایه‌ی inference جدا + model-registry + feedback (به‌تدریج) | متوسط | بالا |
| AI3 | سیستماتیک‌کردنِ feature engineering (منبعِ واحدِ ویژگی‌ها برای no-show/rfm/توصیه) | پایین | متوسط |
| AI4 | نگه‌داشتنِ توضیح‌پذیری حتی بعد از ML (ثبتِ دلایلِ score) | پایین | کم |

**نتیجه:** پایه‌ی داده و نقاطِ اتصال (DIP) برای ارتقا به AI واقعی آماده است؛ ولی امروز «AI» = heuristic.
هرگونه ادعای «AI-heavy» در بازاریابی باید با این واقعیت هم‌تراز شود.
