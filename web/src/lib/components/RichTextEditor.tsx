"use client";

import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";

type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

type RichTextEditorProps = {
  value: Record<string, JSONValue>;
  onChange: (nextValue: Record<string, JSONValue>) => void;
  editable?: boolean;
};

function isDocNode(value: Record<string, JSONValue>) {
  return value.type === "doc";
}

export function RichTextEditor({ value, onChange, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: isDocNode(value) ? value : { type: "doc", content: [{ type: "paragraph" }] },
    editable,
    onUpdate: ({ editor: activeEditor }) => {
      onChange(activeEditor.getJSON() as Record<string, JSONValue>);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[220px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.getJSON() as Record<string, JSONValue>;
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(editable);
  }, [editor, editable]);

  if (!editor) {
    return (
      <div className="min-h-[220px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          disabled={!editable}
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          disabled={!editable}
        >
          Italic
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          disabled={!editable}
        >
          Bulleted List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          disabled={!editable}
        >
          Numbered List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          disabled={!editable}
        >
          Heading
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
