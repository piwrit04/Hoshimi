import { motion } from 'framer-motion';
import { Home, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full"
      >
        {/* 主卡片 */}
        <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl overflow-hidden">
          {/* 顶部渐变条 */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand via-purple-500 to-cyan-500" />
          
          {/* 背景装饰 */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />

          {/* 内容 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* 404 大数字 */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative mb-6"
            >
              {/* 发光效果 */}
              <div className="absolute inset-0 bg-brand-20 blur-3xl rounded-full scale-150" />
              
              {/* 数字 */}
              <h1 className="relative text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-400 via-purple-400 to-cyan-400">
                404
              </h1>

              {/* 装饰性元素 */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-2 -right-4 w-8 h-8 border-2 border-brand-30 rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                className="absolute -bottom-2 -left-4 w-6 h-6 border-2 border-purple-500/30 rounded-full"
              />
            </motion.div>

            {/* 标题和描述 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-3">
                页面不存在
              </h2>
              <p className="text-muted-foreground mb-8 max-w-sm">
                抱歉，您访问的页面可能已被移除、更名或暂时不可用
              </p>
            </motion.div>

            {/* 操作按钮 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center w-full"
            >
              <Link
                to="/dashboard"
                className={cn(
                  "flex items-center justify-center gap-2 px-8 py-3",
                  "bg-primary text-primary-foreground rounded-xl font-medium",
                  "hover:bg-primary/90 transition-all duration-200",
                  "hover:shadow-lg hover:shadow-primary/25"
                )}
              >
                <Home size={18} />
                返回首页
              </Link>
            </motion.div>

            {/* 搜索建议 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 pt-6 border-t border-border/50 w-full"
            >
              <p className="text-xs text-muted-foreground mb-3">
                您可以尝试以下操作：
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['搜索角色', '浏览图鉴', '查看收藏'].map((item, index) => (
                  <Link
                    key={item}
                    to={index === 0 ? '/characters' : index === 1 ? '/characters' : '/collection'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground bg-secondary/50 rounded-full hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Search size={12} />
                    {item}
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* 底部装饰 */}
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mt-8 text-xs text-muted-foreground/50"
            >
              错误代码: 404_PAGE_NOT_FOUND
            </motion.div>
          </div>
        </div>

        {/* 底部装饰点 */}
        <div className="flex justify-center gap-2 mt-6">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.7, 0.3]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                delay: i * 0.1 
              }}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-brand to-purple-500"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
