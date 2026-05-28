// ✅ AI-First Universal Project Selector for SDK
// Provides unified project filtering and data aggregation capabilities

import { logger } from '../utils/logger';
// ✅ Philosophy: Универсальная система проверки активности через SDK
import { getActiveCount, filterActive } from '../utils/activityHelpers';

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: number;
  is_owner: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'archived';  // ⚠️ DEPRECATED: Используй is_active вместо status!
  is_active?: boolean;  // ✅ Philosophy: Используй is_active для проверки активности!
  metadata?: Record<string, any>;
}

export type ProjectSelectorMode = 'all' | 'my' | 'specific';

export interface ProjectFilter {
  mode: ProjectSelectorMode;
  projectId?: string;
  includeArchived?: boolean;
  status?: Project['status'][];
}

export interface AggregatedProjectData {
  totalProjects: number;
  activeProjects: number;
  ownedProjects: number;
  totalUsers: number;
  totalRevenue: number;
  totalTransactions: number;
  projects: Project[];
}

export interface ProjectSelectorConfig {
  enableAggregation: boolean;
  cacheTimeout: number;
  includeMetadata: boolean;
  autoRefresh: boolean;
}

/**
 * ✅ Universal Project Selector for SDK
 * Provides AI-friendly project filtering and data aggregation
 */
export class UniversalProjectSelector {
  private sdk: any;
  private config: ProjectSelectorConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(sdk: any, config: Partial<ProjectSelectorConfig> = {}) {
    this.sdk = sdk;
    this.config = {
      enableAggregation: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      includeMetadata: true,
      autoRefresh: true,
      ...config
    };
  }

  /**
   * ✅ Get projects based on filter mode
   */
  async getProjects(filter: ProjectFilter): Promise<Project[]> {
    const cacheKey = `projects_${JSON.stringify(filter)}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch all projects
      const response = await this.sdk.api.getProjects();
      let projects = response.data || [];

      // Apply filters
      projects = this.applyFilters(projects, filter);

      // Cache result
      this.setCachedData(cacheKey, projects);
      
      return projects;
    } catch (error) {
      logger.error('Failed to fetch projects:', error);
      throw error;
    }
  }

  /**
   * ✅ Get aggregated data for projects
   */
  async getAggregatedData(filter: ProjectFilter): Promise<AggregatedProjectData> {
    if (!this.config.enableAggregation) {
      throw new Error('Aggregation is disabled');
    }

    const cacheKey = `aggregated_${JSON.stringify(filter)}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const projects = await this.getProjects(filter);
      
      // Calculate aggregated metrics
      const aggregated: AggregatedProjectData = {
        totalProjects: projects.length,
        // ✅ Philosophy: Используем is_active для проверки активности, НЕ status!
        activeProjects: getActiveCount(projects),
        ownedProjects: projects.filter(p => p.is_owner).length,
        totalUsers: 0,
        totalRevenue: 0,
        totalTransactions: 0,
        projects
      };

      // Fetch additional metrics if needed
      if (projects.length > 0) {
        const metrics = await this.fetchProjectMetrics(projects);
        aggregated.totalUsers = metrics.totalUsers;
        aggregated.totalRevenue = metrics.totalRevenue;
        aggregated.totalTransactions = metrics.totalTransactions;
      }

      // Cache result
      this.setCachedData(cacheKey, aggregated);
      
      return aggregated;
    } catch (error) {
      logger.error('Failed to fetch aggregated data:', error);
      throw error;
    }
  }

  /**
   * ✅ Get project statistics
   */
  async getProjectStats(filter: ProjectFilter): Promise<{
    totalProjects: number;
    activeProjects: number;
    ownedProjects: number;
    archivedProjects: number;
    averageUsersPerProject: number;
    projectsByStatus: Record<string, number>;
  }> {
    const projects = await this.getProjects(filter);
    
    const stats = {
      totalProjects: projects.length,
      // ✅ Philosophy: Используем is_active для проверки активности, НЕ status!
      activeProjects: projects.filter(p => p.is_active !== false).length,
      ownedProjects: projects.filter(p => p.is_owner).length,
      archivedProjects: projects.filter(p => p.status === 'archived').length,
      averageUsersPerProject: 0,
      projectsByStatus: projects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Calculate average users per project
    if (projects.length > 0) {
      try {
        const totalUsers = await this.fetchTotalUsers(projects);
        stats.averageUsersPerProject = totalUsers / projects.length;
      } catch (error) {
        logger.warn('Failed to fetch user count:', error);
      }
    }

    return stats;
  }

  /**
   * ✅ Search projects by criteria
   */
  async searchProjects(query: string, filter: ProjectFilter): Promise<Project[]> {
    const projects = await this.getProjects(filter);
    
    const searchTerm = query.toLowerCase();
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchTerm) ||
      project.description?.toLowerCase().includes(searchTerm) ||
      String(project.id).includes(searchTerm)
    );
  }

  /**
   * ✅ Get projects for specific user
   */
  async getUserProjects(userId: number, mode: 'owned' | 'member' | 'all' = 'all'): Promise<Project[]> {
    const filter: ProjectFilter = {
      mode: 'all', // Get all projects first
      includeArchived: false
    };

    const projects = await this.getProjects(filter);
    
    switch (mode) {
      case 'owned':
        return projects.filter(p => p.owner_id === userId);
      case 'member':
        return projects.filter(p => p.permissions.includes('read') || p.permissions.includes('write'));
      case 'all':
      default:
        return projects;
    }
  }

  /**
   * ✅ Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * ✅ Update configuration
   */
  updateConfig(newConfig: Partial<ProjectSelectorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Private helper methods

  private applyFilters(projects: Project[], filter: ProjectFilter): Project[] {
    let filtered = [...projects];

    // Apply mode filter
    switch (filter.mode) {
      case 'my':
        filtered = filtered.filter(p => p.is_owner);
        break;
      case 'specific':
        if (filter.projectId) {
          filtered = filtered.filter(p => p.id === filter.projectId);
        }
        break;
      case 'all':
      default:
        // No additional filtering
        break;
    }

    // Apply status filter
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(p => filter.status!.includes(p.status));
    }

    // Apply archived filter
    if (!filter.includeArchived) {
      filtered = filtered.filter(p => p.status !== 'archived');
    }

    return filtered;
  }

  private async fetchProjectMetrics(projects: Project[]): Promise<{
    totalUsers: number;
    totalRevenue: number;
    totalTransactions: number;
  }> {
    try {
      // Fetch metrics for all projects
      const metricsPromises = projects.map(async (project) => {
        try {
          const [usersResponse, revenueResponse, transactionsResponse] = await Promise.all([
            this.sdk.api.getProjectUsers(project.id).catch(() => ({ data: [] })),
            this.sdk.payments.getProjectRevenue(project.id).catch(() => ({ data: 0 })),
            this.sdk.payments.getProjectTransactions(project.id).catch(() => ({ data: [] }))
          ]);

          return {
            users: usersResponse.data?.length || 0,
            revenue: revenueResponse.data || 0,
            transactions: transactionsResponse.data?.length || 0
          };
        } catch (error) {
          logger.warn(`Failed to fetch metrics for project ${project.id}:`, error);
          return { users: 0, revenue: 0, transactions: 0 };
        }
      });

      const metrics = await Promise.all(metricsPromises);

      return {
        totalUsers: metrics.reduce((sum, m) => sum + m.users, 0),
        totalRevenue: metrics.reduce((sum, m) => sum + m.revenue, 0),
        totalTransactions: metrics.reduce((sum, m) => sum + m.transactions, 0)
      };
    } catch (error) {
      logger.warn('Failed to fetch project metrics:', error);
      return { totalUsers: 0, totalRevenue: 0, totalTransactions: 0 };
    }
  }

  private async fetchTotalUsers(projects: Project[]): Promise<number> {
    try {
      const userPromises = projects.map(project => 
        this.sdk.api.getProjectUsers(project.id).catch(() => ({ data: [] }))
      );
      
      const userResponses = await Promise.all(userPromises);
      const uniqueUsers = new Set();
      
      userResponses.forEach(response => {
        response.data?.forEach((user: any) => uniqueUsers.add(user.id));
      });
      
      return uniqueUsers.size;
    } catch (error) {
      logger.warn('Failed to fetch total users:', error);
      return 0;
    }
  }

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

// ✅ Export types and class
export default UniversalProjectSelector;



