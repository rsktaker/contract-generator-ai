'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Help() {
  const router = useRouter();
  
  const faqs = [
    {
      question: "How do I create a new contract?",
      answer: "Simply navigate to the contract creation page and type what kind of contract you need. For example, 'create an NDA' or 'make a service agreement'. Our AI will instantly generate a professional contract with proper legal structure.",
      category: "Getting Started"
    },
    {
      question: "What types of contracts can I generate?",
      answer: "We support various business contracts including NDAs (Non-Disclosure Agreements), Service Agreements, Employment Contracts, Partnership Agreements, and custom contract types. Each follows proper legal standards and includes all necessary clauses.",
      category: "Contract Types"
    },
    {
      question: "How do I fill out the bracketed placeholders?",
      answer: "After generating a contract, you'll see placeholder fields like [Your Name] or [Company Name]. Simply chat with our AI assistant and provide the specific information. For example, say 'My name is John Smith and my company is ABC Corp' and the AI will update the contract immediately.",
      category: "Editing"
    },
    {
      question: "Can I edit contracts after they're generated?",
      answer: "Yes! You can make changes by chatting with the AI assistant. Ask for specific modifications like 'change the duration to 2 years' or 'add a termination clause'. The AI will regenerate the contract with your changes while maintaining legal compliance.",
      category: "Editing"
    },
    {
      question: "Are the contracts legally binding?",
      answer: "Our contracts are generated using comprehensive legal standards and follow US business law requirements. However, we recommend having any contract reviewed by a qualified attorney before signing, especially for complex or high-value agreements.",
      category: "Legal"
    },
    {
      question: "How do I share contracts with other parties?",
      answer: "Once your contract is finalized, you can send it directly to other parties via email. They'll receive a secure link to review and sign the document electronically if needed.",
      category: "Sharing"
    },
    {
      question: "What happens to my past conversations?",
      answer: "All your contract conversations are saved and can be accessed through the 'Past Chats' button in the chat interface. This allows you to continue working on contracts or reference previous discussions.",
      category: "Account"
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we take security seriously. All contract data is encrypted and stored securely. We never share your contract content with third parties and follow industry-standard security practices.",
      category: "Security"
    },
    {
      question: "Can I generate contracts on mobile?",
      answer: "Absolutely! Our platform is fully responsive and works seamlessly on mobile devices. You can create, edit, and manage contracts from your phone or tablet.",
      category: "Technical"
    },
    {
      question: "What if I need help with a specific contract clause?",
      answer: "Our AI assistant is trained on comprehensive legal guidelines and can help explain contract clauses or suggest improvements. You can also ask questions like 'what does this liability clause mean?' for clarification.",
      category: "Support"
    }
  ];


  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about creating, editing, and managing contracts with our AI-powered platform.
            </p>
          </div>
        </div>

        {/* Quick Start Guide */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">🚀 Quick Start Guide</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800">
            <ol className="list-decimal list-inside space-y-2">
              <li>Navigate to the contract creation page</li>
              <li>Tell our AI what kind of contract you need (e.g., "create an NDA")</li>
              <li>Review the generated contract and fill in bracketed placeholders</li>
              <li>Use the chat feature to make any adjustments</li>
              <li>Share or download your finalized contract</li>
            </ol>
          </CardContent>
        </Card>


        {/* FAQ List */}
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">
                  {faq.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Support */}
        <Card className="mt-12 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">Still need help?</CardTitle>
          </CardHeader>
          <CardContent className="text-green-800">
            <p className="mb-3">
              If you can't find the answer you're looking for, our AI assistant in the chat interface 
              is always ready to help with specific questions about your contracts.
            </p>
            <p className="text-sm">
              For technical support or account issues, you can also reach out through your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
