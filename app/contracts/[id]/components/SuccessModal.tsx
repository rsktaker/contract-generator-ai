"use client";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAsTemplate: () => void;
}

export const SuccessModal = ({ isOpen, onClose, onSaveAsTemplate }: SuccessModalProps) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black opacity-50" onClick={handleBackdropClick}></div>
      <div className="relative bg-white rounded-lg max-w-md w-full p-6">
        {/* Success Icon */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Contract Sent Successfully!
          </h3>
          <p className="text-gray-600">
            Your contract has been sent to the recipient. They will receive an email with a link to sign the contract.
          </p>
        </div>

        {/* Save As Template Section */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Save As Template?
          </h4>
          <p className="text-xs text-gray-600 mb-3">
            Save this contract as a template to quickly send the same contract to multiple recipients in the future.
          </p>
          <button
            onClick={onSaveAsTemplate}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Save As Template
          </button>
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}; 