"use client";

import { useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $getSelection, $createParagraphNode, $createTextNode, EditorState, $isRangeSelection } from 'lexical';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { AnimatedLoading } from './AnimatedLoading';

interface ContractEditorProps {
  contractJson: any;
  currentParty: string;
  onSignatureClick: (blockIndex: number, signatureIndex: number) => void;
  onRegenerateBlock: (blockIndex: number, userInstructions: string) => void;
  onManualBlockEdit: (blockIndex: number, updatedBlock: any) => void;
  onManualTitleEdit: (newTitle: string) => void;
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

// Force editable state plugin
function EditablePlugin({ editable = true }: { editable?: boolean }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(editable);
  }, [editor, editable]);
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
  onManualTitleEdit,
  saveStatus,
  onShowPreview,
  onDownloadPDF,
  isDownloadingPDF
}: ContractEditorProps) {
  // Placeholder detection for generating state
  const isPlaceholderContent = !!(contractJson && (
    contractJson.title === 'Generating Contract...' ||
    (contractJson.blocks && contractJson.blocks[0]?.text === 'Contract is being generated...')
  ));
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
                  text: "Start typing your contract...",
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
    
    // Ensure we always have at least one paragraph
    if (paragraphs.length === 0) {
      paragraphs.push('Start typing your contract...');
    }
    
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

  // Title editor: initial state
  const getInitialTitleEditorState = () => {
    const titleText = contractJson?.title || 'Untitled Contract';
    return JSON.stringify({
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: titleText,
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    });
  };

  const extractPlainTextFromLexical = (lexicalState: any): string => {
    let result = '';
    const traverse = (node: any) => {
      if (node.type === 'text' && typeof node.text === 'string') {
        result += node.text;
      }
      if (Array.isArray(node.children)) {
        node.children.forEach(traverse);
      }
    };
    if (lexicalState?.root) {
      traverse(lexicalState.root);
    }
    return result.trim();
  };

  const handleTitleSave = (content: string) => {
    try {
      const lexicalState = JSON.parse(content);
      const plain = extractPlainTextFromLexical(lexicalState);
      if (plain !== (contractJson?.title || '')) {
        onManualTitleEdit(plain);
      }
    } catch (e) {
      console.error('Error parsing title editor content:', e);
    }
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

  // Show loading spinner for the entire editor while generating or if content missing
  if (
    !contractJson ||
    !contractJson.blocks ||
    contractJson.blocks.length === 0 ||
    isPlaceholderContent
  ) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <AnimatedLoading />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden mt-1">
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-y-auto p-8 py-4 m-3 mb-4 pt-6 ml-5 min-h-0 max-h-full">
        <div className="p-8 pt-0.5 max-w-4xl mx-auto w-full">
          <div className="flex-1 flex ml-5 mb-4">
            <SaveStatusIndicator status={saveStatus} />
          </div>
          {/* Contract Header - Editable Title (Lexical) */}
          <div className="text-center mb-4 flex-shrink-0 relative z-50 pointer-events-auto">
            <div className="flex items-center justify-center">
              <div className="relative w-full z-50 pointer-events-auto">
                <LexicalComposer
                  initialConfig={{
                    namespace: 'ContractTitleEditor',
                    theme: {
                      paragraph: 'mb-0',
                    },
                    onError: (error: Error) => console.error('Lexical title error:', error),
                    editorState: getInitialTitleEditorState(),
                  }}
                >
                  <div className="relative z-50 pointer-events-auto">
                    <EditablePlugin editable={true} />
                    <RichTextPlugin
                      contentEditable={
                        <ContentEditable
                          className="outline-none text-4xl font-bold text-gray-900 mb-2 text-center min-h-[48px] pointer-events-auto relative z-50 block w-full cursor-text"
                          style={{ fontFamily: 'Century Schoolbook, Times New Roman, serif' }}
                          role="textbox"
                          tabIndex={0}
                          aria-label="Contract title"
                        />
                      }
                      placeholder={
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-gray-400 pointer-events-none z-40">
                          Untitled Contract
                        </div>
                      }
                      ErrorBoundary={ErrorBoundary}
                    />
                    <HistoryPlugin />
                    <SaveOnChangePlugin onSave={handleTitleSave} />
                  </div>
                </LexicalComposer>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Date: {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
          
          {/* Lexical Editor */}
          <div className="prose prose-lg max-w-none mt-4 relative z-10">
            <LexicalComposer initialConfig={initialConfig} key={JSON.stringify(contractJson)}>
              <div className="relative">
                <Toolbar />
                <div className="relative">
                  <EditablePlugin editable={true} />
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