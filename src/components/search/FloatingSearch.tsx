import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, GripHorizontal, Command, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchStore } from "@/store/useSearchStore";
import { buildIndex, searchItems } from "@/lib/componentSearch";
import { COMPONENTS } from "@/pages/Components/registry";
import { Link } from "react-router-dom";

/*
 * 全局搜索面板（Ctrl/⌘ + K）。
 *
 * 面板本体、拖拽、位置记忆、快捷键、过渡动画**整套来自工具箱的 FloatingSearch**。
 * 只换了一件事：搜的内容从「角色」改成「组件」（工具箱那份读角色数据）。
 * 结构、className、动效参数都没动。
 */
export function FloatingSearch() {
  const { isOpen, closeSearch } = useSearchStore();
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [query, setQuery] = useState("");
  const dragStartRef = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => buildIndex(COMPONENTS), []);
  const results = useMemo(() => searchItems(index, query, 8), [index, query]);

  /* 位置记忆 */
  useEffect(() => {
    const saved = localStorage.getItem("search-window-pos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const x = Math.min(Math.max(0, parsed.x), window.innerWidth - 400);
        const y = Math.min(Math.max(0, parsed.y), window.innerHeight - 100);
        setPosition({ x, y });
      } catch { void 0; }
    }
  }, []);

  /* 拖拽 */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      const elWidth = windowRef.current?.offsetWidth || 480;
      const elHeight = windowRef.current?.offsetHeight || 400;
      const clampedX = Math.min(Math.max(0, newX), window.innerWidth - elWidth);
      const clampedY = Math.min(Math.max(0, newY), window.innerHeight - elHeight);
      setPosition({ x: clampedX, y: clampedY });
    };
    const handleMouseUp = () => { if (isDragging) setIsDragging(false); };
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging) localStorage.setItem("search-window-pos", JSON.stringify(position));
  }, [position, isDragging]);

  /* 快捷键 */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useSearchStore.getState().toggleSearch();
      }
      if (e.key === "Escape" && isOpen) closeSearch();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeSearch]);

  /* 关闭时清空输入，下次打开是干净的 */
  useEffect(() => { if (!isOpen) setQuery(""); }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={closeSearch} />

          <motion.div
            ref={windowRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{ left: position.x, top: position.y, position: "fixed" }}
            className="z-50 w-[480px] flex flex-col bg-card/95 backdrop-blur-xl border border-border/50 shadow-floating rounded-xl overflow-hidden"
          >
            {/* 拖拽把手 */}
            <div
              onMouseDown={handleMouseDown}
              className={cn(
                "h-10 flex items-center justify-between px-4 border-b border-border/50 bg-secondary/30 select-none cursor-move",
                isDragging ? "cursor-grabbing" : "cursor-grab"
              )}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground pointer-events-none">
                <GripHorizontal size={14} />
                <span>全局搜索</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 pointer-events-none">
                  <span className="text-xs">Esc</span>
                </kbd>
                <button
                  onClick={closeSearch}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary/80 transition-colors"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* 输入 */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索组件（支持拼音）..."
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary/50 border border-transparent focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/70"
                />
              </div>
            </div>

            {/* 结果 */}
            <div className="max-h-[400px] overflow-y-auto p-2 pt-0">
              {query === "" ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <Command className="mx-auto h-8 w-8 mb-3 opacity-20" />
                  <p>输入关键词开始搜索</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  <h4 className="px-2 py-1.5 text-xs font-medium text-muted-foreground">组件</h4>
                  {results.map((item) => (
                    <Link
                      key={item.id}
                      to={`/components#${item.anchor}`}
                      onClick={closeSearch}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary border border-border/50 flex items-center justify-center">
                        <Boxes size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm group-hover:text-primary transition-colors">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.sub}</div>
                      </div>
                      <div className="text-xs text-muted-foreground group-hover:text-primary/70">跳转</div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <p>未找到相关结果</p>
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-secondary/30 border-t border-border/50 text-[10px] text-muted-foreground flex justify-between">
              <span>拖动顶部标题栏可移动窗口</span>
              <span>{results.length} 个结果</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
