import { useState } from 'react';
import { X, Save } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import type { Post } from '../store/types';

interface EditPostModalProps {
  post: Post;
  language: 'ru' | 'en';
  onSave: (id: string, updates: Partial<Post>) => void;
  onClose: () => void;
}

export default function EditPostModal({ post, language, onSave, onClose }: EditPostModalProps) {
  const ru = language === 'ru';
  const [title, setTitle] = useState(post.title || '');
  const [topic, setTopic] = useState(post.topic || '');
  const [html, setHtml] = useState(post.content || '');
  const [scheduledTime, setScheduledTime] = useState(post.scheduledTime || '10:00');
  const [scheduledAt, setScheduledAt] = useState(post.scheduledAt ? post.scheduledAt.slice(0, 16) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    const updates: Partial<Post> = {
      title: title.trim() || post.title,
      topic: topic.trim() || post.topic,
      content: html,
      scheduledTime,
    };
    if (scheduledAt) {
      updates.scheduledAt = new Date(scheduledAt).toISOString();
      updates.scheduledDates = [];
      if (post.status !== 'moderating' && post.status !== 'rejected') {
        updates.status = 'scheduled';
      }
    }
    onSave(post.id, updates);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-lg text-slate-900">
            {ru ? 'Редактирование поста из очереди' : 'Edit queued post'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" title={ru ? 'Закрыть' : 'Close'}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{ru ? 'Заголовок' : 'Title'}</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{ru ? 'Тема' : 'Topic'}</label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {ru ? 'Текст публикации (форматирование, эмодзи, картинки)' : 'Post text (formatting, emojis, images)'}
            </label>
            <RichTextEditor
              value={html}
              onChange={setHtml}
              placeholder={ru ? 'Отредактируйте текст…' : 'Edit text…'}
              minHeight={260}
              allowImageUpload
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{ru ? 'Одна дата (необязательно)' : 'Single date (optional)'}</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{ru ? 'Время для календарных дней' : 'Time for calendar days'}</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {post.scheduledDates?.length ? (
            <p className="text-xs text-slate-500">
              {ru ? 'Дни календаря' : 'Calendar days'}: {post.scheduledDates.join(', ')}
            </p>
          ) : null}
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700">
            {ru ? 'Отмена' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} /> {ru ? 'Сохранить' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
