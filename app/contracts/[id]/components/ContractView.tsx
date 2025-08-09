"use client";

import { SaveStatusIndicator } from './SaveStatusIndicator';
import { AnimatedLoading } from './AnimatedLoading';


interface ContractViewProps {
  contractJson: any;
  saveStatus: 'saved' | 'saving' | 'error';
  onDownloadPDF: () => void;
  isDownloadingPDF: boolean;
}

export function ContractView({
  contractJson,
  saveStatus,
  onDownloadPDF,
  isDownloadingPDF
}: ContractViewProps) {

  if (!contractJson || !contractJson.blocks || contractJson.blocks.length === 0) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <AnimatedLoading />
      </div>
    );
  }

  const contractText = contractJson.blocks[0]?.text || '';
  
  // Check if this is placeholder content - show loading animation instead
  const isPlaceholderContent = (
    contractJson.title === "Generating Contract..." ||
    contractText === "Contract is being generated..."
  );
  
  if (isPlaceholderContent) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <AnimatedLoading />
      </div>
    );
  }

  
  // Debug logging
  console.log('ContractView - contractJson:', contractJson);
  console.log('ContractView - contractText:', contractText);

  return (
    <div className="h-full flex flex-col overflow-hidden">

      





      {/* Contract Content - PDF Style */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-y-auto p-8 py-4 m-3 pt-6 ml-5 min-h-0 max-h-full">
        <div className="p-8 pt-5 max-w-4xl mx-auto w-full">
          {/* Contract Text - No Header, No Date */}
          <div className="prose prose-lg max-w-none">
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
        </div>
      </div>


{/* Header */}
      <div className="flex items-center justify-between mb-6 mt-2 flex-shrink-0">
        <div className="flex items-center space-x-3 ml-6">
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