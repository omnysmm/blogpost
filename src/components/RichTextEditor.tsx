import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Heading1, Heading2, List, ListOrdered,
  Quote, Link2, Undo, Redo, Smile, ImagePlus, X, AlignLeft
} from 'lucide-react';

const EMOJI_GROUPS = [
  { label: '😀', items: ['😀','😄','😁','😊','😉','😍','🥰','😘','😎','🤩','🥳','😏','😅','😂','🤣','🥲','☺️','😇','🙂','🙃','😋','😛','😜','🤪','😝','🤗','🤭','🫣','🤫','🤔','🫡'] },
  { label: '👍', items: ['👍','👎','👌','✌️','🤞','🫶','👏','🙌','🤝','💪','🫰','🤙','👋','🖐️','✋','🤚','🫱','🫲','🙏','✍️','👀','🧠','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💯','✨'] },
  { label: '🔥', items: ['🔥','⭐','🌟','💫','⚡','💥','🎉','🎊','🎁','🏆','🥇','🎯','🚀','💡','📈','💰','💸','📢','📣','🔔','📌','📍','✅','❌','⚠️','❓','❗','💬','💭','🗓️','⏰'] },
  { label: '📷', items: ['📷','📸','🖼️','🎨','🎬','🎥','📹','🎞️','🎵','🎶','🎤','🎧','📢','📺','💻','📱','⌚','🎮','🕹️','📚','📝','📄','✏️','🖊️','🗂️','📊','🧩','🛠️','🔧','⚙️','🔒'] },
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  allowImageUpload?: boolean;
  onImageUpload?: (dataUrl: string, fileName: string) => void;
  uploadedImage?: string | null;
  onRemoveImage?: () => void;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = '',
  minHeight = 280,
  allowImageUpload = false,
  onImageUpload,
  uploadedImage,
  onRemoveImage,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [html, setHtml] = useState(value);

  // Sync external value → editor whenever parent value changes
  useEffect(() => {
    if (!editorRef.current) return;
    if (value !== html) {
      editorRef.current.innerHTML = value || '';
      setHtml(value || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = useCallback(() => {
    if (!editorRef.current) return;
    const next = editorRef.current.innerHTML;
    setHtml(next);
    onChange(next);
  }, [onChange]);

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const insertEmoji = (emoji: string) => {
    editorRef.current?.focus();
    document.execCommand('insertText', false, emoji);
    emit();
    setShowEmoji(false);
  };

  const insertLink = () => {
    if (!linkUrl.trim()) return;
    exec('createLink', linkUrl.trim());
    setLinkUrl('');
    setShowLink(false);
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      onImageUpload?.(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
  };

  const tools = [
    { icon: Bold, title: 'Жирный', action: () => exec('bold'), cmd: 'bold' },
    { icon: Italic, title: 'Курсив', action: () => exec('italic'), cmd: 'italic' },
    { icon: Underline, title: 'Подчёркнутый', action: () => exec('underline'), cmd: 'underline' },
    { icon: Heading1, title: 'Заголовок 1', action: () => exec('formatBlock', 'H1') },
    { icon: Heading2, title: 'Заголовок 2', action: () => exec('formatBlock', 'H2') },
    { icon: AlignLeft, title: 'Абзац', action: () => exec('formatBlock', 'P') },
    { icon: List, title: 'Маркированный список', action: () => exec('insertUnorderedList') },
    { icon: ListOrdered, title: 'Нумерованный список', action: () => exec('insertOrderedList') },
    { icon: Quote, title: 'Цитата', action: () => exec('formatBlock', 'BLOCKQUOTE') },
  ];

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50 relative">
        {tools.map((tool, i) => (
          <button
            key={i}
            type="button"
            title={tool.title}
            onClick={tool.action}
            className="p-2 rounded hover:bg-slate-200 text-slate-600 transition"
          >
            <tool.icon size={15} />
          </button>
        ))}
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button
          type="button"
          title="Ссылка"
          onClick={() => setShowLink(v => !v)}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 transition"
        >
          <Link2 size={15} />
        </button>
        <button
          type="button"
          title="Эмодзи"
          onClick={() => setShowEmoji(v => !v)}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 transition"
        >
          <Smile size={15} />
        </button>
        {allowImageUpload && (
          <button
            type="button"
            title="Добавить изображение"
            onClick={() => fileRef.current?.click()}
            className="p-2 rounded hover:bg-slate-200 text-slate-600 transition"
          >
            <ImagePlus size={15} />
          </button>
        )}
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button type="button" title="Отменить" onClick={() => exec('undo')} className="p-2 rounded hover:bg-slate-200 text-slate-600 transition">
          <Undo size={15} />
        </button>
        <button type="button" title="Повторить" onClick={() => exec('redo')} className="p-2 rounded hover:bg-slate-200 text-slate-600 transition">
          <Redo size={15} />
        </button>

        {/* Link input */}
        {showLink && (
          <div className="absolute top-full left-2 z-20 mt-1 flex gap-2 p-2 bg-white border border-slate-200 rounded-lg shadow-lg">
            <input
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="px-2 py-1 border border-slate-200 rounded text-sm w-56"
              onKeyDown={e => e.key === 'Enter' && insertLink()}
            />
            <button type="button" onClick={insertLink} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">OK</button>
            <button type="button" onClick={() => setShowLink(false)} className="px-2 py-1 text-slate-500 text-sm">✕</button>
          </div>
        )}

        {/* Emoji picker */}
        {showEmoji && (
          <div className="absolute top-full right-2 z-20 mt-1 w-80 max-h-64 overflow-y-auto p-3 bg-white border border-slate-200 rounded-xl shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-slate-500">Эмодзи и смайлы</span>
              <button type="button" onClick={() => setShowEmoji(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
            </div>
            {EMOJI_GROUPS.map((group, gi) => (
              <div key={gi} className="mb-2">
                <div className="text-xs text-slate-400 mb-1">{group.label}</div>
                <div className="grid grid-cols-10 gap-0.5">
                  {group.items.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="w-7 h-7 rounded hover:bg-blue-50 text-lg leading-none flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image preview */}
      {allowImageUpload && uploadedImage && (
        <div className="px-3 pt-3">
          <div className="relative inline-block">
            <img src={uploadedImage} alt="upload" className="max-h-40 rounded-lg border border-slate-200" />
            <button
              type="button"
              onClick={onRemoveImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
              title="Удалить изображение"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = '';
        }}
      />

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        className="px-4 py-3 outline-none prose prose-sm max-w-none"
        style={{ minHeight }}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  );
}
