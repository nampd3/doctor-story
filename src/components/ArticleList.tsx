import React from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { Article } from '../types';
import { cn } from '../lib/utils';

interface ArticleListProps {
  articles: Article[];
  isAdmin: boolean;
  onDelete?: (id: string) => void;
}

export const ArticleList: React.FC<ArticleListProps> = ({ articles, isAdmin, onDelete }) => {
  if (articles.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
        <p className="text-gray-400 font-serif italic text-lg">No articles published yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {articles.map((article) => (
        <article key={article.id} className="group relative">
          <div className="flex flex-col md:flex-row md:items-start gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                  {article.createdAt?.toDate ? format(article.createdAt.toDate(), 'MMMM d, yyyy') : 'Recently Published'}
                </span>
                {isAdmin && onDelete && (
                  <button
                    onClick={() => onDelete(article.id)}
                    className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Delete
                  </button>
                )}
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-light text-gray-900 leading-tight hover:text-gray-600 transition-colors cursor-pointer">
                {article.title}
              </h2>
              <div className="prose prose-gray max-w-none prose-headings:font-serif prose-p:leading-relaxed prose-p:text-gray-600">
                {article.format === 'markdown' ? (
                  <ReactMarkdown>{article.content}</ReactMarkdown>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: article.content }} />
                )}
              </div>
              <div className="pt-6 flex items-center space-x-4">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                  End of Insight
                </span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};
