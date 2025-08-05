'use client'

// components/Header.tsx
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface HeaderProps {
  authenticated?: boolean
}

export default function Header({ authenticated = true }: HeaderProps) {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if user is admin
  useEffect(() => {
    if (session?.user?.email) {
      checkAdminStatus()
    }
  }, [session])

  const checkAdminStatus = async () => {
    try {
      const res = await fetch('/api/admin/check')
      if (res.ok) {
        setIsAdmin(true)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false)
      }
      if (!target.closest('.mobile-menu-container')) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-full mx-auto px-2 sm:px-3 lg:px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}  
          <Link href="/" className="flex items-center space-x-2 ml-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-lg font-[550] text-black">ContractGenerator.ai</span>
            </Link>

          {authenticated ? (
            <>
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                {/* <Link 
                  href="/dashboard" 
                  className="px-4 py-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium"
                >
                  Dashboard
                </Link> */}
                <Link 
                  href="/contracts" 
                  className="px-4 py-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium"
                >
                  Dashboard
                </Link>
                {/**
                 * Removed the admin dashboard button (because it's off-putting to user, and admins can just manually append)
                 */}
                
                <div className="ml-4 pl-4 border-l border-gray-200">
                  <Link
                    href="/contracts/new"
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all text-sm font-medium shadow-sm hover:shadow active:shadow-md"
                  >
                    Create Contract
                  </Link>
                </div>

                {/* User Menu */}
                <div className="ml-3 relative user-menu-container">
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 active:text-gray-900 transition-all p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100"
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{session?.user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500">{session?.user?.email}</p>
                      </div>
                      <button 
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </nav>

              {/* Mobile Menu Button */}
              <div className="md:hidden mobile-menu-container">
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-gray-600 hover:text-gray-900 active:text-gray-900 p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            /* Unauthenticated Header */
            <nav className="flex items-center space-x-0.5">
              <Link 
                href="/api/auth/signin/google"
                className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-all"
                title="Sign in with Google"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </Link>
              <Link 
                href="/auth/signin" 
                className="px-2 md:px-3 py-2 rounded-lg text-gray-700 hover:text-gray-900 active:bg-gray-100 active:text-gray-900 transition-all text-sm md:text-base font-medium hover:underline"
              >
                Log in / Sign Up
              </Link>
            </nav>
          )}
        </div>
      </div>

      {/* Mobile Menu - Authenticated Users */}
      {authenticated && isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-2 py-2 space-y-1 flex flex-col justify-center min-h-[200px]">
            {/* <Link 
              href="/dashboard" 
              className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 active:text-gray-900 transition-all"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
            </Link> */}
            <Link 
              href="/contracts" 
              className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 active:text-gray-900 transition-all"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            
            <div className="pt-1">
              <Link 
                href="/contracts/new" 
                className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Create Contract
              </Link>
            </div>
            
            <hr className="my-2" />
            
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-gray-900">{session?.user?.name || 'User'}</p>
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
            </div>
            
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false)
                handleSignOut()
              }}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 active:text-gray-900 transition-all"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  )
}