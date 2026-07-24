-- 025: ایندکس روی FKهای reviews که ایندکس نداشتن.
-- بدون این‌ها حذف یک کاربر/رزرو باعث full-scan جدول reviews می‌شد،
-- و کوئریِ «نظرات این کاربر» / «نظرِ این رزرو» هم بهینه نبود.
CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON reviews (user_id);
CREATE INDEX IF NOT EXISTS reviews_reservation_id_idx ON reviews (reservation_id);
