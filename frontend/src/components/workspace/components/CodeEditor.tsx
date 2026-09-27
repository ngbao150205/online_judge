import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  language: string;
  value: string;

  onChange: (
    value: string
  ) => void;
}

const getMonacoLanguage = (
  language: string
) => {
  switch (language) {
    case 'cpp':
      return 'cpp';

    case 'java':
      return 'java';

    case 'python':
      return 'python';

    case 'javascript':
      return 'javascript';

    case 'typescript':
      return 'typescript';

    default:
      return language;
  }
};

export const CodeEditor = ({
  language,
  value,
  onChange,
}: CodeEditorProps) => {
  return (
    <div className="h-full w-full overflow-hidden bg-[#1e1e1e]">
      <Editor
        height="100%"
        width="100%"
        language={getMonacoLanguage(
          language
        )}
        value={value}
        theme="vs-dark"
        onChange={(newValue) => {
          onChange(
            newValue ?? ''
          );
        }}
        options={{
          fontSize: 13,

          minimap: {
            enabled: false,
          },

          automaticLayout: true,

          scrollBeyondLastLine: false,

          smoothScrolling: true,

          wordWrap: 'off',

          padding: {
            top: 12,
            bottom: 12,
          },

          tabSize: 4,

          insertSpaces: true,

          renderWhitespace: 'selection',

          lineNumbers: 'on',

          folding: true,

          bracketPairColorization: {
            enabled: true,
          },

          cursorBlinking: 'smooth',

          formatOnPaste: false,

          formatOnType: false,

          suggestOnTriggerCharacters: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;