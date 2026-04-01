import React, { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { cn } from '../lib/utils';

interface ArticleEditorProps {
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  format: 'richtext' | 'markdown';
  setFormat: (format: 'richtext' | 'markdown') => void;
  onSave: () => void;
  isSaving: boolean;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  title,
  setTitle,
  content,
  setContent,
  format,
  setFormat,
  onSave,
  isSaving,
}) => {
  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Article Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a compelling title..."
          className="w-full text-2xl font-serif border-b border-gray-200 py-2 focus:outline-none focus:border-gray-900 transition-colors"
        />
      </div>

      <div className="flex items-center space-x-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Format:
        </label>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setFormat('richtext')}
            className={cn(
              "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
              format === 'richtext' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Rich Text
          </button>
          <button
            onClick={() => setFormat('markdown')}
            className={cn(
              "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
              format === 'markdown' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Markdown
          </button>
        </div>
      </div>

      <div className="min-h-[400px]">
        {format === 'richtext' ? (
          <ReactQuill
            theme="snow"
            value={content}
            onChange={setContent}
            className="h-[350px] mb-12"
            placeholder="Share your medical insights..."
          />
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your article in Markdown..."
            className="w-full h-[400px] p-4 font-mono text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        )}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onSave}
          disabled={isSaving || !title || !content}
          className="bg-gray-900 text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-95"
        >
          {isSaving ? 'Publishing...' : 'Publish Article'}
        </button>
      </div>
    </div>
  );
};
