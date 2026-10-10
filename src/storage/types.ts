/**
 * 本地账本快照类型。
 *
 * 存储选型（一期）：**IndexedDB**（库名 hoshimi，键 snapshot）。
 * - PRD D2：不用 localStorage 存业务账本（容量小、同步阻塞）。
 * - Electron：app://hoshimi 有稳定 origin，IDB 跨重启保留；以后 JSON 备份可写到
 *   userData（%APPDATA%\\Hoshimi），主存仍是 IDB。
 * - 主题 / 侧栏折叠仍用 zustand persist → localStorage（小偏好，启动要同步读）。
 *
 * version 用于迁移：normalizeSnapshot 把旧版抬到 SCHEMA_VERSION。
 */

import type { Order, Platform } from '@/domain/order'

/** 当前快照 schema 版本；改结构时 +1 并在 normalizeSnapshot 写迁移 */
export const SCHEMA_VERSION = 1

export const DB_NAME = 'hoshimi'
export const DB_VERSION = 1
export const KV_STORE = 'kv'
export const SNAPSHOT_KEY = 'snapshot'

export type Customer = {
  id: string
  nickname: string
  contact: string
  note: string
  createdAt: string
  mergedIntoId?: string
}

export type ChannelFee = {
  platform: Platform
  rate: number
}

export type AppSettings = {
  /** 托管到期提醒提前天数 */
  expiryOffsets: number[]
  /** 最近用过的项目名（录单快捷） */
  recentProductIds: string[]
}

export type Snapshot = {
  version: number
  orders: Order[]
  customers: Customer[]
  settings: AppSettings
  channelFees: ChannelFee[]
  /** 单号序号（全局自增） */
  orderSeq: number
  updatedAt: string
}
