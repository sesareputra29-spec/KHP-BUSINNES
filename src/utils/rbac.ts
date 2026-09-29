/**
 * Role-Based Access Control (RBAC) Module for Kalkulator HPP Commercial SaaS
 * Evaluates user permissions for actions across system modules.
 */

import { UserProfile } from '../types';

export type SystemModule =
  | 'dashboard'
  | 'calculator'
  | 'master_data'
  | 'bom'
  | 'produksi'
  | 'pricing'
  | 'inventory'
  | 'analysis'
  | 'reports'
  | 'system';

export type RbacAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export interface PermissionRule {
  allowedRoles: Array<UserProfile['role']>;
  restrictedActions?: Partial<Record<UserProfile['role'], RbacAction[]>>;
}

export const MODULE_PERMISSIONS: Record<SystemModule, PermissionRule> = {
  dashboard: {
    allowedRoles: ['Administrator', 'Manager / Owner', 'Cost Accountant', 'Inventory Staff', 'Staff', 'Kasir', 'Viewer'],
  },
  calculator: {
    allowedRoles: ['Administrator', 'Manager / Owner', 'Cost Accountant', 'Staff', 'Viewer'],
    restrictedActions: {
      Viewer: ['view'],
      Staff: ['view', 'create'],
    },
  },
  master_data: {
    allowedRoles: ['Administrator', 'Manager / Owner', 'Cost Accountant', 'Inventory Staff'],
    restrictedActions: {
      'Cost Accountant': ['view', 'create', 'edit'],
      'Inventory Staff': ['view', 'create', 'edit'], // cannot delete
    },
  },
  bom: {
    allowedRoles: ['Administrator', 'Manager / Owner', 'Cost Accountant'],
    restrictedActions: {
      'Cost Accountant': ['view', 'create', 'edit'],
    },
  },
  produksi: {
    allowedRoles: ['Administrator', 'Manager / Owner', 'Cost Accountant', 'Staff'],
    restrictedActions: {
      Staff: ['view', 'edit'], // can update production status, cannot delete
    },
  },
  pricing: {
    allowedRoles: ['Administrator', 'Manager / Owner', 'Cost Accountant'],
  },
  inventory: {
    allowedRoles: ['Administrator', 'Manager / Owner', 'Cost Accountant', 'Inventory Staff'],
  },
  analysis: {
    allowedRoles: ['Administrator', 'Manager / Owner', 'Cost Accountant', 'Viewer'],
  },
  reports: {
    allowedRoles: ['Administrator', 'Manager / Owner', 'Cost Accountant', 'Inventory Staff', 'Viewer'],
  },
  system: {
    allowedRoles: ['Administrator', 'Manager / Owner'],
  },
};

/**
 * Validates whether a user with a given role has permission to execute an action on a module.
 */
export const checkPermission = (
  userRole: UserProfile['role'] | undefined,
  module: SystemModule,
  action: RbacAction = 'view'
): boolean => {
  if (!userRole) return false;

  // Super Owners and Admins always have full permissions
  if (userRole === 'Administrator' || userRole === 'Manager / Owner') {
    return true;
  }

  const rule = MODULE_PERMISSIONS[module];
  if (!rule) return false;

  // Check if role is in allowed list
  if (!rule.allowedRoles.includes(userRole)) {
    return false;
  }

  // Check if action is restricted for this role
  if (rule.restrictedActions && rule.restrictedActions[userRole]) {
    const allowedActions = rule.restrictedActions[userRole]!;
    return allowedActions.includes(action);
  }

  // By default, non-admin roles cannot delete
  if (action === 'delete') {
    return false;
  }

  return true;
};
