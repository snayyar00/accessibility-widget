interface TemplatePattern {
  pattern_id: string
  issue_type: string
  selector_pattern: string
  occurrence_count: number
  affected_elements: string[]
  fix_scope: 'theme_level' | 'component_level' | 'content_level'
  confidence: number
  template_recommendation: string
  estimated_fix_effort: 'minimal' | 'moderate' | 'significant'
  fix_priority_score: number
}

interface TemplateAnalysisResult {
  patterns_detected: TemplatePattern[]
  total_template_issues: number
  potential_cost_savings: number
  fix_priority_score: number
}

interface RawIssue {
  code: string
  message: string
  context: string[]
  selectors: string[]
  type: 'error' | 'warning' | 'notice'
  runner: 'axe' | 'htmlcs'
}

/**
 * Advanced template analysis for large sites
 */
export class TemplateAnalysisService {
  
  /**
   * Analyze issues for template patterns
   */
  static analyzeTemplatePatterns(issues: RawIssue[]): TemplateAnalysisResult {
    const patterns = new Map<string, RawIssue[]>();
    const debugMode = process.env.PREPROCESSING_DEBUG_MODE === 'true';
    
    if (debugMode) {
      console.log(`🔍 Template analysis starting with ${issues.length} issues`);
    }
    
    // Group issues by potential template patterns
    issues.forEach(issue => {
      const templateKeys = this.generateTemplateKeys(issue);
      
      templateKeys.forEach(key => {
        if (!patterns.has(key)) {
          patterns.set(key, []);
        }
        patterns.get(key)!.push(issue);
      });
    });
    
    // Analyze patterns and create template recommendations
    const detectedPatterns: TemplatePattern[] = [];
    let totalTemplateIssues = 0;
    
    patterns.forEach((patternIssues, patternKey) => {
      if (patternIssues.length >= 3) { // Template threshold
        const pattern = this.createTemplatePattern(patternKey, patternIssues);
        detectedPatterns.push(pattern);
        totalTemplateIssues += patternIssues.length;
        
        if (debugMode) {
          console.log(`🔁 Template pattern: ${pattern.pattern_id} (${pattern.occurrence_count} issues)`);
        }
      }
    });
    
    // Sort by fix priority (impact vs effort)
    detectedPatterns.sort((a, b) => b.fix_priority_score - a.fix_priority_score);
    
    const costSavings = this.calculateCostSavings(detectedPatterns);
    const priorityScore = this.calculateOverallPriority(detectedPatterns);
    
    if (debugMode) {
      console.log('📊 Template analysis results:');
      console.log(`   ${detectedPatterns.length} patterns detected`);
      console.log(`   ${totalTemplateIssues} template issues`);
      console.log(`   ${costSavings}% potential cost savings`);
    }
    
    return {
      patterns_detected: detectedPatterns,
      total_template_issues: totalTemplateIssues,
      potential_cost_savings: costSavings,
      fix_priority_score: priorityScore,
    };
  }
  
  /**
   * Generate template keys for pattern detection
   */
  private static generateTemplateKeys(issue: RawIssue): string[] {
    const keys: string[] = [];
    const primarySelector = issue.selectors[0] || '';
    
    // CSS class-based patterns
    const classMatches = primarySelector.match(/\.[\w-]+/g);
    if (classMatches) {
      classMatches.forEach(className => {
        keys.push(`class:${issue.code}:${className}`);
      });
    }
    
    // Element type patterns
    const elementMatch = primarySelector.match(/^[a-zA-Z]+/);
    if (elementMatch) {
      keys.push(`element:${issue.code}:${elementMatch[0]}`);
    }
    
    // Attribute patterns
    if (primarySelector.includes('[')) {
      const attrMatch = primarySelector.match(/\[([^\]]+)\]/);
      if (attrMatch) {
        keys.push(`attr:${issue.code}:${attrMatch[1]}`);
      }
    }
    
    // Structural patterns (parent-child relationships)
    if (primarySelector.includes(' ') || primarySelector.includes('>')) {
      const structuralPattern = this.extractStructuralPattern(primarySelector);
      if (structuralPattern) {
        keys.push(`structure:${issue.code}:${structuralPattern}`);
      }
    }
    
    return keys;
  }
  
  /**
   * Extract structural CSS pattern
   */
  private static extractStructuralPattern(selector: string): string | null {
    // Simplify complex selectors to patterns
    return selector
      .replace(/\[\d+\]/g, '[]')  // array indices
      .replace(/:nth-child\(\d+\)/g, ':nth-child()')
      .replace(/#[\w-]+/g, '#ID')  // generalize IDs
      .replace(/\.[\w-]+/g, '.CLASS')  // generalize classes
      .trim();
  }
  
  /**
   * Create template pattern from grouped issues
   */
  private static createTemplatePattern(patternKey: string, issues: RawIssue[]): TemplatePattern {
    const [type, code, pattern] = patternKey.split(':');
    const occurrenceCount = issues.length;
    
    // Determine fix scope based on pattern type and count
    let fixScope: 'theme_level' | 'component_level' | 'content_level';
    if (type === 'class' && occurrenceCount >= 10) {
      fixScope = 'theme_level';
    } else if (type === 'element' && occurrenceCount >= 15) {
      fixScope = 'theme_level';
    } else if (occurrenceCount >= 5) {
      fixScope = 'component_level';
    } else {
      fixScope = 'content_level';
    }
    
    // Generate specific recommendation
    const recommendation = this.generateTemplateRecommendation(type, code, pattern, fixScope, occurrenceCount);
    
    // Calculate confidence based on pattern strength
    const confidence = Math.min(90, 50 + (occurrenceCount * 4));
    
    // Estimate fix effort
    const fixEffort = this.estimateFixEffort(type, code, fixScope, occurrenceCount);
    
    // Calculate fix priority score (impact / effort)
    const impactScore = this.calculateImpactScore(code, occurrenceCount);
    const effortMultiplier = fixEffort === 'minimal' ? 3 : fixEffort === 'moderate' ? 2 : 1;
    const fixPriorityScore = Math.round(impactScore * effortMultiplier);
    
    return {
      pattern_id: `${type}_${code}_${this.hashPattern(pattern)}`,
      issue_type: code,
      selector_pattern: pattern,
      occurrence_count: occurrenceCount,
      affected_elements: [...new Set(issues.flatMap(issue => issue.selectors))],
      fix_scope: fixScope,
      confidence,
      template_recommendation: recommendation,
      estimated_fix_effort: fixEffort,
      fix_priority_score: fixPriorityScore,
    };
  }
  
  /**
   * Generate specific template recommendation
   */
  private static generateTemplateRecommendation(
    type: string, 
    code: string, 
    pattern: string, 
    scope: string, 
    count: number,
  ): string {
    const baseRecommendations: Record<string, string> = {
      'color-contrast': 'Update CSS color variables or theme to meet WCAG contrast requirements',
      'alt-text': 'Add default alt text handling to image components or content templates',
      'heading-order': 'Review heading hierarchy in templates and establish consistent structure',
      'button-name': 'Add aria-label or text content to button components',
      'link-name': 'Ensure all link components have descriptive text or aria-labels',
      'form-label': 'Associate labels with form inputs in component templates',
      'duplicate-id': 'Use unique ID generation in component templates',
    };
    
    const baseRec = baseRecommendations[code] || 'Review and fix accessibility issues in template';
    
    if (scope === 'theme_level') {
      return `${baseRec}. This affects ${count} elements across your site and should be fixed at the theme/CSS level for maximum efficiency.`;
    } if (scope === 'component_level') {
      return `${baseRec}. This affects ${count} instances and should be fixed in the component template or partial.`;
    } 
    return `${baseRec}. This affects ${count} instances and requires individual content updates.`;
    
  }
  
  /**
   * Estimate fix effort based on pattern characteristics
   */
  private static estimateFixEffort(
    type: string, 
    code: string, 
    scope: string, 
    count: number,
  ): 'minimal' | 'moderate' | 'significant' {
    // CSS-only fixes are usually minimal
    if (['color-contrast', 'focus-visible'].includes(code)) {
      return scope === 'theme_level' ? 'minimal' : 'moderate';
    }
    
    // Content fixes scale with count
    if (['alt-text', 'button-name', 'link-name'].includes(code)) {
      if (scope === 'theme_level') return 'moderate';
      return count > 10 ? 'significant' : 'moderate';
    }
    
    // Structural fixes are usually more complex
    if (['heading-order', 'duplicate-id', 'landmark-missing'].includes(code)) {
      return scope === 'theme_level' ? 'moderate' : 'significant';
    }
    
    return 'moderate';
  }
  
  /**
   * Calculate impact score for prioritization
   */
  private static calculateImpactScore(code: string, count: number): number {
    const impactWeights: Record<string, number> = {
      'color-contrast': 90,
      'button-name': 85,
      'link-name': 85,
      'alt-text': 80,
      'form-label': 80,
      'heading-order': 70,
      'duplicate-id': 60,
      'focus-visible': 75,
    };
    
    const baseImpact = impactWeights[code] || 50;
    const countMultiplier = Math.min(2.0, 1 + (count / 20)); // Cap at 2x
    
    return Math.round(baseImpact * countMultiplier);
  }
  
  /**
   * Calculate potential cost savings from template fixes
   */
  private static calculateCostSavings(patterns: TemplatePattern[]): number {
    const totalTemplateIssues = patterns.reduce((sum, p) => sum + p.occurrence_count, 0);
    const templateReps = patterns.length * 2; // avg 2 reps per template
    
    if (totalTemplateIssues === 0) return 0;
    
    const savings = ((totalTemplateIssues - templateReps) / totalTemplateIssues) * 100;
    return Math.round(savings);
  }
  
  /**
   * Calculate overall priority score
   */
  private static calculateOverallPriority(patterns: TemplatePattern[]): number {
    if (patterns.length === 0) return 0;
    
    const avgPriority = patterns.reduce((sum, p) => sum + p.fix_priority_score, 0) / patterns.length;
    return Math.round(avgPriority);
  }
  
  /**
   * Hash pattern for consistent IDs
   */
  private static hashPattern(pattern: string): string {
    let hash = 0;
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }
} 