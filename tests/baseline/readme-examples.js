/**
 * Baseline Test Suite: README Examples
 *
 * Purpose: Document and validate all redirect examples from README.md
 * Baseline: MV2 v3.5.4
 * Date: 2025-12-22
 *
 * Constitution Principle V: "Test Obsessively - High-Risk Surgery"
 *
 * This test suite establishes ground truth for regression detection.
 * MV3 migration MUST pass all these tests identically to MV2.
 */

const README_EXAMPLES = {

  /**
   * Test 1: De-mobilizer
   * Always show desktop version of websites by removing 'm.' subdomain
   */
  demobilizer: {
    description: "Always show the desktop version of websites",
    patternType: "Regular Expression",
    includePattern: "^(https?://)([a-z0-9-]*\\.)m(?:obile)?\\.(.*)",
    redirectTo: "$1$2$3",
    testCases: [
      {
        input: "https://en.m.wikipedia.org/",
        expected: "https://en.wikipedia.org/",
        description: "Remove 'm.' from Wikipedia mobile"
      },
      {
        input: "https://en.m.wikipedia.org/wiki/Test",
        expected: "https://en.wikipedia.org/wiki/Test",
        description: "Remove 'm.' with path"
      },
      {
        input: "http://m.example.com/page",
        expected: "http://example.com/page",
        description: "Remove 'm.' from generic mobile site"
      },
      {
        input: "https://sub.mobile.example.com/",
        expected: "https://sub.example.com/",
        description: "Remove 'mobile.' variant"
      }
    ]
  },

  /**
   * Test 2: AMP Redirect
   * Remove Google/Bing AMP proxy and go directly to original site
   */
  ampRedirect: {
    description: "AMP is bad - redirect to original site",
    patternType: "Regular Expression",
    includePattern: "^(?:https?://)www.(?:google|bing).com/amp/(?:s/)?(.*)",
    redirectTo: "https://$1",
    testCases: [
      {
        input: "https://www.google.com/amp/www.example.com/amp/document",
        expected: "https://www.example.com/amp/document",
        description: "Remove Google AMP proxy"
      },
      {
        input: "https://www.google.com/amp/s/www.example.com/page",
        expected: "https://www.example.com/page",
        description: "Remove Google AMP proxy with /s/ variant"
      },
      {
        input: "https://www.bing.com/amp/example.org/article",
        expected: "https://example.org/article",
        description: "Remove Bing AMP proxy"
      }
    ]
  },

  /**
   * Test 3: Doubleclick Escaper
   * Remove doubleclick tracking and go directly to destination
   */
  doubleclickEscaper: {
    description: "Remove doubleclick link tracking",
    patternType: "Regular Expression",
    includePattern: "^(?:https?://)ad.doubleclick.net/.*\\?(http?s://.*)",
    redirectTo: "$1",
    testCases: [
      {
        input: "https://ad.doubleclick.net/ddm/trackclk/N135005.2681608PRIVATENETWORK/B20244?https://www.example.com",
        expected: "https://www.example.com",
        description: "Extract destination from doubleclick tracking URL"
      },
      {
        input: "http://ad.doubleclick.net/click/N12345.67890TRACKING/B98765?http://destination.com/page",
        expected: "http://destination.com/page",
        description: "Extract HTTP destination from tracking"
      }
    ]
  },

  /**
   * Test 4: YouTube Shorts to Regular YouTube
   * Convert YouTube Shorts URLs to regular watch URLs
   * NOTE: Uses historyState request type (special handling)
   */
  youtubeShortsToWatch: {
    description: "Redirect YouTube Shorts to regular YouTube",
    patternType: "Regular Expression",
    includePattern: "^(?:https?://)(?:www.)?youtube.com/shorts/([a-zA-Z0-9_-]+)(.*)",
    redirectTo: "https://www.youtube.com/watch?v=$1$2",
    advancedOptions: {
      requestTypes: ["history"], // historyState - SPA navigation
    },
    testCases: [
      {
        input: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        expected: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        description: "Convert Shorts URL to watch URL"
      },
      {
        input: "https://youtube.com/shorts/abc123XYZ",
        expected: "https://www.youtube.com/watch?v=abc123XYZ",
        description: "Convert without www subdomain"
      },
      {
        input: "https://www.youtube.com/shorts/videoID?feature=share",
        expected: "https://www.youtube.com/watch?v=videoID?feature=share",
        description: "Preserve query parameters"
      }
    ]
  },

  /**
   * Test 5: DuckDuckGo !bang on Google
   * Redirect Google searches with !bangs to DuckDuckGo
   */
  ddgBangOnGoogle: {
    description: "Redirect any Google query with a !bang to DDG",
    patternType: "Regular Expression",
    includePattern: "^(?:https?://)(?:www.)google\\.(?:com|au|de|co\\.uk)/search\\?(?:.*)?(?:oq|q)=([^\\&]*\\+)?((?:%21|!)[^\\&]*)",
    redirectTo: "https://duckduckgo.com/?q=$1$2",
    testCases: [
      {
        input: "https://www.google.com/search?&ei=-FvkXcOVMo6RRwW5p5DgBg&q=test%21wiki&oq=test%21wiki&gs_l=xyz",
        expected: "https://duckduckgo.com/?q=test%21wiki",
        description: "Redirect Google search with !bang to DDG"
      },
      {
        input: "https://www.google.com/search?q=foo+bar+%21google",
        expected: "https://duckduckgo.com/?q=foo+bar+%21google",
        description: "Redirect with URL-encoded bang"
      }
    ]
  },

  /**
   * Test 6: Custom DDG !bang with URL decode
   * Example: !ghh bang for git history viewer
   * NOTE: Uses URL decode processing option
   */
  ddgGhhBang: {
    description: "Create new !ghh bang that redirects to githistory.xyz",
    patternType: "Regular Expression",
    includePattern: "^(?:https?://)duckduckgo.com/\\?q=(?:(?:%21|!)ghh\\+)(?:.*)(github|gitlab|bitbucket)(?:\\.org|\\.com)(.*?(?=\\&))",
    redirectTo: "https://$1.githistory.xyz$2",
    advancedOptions: {
      processMatches: ["urlDecode"], // URL decode before substitution
    },
    testCases: [
      {
        input: "https://duckduckgo.com/?q=%21ghh+https%3A%2F%2Fgithub.com%2Fbabel%2Fbabel%2Fblob%2Fmaster%2Fpackages%2Fbabel-core%2FREADME.md&test=value",
        expected: "https://github.githistory.xyz/babel/babel/blob/master/packages/babel-core/README.md",
        description: "Decode URL-encoded GitHub path and redirect to githistory"
      }
    ]
  },

  /**
   * Test 7: Fast DDG !google bang
   * Skip DDG intermediary and go directly to Google search
   */
  fastDdgGoogleBang: {
    description: "DuckDuckGo → Google !bang shortcut",
    patternType: "Regular Expression",
    includePattern: "^https://duckduckgo\\.com/\\?q=(.*?)\\+?(?:%21|!)google\\b\\+?(.*?)(?:&|$)",
    redirectTo: "https://google.com/search?hl=en&q=$1$2",
    testCases: [
      {
        input: "https://duckduckgo.com/?q=foo+bar+%21google+test+bar",
        expected: "https://google.com/search?hl=en&q=foo+bar+test+bar",
        description: "Fast redirect with terms before and after !google"
      },
      {
        input: "https://duckduckgo.com/?q=test+query+%21google",
        expected: "https://google.com/search?hl=en&q=test+query+",
        description: "Fast redirect with terms before !google only"
      }
    ]
  }
};

/**
 * Test Runner (Manual Testing Guide)
 *
 * To validate MV2 baseline:
 * 1. Load Redirector MV2 v3.5.4 in Chrome (developer mode)
 * 2. Create each redirect rule from README_EXAMPLES
 * 3. Navigate to each testCase.input URL
 * 4. Verify redirect to testCase.expected URL
 * 5. Record any failures or differences
 *
 * To validate MV3 migration:
 * 1. Load Redirector MV3 v4.0.0-beta.1
 * 2. Import same redirect rules (or migrate automatically)
 * 3. Navigate to each testCase.input URL
 * 4. Verify redirect to testCase.expected URL
 * 5. Compare behavior to MV2 baseline - MUST be identical
 *
 * Success Criteria:
 * ✅ All test cases redirect correctly
 * ✅ MV3 behavior matches MV2 byte-for-byte
 * ✅ Advanced options (historyState, URL decode) work identically
 * ✅ No console errors, no failures
 */

/**
 * Expected Results (MV2 Baseline)
 *
 * Run date: [TO BE FILLED]
 * Chrome version: [TO BE FILLED]
 * Redirector version: 3.5.4
 *
 * Results:
 * - Test 1 (De-mobilizer): [ ] PASS / [ ] FAIL - Notes: _______
 * - Test 2 (AMP Redirect): [ ] PASS / [ ] FAIL - Notes: _______
 * - Test 3 (Doubleclick): [ ] PASS / [ ] FAIL - Notes: _______
 * - Test 4 (YouTube Shorts): [ ] PASS / [ ] FAIL - Notes: _______
 * - Test 5 (DDG !bang on Google): [ ] PASS / [ ] FAIL - Notes: _______
 * - Test 6 (DDG !ghh with URL decode): [ ] PASS / [ ] FAIL - Notes: _______
 * - Test 7 (Fast DDG !google): [ ] PASS / [ ] FAIL - Notes: _______
 *
 * Overall: [ ] ALL PASS (baseline established) / [ ] FAILURES (investigate)
 */

/**
 * Export for automated testing (future)
 *
 * This structure can be converted to automated tests using:
 * - Puppeteer for headless browser testing
 * - WebExtension testing framework
 * - Manual QA checklist for beta testing
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = README_EXAMPLES;
}
