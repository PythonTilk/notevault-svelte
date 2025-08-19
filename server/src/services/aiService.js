/**
 * AI-Powered Content Suggestions Service
 * 
 * Provides intelligent content suggestions, auto-completion, and smart features
 * using various AI models and local intelligence algorithms.
 */

import { EventEmitter } from 'events';
import dbPool from '../config/database-optimized.js';
import { SECURITY_EVENTS, logSecurityEvent } from '../utils/logger.js';

class AIService extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      enableAI: process.env.ENABLE_AI !== 'false',
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      maxSuggestions: parseInt(process.env.MAX_AI_SUGGESTIONS || '5'),
      contextWindow: parseInt(process.env.AI_CONTEXT_WINDOW || '1000'), // characters
      cacheTimeout: parseInt(process.env.AI_CACHE_TIMEOUT || '300000'), // 5 minutes
      fallbackToLocal: process.env.AI_FALLBACK_LOCAL !== 'false',
      enableContentAnalysis: process.env.AI_CONTENT_ANALYSIS !== 'false',
      enableSmartTags: process.env.AI_SMART_TAGS !== 'false'
    };

    // Local intelligence cache
    this.suggestionCache = new Map();
    this.contentPatterns = new Map();
    this.userContexts = new Map();
    
    // AI model clients (will be initialized if API keys are available)
    this.openaiClient = null;
    this.anthropicClient = null;
    
    this.initializeAIClients();
    this.initializeLocalIntelligence();
    
    console.log('AI Service initialized', {
      hasOpenAI: !!this.openaiClient,
      hasAnthropic: !!this.anthropicClient,
      enableAI: this.config.enableAI
    });
  }

  async initializeAIClients() {
    try {
      // Initialize OpenAI client if API key is available
      if (this.config.openaiApiKey) {
        const { OpenAI } = await import('openai');
        this.openaiClient = new OpenAI({
          apiKey: this.config.openaiApiKey
        });
        console.log('OpenAI client initialized');
      }
      
      // Initialize Anthropic client if API key is available
      if (this.config.anthropicApiKey) {
        const { Anthropic } = await import('@anthropic-ai/sdk');
        this.anthropicClient = new Anthropic({
          apiKey: this.config.anthropicApiKey
        });
        console.log('Anthropic client initialized');
      }
    } catch (error) {
      console.warn('AI clients initialization failed:', error.message);
      console.log('Falling back to local intelligence only');
    }
  }

  async initializeLocalIntelligence() {
    try {
      // Build content patterns from existing notes
      await this.buildContentPatterns();
      
      // Initialize common templates and suggestions
      this.commonTemplates = [
        { type: 'meeting', template: '# Meeting Notes - {date}\n\n## Attendees\n- \n\n## Agenda\n1. \n\n## Action Items\n- [ ] \n\n## Next Steps\n' },
        { type: 'project', template: '# Project: {title}\n\n## Overview\n\n\n## Goals\n- \n\n## Tasks\n- [ ] \n\n## Timeline\n\n\n## Resources\n' },
        { type: 'daily', template: '# Daily Notes - {date}\n\n## Today\'s Goals\n- [ ] \n\n## Completed\n- \n\n## Notes\n\n\n## Tomorrow\n- [ ] ' },
        { type: 'brainstorm', template: '# Brainstorming - {topic}\n\n## Ideas\n- \n\n## Key Points\n\n\n## Next Actions\n- [ ] ' }
      ];
      
      console.log('Local intelligence patterns built');
    } catch (error) {
      console.error('Failed to initialize local intelligence:', error);
    }
  }

  async buildContentPatterns() {
    try {
      const notes = await dbPool.query(`
        SELECT title, content, tags, created_at
        FROM notes 
        WHERE content IS NOT NULL AND LENGTH(content) > 50
        ORDER BY created_at DESC 
        LIMIT 1000
      `);

      // Analyze common patterns in notes
      const patterns = {
        titlePatterns: new Map(),
        contentStructures: new Map(),
        tagCombinations: new Map(),
        commonPhrases: new Map()
      };

      notes.forEach(note => {
        // Analyze title patterns
        this.analyzeTitle(note.title, patterns.titlePatterns);
        
        // Analyze content structure
        this.analyzeContentStructure(note.content, patterns.contentStructures);
        
        // Analyze tag combinations
        if (note.tags) {
          this.analyzeTagCombinations(note.tags, patterns.tagCombinations);
        }
        
        // Extract common phrases
        this.extractCommonPhrases(note.content, patterns.commonPhrases);
      });

      this.contentPatterns = patterns;
      console.log('Content patterns analyzed:', {
        titlePatterns: patterns.titlePatterns.size,
        contentStructures: patterns.contentStructures.size,
        tagCombinations: patterns.tagCombinations.size,
        commonPhrases: patterns.commonPhrases.size
      });
    } catch (error) {
      console.error('Failed to build content patterns:', error);
    }
  }

  /**
   * Get content suggestions based on current context
   * @param {Object} context - Current editing context
   * @returns {Array} Array of suggestions
   */
  async getContentSuggestions(context) {
    const { 
      currentContent = '', 
      cursorPosition = 0, 
      userId, 
      noteId, 
      workspaceId,
      title = '' 
    } = context;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(context);
      if (this.suggestionCache.has(cacheKey)) {
        const cached = this.suggestionCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
          return cached.suggestions;
        }
      }

      let suggestions = [];

      // Try AI-powered suggestions first
      if (this.config.enableAI && (this.openaiClient || this.anthropicClient)) {
        try {
          suggestions = await this.getAISuggestions(context);
        } catch (error) {
          console.warn('AI suggestions failed, falling back to local:', error.message);
        }
      }

      // Fall back to local intelligence if AI failed or not available
      if (suggestions.length === 0 && this.config.fallbackToLocal) {
        suggestions = await this.getLocalSuggestions(context);
      }

      // Cache the results
      this.suggestionCache.set(cacheKey, {
        suggestions,
        timestamp: Date.now()
      });

      // Log successful suggestion generation
      await logSecurityEvent(SECURITY_EVENTS.AI_SUGGESTION_GENERATED, {
        userId,
        noteId,
        suggestionsCount: suggestions.length,
        method: suggestions.length > 0 ? 'ai' : 'local'
      });

      return suggestions.slice(0, this.config.maxSuggestions);
    } catch (error) {
      console.error('Content suggestions error:', error);
      return [];
    }
  }

  /**
   * Get AI-powered suggestions using external APIs
   * @param {Object} context - Current editing context
   * @returns {Array} AI-generated suggestions
   */
  async getAISuggestions(context) {
    const { currentContent, cursorPosition, title } = context;
    
    // Prepare context for AI
    const contextBefore = currentContent.substring(Math.max(0, cursorPosition - this.config.contextWindow), cursorPosition);
    const contextAfter = currentContent.substring(cursorPosition, cursorPosition + this.config.contextWindow);
    
    const prompt = this.buildAIPrompt(title, contextBefore, contextAfter);

    try {
      if (this.openaiClient) {
        return await this.getOpenAISuggestions(prompt);
      } else if (this.anthropicClient) {
        return await this.getAnthropicSuggestions(prompt);
      }
    } catch (error) {
      console.error('AI API error:', error);
      throw error;
    }

    return [];
  }

  async getOpenAISuggestions(prompt) {
    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful writing assistant that provides concise, relevant content suggestions for note-taking. Provide 3-5 short suggestions that naturally continue the current context.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.7,
      n: 1
    });

    const content = response.choices[0]?.message?.content || '';
    return this.parseSuggestions(content);
  }

  async getAnthropicSuggestions(prompt) {
    const response = await this.anthropicClient.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `You are a helpful writing assistant. Based on this context, provide 3-5 short content suggestions:\n\n${prompt}`
      }]
    });

    const content = response.content[0]?.text || '';
    return this.parseSuggestions(content);
  }

  /**
   * Get local intelligence-based suggestions
   * @param {Object} context - Current editing context
   * @returns {Array} Local suggestions
   */
  async getLocalSuggestions(context) {
    const { currentContent, cursorPosition, title } = context;
    const suggestions = [];

    // Template suggestions based on title or content patterns
    const templateSuggestions = this.getTemplateSuggestions(title, currentContent);
    suggestions.push(...templateSuggestions);

    // Completion suggestions based on common patterns
    const completionSuggestions = this.getCompletionSuggestions(currentContent, cursorPosition);
    suggestions.push(...completionSuggestions);

    // Related content suggestions
    const relatedSuggestions = await this.getRelatedContentSuggestions(context);
    suggestions.push(...relatedSuggestions);

    return suggestions;
  }

  getTemplateSuggestions(title, content) {
    const suggestions = [];
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    // Check if user is starting a new note and suggest templates
    if (content.trim().length < 50) {
      for (const template of this.commonTemplates) {
        if (titleLower.includes(template.type) || 
            contentLower.includes(template.type)) {
          suggestions.push({
            type: 'template',
            text: template.template.replace('{title}', title)
                                  .replace('{date}', new Date().toLocaleDateString())
                                  .replace('{topic}', title),
            confidence: 0.8,
            category: `${template.type} template`
          });
        }
      }
    }

    return suggestions;
  }

  getCompletionSuggestions(content, cursorPosition) {
    const suggestions = [];
    
    // Get current line and previous context
    const beforeCursor = content.substring(0, cursorPosition);
    const lines = beforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];
    
    // List completion suggestions
    if (currentLine.trim().match(/^[-*]\s*/)) {
      const commonListItems = this.getCommonListItems(content);
      suggestions.push(...commonListItems.map(item => ({
        type: 'completion',
        text: item,
        confidence: 0.6,
        category: 'list item'
      })));
    }
    
    // Heading suggestions
    if (currentLine.trim().match(/^#+\s*/)) {
      const headingSuggestions = this.getCommonHeadings();
      suggestions.push(...headingSuggestions.map(heading => ({
        type: 'completion',
        text: heading,
        confidence: 0.7,
        category: 'heading'
      })));
    }

    // Task completion suggestions
    if (currentLine.trim().match(/^-\s*\[\s*\]\s*/)) {
      const taskSuggestions = this.getCommonTasks(content);
      suggestions.push(...taskSuggestions.map(task => ({
        type: 'completion',
        text: task,
        confidence: 0.6,
        category: 'task'
      })));
    }

    return suggestions;
  }

  async getRelatedContentSuggestions(context) {
    const { title, currentContent, workspaceId } = context;
    const suggestions = [];

    try {
      // Find related notes in the same workspace
      const relatedNotes = await dbPool.query(`
        SELECT title, content, tags
        FROM notes 
        WHERE workspace_id = ? AND title != ?
        ORDER BY created_at DESC 
        LIMIT 20
      `, [workspaceId, title]);

      // Simple similarity matching based on common words
      const contentWords = this.extractKeywords(currentContent + ' ' + title);
      
      for (const note of relatedNotes) {
        const noteWords = this.extractKeywords(note.title + ' ' + note.content);
        const similarity = this.calculateSimilarity(contentWords, noteWords);
        
        if (similarity > 0.3) {
          // Extract relevant snippets
          const snippets = this.extractRelevantSnippets(note.content, contentWords);
          suggestions.push(...snippets.map(snippet => ({
            type: 'related',
            text: snippet,
            confidence: similarity,
            category: 'related content',
            source: note.title
          })));
        }
      }
    } catch (error) {
      console.error('Failed to get related content suggestions:', error);
    }

    return suggestions.slice(0, 3); // Limit related suggestions
  }

  /**
   * Generate smart tags for content
   * @param {string} content - Content to analyze
   * @param {string} title - Note title
   * @returns {Array} Suggested tags
   */
  async generateSmartTags(content, title = '') {
    if (!this.config.enableSmartTags) return [];

    try {
      const allText = (title + ' ' + content).toLowerCase();
      const suggestedTags = [];

      // Rule-based tag suggestions
      const tagRules = [
        { pattern: /meeting|agenda|attendees/, tags: ['meeting', 'discussion'] },
        { pattern: /project|milestone|deadline/, tags: ['project', 'planning'] },
        { pattern: /bug|fix|issue|error/, tags: ['bug', 'technical'] },
        { pattern: /idea|brainstorm|concept/, tags: ['ideas', 'brainstorming'] },
        { pattern: /todo|task|action/, tags: ['tasks', 'todo'] },
        { pattern: /research|study|analysis/, tags: ['research', 'analysis'] },
        { pattern: /review|feedback|comments/, tags: ['review', 'feedback'] }
      ];

      for (const rule of tagRules) {
        if (rule.pattern.test(allText)) {
          suggestedTags.push(...rule.tags);
        }
      }

      // Extract entities (simple pattern matching)
      const entities = this.extractEntities(allText);
      suggestedTags.push(...entities);

      // Get popular tag combinations from patterns
      const popularTags = this.getPopularTagsForContent(allText);
      suggestedTags.push(...popularTags);

      // Remove duplicates and limit
      return [...new Set(suggestedTags)].slice(0, 8);
    } catch (error) {
      console.error('Smart tag generation error:', error);
      return [];
    }
  }

  /**
   * Analyze content for insights and improvements
   * @param {string} content - Content to analyze
   * @returns {Object} Content analysis results
   */
  async analyzeContent(content) {
    if (!this.config.enableContentAnalysis) return null;

    try {
      const analysis = {
        readability: this.calculateReadability(content),
        structure: this.analyzeStructure(content),
        suggestions: [],
        insights: []
      };

      // Readability suggestions
      if (analysis.readability.score < 0.6) {
        analysis.suggestions.push({
          type: 'readability',
          message: 'Consider breaking up long sentences for better readability',
          severity: 'medium'
        });
      }

      // Structure suggestions
      if (!analysis.structure.hasHeadings && content.length > 500) {
        analysis.suggestions.push({
          type: 'structure',
          message: 'Consider adding headings to organize your content',
          severity: 'low'
        });
      }

      // Word count insights
      analysis.insights.push({
        type: 'statistics',
        data: {
          wordCount: content.split(/\s+/).length,
          characterCount: content.length,
          estimatedReadTime: Math.ceil(content.split(/\s+/).length / 200) // 200 WPM
        }
      });

      return analysis;
    } catch (error) {
      console.error('Content analysis error:', error);
      return null;
    }
  }

  // Utility methods for local intelligence
  buildAIPrompt(title, contextBefore, contextAfter) {
    return `Title: ${title}

Content before cursor:
${contextBefore}

Content after cursor:
${contextAfter}

Please provide 3-5 short suggestions for continuing this content naturally.`;
  }

  parseSuggestions(aiResponse) {
    const lines = aiResponse.split('\n').filter(line => line.trim());
    return lines.map((line, index) => ({
      type: 'ai',
      text: line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim(),
      confidence: 0.9 - (index * 0.1),
      category: 'ai suggestion'
    }));
  }

  analyzeTitle(title, patterns) {
    const words = title.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 2) {
        patterns.set(word, (patterns.get(word) || 0) + 1);
      }
    });
  }

  analyzeContentStructure(content, structures) {
    const hasHeadings = /^#+\s/.test(content);
    const hasLists = /^[-*]\s/.test(content);
    const hasTasks = /^-\s*\[.\]\s/.test(content);
    
    const structure = { hasHeadings, hasLists, hasTasks };
    const key = JSON.stringify(structure);
    structures.set(key, (structures.get(key) || 0) + 1);
  }

  analyzeTagCombinations(tags, combinations) {
    if (Array.isArray(tags)) {
      const sortedTags = tags.sort().join(',');
      combinations.set(sortedTags, (combinations.get(sortedTags) || 0) + 1);
    }
  }

  extractCommonPhrases(content, phrases) {
    const sentences = content.split(/[.!?]+/);
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/);
      if (words.length >= 3 && words.length <= 8) {
        const phrase = words.join(' ').toLowerCase();
        if (phrase.length > 10) {
          phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
        }
      }
    });
  }

  getCommonListItems(content) {
    const items = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^[-*]\s+(.+)$/);
      if (match && match[1].length < 50) {
        items.push(match[1]);
      }
    }
    
    return [...new Set(items)].slice(0, 3);
  }

  getCommonHeadings() {
    return [
      'Overview', 'Goals', 'Tasks', 'Notes', 'Summary', 
      'Next Steps', 'Action Items', 'Key Points', 'Timeline'
    ];
  }

  getCommonTasks(content) {
    const tasks = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^-\s*\[.\]\s+(.+)$/);
      if (match && match[1].length < 50) {
        tasks.push(match[1]);
      }
    }
    
    return [...new Set(tasks)].slice(0, 3);
  }

  extractKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));
    
    return [...new Set(words)];
  }

  isStopWord(word) {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'over', 'under', 'again', 'further', 'then'
    ]);
    return stopWords.has(word);
  }

  calculateSimilarity(words1, words2) {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = [...set1].filter(word => set2.has(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  extractRelevantSnippets(content, keywords) {
    const sentences = content.split(/[.!?]+/);
    const relevantSentences = [];
    
    for (const sentence of sentences) {
      const sentenceWords = this.extractKeywords(sentence);
      const relevance = this.calculateSimilarity(sentenceWords, keywords);
      
      if (relevance > 0.2 && sentence.trim().length > 20) {
        relevantSentences.push({
          text: sentence.trim(),
          relevance
        });
      }
    }
    
    return relevantSentences
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 2)
      .map(s => s.text);
  }

  extractEntities(text) {
    const entities = [];
    
    // Simple pattern matching for entities
    const patterns = [
      { regex: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, type: 'proper_noun' },
      { regex: /\b\d{4}-\d{2}-\d{2}\b/g, type: 'date' },
      { regex: /\b[A-Z]{2,}\b/g, type: 'acronym' }
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern.regex) || [];
      entities.push(...matches.map(match => match.toLowerCase()));
    }
    
    return [...new Set(entities)].slice(0, 3);
  }

  getPopularTagsForContent(text) {
    const tags = [];
    
    // Get popular tag combinations from patterns
    for (const [tagCombo, count] of this.contentPatterns.tagCombinations || []) {
      if (count > 5) { // Only suggest popular combinations
        const comboTags = tagCombo.split(',');
        const relevantTags = comboTags.filter(tag => 
          text.includes(tag.toLowerCase()) || 
          this.calculateSimilarity([tag], this.extractKeywords(text)) > 0.3
        );
        
        if (relevantTags.length > 0) {
          tags.push(...relevantTags);
        }
      }
    }
    
    return [...new Set(tags)].slice(0, 3);
  }

  calculateReadability(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.countSyllables(content) / words.length;
    
    // Simple readability score (0-1)
    const score = Math.max(0, Math.min(1, 
      1 - (avgWordsPerSentence - 15) * 0.02 - (avgSyllablesPerWord - 1.5) * 0.1
    ));
    
    return {
      score,
      avgWordsPerSentence: Math.round(avgWordsPerSentence),
      avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 10) / 10
    };
  }

  analyzeStructure(content) {
    return {
      hasHeadings: /^#+\s/m.test(content),
      hasLists: /^[-*]\s/m.test(content),
      hasTasks: /^-\s*\[.\]\s/m.test(content),
      paragraphCount: content.split(/\n\s*\n/).length,
      lineCount: content.split('\n').length
    };
  }

  countSyllables(text) {
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiou]{2,}/g, 'a')
      .replace(/[^aeiou]/g, '')
      .length || 1;
  }

  generateCacheKey(context) {
    const { currentContent, cursorPosition, title, userId, noteId } = context;
    const contentHash = this.simpleHash(currentContent);
    return `${userId}-${noteId}-${contentHash}-${cursorPosition}-${title}`;
  }

  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Clean up caches and optimize performance
   */
  async cleanupCaches() {
    const now = Date.now();
    
    // Clean suggestion cache
    for (const [key, value] of this.suggestionCache.entries()) {
      if (now - value.timestamp > this.config.cacheTimeout) {
        this.suggestionCache.delete(key);
      }
    }
    
    // Rebuild content patterns periodically
    if (this.contentPatterns.size === 0 || Math.random() < 0.01) {
      await this.buildContentPatterns();
    }
    
    console.log('AI Service caches cleaned up');
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      cacheSize: this.suggestionCache.size,
      patternsSize: Object.values(this.contentPatterns).reduce((sum, map) => sum + map.size, 0),
      hasAIClients: !!(this.openaiClient || this.anthropicClient),
      config: {
        enableAI: this.config.enableAI,
        enableContentAnalysis: this.config.enableContentAnalysis,
        enableSmartTags: this.config.enableSmartTags
      }
    };
  }
}

// Export singleton instance
export default new AIService();