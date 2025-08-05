"use client";

import { useState, useEffect } from 'react';

interface UnknownsPanelProps {
  contractText: string;
  onReplaceUnknowns: (replacements: Record<string, string>, dismissedUnknowns: string[]) => void;
  isReplacing: boolean;
  onExpandChange?: (isExpanded: boolean) => void;
}

// Function to extract unknowns from contract text
function extractUnknowns(text: string): string[] {
  const regex = /\[([^\]]+)\]/g;
  const matches = text.match(regex);
  if (!matches) return [];
  
  // Remove brackets, capitalize first letter of each word, and return unique unknowns
  const unknowns = matches.map(match => {
    const unknown = match.slice(1, -1);
    return unknown.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  });
  return [...new Set(unknowns)];
}

export function UnknownsPanel({ contractText, onReplaceUnknowns, isReplacing, onExpandChange }: UnknownsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [unknowns, setUnknowns] = useState<string[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [disabledUnknowns, setDisabledUnknowns] = useState<Set<string>>(new Set());
  const [showNoUnknowns, setShowNoUnknowns] = useState(false);

  const handleToggleExpand = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    onExpandChange?.(newExpandedState);
  };

  useEffect(() => {
    const extractedUnknowns = extractUnknowns(contractText);
    setUnknowns(extractedUnknowns);
    
    // Initialize inputs for new unknowns
    const newInputs: Record<string, string> = {};
    extractedUnknowns.forEach(unknown => {
      if (!(unknown in inputs)) {
        newInputs[unknown] = '';
      }
    });
    setInputs(prev => ({ ...prev, ...newInputs }));
  }, [contractText]);

  const handleInputChange = (unknown: string, value: string) => {
    setInputs(prev => ({ ...prev, [unknown]: value }));
  };

  const toggleUnknown = (unknown: string) => {
    setDisabledUnknowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unknown)) {
        newSet.delete(unknown);
      } else {
        newSet.add(unknown);
      }
      return newSet;
    });
  };

  const handleReplace = async () => {
    // Filter out disabled unknowns and empty inputs
    const activeReplacements: Record<string, string> = {};
    const dismissedUnknowns: string[] = [];
    
    console.log('handleReplace called with unknowns:', unknowns);
    console.log('inputs:', inputs);
    console.log('disabledUnknowns:', disabledUnknowns);
    
    unknowns.forEach(unknown => {
      if (disabledUnknowns.has(unknown)) {
        dismissedUnknowns.push(unknown);
      } else if (inputs[unknown]?.trim()) {
        activeReplacements[unknown] = inputs[unknown].trim();
      }
    });

    console.log('activeReplacements:', activeReplacements);
    console.log('dismissedUnknowns:', dismissedUnknowns);

    if (Object.keys(activeReplacements).length > 0) {
      console.log('Calling onReplaceUnknowns with:', { activeReplacements, dismissedUnknowns });
      await onReplaceUnknowns(activeReplacements, dismissedUnknowns);
      
      // Show "No Unknowns" message briefly
      setShowNoUnknowns(true);
      setTimeout(() => {
        setShowNoUnknowns(false);
        setTimeout(() => {
          setIsExpanded(false);
        }, 300); // Add delay before sliding back
      }, 1000);
    } else {
      console.log('No active replacements to make');
    }
  };

  const hasActiveUnknowns = unknowns.length > 0 && !unknowns.every(unknown => 
    disabledUnknowns.has(unknown) || !inputs[unknown]?.trim()
  );

  return (
    <div className="mb-0">
      {/* Expand/Collapse Button */}
      <button
        onClick={handleToggleExpand}
        className="flex items-center px-2 py-1 bg-gray-200 border border-gray-200 rounded-tl-md rounded-tr-md hover:bg-gray-100 transition-colors"
      >
        <span className="text-xs text-black mr-1">Edit Unknowns</span>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? '' : 'rotate-180'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Slide-out Panel */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 bg-white border border-gray-200 rounded-tr-md mt-0 max-h-64 overflow-y-auto">
          {showNoUnknowns ? (
            <div className="text-center text-gray-500 py-4">
              No Unknowns.
            </div>
          ) : unknowns.length === 0 || unknowns.every(unknown => disabledUnknowns.has(unknown)) ? (
            <div className="text-center text-gray-500 py-4">
              No Unknowns.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>One-to-one replacement of enabled unknowns.</span>
                </div>
                <button
                  onClick={handleReplace}
                  disabled={!hasActiveUnknowns || isReplacing}
                  className="px-3 py-1.5 mr-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                >
                  {isReplacing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Replacing...
                    </>
                  ) : (
                    'Replace'
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {unknowns.map((unknown) => (
                  <div 
                    key={unknown} 
                    className={`flex items-center gap-2 ${
                      disabledUnknowns.has(unknown) ? 'opacity-50' : ''
                    }`}
                  >
                    <input
                      type="text"
                      value={inputs[unknown] || ''}
                      onChange={(e) => handleInputChange(unknown, e.target.value)}
                      placeholder={unknown}
                      disabled={disabledUnknowns.has(unknown)}
                      className={`flex-1 p-1.5 border border-gray-300 rounded-md disabled:opacity-50 text-sm ${
                        disabledUnknowns.has(unknown) ? 'bg-gray-100' : ''
                      }`}
                    />
                    <button
                      onClick={() => toggleUnknown(unknown)}
                      className={`p-1.5 rounded-md transition-colors ${
                        disabledUnknowns.has(unknown) 
                          ? 'text-gray-400 hover:text-gray-600' 
                          : 'text-red-500 hover:text-red-700'
                      }`}
                      title={disabledUnknowns.has(unknown) ? 'Enable' : 'Disable'}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 