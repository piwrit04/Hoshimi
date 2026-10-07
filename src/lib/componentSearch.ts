import { pinyin } from "pinyin-pro";

/**
 * 组件库展览用的搜索。
 *
 * 工具箱的 FloatingSearch 原本调 useCharacterSearch（角色数据 + Trie 树 + 拼音）。
 * 本项目没有角色数据，但要**保留搜索面板本身**（它是布局的一部分）。
 * 所以这里只换掉"搜的是什么"：搜组件名，字段是中文名 / 英文名 / 拼音。
 *
 * 拼音是 pinyin-pro 干的活，不改。
 */

export type SearchItem = {
  id: string;
  /** 中文名，也是显示名 */
  name: string;
  /** 英文名 / 分组名，显示在第二行 */
  sub: string;
  /** 组件索引页里的锚点 */
  anchor: string;
};

/** 组件的拼音键：全拼 + 首字母，都用来匹配 */
function keysOf(text: string): { full: string; initials: string } {
  const full = pinyin(text, { toneType: "none", type: "array" }).join("").toLowerCase();
  const initials = pinyin(text, { pattern: "first", toneType: "none", type: "array" }).join("").toLowerCase();
  return { full, initials };
}

type Indexed = SearchItem & { hay: string };

export function buildIndex(items: SearchItem[]): Indexed[] {
  return items.map((it) => {
    const a = keysOf(it.name);
    const b = keysOf(it.sub);
    return {
      ...it,
      hay: [it.name, it.sub, a.full, a.initials, b.full, b.initials].join(" ").toLowerCase(),
    };
  });
}

export function searchItems(index: Indexed[], query: string, limit = 12): SearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  /* 先把"开头就命中"的排在前面，其余是包含匹配 */
  const starts: Indexed[] = [];
  const contains: Indexed[] = [];
  for (const it of index) {
    if (it.name.toLowerCase().startsWith(q) || it.hay.includes(` ${q}`)) starts.push(it);
    else if (it.hay.includes(q)) contains.push(it);
  }
  return [...starts, ...contains].slice(0, limit).map(({ hay: _hay, ...rest }) => rest);
}

export type { Indexed };
