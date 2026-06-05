import { Article } from '../types';
import { Clock, Eye, ThumbsUp, FileText, Play, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface ArticleCardProps {
  key?: any;
  article: Article;
  onClick: () => void;
  layout?: 'featured' | 'standard' | 'compact';
}

export default function ArticleCard({ article, onClick, layout = 'standard' }: ArticleCardProps) {
  // Format dates elegantly
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const getReadingTime = (content: string) => {
    const words = (content || '').trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  if (layout === 'featured') {
    return (
      <motion.div
        id={`article-featured-${article.id}`}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="group cursor-pointer grid grid-cols-1 md:grid-cols-12 gap-6 bg-white border-b border-gray-100 pb-8 hover:bg-neutral-50/50 p-4 transition-all rounded-lg"
        onClick={onClick}
      >
        <div className="md:col-span-7 relative overflow-hidden rounded-md bg-neutral-100 aspect-video md:aspect-auto md:h-96">
          <img
            src={article.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200' }
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          {article.videoUrl && (
            <div className="absolute top-4 left-4 bg-red-600 text-white p-2 rounded-full shadow-lg">
              <Play className="w-5 h-5 fill-current" />
            </div>
          )}
          <div className="absolute top-4 right-4 bg-neutral-900/80 backdrop-blur-md text-white text-xs font-mono px-3 py-1 rounded">
            {article.category}
          </div>
        </div>

        <div className="md:col-span-5 flex flex-col justify-between py-2">
          <div>
            <div className="flex items-center space-x-2 text-red-600 font-sans font-bold text-xs uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              <span>LATEST BREAKING</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-sans font-extrabold text-neutral-900 leading-tight group-hover:text-red-600 transition-colors mb-4">
              {article.title}
            </h2>
            <p className="text-neutral-600 line-clamp-4 leading-relaxed text-sm md:text-base">
              {(article.summary || article.content.substring(0, 180) + '...').replace(/[*#_]/g, '').trim()}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-mono text-neutral-500">
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-red-500" />
              {formatDate(article.publishedAt)}
            </span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center text-neutral-400" title="Reading Time">
                <BookOpen className="w-3.5 h-3.5 mr-1" />
                {getReadingTime(article.content)}
              </span>
              <span className="flex items-center">
                <Eye className="w-3.5 h-3.5 mr-1 text-neutral-400" />
                {article.viewsCount}
              </span>
              <span className="flex items-center text-red-600/85">
                <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                {article.likesCount}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (layout === 'compact') {
    return (
      <div
        id={`article-compact-${article.id}`}
        className="group cursor-pointer flex items-start space-x-3 py-3 border-b border-gray-100 hover:bg-neutral-50/50 px-2 rounded-md transition-all"
        onClick={onClick}
      >
        <div className="flex-shrink-0 w-20 h-14 relative overflow-hidden bg-neutral-150 rounded">
          <img
            src={article.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=200' }
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block mb-0.5">
            {article.category}
          </span>
          <h4 className="text-xs font-sans font-bold text-neutral-900 group-hover:text-red-600 transition-colors line-clamp-2 leading-snug">
            {article.title}
          </h4>
          <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-neutral-400">
            <span className="flex items-center">
              {formatDate(article.publishedAt)}
            </span>
            <span className="flex items-center">
              <Eye className="w-2.5 h-2.5 mr-0.5" />
              {article.viewsCount}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Standard Grid layout
  return (
    <motion.div
      id={`article-standard-${article.id}`}
      whileHover={{ y: -4 }}
      className="group cursor-pointer bg-white border border-gray-150 rounded-lg overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-300"
      onClick={onClick}
    >
      <div className="relative aspect-video bg-neutral-100 overflow-hidden">
        <img
          src={article.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=500' }
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        {article.videoUrl && (
          <div className="absolute top-2 left-2 bg-red-600 text-white p-1 rounded-full shadow">
            <Play className="w-4 h-4 fill-current" />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-neutral-900/80 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-0.5 rounded uppercase">
          {article.category}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-sans font-extrabold text-neutral-900 group-hover:text-red-600 transition-colors line-clamp-2 mb-2 leading-snug">
            {article.title}
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed line-clamp-3 mb-4">
            {(article.summary || article.content.substring(0, 120) + '...').replace(/[*#_]/g, '').trim()}
          </p>
        </div>

        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1 text-neutral-400" />
            {formatDate(article.publishedAt)}
          </span>
          <div className="flex items-center space-x-2.5">
            <span className="flex items-center text-neutral-400" title="Reading Time">
              <BookOpen className="w-3 h-3 mr-1" />
              {getReadingTime(article.content)}
            </span>
            <span className="flex items-center">
              <Eye className="w-3 h-3 mr-1 text-neutral-400" />
              {article.viewsCount}
            </span>
            <span className="flex items-center text-red-600/80">
              <ThumbsUp className="w-3 h-3 mr-0.5 fill-none" />
              {article.likesCount}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
