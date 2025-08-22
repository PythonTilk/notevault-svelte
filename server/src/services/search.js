/**
 * Advanced Search Service
 * 
 * Provides full-text search with relevance ranking, advanced filters,
 * search analytics, and real-time suggestions across all content types.
 */

import { EventEmitter } from 'events';
import dbPool from '../config/database-optimized.js';
import { SECURITY_EVENTS, logSecurityEvent } from '../utils/logger.js';

class SearchService extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      enableAnalytics: process.env.SEARCH_ANALYTICS !== 'false',
      enableSuggestions: process.env.SEARCH_SUGGESTIONS !== 'false',
      maxSuggestions: parseInt(process.env.MAX_SUGGESTIONS || '10'),
      minQueryLength: parseInt(process.env.MIN_QUERY_LENGTH || '2'),
      maxResults: parseInt(process.env.MAX_SEARCH_RESULTS || '100'),
      enableFTS: process.env.ENABLE_FTS !== 'false', // Full-text search
      highlightContext: parseInt(process.env.HIGHLIGHT_CONTEXT || '50') // characters
    };

    // Search analytics
    this.searchAnalytics = {
      totalSearches: 0,
      popularQueries: new Map(),
      recentSearches: [],
      searchTrends: new Map(),
      avgResponseTime: 0,
      noResultsQueries: []
    };

    // Search result types and their weights for relevance scoring
    this.contentTypes = {
      notes: { weight: 1.0, table: 'notes', fields: ['title', 'content', 'tags'] },
      workspaces: { weight: 0.9, table: 'workspaces', fields: ['name', 'description'] },
      files: { weight: 0.8, table: 'files', fields: ['filename', 'original_name'] },
      users: { weight: 0.7, table: 'users', fields: ['display_name', 'email'] },
      chat: { weight: 0.6, table: 'chat_messages', fields: ['content'] }
    };

    this.initializeSearchTables();
    console.log('Advanced Search Service initialized');
  }

  /**
   * Initialize search-optimized tables and indexes
   */
  async initializeSearchTables() {
    try {
      if (this.config.enableFTS) {
        // Create FTS virtual tables for full-text search
        await this.createFTSTables();
      }
      
      // Create search analytics table
      await this.createAnalyticsTable();
      
      console.log('Search tables and indexes initialized');
    } catch (error) {
      console.error('Failed to initialize search tables:', error);
    }
  }

  /**
   * Create FTS (Full-Text Search) virtual tables
   */
  async createFTSTables() {
    const ftsQueries = [
      // Notes FTS
      `CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        id UNINDEXED, title, content, tags, author_id UNINDEXED, workspace_id UNINDEXED,
        content=notes, content_rowid=id
      )`,
      
      // Workspaces FTS
      `CREATE VIRTUAL TABLE IF NOT EXISTS workspaces_fts USING fts5(
        id UNINDEXED, name, description, owner_id UNINDEXED,
        content=workspaces, content_rowid=id
      )`,
      
      // Files FTS
      `CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
        id UNINDEXED, filename, original_name, uploaded_by UNINDEXED, workspace_id UNINDEXED,
        content=files, content_rowid=id
      )`,
      
      // Chat FTS
      `CREATE VIRTUAL TABLE IF NOT EXISTS chat_fts USING fts5(
        id UNINDEXED, content, author_id UNINDEXED, channel_id UNINDEXED,
        content=chat_messages, content_rowid=id
      )`
    ];

    for (const query of ftsQueries) {
      try {
        await dbPool.run(query);
      } catch (error) {
        console.warn('FTS table creation warning:', error.message);
      }
    }

    // Create triggers to keep FTS tables synchronized
    await this.createFTSTriggers();
  }

  /**
   * Create triggers to synchronize FTS tables
   */
  async createFTSTriggers() {
    const triggers = [
      // Notes triggers
      `CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, id, title, content, tags, author_id, workspace_id)
        VALUES (new.rowid, new.id, new.title, new.content, new.tags, new.author_id, new.workspace_id);
      END`,
      
      `CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, id, title, content, tags, author_id, workspace_id)
        VALUES('delete', old.rowid, old.id, old.title, old.content, old.tags, old.author_id, old.workspace_id);
      END`,
      
      `CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, id, title, content, tags, author_id, workspace_id)
        VALUES('delete', old.rowid, old.id, old.title, old.content, old.tags, old.author_id, old.workspace_id);
        INSERT INTO notes_fts(rowid, id, title, content, tags, author_id, workspace_id)
        VALUES (new.rowid, new.id, new.title, new.content, new.tags, new.author_id, new.workspace_id);
      END`,

      // Workspaces triggers
      `CREATE TRIGGER IF NOT EXISTS workspaces_ai AFTER INSERT ON workspaces BEGIN
        INSERT INTO workspaces_fts(rowid, id, name, description, owner_id)
        VALUES (new.rowid, new.id, new.name, new.description, new.owner_id);
      END`,
      
      `CREATE TRIGGER IF NOT EXISTS workspaces_ad AFTER DELETE ON workspaces BEGIN
        INSERT INTO workspaces_fts(workspaces_fts, rowid, id, name, description, owner_id)
        VALUES('delete', old.rowid, old.id, old.name, old.description, old.owner_id);
      END`,
      
      `CREATE TRIGGER IF NOT EXISTS workspaces_au AFTER UPDATE ON workspaces BEGIN
        INSERT INTO workspaces_fts(workspaces_fts, rowid, id, name, description, owner_id)
        VALUES('delete', old.rowid, old.id, old.name, old.description, old.owner_id);
        INSERT INTO workspaces_fts(rowid, id, name, description, owner_id)
        VALUES (new.rowid, new.id, new.name, new.description, new.owner_id);
      END`
    ];

    for (const trigger of triggers) {
      try {
        await dbPool.run(trigger);
      } catch (error) {
        console.warn('FTS trigger creation warning:', error.message);
      }
    }
  }

  /**
   * Create search analytics table
   */
  async createAnalyticsTable() {
    await dbPool.run(`
      CREATE TABLE IF NOT EXISTS search_analytics (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        query TEXT NOT NULL,
        user_id TEXT,
        results_count INTEGER DEFAULT 0,
        response_time INTEGER DEFAULT 0,
        filters TEXT, -- JSON
        content_types TEXT, -- JSON array
        clicked_result_id TEXT,
        clicked_result_type TEXT,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    await dbPool.run(`
      CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query)
    `);
    
    await dbPool.run(`
      CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id)
    `);
    
    await dbPool.run(`
      CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at)
    `);
  }

  /**
   * Perform advanced search across all content types
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Search results with metadata
   */
  async search(query, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate and sanitize query
      const sanitizedQuery = this.sanitizeQuery(query);
      if (!sanitizedQuery || sanitizedQuery.length < this.config.minQueryLength) {
        return this.emptySearchResult('Query too short or empty');
      }

      const {
        userId,
        contentTypes = Object.keys(this.contentTypes),
        filters = {},
        limit = 20,
        offset = 0,
        sortBy = 'relevance',
        includeHighlights = true,
        workspaceId = null
      } = options;

      // Check user permissions for workspace-specific search
      if (workspaceId && userId) {
        const hasAccess = await this.checkWorkspaceAccess(userId, workspaceId);
        if (!hasAccess) {
          throw new Error('Access denied to workspace');
        }
      }

      // Perform search across different content types
      const searchPromises = contentTypes.map(type => 
        this.searchContentType(sanitizedQuery, type, { 
          filters, 
          workspaceId, 
          userId,
          includeHighlights 
        })
      );

      const typeResults = await Promise.allSettled(searchPromises);
      
      // Combine and rank results
      const allResults = [];
      typeResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          allResults.push(...result.value.map(item => ({
            ...item,
            contentType: contentTypes[index],
            weight: this.contentTypes[contentTypes[index]].weight
          })));
        }
      });

      // Calculate relevance scores and sort
      const scoredResults = this.calculateRelevanceScores(allResults, sanitizedQuery);
      scoredResults.sort((a, b) => {
        if (sortBy === 'relevance') {
          return b.relevanceScore - a.relevanceScore;
        } else if (sortBy === 'date') {
          return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
        }
        return 0;
      });

      // Apply pagination
      const paginatedResults = scoredResults.slice(offset, offset + limit);

      // Create search result object
      const searchResult = {
        query: sanitizedQuery,
        results: paginatedResults,
        totalResults: scoredResults.length,
        hasMore: offset + limit < scoredResults.length,
        responseTime: Date.now() - startTime,
        facets: await this.generateFacets(scoredResults),
        suggestions: await this.generateSuggestions(sanitizedQuery),
        searchId: this.generateSearchId()
      };

      // Log search analytics
      if (this.config.enableAnalytics) {
        await this.logSearchAnalytics(sanitizedQuery, searchResult, options);
      }

      this.emit('search_completed', { query: sanitizedQuery, results: searchResult });
      return searchResult;

    } catch (error) {
      console.error('Search error:', error);
      
      await logSecurityEvent(SECURITY_EVENTS.SEARCH_ERROR, {
        query,
        error: error.message,
        userId: options.userId
      });

      throw error;
    }
  }

  /**
   * Search within a specific content type
   * @param {string} query - Search query
   * @param {string} contentType - Content type to search
   * @param {Object} options - Search options
   * @returns {Array} Search results
   */
  async searchContentType(query, contentType, options = {}) {
    const typeConfig = this.contentTypes[contentType];
    if (!typeConfig) {
      return [];
    }

    const { filters, workspaceId, userId, includeHighlights } = options;

    try {
      if (this.config.enableFTS) {
        return await this.searchWithFTS(query, contentType, typeConfig, options);
      } else {
        return await this.searchWithLike(query, contentType, typeConfig, options);
      }
    } catch (error) {
      console.error(`Search error for ${contentType}:`, error);
      return [];
    }
  }

  /**
   * Search using FTS (Full-Text Search)
   * @param {string} query - Search query
   * @param {string} contentType - Content type
   * @param {Object} typeConfig - Type configuration
   * @param {Object} options - Search options
   * @returns {Array} Search results
   */
  async searchWithFTS(query, contentType, typeConfig, options) {
    const { filters, workspaceId, userId, includeHighlights } = options;
    
    // Prepare FTS query
    const ftsQuery = this.prepareFTSQuery(query);
    const ftsTable = `${typeConfig.table}_fts`;
    
    let sql = `
      SELECT 
        t.*,
        fts.rank,
        ${includeHighlights ? `highlight(${ftsTable}, 1, '<mark>', '</mark>') as title_highlight,` : ''}
        ${includeHighlights ? `snippet(${ftsTable}, 2, '<mark>', '</mark>', '...', ${this.config.highlightContext}) as content_highlight` : ''}
      FROM ${ftsTable} fts
      JOIN ${typeConfig.table} t ON t.id = fts.id
      WHERE ${ftsTable} MATCH ?
    `;

    const params = [ftsQuery];

    // Add workspace filter
    if (workspaceId && typeConfig.table !== 'users') {
      sql += ` AND t.workspace_id = ?`;
      params.push(workspaceId);
    }

    // Add user permission filters
    if (userId && contentType === 'notes') {
      sql += ` AND (t.is_public = 1 OR t.author_id = ? OR EXISTS (
        SELECT 1 FROM workspace_members wm 
        WHERE wm.workspace_id = t.workspace_id AND wm.user_id = ?
      ))`;
      params.push(userId, userId);
    }

    // Add additional filters
    if (filters.dateRange) {
      sql += ` AND t.created_at BETWEEN ? AND ?`;
      params.push(filters.dateRange.start, filters.dateRange.end);
    }

    if (filters.author && contentType === 'notes') {
      sql += ` AND t.author_id = ?`;
      params.push(filters.author);
    }

    sql += ` ORDER BY fts.rank LIMIT 50`;

    const results = await dbPool.query(sql, params);
    return results || [];
  }

  /**
   * Search using LIKE queries (fallback)
   * @param {string} query - Search query
   * @param {string} contentType - Content type
   * @param {Object} typeConfig - Type configuration
   * @param {Object} options - Search options
   * @returns {Array} Search results
   */
  async searchWithLike(query, contentType, typeConfig, options) {
    const { filters, workspaceId, userId } = options;
    const searchTerms = query.split(/\s+/).filter(term => term.length >= 2);
    
    if (searchTerms.length === 0) return [];

    // Build LIKE conditions for each searchable field
    const likeConditions = [];
    const params = [];

    typeConfig.fields.forEach(field => {
      searchTerms.forEach(term => {
        likeConditions.push(`t.${field} LIKE ?`);
        params.push(`%${term}%`);
      });
    });

    let sql = `
      SELECT t.*, 
             ${this.calculateLikeRelevance(typeConfig.fields, searchTerms)} as relevance_score
      FROM ${typeConfig.table} t
      WHERE (${likeConditions.join(' OR ')})
    `;

    // Add workspace filter
    if (workspaceId && typeConfig.table !== 'users') {
      sql += ` AND t.workspace_id = ?`;
      params.push(workspaceId);
    }

    // Add user permission filters
    if (userId && contentType === 'notes') {
      sql += ` AND (t.is_public = 1 OR t.author_id = ? OR EXISTS (
        SELECT 1 FROM workspace_members wm 
        WHERE wm.workspace_id = t.workspace_id AND wm.user_id = ?
      ))`;
      params.push(userId, userId);
    }

    // Add additional filters
    if (filters.dateRange) {
      sql += ` AND t.created_at BETWEEN ? AND ?`;
      params.push(filters.dateRange.start, filters.dateRange.end);
    }

    sql += ` ORDER BY relevance_score DESC LIMIT 50`;

    const results = await dbPool.query(sql, params);
    return results || [];
  }

  /**
   * Calculate relevance scores for search results
   * @param {Array} results - Search results
   * @param {string} query - Original query
   * @returns {Array} Results with relevance scores
   */
  calculateRelevanceScores(results, query) {
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return results.map(result => {
      let score = 0;
      const content = `${result.title || ''} ${result.content || ''} ${result.name || ''} ${result.filename || ''}`.toLowerCase();
      
      // Exact phrase bonus
      if (content.includes(query.toLowerCase())) {
        score += 10;
      }
      
      // Individual term scoring
      queryTerms.forEach(term => {
        const termRegex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = content.match(termRegex) || [];
        score += matches.length * 2;
        
        // Title/name bonus
        const title = (result.title || result.name || result.filename || '').toLowerCase();
        if (title.includes(term)) {
          score += 5;
        }
      });
      
      // Apply content type weight
      score *= result.weight || 1;
      
      // Recency bonus
      const createdAt = new Date(result.created_at || result.updated_at);
      const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 7) {
        score += 2;
      } else if (daysSinceCreation < 30) {
        score += 1;
      }
      
      return {
        ...result,
        relevanceScore: score
      };
    });
  }

  /**
   * Generate search suggestions
   * @param {string} query - Current query
   * @returns {Array} Suggestions
   */
  async generateSuggestions(query) {
    if (!this.config.enableSuggestions || query.length < 2) {
      return [];
    }

    try {
      // Get popular queries that start with or contain the current query
      const suggestions = await dbPool.query(`
        SELECT query, COUNT(*) as frequency
        FROM search_analytics
        WHERE query LIKE ? OR query LIKE ?
        GROUP BY query
        ORDER BY frequency DESC, length(query) ASC
        LIMIT ?
      `, [`${query}%`, `%${query}%`, this.config.maxSuggestions]);

      return (suggestions || []).map(s => s.query);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Generate search facets for filtering
   * @param {Array} results - Search results
   * @returns {Object} Facets
   */
  async generateFacets(results) {
    const facets = {
      contentTypes: {},
      authors: {},
      workspaces: {},
      dateRanges: {
        'Last 7 days': 0,
        'Last 30 days': 0,
        'Last 3 months': 0,
        'Older': 0
      }
    };

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    results.forEach(result => {
      // Content type facets
      const contentType = result.contentType;
      facets.contentTypes[contentType] = (facets.contentTypes[contentType] || 0) + 1;

      // Author facets (for notes)
      if (result.author_id) {
        facets.authors[result.author_id] = (facets.authors[result.author_id] || 0) + 1;
      }

      // Workspace facets
      if (result.workspace_id) {
        facets.workspaces[result.workspace_id] = (facets.workspaces[result.workspace_id] || 0) + 1;
      }

      // Date range facets
      const createdAt = new Date(result.created_at).getTime();
      const age = now - createdAt;
      
      if (age < 7 * day) {
        facets.dateRanges['Last 7 days']++;
      } else if (age < 30 * day) {
        facets.dateRanges['Last 30 days']++;
      } else if (age < 90 * day) {
        facets.dateRanges['Last 3 months']++;
      } else {
        facets.dateRanges['Older']++;
      }
    });

    return facets;
  }

  /**
   * Log search analytics
   * @param {string} query - Search query
   * @param {Object} result - Search result
   * @param {Object} options - Search options
   */
  async logSearchAnalytics(query, result, options) {
    try {
      await dbPool.run(`
        INSERT INTO search_analytics (
          query, user_id, results_count, response_time, 
          filters, content_types, session_id, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        query,
        options.userId || null,
        result.totalResults,
        result.responseTime,
        JSON.stringify(options.filters || {}),
        JSON.stringify(options.contentTypes || []),
        options.sessionId || null,
        options.ipAddress || null,
        options.userAgent || null
      ]);

      // Update in-memory analytics
      this.searchAnalytics.totalSearches++;
      this.searchAnalytics.popularQueries.set(
        query, 
        (this.searchAnalytics.popularQueries.get(query) || 0) + 1
      );

      // Update moving average response time
      const currentAvg = this.searchAnalytics.avgResponseTime;
      const totalSearches = this.searchAnalytics.totalSearches;
      this.searchAnalytics.avgResponseTime = 
        (currentAvg * (totalSearches - 1) + result.responseTime) / totalSearches;

      // Track no-results queries
      if (result.totalResults === 0) {
        this.searchAnalytics.noResultsQueries.push({
          query,
          timestamp: Date.now()
        });
        
        // Keep only last 100 no-results queries
        if (this.searchAnalytics.noResultsQueries.length > 100) {
          this.searchAnalytics.noResultsQueries.shift();
        }
      }

    } catch (error) {
      console.error('Failed to log search analytics:', error);
    }
  }

  /**
   * Utility methods
   */

  sanitizeQuery(query) {
    if (typeof query !== 'string') return '';
    return query.trim().replace(/[^\w\s\-\.@]/g, '').substring(0, 200);
  }

  prepareFTSQuery(query) {
    // Convert search query to FTS syntax
    const terms = query.split(/\s+/).filter(term => term.length >= 2);
    return terms.map(term => `"${term}"`).join(' OR ');
  }

  calculateLikeRelevance(fields, terms) {
    const conditions = [];
    fields.forEach(field => {
      terms.forEach(term => {
        conditions.push(`CASE WHEN ${field} LIKE '%${term}%' THEN 1 ELSE 0 END`);
      });
    });
    return `(${conditions.join(' + ')})`;
  }

  generateSearchId() {
    return `search_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  emptySearchResult(reason = '') {
    return {
      query: '',
      results: [],
      totalResults: 0,
      hasMore: false,
      responseTime: 0,
      facets: {},
      suggestions: [],
      searchId: this.generateSearchId(),
      error: reason
    };
  }

  async checkWorkspaceAccess(userId, workspaceId) {
    try {
      const access = await dbPool.get(`
        SELECT 1 FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE w.id = ? AND (w.owner_id = ? OR wm.user_id = ?)
      `, [workspaceId, userId, userId]);
      
      return !!access;
    } catch (error) {
      console.error('Error checking workspace access:', error);
      return false;
    }
  }

  /**
   * Get search analytics
   * @returns {Object} Analytics data
   */
  getAnalytics() {
    const popularQueries = Array.from(this.searchAnalytics.popularQueries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    return {
      totalSearches: this.searchAnalytics.totalSearches,
      popularQueries,
      avgResponseTime: Math.round(this.searchAnalytics.avgResponseTime),
      noResultsQueries: this.searchAnalytics.noResultsQueries.slice(-10),
      searchTrends: Object.fromEntries(this.searchAnalytics.searchTrends)
    };
  }

  /**
   * Log search result click
   * @param {string} searchId - Search ID
   * @param {string} resultId - Clicked result ID
   * @param {string} resultType - Result content type
   */
  async logSearchClick(searchId, resultId, resultType) {
    try {
      await dbPool.run(`
        UPDATE search_analytics 
        SET clicked_result_id = ?, clicked_result_type = ?
        WHERE id = ?
      `, [resultId, resultType, searchId]);
    } catch (error) {
      console.error('Failed to log search click:', error);
    }
  }
}

// Export singleton instance
export default new SearchService();