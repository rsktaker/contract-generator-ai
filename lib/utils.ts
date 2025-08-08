import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Detects if the user is in an embedded browser (WebView, in-app browser, etc.)
 * This is useful for redirecting users to the main site for OAuth flows
 * that don't work properly in embedded browsers.
 */
export function isEmbeddedBrowser(): boolean {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  
  // Check for common embedded browser indicators
  const embeddedIndicators = [
    'wv', // Android WebView
    'webview',
    'instagram',
    'fbav', // Facebook in-app browser
    'fban', // Facebook in-app browser
    'twitter',
    'linkedin',
    'whatsapp',
    'telegram',
    'snapchat',
    'tiktok',
    'line',
    'wechat',
    'qq',
    'ucbrowser',
    'opera mini',
    'opera touch',
    'samsungbrowser',
    'miuibrowser',
    'huaweibrowser',
    'edgewebview',
    'ms-appx-webview',
    'cordova',
    'phonegap',
    'ionic',
    'capacitor'
  ]
  
  // Additional checks for LinkedIn specifically
  const isLinkedIn = userAgent.includes('linkedin') || 
                    (window as any).LinkedInApp || 
                    (window as any).linkedin
  
  // Check if we're in a WebView or iframe
  const isInWebView = (window as any).ReactNativeWebView || 
                     (window as any).webkit?.messageHandlers ||
                     window.self !== window.top
  
  return embeddedIndicators.some(indicator => userAgent.includes(indicator)) || 
         isLinkedIn || 
         isInWebView
}

/**
 * Specifically detects LinkedIn embedded browser
 */
export function isLinkedInBrowser(): boolean {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  return userAgent.includes('linkedin') || 
         (window as any).LinkedInApp || 
         (window as any).linkedin ||
         window.self !== window.top // LinkedIn often uses iframes
}

/**
 * Ultra-aggressive LinkedIn redirect that tries every possible method
 */
export function forceLinkedInRedirect(url: string): void {
  if (typeof window === 'undefined') return
  
  // Method 1: Try LinkedIn's custom URL scheme
  try {
    window.location.href = `linkedin://open?url=${encodeURIComponent(url)}`
  } catch (error) {
    // Continue to next method
  }
  
  // Method 2: Try with _system target (works in some WebViews)
  try {
    window.open(url, '_system')
  } catch (error) {
    // Continue to next method
  }
  
  // Method 3: Try with a delay to bypass restrictions
  setTimeout(() => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      window.location.href = url
    }
  }, 50)
  
  // Method 4: Try immediate location change
  try {
    window.location.replace(url)
  } catch (error) {
    window.location.href = url
  }
  
  // Method 5: Try creating a link and clicking it programmatically
  setTimeout(() => {
    try {
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      // Final fallback
      window.location.href = url
    }
  }, 100)
}

/**
 * Redirects to the main site (dreamsign.ai) with Google OAuth already initiated.
 * This is used when users are in embedded browsers where OAuth flows don't work properly.
 * The main site will automatically redirect to Google OAuth when accessed with provider=google.
 */
export function redirectToMainSiteWithGoogleAuth(callbackUrl?: string): void {
  if (typeof window === 'undefined') return
  
  const baseUrl = 'https://dreamsign.ai'
  const autoAuthPath = '/api/auth/auto-google'
  const googleAuthUrl = `${baseUrl}${autoAuthPath}?provider=google`
  
  // Add callback URL if provided
  const finalUrl = callbackUrl 
    ? `${googleAuthUrl}&callbackUrl=${encodeURIComponent(callbackUrl)}`
    : googleAuthUrl
  
  // Try multiple methods to ensure the redirect works in embedded browsers
  try {
    // Method 1: Try to open in new window/tab (most reliable for embedded browsers)
    const newWindow = window.open(finalUrl, '_blank', 'noopener,noreferrer')
    
    // Method 2: If window.open fails or is blocked, try direct navigation
    if (!newWindow || newWindow.closed) {
      window.location.href = finalUrl
    }
  } catch (error) {
    // Method 3: Fallback to direct navigation
    window.location.href = finalUrl
  }
}

/**
 * Force redirect to main site with Google OAuth - use this when you want to ensure
 * the user gets to the main site regardless of browser detection
 */
export function forceRedirectToMainSiteWithGoogleAuth(callbackUrl?: string): void {
  if (typeof window === 'undefined') return
  
  const baseUrl = 'https://dreamsign.ai'
  const autoAuthPath = '/api/auth/auto-google'
  const googleAuthUrl = `${baseUrl}${autoAuthPath}?provider=google`
  
  // Add callback URL if provided
  const finalUrl = callbackUrl 
    ? `${googleAuthUrl}&callbackUrl=${encodeURIComponent(callbackUrl)}`
    : googleAuthUrl
  
  // LinkedIn-specific handling - try multiple approaches
  if (isLinkedInBrowser()) {
    // Method 1: Try LinkedIn's own URL opening mechanism
    try {
      // LinkedIn sometimes supports this pattern
      window.location.href = `linkedin://open?url=${encodeURIComponent(finalUrl)}`
      return
    } catch (error) {
      // Continue to other methods
    }
    
    // Method 2: Try with a delay to bypass restrictions
    setTimeout(() => {
      try {
        window.open(finalUrl, '_system')
      } catch (error) {
        window.location.href = finalUrl
      }
    }, 100)
    
    // Method 3: Try immediate fallback
    try {
      window.open(finalUrl, '_system')
    } catch (error) {
      window.location.href = finalUrl
    }
    
    return
  }
  
  // For other embedded browsers
  try {
    // Method 1: Try window.open first (most reliable for embedded browsers)
    const newWindow = window.open(finalUrl, '_blank', 'noopener,noreferrer')
    
    // Method 2: If that fails, use location.replace for a more forceful redirect
    if (!newWindow || newWindow.closed) {
      window.location.replace(finalUrl)
    }
  } catch (error) {
    // Method 3: Final fallback - try multiple approaches
    try {
      window.location.replace(finalUrl)
    } catch {
      window.location.href = finalUrl
    }
  }
}

// AI SDK Tool Processing Functions

/**
 * Processes tool invocations where human input is required, executing tools when authorized.
 *
 * @param options - The function options
 * @param options.tools - Map of tool names to Tool instances that may expose execute functions
 * @param options.writer - UIMessageStream writer for sending results back to the client
 * @param options.messages - Array of messages to process
 * @param executionFunctions - Map of tool names to execute functions
 * @returns Promise resolving to the processed messages
 */

import {
  convertToModelMessages,
  Tool,
  ToolCallOptions,
  ToolSet,
  UIMessageStreamWriter,
  getToolName,
  isToolUIPart,
} from 'ai';
import { HumanInTheLoopUIMessage } from './types';

// Approval string to be shared across frontend and backend
export const APPROVAL = {
  YES: 'Yes, confirmed.',
  NO: 'No, denied.',
} as const;

function isValidToolName<K extends PropertyKey, T extends object>(
  key: K,
  obj: T,
): key is K & keyof T {
  return key in obj;
}

export async function processToolCalls<
  Tools extends ToolSet,
  ExecutableTools extends {
    [Tool in keyof Tools as Tools[Tool] extends { execute: Function }
      ? never
      : Tool]: Tools[Tool];
  },
>(
  {
    writer,
    messages,
  }: {
    tools: Tools;
    writer: UIMessageStreamWriter;
    messages: HumanInTheLoopUIMessage[];
  },
  executeFunctions: {
    [K in keyof Tools & keyof ExecutableTools]?: (
      args: ExecutableTools[K] extends Tool<infer P> ? P : never,
      context: ToolCallOptions,
    ) => Promise<any>;
  },
): Promise<HumanInTheLoopUIMessage[]> {
  const lastMessage = messages[messages.length - 1];
  const parts = lastMessage.parts;
  if (!parts) return messages;

  const processedParts = await Promise.all(
    parts.map(async part => {
      if (!isToolUIPart(part)) return part;

      const toolName = getToolName(part);

      if (!(toolName in executeFunctions) || part.state !== 'output-available')
        return part;

      let result;

      if (part.output === APPROVAL.YES) {
        if (
          !isValidToolName(toolName, executeFunctions) ||
          part.state !== 'output-available'
        ) {
          return part;
        }

        const toolInstance = executeFunctions[toolName] as Tool['execute'];
        if (toolInstance) {
          result = await toolInstance(part.input, {
            messages: convertToModelMessages(messages),
            toolCallId: part.toolCallId,
          });
        } else {
          result = 'Error: No execute function found on tool';
        }
      } else if (part.output === APPROVAL.NO) {
        result = 'Error: User denied access to tool execution';
      } else {
        return part;
      }

      writer.write({
        type: 'tool-output-available',
        toolCallId: part.toolCallId,
        output: result,
      });

      return {
        ...part,
        output: result,
      };
    }),
  );

  return [...messages.slice(0, -1), { ...lastMessage, parts: processedParts }];
}

export function getToolsRequiringConfirmation<T extends ToolSet>(tools: T): string[] {
  return (Object.keys(tools) as (keyof T)[]).filter(key => {
    const maybeTool = tools[key];
    return typeof maybeTool.execute !== 'function';
  }) as string[];
}
