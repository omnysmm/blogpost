import { useRef, useState } from 'react';
import { X, Save, ArrowUp, ArrowDown, Upload, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { generateImage as aiGenerateImage } from '../services/ai';
import { buildImagePrompt } from '../services/contentEngine';
import type { Post } from '../store/types';

function extractImageSrc(html: string): string | undefined {
  const m = (html || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  const src = m?.[1];
  if (!src) return undefined;
  return src.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function stripImagesFromHtml(html: string): string {
  return (html || '')
    .replace(/<p>\s*<img[^>]*>\s*<\/p>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/^\s+|\s+$/g, '');
}

function withImageHtml(body: string, src: string | null | undefined, position: 'top' | 'bottom'): string {
  const text = stripImagesFromHtml(body);
  if (!src) return text;
  const img = `<p><img src="${src.replace(/"/g, '&quot;')}" alt="" style="max-width:100%;border-radius:12px;display:block" /></p>`;
  return position === 'top' ? `${img}\n\n${text}` : `${text}\n\n${img}`;
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

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
  const [scheduledAt, setScheduledAt] = useState(post.scheduledAt ? post.scheduledAt.slice(0, 16) : '');
  const [saving, setSaving] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(extractImageSrc(post.content || '') || null);
  const [imagePosition, setImagePosition] = useState<'top' | 'bottom'>(() => {
    const content = post.content || '';
    const imgIdx = content.search(/<img/i);
    const textIdx = content.search(/[^<\s][^<]*/);
    return imgIdx >= 0 && textIdx >= 0 && imgIdx < textIdx ? 'top' : 'bottom';
  });
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const replaceRef = useRef<HTMLInputElement | null>(null);

  const bodyText = stripImagesFromHtml(html);
  const previewHtml = withImageHtml(bodyText, imageSrc, imagePosition);

  const handleSave = () => {
    setSaving(true);
    const content = withImageHtml(bodyText, imageSrc, imagePosition);
    const updates: Partial<Post> = {
      title: title.trim() || post.title,
      topic: topic.trim() || post.topic,
      content,
      hasImage: !!imageSrc,
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

  const togglePosition = () => {
    setImagePosition(prev => (prev === 'top' ? 'bottom' : 'top'));
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

          {/* Image: move / regenerate / replace from file */}
          <div className="rounded-lg border border-slate-100 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-medium text-slate-600">{ru ? 'Изображение' : 'Image'}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={togglePosition}
                  className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 flex items-center gap-1"
                  title={imagePosition === 'top' ? (ru ? 'Переместить вниз' : 'Move down') : (ru ? 'Переместить вверх' : 'Move up')}
                >
                  {imagePosition === 'top' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                  {imagePosition === 'top' ? (ru ? 'Вниз' : 'Down') : (ru ? 'Вверх' : 'Up')}
                </button>
                <button
                  type="button"
                  disabled={isRegeneratingImage}
                  onClick={async () => {
                    setIsRegeneratingImage(true);
                    try {
                      const srcText = topic.trim() || title.trim() || bodyText.slice(0, 80);
                      const imagePrompt = buildImagePrompt(srcText, language);
                      const url = await aiGenerateImage({ prompt: imagePrompt, width: 1024, height: 640 });
                      if (url) setImageSrc(url);
                    } catch (e) {
                      console.warn('Regenerate image failed', e);
                    } finally {
                      setIsRegeneratingImage(false);
                    }
                  }}
                  className="text-xs px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-700 flex items-center gap-1 disabled:opacity-50"
                >
                  {isRegeneratingImage ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  {ru ? 'Перегенерировать' : 'Regenerate'}
                </button>
                <button
                  type="button"
                  onClick={() => replaceRef.current?.click()}
                  className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 flex items-center gap-1"
                >
                  <Upload size={12} />
                  {ru ? 'Заменить из файла' : 'Replace from file'}
                </button>
                {imageSrc && (
                  <button
                    type="button"
                    onClick={() => setImageSrc(null)}
                    className="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            {imageSrc ? (
              <img src={imageSrc} alt="" className="max-h-48 rounded-lg border border-slate-200 bg-slate-50" />
            ) : (
              <p className="text-xs text-slate-400">{ru ? 'Изображение не выбрано' : 'No image'}</p>
            )}
            <input
              ref={replaceRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  setImageSrc(await readImageFile(file));
                } catch (err) {
                  console.warn('Replace image failed', err);
                }
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {ru ? 'Текст публикации (форматирование, эмодзи, картинки)' : 'Post text (formatting, emojis, images)'}
            </label>
            <RichTextEditor
              value={bodyText}
              onChange={setHtml}
              placeholder={ru ? 'Отредактируйте текст…' : 'Edit text…'}
              minHeight={260}
              allowImageUpload
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{ru ? 'Дата и время публикации' : 'Publish date & time'}</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{ru ? 'Тип' : 'Type'}</label>
              <p className="p-2.5 border border-slate-100 bg-slate-50 rounded-lg text-sm text-slate-600">{post.type}</p>
            </div>
          </div>

          {post.scheduledDates?.length ? (
            <p className="text-xs text-slate-500">
              {ru ? 'Дни календаря' : 'Calendar days'}: {post.scheduledDates.join(', ')}
            </p>
          ) : null}

          {/* Live preview with image placement */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {ru ? 'Предпросмотр' : 'Preview'}
            </label>
            <div
              className="text-xs text-slate-700 bg-slate-50 rounded p-2 max-h-48 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
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
