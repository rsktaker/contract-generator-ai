'use client'

// app/page.tsx
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'
import Typewriter from 'typewriter-effect'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const [email, setEmail] = useState('')
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Newsletter signup logic would go here
    console.log('Newsletter signup:', email)
    setEmail('')
    alert('Thank you for subscribing to DreamSign updates!')
  }

  const handleGenerateContract = async () => {
    if (!prompt.trim()) {
      alert('Please enter a description of the contract you need.')
      return
    }

    console.log('[LANDING-PAGE] Generate button clicked, setting loading state...');
    setIsGenerating(true)

    // Create contract first, then redirect immediately
    try {
      console.log('[LANDING-PAGE] Making API call to /api/contracts/generate...');
      const response = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
        }),
      });

      console.log('[LANDING-PAGE] API response received, status:', response.status);

      if (response.ok) {
        const { contract } = await response.json();
        console.log('[LANDING-PAGE] Contract created with ID:', contract._id);
        
        // Navigate immediately - don't wait for anything else
        const encodedPrompt = encodeURIComponent(prompt.trim());
        const redirectUrl = `/contracts/${contract._id}?prompt=${encodedPrompt}`;
        console.log('[LANDING-PAGE] Redirecting to:', redirectUrl);
        
        router.push(redirectUrl);
        return; // Exit immediately after navigation
      } else {
        console.error('[LANDING-PAGE] API error response:', response.status);
        const errorData = await response.json();
        alert(errorData.message || "Failed to generate contract. Please try again.");
      }
    } catch (error) {
      console.error("[LANDING-PAGE] Error in handleGenerateContract:", error);
      alert("An error occurred while generating the contract. Please try again.");
    }
    
    console.log('[LANDING-PAGE] Resetting loading state...');
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header authenticated={isAuthenticated} />
      <main className="flex-1 bg-gray-50">
        {/* Hero Section */}
        <div className="bg-white min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden">
          <style jsx>{`
            @keyframes gradientShift {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
          `}</style>
          
          {/* Radial Gradient Dot Pattern Background */}
          <div className="absolute inset-0 h-full w-full bg-transparent bg-[radial-gradient(#2563EB50_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)] z-0"></div>
          
          <div className="w-full max-w-3.5xl mx-auto px-4 py-8 md:py-16 relative z-10">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl mt-10 font-bold text-gray-900 mb-6 md:mb-10">
                <Typewriter
                  onInit={(typewriter) => {
                    typewriter
                      .typeString('Make Contracts with AI.')
                      .pauseFor(2000)
                      .callFunction(() => {
                        // Remove cursor after 2 seconds
                        const cursor = document.querySelector('.Typewriter__cursor') as HTMLElement;
                        if (cursor) {
                          cursor.style.display = 'none';
                        }
                      })
                      .start();
                  }}
                  options={{
                    delay: 100,
                    cursor: '|',
                  }}
                />
              </h1>
              
              {/* Contract Generation Card */}
                <div className="space-y-6">
                  {/* Textarea with Generate Button below */}
                  <div className="w-full max-w-4xl mx-auto flex flex-col border border-gray-300 rounded-xl bg-white h-60 p-2 shadow-lg mt-10 mb-23">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="flex-1 bg-transparent outline-none resize-none text-[15px] p-6 h-full"
                      placeholder="Create a freelance contract between ABC Corp and John Smith for website development. $5,000 payment in two milestones, 6-week timeline."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerateContract();
                        }
                      }}
                    />
                    <div className="flex justify-end mt-1">
                      <button
                        onClick={handleGenerateContract}
                        disabled={isGenerating}
                        className="group relative px-5 py-3 mr-2 mb-2 rounded-full font-medium text-white border-2 border-transparent overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        style={{
                          backgroundImage: 'linear-gradient(#2563eb, #2563eb), linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3, #54a0ff, #5f27cd)',
                          backgroundOrigin: 'padding-box, border-box',
                          backgroundClip: 'padding-box, border-box',
                          backgroundSize: '400% 400%',
                          animation: 'gradientShift 3s ease infinite',
                        }}
                      >
                        <span className="relative z-10 text-center text-md flex items-center gap-2">
                          {isGenerating ? (
                            <span className="flex items-center gap-1">
                              Generating
                              <span className="flex mt-1.5 gap-1">
                                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </span>
                            </span>
                          ) : (
                            <>
                              Generate
                              <svg 
                                className="w-4 h-4 transition-transform group-hover:translate-x-1" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </>
                          )}
                        </span>
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                      </button>
                    </div>
                  </div>
                </div>
              
              
              {/* Credit Card Text */}
              <p className="text-gray-600 text-lg font-thin inline-block mt-30" style={{ fontFamily: 'Poppins, sans-serif' }}>
                No Credit Card or Sign Up Required.
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Why Choose DreamSign?
              </h2>
              <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
                Our AI-powered platform rolls contract creation and eSignature into one simple, fast, and reliable experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="bg-white rounded-lg shadow-md p-4 md:p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4 hidden md:flex">
                  <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3">Lightning Fast</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Generate comprehensive contracts in minutes, not hours, with our frictionless agentic workflow. 
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 md:p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 hidden md:flex">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3">Legally Binding</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  All contracts ensure proper legal structure to protect your interests and employ cyrptography to securely create eSignatures.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 md:p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 hidden md:flex">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3">Fully Customizable</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Tailor every contract to your specific needs with custom clauses and requirements entered manually or generated by our AI.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gray-50 py-12 md:py-30">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
              <div>
                <div className="text-2xl md:text-3xl font-bold text-black mb-1 md:mb-2">10,000+</div>
                <div className="text-gray-600 text-sm md:text-base">Contracts Generated</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-green-600 mb-1 md:mb-2">95%</div>
                <div className="text-gray-600 text-sm md:text-base">Time Saved</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-purple-600 mb-1 md:mb-2">24/7</div>
                <div className="text-gray-600 text-sm md:text-base">AI Availability</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-orange-600 mb-1 md:mb-2">1 Min</div>
                <div className="text-gray-600 text-sm md:text-base">Average Generation Time</div>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Types Section */}
        <div className="bg-white py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Supported Contract Types
              </h2>
              <p className="text-gray-600 text-base md:text-lg">
                Create any type of contract with our comprehensive AI system
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[
                { name: 'Service Agreement', desc: 'Professional service contracts with payment terms and deliverables' },
                { name: 'Non-Disclosure Agreement', desc: 'Protect confidential information and trade secrets' },
                { name: 'Employment Contract', desc: 'Comprehensive employment terms and conditions' },
                { name: 'Lease Agreement', desc: 'Residential and commercial property leases' },
                { name: 'Partnership Agreement', desc: 'Business partnership terms and profit sharing' },
                { name: 'Custom Contract', desc: 'Any other type of legal agreement you need' }
              ].map((contract, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 mb-2 text-base md:text-lg">{contract.name}</h3>
                  <p className="text-gray-600 text-sm md:text-base">{contract.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-6 md:mt-8">
              <Link
                href="/"
                className="inline-flex items-center px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-800 active:bg-blue-700 transition-colors font-semibold text-sm md:text-base"
              >
                Start Creating
                <svg className="ml-2 w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        
{/* 
        CTA Section
        <div className="bg-black py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Create Your Contract?
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              Join thousands of professionals who trust DreamSign for their contract needs
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-4 bg-white text-black rounded-md hover:bg-gray-100 transition-colors font-semibold text-lg"
            >
              Get Started Now
            </Link>
          </div>
        </div> */}

        {/* Newsletter Section */}
        <div className="bg-white py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
              Stay Updated with DreamSign
            </h2>
            <p className="text-gray-600 mb-6 md:mb-8 text-sm md:text-base">
              Get the latest updates on new features, legal insights, and contract templates
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 md:gap-4 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-black text-sm md:text-base"
                required
              />
              <button
                type="submit"
                className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-800 active:bg-blue-700 transition-colors font-semibold text-sm md:text-base"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
