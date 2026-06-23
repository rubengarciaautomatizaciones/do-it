import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = "Escribe una descripción ('-' para viñetas)..." }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'cursor-text before:content-[attr(data-placeholder)] before:text-gray-400 before:float-left before:pointer-events-none',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none text-gray-600 min-h-[100px]',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getText() ? editor.getHTML() : '');
    },
  });

  // Sincronizar contenido externo si cambia (ej. al cargar la tarea)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50 transition-colors focus-within:bg-white focus-within:border-gray-200 focus-within:shadow-sm">
      <EditorContent editor={editor} />
    </div>
  );
}