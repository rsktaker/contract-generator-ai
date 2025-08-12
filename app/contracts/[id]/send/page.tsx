"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useSession } from 'next-auth/react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';

// Build a Lexical editor state JSON string from plain text lines
function buildInitialEditorState(plain: string) {
  const paragraphs = plain.split('\n');
  return JSON.stringify({
    root: {
      children: paragraphs.map((line) => ({
        type: 'paragraph',
        version: 1,
        indent: 0,
        format: '',
        direction: 'ltr',
        children: [{ type: 'text', version: 1, text: line, detail: 0, format: 0, mode: 'normal', style: '' }]
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1
    }
  });
}

export default function SendPage() {
  const { id } = useParams();
  const router = useRouter();
  const contractId = id as string;
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const defaultBody = 'Dear [Recipient Name],\n\nPlease find attached the contract for your review and signature.\n\nBest regards,\n[Your Name]';
  const [editorStateJson, setEditorStateJson] = useState<string>(buildInitialEditorState(defaultBody));
  const [isSending, setIsSending] = useState(false);
  const [contractTitle, setContractTitle] = useState('Contract');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/contracts/${contractId}`);
        if (res.ok) {
          const data = await res.json();
          const content = typeof data.contract.content === 'string' ? JSON.parse(data.contract.content) : data.contract.content;
          const title = content?.title || data.contract?.title || 'Contract';
          setContractTitle(title);
          setSubject(`Contract: ${title}`);
          setEditorStateJson(buildInitialEditorState(defaultBody));
        }
      } catch {}
    };
    load();
  }, [contractId]);

  const initialConfig = {
    namespace: 'EmailEditor',
    editorState: editorStateJson,
    theme: { paragraph: 'mb-2' },
    onError: (e: Error) => console.error(e)
  } as const;

  const handleEditorChange = (editorState: any) => {
    setEditorStateJson(JSON.stringify(editorState.toJSON()));
  };

  const extractPlainText = (lexical: any): string => {
    const paras: string[] = [];
    const traverse = (node: any) => {
      if (node.type === 'paragraph') {
        let t = '';
        node.children?.forEach((c: any) => { if (c.type === 'text') t += c.text; });
        paras.push(t);
      } else if (node.children) {
        node.children.forEach(traverse);
      }
    };
    traverse(lexical.root);
    return paras.join('\n');
  };

  const handleSend = async () => {
    if (!recipientEmail.trim()) return;
    setIsSending(true);
    try {
      const parsed = JSON.parse(editorStateJson);
      const message = extractPlainText(parsed);
      const res = await fetch(`/api/contracts/${contractId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipientEmail.trim(), subject, message })
      });
      if (res.ok) {
        router.push(`/contracts/${contractId}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header authenticated={isAuthenticated} />
      <div className="flex-1 bg-gray-50">
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-gray-500 w-14">To:</span>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1 p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-14">Subject:</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1 p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="p-4">
              <div className="prose max-w-none">
                <LexicalComposer initialConfig={initialConfig}>
                  <RichTextPlugin
                    contentEditable={<ContentEditable className="min-h-[220px] outline-none p-3" />}
                    placeholder={<div className="text-gray-400">Compose your message…</div>}
                    ErrorBoundary={({ children }) => <div>{children}</div>}
                  />
                  <HistoryPlugin />
                  <OnChangePlugin onChange={(state) => state.read(() => handleEditorChange(state))} />
                </LexicalComposer>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleSend}
                disabled={!recipientEmail.trim() || isSending}
                className={`px-5 py-2 bg-black text-white rounded hover:bg-gray-900 disabled:opacity-50 ${isSending ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isSending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Sending…
                  </span>
                ) : (
                  'Send Email'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

