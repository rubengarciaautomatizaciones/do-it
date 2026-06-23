import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = "Escribe una descripción ('-' para viñetas)..." }: RichTextEditorProps) {
  const [localContent, setLocalContent] = useState(content);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'cursor-text before:content-[attr(data-placeholder)] before:text-gray-400 before:float-left before:pointer-events-none',
      }),
    ],
    content: localContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none text-black min-h-[100px]',
      },
    },
    onUpdate: ({ editor }) => {
      // Solo actualizamos el estado local para no laguear
      setLocalContent(editor.getHTML());
    },
    onBlur: ({ editor }) => {
      // Guardamos en la base de datos SOLO cuando el usuario hace click fuera
      onChange(editor.getHTML());
    }
  });

  useEffect(() => {
    if (editor && content !== localContent && !editor.isFocused) {
      editor.commands.setContent(content);
      setLocalContent(content);
    }
  }, [content, editor]);

  return (
    <div className="bg-white rounded-xl p-4 transition-colors focus-within:bg-gray-50/30">
      <EditorContent editor={editor} />
    </div>
  );
}