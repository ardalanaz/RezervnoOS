# ── مرحله ۱: build ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# ── مرحله ۲: ایمیج نهایی (سخت‌شده) ──
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# امنیت: حذف ابزارهای غیرضروری + به‌روزرسانی پکیج‌های امنیتی
RUN apk --no-cache upgrade && apk add --no-cache dumb-init

# امنیت: ساخت کاربر non-root اختصاصی (اجرا با root خطرناک است)
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --chown=nextjs:nodejs docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# امنیت: اجرا با کاربر non-root
USER nextjs

EXPOSE 3000
# dumb-init: مدیریت صحیح سیگنال‌ها و جلوگیری از zombie process
ENTRYPOINT ["dumb-init", "--"]
CMD ["/docker-entrypoint.sh"]
