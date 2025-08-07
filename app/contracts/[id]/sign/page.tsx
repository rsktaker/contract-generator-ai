"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from "@/components/Header";
import SignatureModal from "@/components/SignatureModal";
import { SuccessModal } from '../components/SuccessModal';
import { contractApi } from '../utils/api';

interface SignatureData {
  img_url: string;
  name: string;
  date: string;
}

export default function SignPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params.id as string;
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  
  const [contract, setContract] = useState<any>(null);
  const [contractJson, setContractJson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSignatureIndex, setCurrentSignatureIndex] = useState(0);
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadContract();
  }, [contractId]);

  // Removed auto-scroll to signature section as it was making the page unusable
  // Users can manually scroll to signatures if needed

  useEffect(() => {
    if (contractJson) {
      setEmailSubject(`Contract: ${contractJson.title}`);
      setEmailMessage(`Dear [Recipient Name],

Please find attached the contract for your review and signature.

Best regards,
[Your Name]`);
    }
  }, [contractJson]);

  const loadContract = async () => {
    try {
      const response = await fetch(`/api/contracts/${contractId}`);
      if (response.ok) {
        const data = await response.json();
        const contractData = data.contract || data; // Handle different response formats
        setContract(contractData);
        
        console.log('Loaded contract data:', contractData);
        
        if (contractData.content) {
          if (typeof contractData.content === 'string') {
            setContractJson(JSON.parse(contractData.content));
          } else {
            setContractJson(contractData.content);
          }
        } else {
          console.error('No content found in contract data:', contractData);
        }
      } else {
        console.error('Failed to load contract:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading contract:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignatureClick = (signatureIndex: number) => {
    setCurrentSignatureIndex(signatureIndex);
    setShowSignatureModal(true);
  };

  const handleSignatureSave = (signatureData: SignatureData) => {
    const newSignatures = [...signatures];
    newSignatures[currentSignatureIndex] = signatureData;
    setSignatures(newSignatures);
    setShowSignatureModal(false);
  };

  const handleRedoSignature = (signatureIndex: number) => {
    setCurrentSignatureIndex(signatureIndex);
    setShowSignatureModal(true);
  };

  const handleSendContract = async () => {
    if (!recipientEmail.trim() || !contractJson) return;
    
    setIsSending(true);
    try {
      const response = await contractApi.sendContract(contractId, contractJson, recipientEmail);
      if (response.success) {
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error sending contract:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    // TODO: Implement save as template functionality
    console.log('Save as template');
    setShowSuccessModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header authenticated={isAuthenticated} />
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!contractJson) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header authenticated={isAuthenticated} />
        <div className="flex items-center justify-center flex-1">
          <div className="text-gray-500">Contract not found</div>
        </div>
      </div>
    );
  }

  const contractText = contractJson.blocks?.[0]?.text || '';

  return (
    <div className="min-h-screen flex flex-col">
      <Header authenticated={isAuthenticated} />
      
      <div className="flex flex-1 bg-gray-50 h-[calc(100vh-4rem)]">
        {/* Left: Contract with Signature Blocks */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">

            {/* Contract Text */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
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

            {/* Signature Section */}
            <div id="signature-section" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Signatures</h2>
              
              <div className="space-y-6">
                {/* Your Signature */}
                <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                  <h3 className="text-lg font-medium text-blue-900 mb-4">Your Signature</h3>
                  
                  {signatures[0] ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Name:</span>
                        <span className="text-gray-900">{signatures[0].name}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Date:</span>
                        <span className="text-gray-900">{signatures[0].date}</span>
                      </div>
                      
                      <div className="border border-gray-300 rounded p-4 bg-white">
                        <img 
                          src={signatures[0].img_url} 
                          alt="Your signature" 
                          className="max-w-full h-16 object-contain"
                        />
                      </div>
                      
                      <button
                        onClick={() => handleRedoSignature(0)}
                        className="text-red-600 hover:text-red-800 hover:underline text-sm font-medium"
                      >
                        Redo Signature
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSignatureClick(0)}
                      className="w-full py-4 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:border-blue-400 hover:text-blue-700 transition-colors"
                    >
                      Click to Sign
                    </button>
                  )}
                </div>

                {/* Counterparty Signature */}
                <div className="border-2 border-red-200 rounded-lg p-6 bg-red-50">
                  <h3 className="text-lg font-medium text-red-900 mb-4">Counterparty Signature</h3>
                  
                  {signatures[1] ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Name:</span>
                        <span className="text-gray-900">{signatures[1].name}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Date:</span>
                        <span className="text-gray-900">{signatures[1].date}</span>
                      </div>
                      
                      <div className="border border-gray-300 rounded p-4 bg-white">
                        <img 
                          src={signatures[1].img_url} 
                          alt="Counterparty signature" 
                          className="max-w-full h-16 object-contain"
                        />
                      </div>
                      
                      <button
                        onClick={() => handleRedoSignature(1)}
                        className="text-red-600 hover:text-red-800 hover:underline text-sm font-medium"
                      >
                        Redo Signature
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSignatureClick(1)}
                      className="w-full py-4 border-2 border-dashed border-red-300 rounded-lg text-red-600 hover:border-red-400 hover:text-red-700 transition-colors"
                    >
                      Click to Sign
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Send Panel */}
        <div className="w-96 bg-white border-l border-gray-200 p-6">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Send Contract</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Message
                </label>
                <textarea
                  rows={6}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            
            <button
              onClick={handleSendContract}
              disabled={signatures.length < 2 || !recipientEmail.trim() || isSending}
              className="w-full py-4 text-white rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg bg-black hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg font-medium"
            >
              {isSending ? 'Sending...' : 'Send Contract →'}
            </button>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal
          onClose={() => setShowSignatureModal(false)}
          onSave={handleSignatureSave}
        />
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onSaveAsTemplate={handleSaveAsTemplate}
      />
    </div>
  );
} 