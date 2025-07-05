import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Grid, 
  IconButton, 
  Dialog, 
  DialogContent, 
  DialogTitle,
  Button,
  Tooltip,
  LinearProgress
} from '@mui/material';
import { 
  FaCamera, 
  FaInfoCircle, 
  FaClock, 
  FaDesktop, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaTimes,
  FaExpand,
  FaEye
} from 'react-icons/fa';
import { MdAccessibility } from 'react-icons/md';

interface WebAbilityMetadataProps {
  metadata?: {
    job_id: string;
    scan_duration: number;
    scan_timestamp: string;
    browser_info: {
      userAgent: string;
      viewport: { width: number; height: number };
      orientation: string;
    };
    accessibility_standards: {
      wcag_version: string;
      compliance_level: string;
      tested_rules: number;
      passed_rules: number;
      failed_rules: number;
      incomplete_rules: number;
      inapplicable_rules: number;
    };
    issue_breakdown: {
      by_type: { errors: number; warnings: number; notices: number; total: number };
      by_severity: { critical: number; serious: number; moderate: number; minor: number; unknown: number };
      by_category: { perceivable: number; operable: number; understandable: number; robust: number; best_practice: number; other: number };
    };
    screenshots: string[];
    violation_screenshots: number;
  };
  issues?: Array<{
    screenshotUrl?: string;
    message: string;
    impact: string;
    code: string;
    wcagLevel?: string;
  }>;
}

const WebAbilityMetadata: React.FC<WebAbilityMetadataProps> = ({ metadata, issues = [] }) => {
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [showMetadata, setShowMetadata] = useState<boolean>(false);

  if (!metadata) return null;

  const formatDuration = (seconds: number) => {
    return `${seconds.toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSuccessRate = () => {
    const { tested_rules, passed_rules } = metadata.accessibility_standards;
    return tested_rules > 0 ? ((passed_rules / tested_rules) * 100).toFixed(1) : '0';
  };

  const issuesWithScreenshots = issues.filter(issue => issue.screenshotUrl);

  return (
    <Box className="webability-metadata-container">
      {/* Enhanced Scan Info Header */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <MdAccessibility className="text-white text-2xl" />
              </div>
              <div>
                <Typography variant="h6" className="font-bold text-gray-900">
                  Enhanced WebAbility Scan
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  WCAG {metadata.accessibility_standards.wcag_version} {metadata.accessibility_standards.compliance_level} • {formatDuration(metadata.scan_duration)}
                </Typography>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Chip 
                label={`${getSuccessRate()}% Success Rate`}
                color="success"
                variant="filled"
                size="small"
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<FaInfoCircle />}
                onClick={() => setShowMetadata(!showMetadata)}
              >
                {showMetadata ? 'Hide' : 'Show'} Details
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-green-600">
                  {metadata.accessibility_standards.passed_rules}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Rules Passed
                </Typography>
              </div>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-red-600">
                  {metadata.accessibility_standards.failed_rules}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Rules Failed
                </Typography>
              </div>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-blue-600">
                  {metadata.issue_breakdown.by_type.total}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Total Issues
                </Typography>
              </div>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-purple-600">
                  {metadata.violation_screenshots}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Screenshots
                </Typography>
              </div>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Screenshots Gallery */}
      {issuesWithScreenshots.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaCamera className="text-blue-600 text-xl" />
              <Typography variant="h6" className="font-bold">
                Issue Screenshots ({issuesWithScreenshots.length})
              </Typography>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {issuesWithScreenshots.map((issue, index) => (
                <div key={index} className="relative group">
                  <div 
                    className="aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all duration-200"
                    onClick={() => setSelectedScreenshot(issue.screenshotUrl!)}
                  >
                    <img 
                      src={issue.screenshotUrl} 
                      alt={`Screenshot for ${issue.message}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                      <FaExpand className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  </div>
                  
                  {/* Issue Impact Badge */}
                  <div className="absolute top-2 right-2">
                    <Chip 
                      label={issue.impact}
                      size="small"
                      color={
                        issue.impact === 'critical' ? 'error' :
                        issue.impact === 'serious' ? 'warning' :
                        issue.impact === 'moderate' ? 'info' : 'default'
                      }
                      sx={{ fontSize: '0.6rem', height: '20px' }}
                    />
                  </div>
                  
                  {/* WCAG Level Badge */}
                  {issue.wcagLevel && (
                    <div className="absolute top-2 left-2">
                      <Chip 
                        label={issue.wcagLevel}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          fontSize: '0.6rem', 
                          height: '20px',
                          backgroundColor: 'rgba(255, 255, 255, 0.9)'
                        }}
                      />
                    </div>
                  )}
                  
                  <Typography variant="caption" className="block mt-2 text-gray-600 text-xs truncate">
                    {issue.message}
                  </Typography>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metadata (Expandable) */}
      {showMetadata && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <Typography variant="h6" className="font-bold mb-4 flex items-center gap-2">
              <FaInfoCircle className="text-blue-600" />
              Detailed Scan Information
            </Typography>
            
            <Grid container spacing={4}>
              {/* Scan Details */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" className="font-semibold mb-2 text-gray-800">
                  Scan Details
                </Typography>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Job ID:</span>
                    <span className="font-mono text-sm">{metadata.job_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span>{formatDuration(metadata.scan_duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timestamp:</span>
                    <span>{formatTimestamp(metadata.scan_timestamp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Viewport:</span>
                    <span>{metadata.browser_info.viewport.width}×{metadata.browser_info.viewport.height}</span>
                  </div>
                </div>
              </Grid>

              {/* WCAG Compliance */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" className="font-semibold mb-2 text-gray-800">
                  WCAG Compliance
                </Typography>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600">Success Rate</span>
                      <span className="font-semibold">{getSuccessRate()}%</span>
                    </div>
                    <LinearProgress 
                      variant="determinate" 
                      value={parseFloat(getSuccessRate())} 
                      color="success"
                      className="h-2 rounded"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tested:</span>
                      <span>{metadata.accessibility_standards.tested_rules}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Passed:</span>
                      <span className="text-green-600">{metadata.accessibility_standards.passed_rules}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Failed:</span>
                      <span className="text-red-600">{metadata.accessibility_standards.failed_rules}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Incomplete:</span>
                      <span className="text-yellow-600">{metadata.accessibility_standards.incomplete_rules}</span>
                    </div>
                  </div>
                </div>
              </Grid>

              {/* Issue Breakdown by Severity */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" className="font-semibold mb-2 text-gray-800">
                  Issues by Severity
                </Typography>
                <div className="space-y-2">
                  {Object.entries(metadata.issue_breakdown.by_severity).map(([severity, count]) => (
                    count > 0 && (
                      <div key={severity} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            severity === 'critical' ? 'bg-red-500' :
                            severity === 'serious' ? 'bg-orange-500' :
                            severity === 'moderate' ? 'bg-yellow-500' :
                            severity === 'minor' ? 'bg-blue-500' : 'bg-gray-500'
                          }`} />
                          <span className="capitalize text-gray-600">{severity}</span>
                        </div>
                        <span className="font-semibold">{count}</span>
                      </div>
                    )
                  ))}
                </div>
              </Grid>

              {/* WCAG Principles */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" className="font-semibold mb-2 text-gray-800">
                  WCAG Principles
                </Typography>
                <div className="space-y-2">
                  {Object.entries(metadata.issue_breakdown.by_category).map(([category, count]) => (
                    count > 0 && (
                      <div key={category} className="flex justify-between items-center">
                        <span className="capitalize text-gray-600">{category.replace('_', ' ')}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    )
                  ))}
                </div>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Screenshot Modal */}
      <Dialog 
        open={!!selectedScreenshot} 
        onClose={() => setSelectedScreenshot(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle className="flex justify-between items-center">
          <span>Issue Screenshot</span>
          <IconButton onClick={() => setSelectedScreenshot(null)}>
            <FaTimes />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedScreenshot && (
            <img 
              src={selectedScreenshot} 
              alt="Issue screenshot"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default WebAbilityMetadata;