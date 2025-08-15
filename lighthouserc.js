module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:50066/',
        'http://localhost:50066/login',
        'http://localhost:50066/files',
        'http://localhost:50066/search'
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        skipAudits: [
          'canonical', // Not relevant for SPA
          'maskable-icon', // PWA feature not yet implemented
          'installable-manifest', // PWA feature not yet implemented
        ]
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        
        // Performance metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        
        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        
        // Best practices
        'is-on-https': 'off', // We're testing locally
        'uses-http2': 'off', // Local testing doesn't use HTTP/2
        'no-vulnerable-libraries': 'warn',
        
        // SEO
        'meta-description': 'warn',
        'document-title': 'error'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};