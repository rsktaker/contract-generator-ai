"use client";

import { useState } from 'react';
import { SaveStatusIndicator } from './SaveStatusIndicator';


interface ContractViewProps {
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

export function ContractView({
  contractJson,
  currentParty,
  onSignatureClick,
  onRegenerateBlock,
  onManualBlockEdit,
  saveStatus,
  onShowPreview,
  onDownloadPDF,
  isDownloadingPDF
}: ContractViewProps) {
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const handleEditStart = (blockIndex: number, text: string) => {
    setEditingBlock(blockIndex);
    setEditText(text);
  };

  const handleEditSave = (blockIndex: number) => {
    onManualBlockEdit(blockIndex, {
      ...contractJson.blocks[blockIndex],
      text: editText
    });
    setEditingBlock(null);
    setEditText('');
  };

  const handleEditCancel = () => {
    setEditingBlock(null);
    setEditText('');
  };

  if (!contractJson || !contractJson.blocks || contractJson.blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No contract content available</div>
      </div>
    );
  }

  const contractText = contractJson.blocks[0]?.text || '';

  return (
    <div className="h-full flex flex-col overflow-hidden">

      





      {/* Contract Content - PDF Style */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-y-auto p-8 py-4 m-3 pt-6 ml-5 min-h-0 max-h-full">
        <div className="p-8 pt-5 max-w-4xl mx-auto w-full">
          {/* Contract Header */}
          <div className="text-center mb-8 flex-shrink-0">
            <div className="flex items-center justify-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Century Gothic, Arial, sans-serif' }}>
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
          
          {/* Contract Text */}
          <div className="prose prose-lg max-w-none">
            {editingBlock === 0 ? (
              <div className="space-y-4">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ fontFamily: 'Century Schoolbook, Times New Roman, serif' }}
                  placeholder="Edit contract text..."
                />
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleEditSave(0)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Contract Text */}
                <div 
                  className="whitespace-pre-wrap text-gray-900 leading-relaxed"
                  style={{ fontFamily: 'Century Schoolbook, Times New Roman, serif' }}
                  dangerouslySetInnerHTML={{
                    __html: contractText
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br>')
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>


{/* Header */}
      <div className="flex items-center justify-between mb-6 mt-2 flex-shrink-0">
        <div className="flex items-center space-x-3 ml-6">
          <button
            onClick={() => handleEditStart(0, contractText)}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Manual Editor</span>
          </button>
          
          <button
            onClick={onDownloadPDF}
            disabled={isDownloadingPDF}
            className="flex items-center space-x-2 px-4 py-2 text-white bg-black rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{isDownloadingPDF ? 'Generating...' : 'Download PDF'}</span>
          </button>
          
        </div>
        <div className="flex-1 flex justify-end mr-6">
            <SaveStatusIndicator status={saveStatus} />
        </div>

      </div>
      
    </div>
  );
}