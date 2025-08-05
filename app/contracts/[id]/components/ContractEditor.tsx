"use client";

import { useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $getSelection, $createParagraphNode, $createTextNode, EditorState, $isRangeSelection } from 'lexical';
import { SaveStatusIndicator } from './SaveStatusIndicator';

interface ContractEditorProps {
  contractJson: any;
  currentParty: string;
  onSignatureClick: (blockIndex: number, signatureIndex: number) => void;
  onRegenerateBlock: (blockIndex: number, userInstructions: string) => void;
  onManualBlockEdit: (blockIndex: number, updatedBlock: any) => void;
  saveStatus: 'saved' | 'saving' | 'error';
  onShowPreview: () => void;
  onDownloadPDF: () => void;
  isDownloadingPDF: boolean;
}

// Toolbar component for formatting
function Toolbar() {
  const [editor] = useLexicalComposerContext();

  const formatText = (format: 'bold' | 'italic' | 'underline') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.formatText(format);
      }
    });
  };

  return (
    <div className="flex items-center space-x-2 p-4 border-b border-gray-200 bg-white">
      <button
        onClick={() => formatText('bold')}
        className="p-2 rounded hover:bg-gray-100 font-bold"
        title="Bold (Ctrl+B)"
      >
        B
      </button>
      <button
        onClick={() => formatText('italic')}
        className="p-2 rounded hover:bg-gray-100 italic"
        title="Italic (Ctrl+I)"
      >
        I
      </button>
      <button
        onClick={() => formatText('underline')}
        className="p-2 rounded hover:bg-gray-100 underline"
        title="Underline (Ctrl+U)"
      >
        U
      </button>
    </div>
  );
}

// Plugin to handle content changes and save
function SaveOnChangePlugin({ onSave }: { onSave: (content: string) => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        const content = JSON.stringify(editorState.toJSON());
        onSave(content);
      });
    });
  }, [editor, onSave]);

  return null;
}

// Error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

// Function to parse markdown-style bold text and convert to Lexical format
function parseMarkdownBold(text: string) {
  // Split text by **bold** patterns
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // This is bold text - remove asterisks and mark as bold
      const boldText = part.slice(2, -2);
      return {
        children: [
          {
            detail: 0,
            format: 1, // bold format
            mode: "normal",
            style: "",
            text: boldText,
            type: "text",
            version: 1
          }
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1
      };
    } else if (part.trim()) {
      // Regular text
      return {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: part,
            type: "text",
            version: 1
          }
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1
      };
    }
    return null;
  }).filter(Boolean);
}

export function ContractEditor({
  contractJson,
  currentParty,
  onSignatureClick,
  onRegenerateBlock,
  onManualBlockEdit,
  saveStatus,
  onShowPreview,
  onDownloadPDF,
  isDownloadingPDF
}: ContractEditorProps) {
  // Convert contract blocks to Lexical editor state
  const getInitialEditorState = () => {
    if (!contractJson || !contractJson.blocks || contractJson.blocks.length === 0) {
      return JSON.stringify({
        root: {
          children: [
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text: "",
                  type: "text",
                  version: 1
                }
              ],
              direction: "ltr",
              format: "",
              indent: 0,
              type: "paragraph",
              version: 1
            }
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "root",
          version: 1
        }
      });
    }

    // Convert contract text to Lexical format with bold parsing
    const contractText = contractJson.blocks[0]?.text || '';
    const paragraphs = contractText.split('\n\n').filter((p: string) => p.trim());
    
    const children = paragraphs.map((paragraph: string) => {
      const parsedParts = parseMarkdownBold(paragraph);
      if (parsedParts.length === 1) {
        return parsedParts[0];
             } else {
         // If we have multiple parts (bold + regular), combine them
         const combinedChildren = parsedParts.flatMap(part => part?.children || []);
         return {
           children: combinedChildren,
           direction: "ltr",
           format: "",
           indent: 0,
           type: "paragraph",
           version: 1
         };
       }
    });

    return JSON.stringify({
      root: {
        children,
        direction: "ltr",
        format: "",
        indent: 0,
        type: "root",
        version: 1
      }
    });
  };

  const handleSave = (content: string) => {
    // Convert Lexical content back to contract format
    try {
      const lexicalState = JSON.parse(content);
      const textContent = extractTextFromLexical(lexicalState);
      
      // Update the contract block
      onManualBlockEdit(0, {
        ...contractJson.blocks[0],
        text: textContent
      });
    } catch (error) {
      console.error('Error parsing editor content:', error);
    }
  };

  const extractTextFromLexical = (lexicalState: any): string => {
    const paragraphs: string[] = [];
    
    const traverse = (node: any) => {
      if (node.type === 'paragraph') {
        let paragraphText = '';
        if (node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'text') {
              // If text is bold, wrap it in **
              if (child.format === 1) {
                paragraphText += `**${child.text}**`;
              } else {
                paragraphText += child.text;
              }
            }
          });
        }
        if (paragraphText.trim()) {
          paragraphs.push(paragraphText.trim());
        }
      } else if (node.children) {
        node.children.forEach(traverse);
      }
    };

    if (lexicalState.root && lexicalState.root.children) {
      lexicalState.root.children.forEach(traverse);
    }

    return paragraphs.join('\n\n');
  };

  const initialConfig = {
    namespace: 'ContractEditor',
    theme: {
      root: 'outline-none',
      paragraph: 'mb-2',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
      },
    },
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
    editorState: getInitialEditorState(),
  };

  if (!contractJson || !contractJson.blocks || contractJson.blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No contract content available</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden mt-1">
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-y-auto p-8 py-4 m-3 mb-0 pt-6 ml-5 min-h-0 max-h-full">
        <div className="p-8 pt-0.5 max-w-4xl mx-auto w-full">
          <div className="flex-1 flex ml-5 mb-4">
            <SaveStatusIndicator status={saveStatus} />
          </div>
          {/* Contract Header */}
          <div className="text-center mb-2 flex-shrink-0">
            <div className="flex items-center justify-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Century Schoolbook, Times New Roman, serif' }}>
                {contractJson.title || 'CONTRACT AGREEMENT'}
              </h1>
            </div>
            <div className="text-sm text-gray-500">
              Date: {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
          
          {/* Lexical Editor */}
          <div className="prose prose-lg max-w-none">
            <LexicalComposer initialConfig={initialConfig} key={JSON.stringify(contractJson)}>
              <div className="relative">
                <Toolbar />
                <div className="relative">
                  <RichTextPlugin
                    contentEditable={
                      <ContentEditable 
                        className="outline-none min-h-[500px] p-4"
                        style={{ fontFamily: 'Century Schoolbook, Times New Roman, serif' }}
                      />
                    }
                    placeholder={
                      <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
                        Start typing your contract...
                      </div>
                    }
                    ErrorBoundary={ErrorBoundary}
                  />
                  <HistoryPlugin />
                  <SaveOnChangePlugin onSave={handleSave} />
                </div>
              </div>
            </LexicalComposer>
          </div>
        </div>
      </div>
    </div>
  );
} 