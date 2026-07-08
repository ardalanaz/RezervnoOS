// ═══════════════════════════════════════════════════════════
//  لایه‌ی Validation متمرکز — API شبیهِ Zod، بدونِ وابستگیِ خارجی.
//
//  چرا این و نه خودِ Zod (فعلاً): محیطِ فعلی شبکه ندارد و نمی‌توان zod را نصب کرد.
//  این لایه همان سه مشکلِ validationِ دستی را حل می‌کند:
//    ۱. Type Inference — از schema، تایپِ خروجی استنتاج می‌شود (Infer<typeof s>)
//    ۲. فرمتِ خطای یکدست — همه‌ی خطاها یک شکل دارند (ValidationError با field+message)
//    ۳. عدم تکرار — schemaها یک‌جا تعریف و در routeها استفاده می‌شوند
//
//  مهاجرت به Zod در آینده: چون API عمداً شبیهِ Zod است، کافی است
//  `import { z } from './validate'` به `import { z } from 'zod'` تغییر کند
//  و بیشترِ schemaها بدونِ تغییر کار می‌کنند. (وقتی شبکه وصل شد + zod نصب شد.)
// ═══════════════════════════════════════════════════════════
import { Err } from './errors';

export interface Issue { field: string; message: string }

export class SchemaError extends Error {
  issues: Issue[];
  constructor(issues: Issue[]) {
    super(issues.map(i => `${i.field}: ${i.message}`).join('؛ '));
    this.issues = issues;
  }
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; issues: Issue[] };

/** پایه‌ی همه‌ی schemaها. */
abstract class Schema<T> {
  protected _optional = false;
  protected _default?: T;
  abstract _parse(v: unknown, path: string): ParseResult<T>;

  optional(): Schema<T | undefined> {
    this._optional = true;
    return this as unknown as Schema<T | undefined>;
  }
  default(val: T): Schema<T> {
    this._default = val;
    this._optional = true;
    return this;
  }

  /** parse با پرتابِ خطای یکدست (برای استفاده در route). */
  parse(v: unknown): T {
    const r = this._parse(v, '');
    if (r.ok) return r.value;
    // فرمتِ خطای یکدست → همان Err.validation پروژه (سازگار با errorResponse)
    throw Err.validation(r.issues.map(i => `${i.field || 'ورودی'}: ${i.message}`).join('؛ '));
  }

  /** parse امن بدونِ پرتاب (برای منطقِ شرطی). */
  safeParse(v: unknown): ParseResult<T> {
    return this._parse(v, '');
  }

  protected handleEmpty(v: unknown): ParseResult<T> | null {
    if (v === undefined || v === null) {
      if (this._default !== undefined) return { ok: true, value: this._default };
      if (this._optional) return { ok: true, value: undefined as unknown as T };
      return { ok: false, issues: [{ field: '', message: 'الزامی است' }] };
    }
    return null;
  }
}

class StringSchema extends Schema<string> {
  private _min?: number; private _max?: number; private _regex?: RegExp; private _trim = false;
  min(n: number) { this._min = n; return this; }
  max(n: number) { this._max = n; return this; }
  regex(r: RegExp) { this._regex = r; return this; }
  trim() { this._trim = true; return this; }
  _parse(v: unknown, path: string): ParseResult<string> {
    const empty = this.handleEmpty(v); if (empty) return this.tagPath(empty, path);
    let s = v;
    if (typeof s !== 'string') {
      if (typeof s === 'number') s = String(s); // پذیرشِ نرمِ عدد → رشته
      else return { ok: false, issues: [{ field: path, message: 'باید رشته باشد' }] };
    }
    if (this._trim) s = (s as string).trim();
    const str = s as string;
    if (this._min !== undefined && str.length < this._min) return { ok: false, issues: [{ field: path, message: `حداقل ${this._min} کاراکتر` }] };
    if (this._max !== undefined && str.length > this._max) return { ok: false, issues: [{ field: path, message: `حداکثر ${this._max} کاراکتر` }] };
    if (this._regex && !this._regex.test(str)) return { ok: false, issues: [{ field: path, message: 'قالب نامعتبر' }] };
    return { ok: true, value: str };
  }
  private tagPath(r: ParseResult<string>, path: string): ParseResult<string> {
    if (!r.ok) r.issues = r.issues.map(i => ({ ...i, field: i.field || path }));
    return r;
  }
}

class NumberSchema extends Schema<number> {
  private _min?: number; private _max?: number; private _int = false;
  min(n: number) { this._min = n; return this; }
  max(n: number) { this._max = n; return this; }
  int() { this._int = true; return this; }
  _parse(v: unknown, path: string): ParseResult<number> {
    const empty = this.handleEmpty(v); if (empty) { if (!empty.ok) empty.issues = empty.issues.map(i => ({ ...i, field: path })); return empty; }
    let n = v;
    if (typeof n === 'string' && n.trim() !== '') n = Number(n); // پذیرشِ نرمِ رشته‌ی عددی
    if (typeof n !== 'number' || Number.isNaN(n)) return { ok: false, issues: [{ field: path, message: 'باید عدد باشد' }] };
    const num = n as number;
    if (this._int && !Number.isInteger(num)) return { ok: false, issues: [{ field: path, message: 'باید عددِ صحیح باشد' }] };
    if (this._min !== undefined && num < this._min) return { ok: false, issues: [{ field: path, message: `حداقل ${this._min}` }] };
    if (this._max !== undefined && num > this._max) return { ok: false, issues: [{ field: path, message: `حداکثر ${this._max}` }] };
    return { ok: true, value: num };
  }
}

class BooleanSchema extends Schema<boolean> {
  _parse(v: unknown, path: string): ParseResult<boolean> {
    const empty = this.handleEmpty(v); if (empty) { if (!empty.ok) empty.issues = empty.issues.map(i => ({ ...i, field: path })); return empty; }
    if (typeof v !== 'boolean') return { ok: false, issues: [{ field: path, message: 'باید بولی باشد' }] };
    return { ok: true, value: v };
  }
}

class EnumSchema<T extends string> extends Schema<T> {
  constructor(private values: readonly T[]) { super(); }
  _parse(v: unknown, path: string): ParseResult<T> {
    const empty = this.handleEmpty(v); if (empty) { if (!empty.ok) empty.issues = empty.issues.map(i => ({ ...i, field: path })); return empty; }
    if (!this.values.includes(v as T)) return { ok: false, issues: [{ field: path, message: `باید یکی از: ${this.values.join('، ')}` }] };
    return { ok: true, value: v as T };
  }
}

type Shape = Record<string, Schema<any>>;
type InferShape<S extends Shape> = { [K in keyof S]: S[K] extends Schema<infer U> ? U : never };

class ObjectSchema<S extends Shape> extends Schema<InferShape<S>> {
  constructor(private shape: S) { super(); }
  _parse(v: unknown, path: string): ParseResult<InferShape<S>> {
    const empty = this.handleEmpty(v); if (empty) { if (!empty.ok) empty.issues = empty.issues.map(i => ({ ...i, field: path })); return empty as ParseResult<InferShape<S>>; }
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      return { ok: false, issues: [{ field: path, message: 'باید آبجکت باشد' }] };
    }
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const issues: Issue[] = [];
    for (const key of Object.keys(this.shape)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const r = this.shape[key]._parse(obj[key], fieldPath);
      if (r.ok) { if (r.value !== undefined) out[key] = r.value; }
      else issues.push(...r.issues.map(i => ({ ...i, field: i.field || fieldPath })));
    }
    if (issues.length) return { ok: false, issues };
    return { ok: true, value: out as InferShape<S> };
  }
}

// ── سازنده‌ها به سبکِ Zod: z.string(), z.object({...}) ──
export const z = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  enum: <T extends string>(values: readonly T[]) => new EnumSchema(values),
  object: <S extends Shape>(shape: S) => new ObjectSchema(shape),
};

/** استنتاجِ تایپ از schema — مثلِ z.infer در Zod. */
export type Infer<T> = T extends Schema<infer U> ? U : never;
