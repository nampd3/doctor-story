import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Article } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ArticleListProps {
  articles: Article[];
  isAdmin: boolean;
  onDelete?: (id: string) => void;
}

export const ArticleList: React.FC<ArticleListProps> = ({ articles, isAdmin, onDelete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTocOpen, setIsTocOpen] = useState(false);

  if (articles.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
        <p className="text-gray-400 font-serif italic text-lg">No articles published yet.</p>
      </div>
    );
  }

  const currentArticle = articles[currentIndex];

  const handleNext = () => {
    if (currentIndex < articles.length - 1) {
      setCurrentIndex(prev => prev + 1);
      scrollToJournal();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      scrollToJournal();
    }
  };

  const scrollToJournal = () => {
    const element = document.getElementById('article-title');
    if (element) {
      const offset = 120; // More offset to show the date/delete button above title
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative min-h-[600px]">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Table of Contents - Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-32 h-fit">
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mb-8">Contents</h3>
            <nav className="space-y-4">
              {articles.map((article, index) => (
                <button
                  key={article.id}
                  onClick={() => {
                    setCurrentIndex(index);
                    scrollToJournal();
                  }}
                  className={cn(
                    "block w-full text-left text-sm transition-all duration-300 group",
                    currentIndex === index 
                      ? "text-gray-900 font-medium translate-x-2" 
                      : "text-gray-400 hover:text-gray-600 hover:translate-x-1"
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <span className={cn(
                      "text-[10px] mt-1 font-mono",
                      currentIndex === index ? "text-gray-900" : "text-gray-300"
                    )}>
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="leading-snug">{article.title}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile TOC Toggle */}
        <div className="lg:hidden mb-8">
          <button 
            onClick={() => setIsTocOpen(!isTocOpen)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium"
          >
            <span className="text-gray-500 uppercase tracking-widest text-[10px]">Table of Contents</span>
            <ChevronRight className={cn("transition-transform", isTocOpen && "rotate-90")} size={16} />
          </button>
          <AnimatePresence>
            {isTocOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-white border-x border-b border-gray-50 rounded-b-xl"
              >
                <div className="p-4 space-y-3">
                  {articles.map((article, index) => (
                    <button
                      key={article.id}
                      onClick={() => {
                        setCurrentIndex(index);
                        setIsTocOpen(false);
                        scrollToJournal();
                      }}
                      className={cn(
                        "block w-full text-left text-sm py-2 px-2 rounded-lg transition-colors",
                        currentIndex === index ? "bg-gray-50 text-gray-900 font-medium" : "text-gray-500"
                      )}
                    >
                      {index + 1}. {article.title}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Article Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.article 
              key={currentArticle.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative"
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    {currentArticle.createdAt?.toDate ? format(currentArticle.createdAt.toDate(), 'MMMM d, yyyy') : 'Recently Published'}
                  </span>
                  {isAdmin && onDelete && (
                    <button
                      onClick={() => onDelete(currentArticle.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-opacity"
                    >
                      Delete
                    </button>
                  )}
                </div>
                
                <h2 id="article-title" className="text-4xl md:text-5xl font-serif font-light text-gray-900 leading-tight">
                  {currentArticle.title}
                </h2>

                <div className="prose prose-gray max-w-none prose-headings:font-serif prose-p:leading-relaxed prose-p:text-gray-600 prose-img:rounded-3xl">
                  {currentArticle.format === 'markdown' || (!currentArticle.format && !currentArticle.content.includes('<')) ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentArticle.content}</ReactMarkdown>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: currentArticle.content }} />
                  )}
                </div>

                <div className="pt-20 flex items-center space-x-6">
                  <div className="h-px flex-1 bg-gray-100" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 italic">
                    End of Insight
                  </span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        {/* Floating Navigation - Right Side */}
        <div className="fixed bottom-8 right-8 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:right-12 z-50 flex lg:flex-col gap-4">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            title="Previous Article"
            className={cn(
              "w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300",
              currentIndex === 0 
                ? "bg-gray-100 text-gray-300 cursor-not-allowed" 
                : "bg-white text-gray-900 hover:bg-gray-900 hover:text-white hover:scale-110 active:scale-95 border border-gray-100"
            )}
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="hidden lg:flex items-center justify-center py-2">
            <span className="text-[10px] font-mono font-bold text-gray-400 rotate-90">
              {currentIndex + 1}/{articles.length}
            </span>
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === articles.length - 1}
            title="Next Article"
            className={cn(
              "w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300",
              currentIndex === articles.length - 1 
                ? "bg-gray-100 text-gray-300 cursor-not-allowed" 
                : "bg-white text-gray-900 hover:bg-gray-900 hover:text-white hover:scale-110 active:scale-95 border border-gray-100"
            )}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
