import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertCircle, Check, ChevronDown, Info, Minus, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * ============================================================
 *  表单控件组 —— 本仓库原来完全没有这些
 * ============================================================
 *
 * 背景：src/styles/global-form.scss 里**早就写好了** .form-input /
 * .form-select / .form-textarea / .form-help / .form-error 的样式，
 * 但没有任何一个 React 组件用它。也就是说表单的外观规范定好了，
 * 组件一个都没做。这个文件把它们补齐。
 *
 * 命名：React 里 `Input` / `Select` 太容易和原生标签、和别人的库撞名字，
 * 所以统一加 Form 前缀。展示页和以后的表单页都从这里拿。
 *
 * 所有颜色都走 global-components.scss 的 .dd-control / .dd-field 那几个类，
 * 组件里**没有一个写死的颜色**，所以深浅模式自动都成立。
 */

/* ------------------------------------------------------------------ */
/* 字段外壳：标签 + 帮助 + 错误，统一排版                                */
/* ------------------------------------------------------------------ */

interface FieldShellProps {
  label?: ReactNode
  required?: boolean
  help?: ReactNode
  error?: ReactNode
  className?: string
  children: ReactNode
  /** 控件的 id，用来把 label 和控件关联起来（点了标签能聚焦控件） */
  htmlFor?: string
  /**
   * 字段名。填了它，这个字段就会**自动认领 ** <Form> 校验出来的错误，
   * 不需要外面把 error 一行行传下来。
   */
  name?: string
}

export function Field({ label, required, help, error, className, children, htmlFor, name }: FieldShellProps) {
  const ctxErrors = useFormErrors()
  /* 显式传的 error 优先（调用方最清楚），没有就认领 Form 校验的结果 */
  const err = error ?? (name ? ctxErrors[name] : undefined)

  return (
    <div className={cn('dd-field', className)}>
      {label && (
        <label className="dd-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="dd-label__required" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {/* 错误优先于帮助文字：同时给两个的话用户不知道该看哪个 */}
      {err ? (
        <span className="dd-error-text" role="alert">
          <AlertCircle size={12} />
          {err}
        </span>
      ) : (
        help && <span className="dd-help">{help}</span>
      )}
    </div>
  )
}

/** 一组字段的容器，控制间距 */
export function FieldSet({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('dd-fieldset', className)}>{children}</div>
}

/** 字段行：标签在左、控件在右（用于设置页那种密集排布） */
export function FieldRow({
  label,
  help,
  children,
  className,
}: {
  label: ReactNode
  help?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-6 py-3', className)}>
      <div className="min-w-0">
        <div className="dd-label">{label}</div>
        {help && <div className="dd-help mt-0.5">{help}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 输入框                                                              */
/* ------------------------------------------------------------------ */

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>

export interface FormInputProps extends NativeInputProps {
  label?: ReactNode
  help?: ReactNode
  error?: ReactNode
  /** 字段名。配合 <Form> 用时填它，错误会自动认领 */
  name?: string
  /** 左侧固定内容，一般是图标 */
  prefix?: ReactNode
  /** 右侧固定内容，一般是单位或者图标 */
  suffix?: ReactNode
  /** 右侧可点的清除按钮 */
  clearable?: boolean
  onClear?: () => void
  /** 撑满宽度（默认就是撑满，false 时按内容） */
  block?: boolean
}

export function FormInput({
  label,
  help,
  error,
  name,
  prefix,
  suffix,
  clearable,
  onClear,
  block = true,
  className,
  id,
  required,
  value,
  ...rest
}: FormInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hasValue = value !== undefined && value !== null && String(value).length > 0

  return (
    <Field label={label} name={name} required={required} help={help} error={error} htmlFor={inputId}>
      <div
        className={cn(
          'dd-control-wrap',
          prefix && 'dd-control-wrap--prefix',
          (suffix || (clearable && hasValue)) && 'dd-control-wrap--suffix',
          !block && 'w-auto'
        )}
      >
        {prefix && <span className="dd-control-icon dd-control-icon--prefix">{prefix}</span>}
        <input
          id={inputId}
          value={value}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn('dd-control', error && 'dd-control--error', className)}
          {...rest}
        />
        {clearable && hasValue ? (
          <button
            type="button"
            aria-label="清除"
            onClick={onClear}
            className="dd-control-icon dd-control-icon--suffix dd-control-icon--button"
          >
            <X size={14} />
          </button>
        ) : (
          suffix && <span className="dd-control-icon dd-control-icon--suffix">{suffix}</span>
        )}
      </div>
    </Field>
  )
}

/* ------------------------------------------------------------------ */
/* 多行文本                                                            */
/* ------------------------------------------------------------------ */

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  help?: ReactNode
  error?: ReactNode
  /** 字段名。配合 <Form> 用时填它 */
  name?: string
  /** 右下角字数统计，给 maxLength 时会显示 n/上限 */
  showCount?: boolean
}

export function FormTextarea({
  label,
  help,
  error,
  name,
  showCount,
  className,
  id,
  required,
  value,
  maxLength,
  ...rest
}: FormTextareaProps) {
  const autoId = useId()
  const textareaId = id ?? autoId
  const len = value === undefined || value === null ? 0 : String(value).length

  return (
    <Field label={label} name={name} required={required} help={help} error={error} htmlFor={textareaId}>
      <textarea
        id={textareaId}
        value={value}
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        className={cn('dd-control dd-control--textarea', error && 'dd-control--error', className)}
        {...rest}
      />
      {showCount && (
        <span className="dd-help text-right tabular-nums">
          {len}
          {maxLength ? ` / ${maxLength}` : ''}
        </span>
      )}
    </Field>
  )
}

/* ------------------------------------------------------------------ */
/* 数字输入（金额场景要用，所以支持步进 + 单位 + 千分位）                 */
/* ------------------------------------------------------------------ */

export interface NumberInputProps {
  label?: ReactNode
  help?: ReactNode
  error?: ReactNode
  /** 字段名。配合 <Form> 用时填它 */
  name?: string
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
  /** 每次加减的步长 */
  step?: number
  /** 显示在输入框右侧的单位，例如「分」 */
  unit?: ReactNode
  /** 是否显示左右加减按钮 */
  controls?: boolean
  placeholder?: string
  disabled?: boolean
  /** 千分位显示。账本金额上屏时用 */
  thousandSeparator?: boolean
  className?: string
}

export function FormNumberInput({
  label,
  help,
  error,
  name,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  controls = true,
  placeholder,
  disabled,
  thousandSeparator,
  className,
}: NumberInputProps) {
  const autoId = useId()

  /** 显示值：千分位只在展示层加，往外传的永远是纯数字 */
  const display = useMemo(() => {
    if (value === null || value === undefined || Number.isNaN(value)) return ''
    return thousandSeparator ? value.toLocaleString('zh-CN') : String(value)
  }, [value, thousandSeparator])

  const clamp = (v: number) => {
    let n = v
    if (min !== undefined && n < min) n = min
    if (max !== undefined && n > max) n = max
    return n
  }

  const bump = (dir: 1 | -1) => {
    const base = value ?? 0
    onChange(clamp(base + dir * step))
  }

  return (
    <Field label={label} name={name} help={help} error={error} htmlFor={autoId}>
      <div className="flex items-stretch gap-2">
        {controls && (
          <button
            type="button"
            aria-label="减"
            disabled={disabled || (min !== undefined && (value ?? 0) <= min)}
            onClick={() => bump(-1)}
            className="btn-secondary btn--circle btn--sm shrink-0"
          >
            <Minus size={14} />
          </button>
        )}
        <div className="dd-control-wrap flex-1">
          <input
            id={autoId}
            inputMode="decimal"
            value={display}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              /* 千分位显示时要把逗号剔掉再解析，否则 1,200 会 parse 成 1 */
              const raw = e.target.value.replace(/,/g, '').trim()
              if (raw === '') return onChange(null)
              const n = Number(raw)
              if (Number.isNaN(n)) return
              onChange(clamp(n))
            }}
            className={cn('dd-control text-right tabular-nums', error && 'dd-control--error', className)}
            style={unit ? { paddingRight: 12 + String(unit).length * 14 } : undefined}
          />
          {unit && (
            <span className="dd-control-icon dd-control-icon--suffix dd-control-icon--unit h-full whitespace-nowrap">
              {unit}
            </span>
          )}
        </div>
        {controls && (
          <button
            type="button"
            aria-label="加"
            disabled={disabled || (max !== undefined && (value ?? 0) >= max)}
            onClick={() => bump(1)}
            className="btn-secondary btn--circle btn--sm shrink-0"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </Field>
  )
}

/* ------------------------------------------------------------------ */
/* 下拉选择                                                            */
/* ------------------------------------------------------------------ */

export interface SelectOption {
  label: string
  value: string
  disabled?: boolean
  /** 选项前的说明文字，右侧小字 */
  hint?: string
}

export interface FormSelectProps {
  label?: ReactNode
  help?: ReactNode
  error?: ReactNode
  /** 字段名。配合 <Form> 用时填它 */
  name?: string
  options: SelectOption[]
  value: string | null
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  /** 可搜索 */
  filterable?: boolean
  /** 可清空 */
  clearable?: boolean
  className?: string
  /** 空选项时的提示 */
  emptyText?: string
}

export function FormSelect({
  label,
  help,
  error,
  name,
  options,
  value,
  onChange,
  placeholder = '请选择',
  disabled,
  filterable,
  clearable,
  className,
  emptyText = '没有匹配项',
}: FormSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const autoId = useId()

  /* 点击外部关闭。用 mousedown 而不是 click：
     click 要等 mouseup，拖选文字松手在外面也会误触发关闭 */
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const current = options.find((o) => o.value === value) ?? null

  const filtered = useMemo(() => {
    if (!filterable || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, filterable, query])

  return (
    <Field label={label} name={name} help={help} error={error} htmlFor={autoId}>
      <div className="relative" ref={wrapRef}>
        <button
          id={autoId}
          type="button"
          disabled={disabled}
          data-open={open}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'dd-control flex items-center justify-between gap-2 text-left',
            error && 'dd-control--error',
            className
          )}
        >
          <span className={cn('truncate', !current && 'opacity-60')}>
            {current ? current.label : placeholder}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {clearable && current && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="清除"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange('')
                }}
                className="dd-control-icon dd-control-icon--button relative"
              >
                <X size={13} />
              </span>
            )}
            <ChevronDown size={15} className={cn('transition-transform', open && 'rotate-180')} />
          </span>
        </button>

        {open && (
          <div
            className="dd-popover dd-popover--plain absolute left-0 right-0 z-50 mt-1 overflow-hidden"
            role="listbox"
          >
            {filterable && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <Search size={13} className="text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索…"
                  className="w-full bg-transparent border-none outline-none text-sm text-foreground"
                />
              </div>
            )}
            <div className="max-h-56 overflow-y-auto custom-scrollbar dd-menu">
              {filtered.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground">{emptyText}</div>
              )}
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  disabled={o.disabled}
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="dd-menu__item"
                >
                  <Check
                    size={14}
                    className={cn('shrink-0', o.value === value ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="truncate">{o.label}</span>
                  {o.hint && <span className="dd-menu__shortcut">{o.hint}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Field>
  )
}

/* ------------------------------------------------------------------ */
/* 原生下拉（<select>）—— 移动端和简单场景用，不弹浮层                    */
/* ------------------------------------------------------------------ */

export function FormNativeSelect({
  label,
  help,
  error,
  name,
  options,
  className,
  ...rest
}: { label?: ReactNode; help?: ReactNode; error?: ReactNode; name?: string; options: SelectOption[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId()
  return (
    <Field label={label} name={name} help={help} error={error} htmlFor={autoId}>
      <select
        id={autoId}
        className={cn('dd-control cursor-pointer', error && 'dd-control--error', className)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

/* ------------------------------------------------------------------ */
/* 复选框 / 单选 / 开关 / 滑块                                          */
/* ------------------------------------------------------------------ */

export interface FormCheckboxProps {
  label?: ReactNode
  /** 字段名。配合 <Form> 用时填它，错误会显示在这条下面 */
  name?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  /** 半选态：表格「全选」用 */
  indeterminate?: boolean
  className?: string
}

export function FormCheckbox({
  label,
  name,
  checked,
  onChange,
  disabled,
  indeterminate,
  className,
}: FormCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)
  const ctxErrors = useFormErrors()
  const err = name ? ctxErrors[name] : undefined
  /* indeterminate 只能通过 JS 属性设，没有对应的 HTML 属性 */
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked
  }, [indeterminate, checked])

  return (
    <span className="inline-flex flex-col gap-1">
      <label className={cn('dd-check', className)}>
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label && <span>{label}</span>}
      </label>
      {err && (
        <span className="dd-error-text" role="alert">
          <AlertCircle size={12} />
          {err}
        </span>
      )}
    </span>
  )
}

export interface FormRadioGroupProps {
  label?: ReactNode
  help?: ReactNode
  error?: ReactNode
  /** 字段名。配合 <Form> 用时填它 */
  name?: string
  options: SelectOption[]
  value: string | null
  onChange: (v: string) => void
  disabled?: boolean
  /** horizontal 默认横排；vertical 竖排 */
  direction?: 'horizontal' | 'vertical'
  /** 卡片样式（选项是一张可点的卡，适合渠道选择这种要展示副文案的） */
  variant?: 'default' | 'card'
  className?: string
}

export function FormRadioGroup({
  label,
  help,
  error,
  name,
  options,
  value,
  onChange,
  disabled,
  direction = 'horizontal',
  variant = 'default',
  className,
}: FormRadioGroupProps) {
  const name0 = useId()
  return (
    <Field label={label} name={name} help={help} error={error}>
      <div
        role="radiogroup"
        aria-invalid={error ? true : undefined}
        className={cn(
          'flex gap-3',
          direction === 'vertical' ? 'flex-col items-stretch' : 'flex-wrap items-center',
          className
        )}
      >
        {options.map((o) => {
          const active = o.value === value
          if (variant === 'card') {
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled || o.disabled}
                onClick={() => onChange(o.value)}
                className={cn(
                  'flex-1 min-w-[140px] text-left rounded-lg border px-4 py-3 transition-colors',
                  active
                    ? 'border-brand bg-brand-20'
                    : 'border-border hover:bg-secondary',
                  (disabled || o.disabled) && 'opacity-55 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span
                    className={cn(
                      'w-4 h-4 rounded-full border shrink-0 flex items-center justify-center',
                      active ? 'border-brand' : 'border-border'
                    )}
                  >
                    {active && <span className="w-2 h-2 rounded-full bg-brand" />}
                  </span>
                  {o.label}
                </div>
                {o.hint && <div className="dd-help mt-1 ml-6">{o.hint}</div>}
              </button>
            )
          }
          return (
            <label key={o.value} className="dd-check">
              <input
                type="radio"
                name={name0}
                checked={active}
                disabled={disabled || o.disabled}
                onChange={() => onChange(o.value)}
              />
              {o.label && <span>{o.label}</span>}
            </label>
          )
        })}
      </div>
    </Field>
  )
}

export function FormSwitch({
  label,
  checked,
  onChange,
  disabled,
  className,
}: {
  label?: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : undefined}
        disabled={disabled}
        data-checked={checked}
        onClick={() => onChange(!checked)}
        className="dd-switch"
      >
        <span className="dd-switch__thumb" />
      </button>
      {label && <span className="text-sm text-foreground">{label}</span>}
    </div>
  )
}

export function FormSlider({
  label,
  help,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  /** 右侧显示当前值 */
  showValue = true,
  formatValue,
  className,
}: {
  label?: ReactNode
  help?: ReactNode
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  showValue?: boolean
  formatValue?: (v: number) => string
  className?: string
}) {
  return (
    <Field label={label} help={help} className={className}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          className="dd-slider flex-1"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {showValue && (
          <span className="text-sm tabular-nums w-12 text-right text-foreground">
            {formatValue ? formatValue(value) : value}
          </span>
        )}
      </div>
    </Field>
  )
}

/* ------------------------------------------------------------------ */
/* 输入建议（AutoComplete）                                            */
/* ------------------------------------------------------------------ */

export function FormAutoComplete({
  label,
  help,
  error,
  name,
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: {
  label?: ReactNode
  help?: ReactNode
  error?: ReactNode
  name?: string
  value: string
  onChange: (v: string) => void
  /** 候选池；组件内部按包含关系过滤 */
  suggestions: string[]
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [touched, setTouched] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const autoId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  /* 没输入过就不弹：一聚焦就铺一屏候选很吵 */
  const filtered = useMemo(() => {
    if (!touched || !value.trim()) return []
    const q = value.trim().toLowerCase()
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8)
  }, [suggestions, value, touched])

  return (
    <Field label={label} name={name} help={help} error={error} htmlFor={autoId}>
      <div className="relative" ref={wrapRef}>
        <div className="dd-control-wrap dd-control-wrap--prefix">
          <span className="dd-control-icon dd-control-icon--prefix">
            <Search size={14} />
          </span>
          <input
            id={autoId}
            value={value}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(e) => {
              onChange(e.target.value)
              setTouched(true)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            className={cn('dd-control', error && 'dd-control--error', className)}
          />
        </div>
        {open && filtered.length > 0 && (
          <div className="dd-popover dd-popover--plain absolute left-0 right-0 z-50 mt-1 overflow-hidden dd-menu max-h-56 overflow-y-auto custom-scrollbar">
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                className="dd-menu__item"
                onClick={() => {
                  onChange(s)
                  setOpen(false)
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </Field>
  )
}

/* ------------------------------------------------------------------ */
/* 分段单选（Naive 没有独立组件，但账本「渠道：微信 / 闲鱼」天天用）      */
/* ------------------------------------------------------------------ */

export function FormSegmentedControl({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label?: ReactNode
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  className?: string
}) {
  return (
    <Field label={label} className={className}>
      <div className="form-radio-group flex-wrap">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            disabled={o.disabled}
            className={cn(
              'form-radio-option',
              o.value === value && 'form-radio-option--active'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  )
}

/* ------------------------------------------------------------------ */
/* 文件上传                                                            */
/* ------------------------------------------------------------------ */

export interface UploadFile {
  name: string
  size: number
  status: 'ready' | 'uploading' | 'done' | 'error'
  /** 0-100 */
  percent?: number
}

export function FormUpload({
  label,
  help,
  accept,
  multiple,
  files,
  onFilesChange,
  className,
}: {
  label?: ReactNode
  help?: ReactNode
  /** 例如 ".xlsx,.xls" —— 账本导 Excel 用 */
  accept?: string
  multiple?: boolean
  files: UploadFile[]
  onFilesChange: (files: UploadFile[]) => void
  className?: string
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const add = (list: FileList | null) => {
    if (!list) return
    const next: UploadFile[] = Array.from(list).map((f) => ({
      name: f.name,
      size: f.size,
      status: 'ready' as const,
    }))
    onFilesChange(multiple ? [...files, ...next] : next)
  }

  const humanSize = (n: number) =>
    n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`

  return (
    <Field label={label} help={help} className={className}>
      <div
        className="dd-upload-tile"
        data-dragging={dragging}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          add(e.dataTransfer.files)
        }}
      >
        <Plus size={22} />
        <span className="text-sm font-semibold">点击选择，或把文件拖进来</span>
        {accept && <span className="text-xs opacity-75">支持 {accept}</span>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => add(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="dd-upload-item">
              <span className="truncate flex-1">{f.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {humanSize(f.size)}
              </span>
              <button
                type="button"
                aria-label={`移除 ${f.name}`}
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => onFilesChange(files.filter((_, j) => j !== i))}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  )
}

/* ------------------------------------------------------------------ */
/* 表单容器 + 校验上下文（Naive 的 n-form）                             */
/* ------------------------------------------------------------------ */

export interface FormRule {
  required?: boolean
  message: string
  /** 返回 true 表示通过 */
  validator?: (value: unknown) => boolean
}

export type FormRules<T extends Record<string, unknown>> = Partial<Record<keyof T, FormRule[]>>

interface FormContextValue {
  errors: Record<string, string>
}

const FormContext = createContext<FormContextValue>({ errors: {} })

export function useFormErrors() {
  return useContext(FormContext).errors
}

/**
 * 极简表单容器：只做「校验 + 把错误按字段发下去」。
 * 不引 react-hook-form —— 一期表单都很短，引一个库不划算。
 */
export function Form<T extends Record<string, unknown>>({
  values,
  rules,
  onSubmit,
  children,
  className,
}: {
  values: T
  rules?: FormRules<T>
  onSubmit?: (values: T) => void
  children: ReactNode
  className?: string
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    if (!rules) return {}
    const next: Record<string, string> = {}
    for (const key of Object.keys(rules) as (keyof T)[]) {
      const list = rules[key]
      if (!list) continue
      for (const rule of list) {
        const v = values[key]
        const empty = v === undefined || v === null || v === ''
        if (rule.required && empty) {
          next[String(key)] = rule.message
          break
        }
        if (!empty && rule.validator && !rule.validator(v)) {
          next[String(key)] = rule.message
          break
        }
      }
    }
    return next
  }

  return (
    <FormContext.Provider value={{ errors }}>
      <form
        className={cn('dd-fieldset', className)}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          const next = validate()
          setErrors(next)
          if (Object.keys(next).length === 0) onSubmit?.(values)
        }}
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/* 说明气泡（Naive 的 n-form-item 里那个问号）                          */
/* ------------------------------------------------------------------ */

export function FormHint({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex items-center text-muted-foreground cursor-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Info size={13} />
      {open && (
        <span className="dd-popover absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-max max-w-[220px] text-xs">
          {children}
        </span>
      )}
    </span>
  )
}
