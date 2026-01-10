/**
 * UI Primitives Barrel Export
 *
 * Import from this file for clean access to all UI components:
 *
 * import { Button, Input, Card } from '@/components/ui';
 */

// Core Components
export {
  Button,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from "./Button";
export { Input, type InputProps } from "./Input";
export { Card, type CardProps, type CardVariant } from "./Card";

// Settings Components
export { SettingsRow, type SettingsRowProps } from "./SettingsRow";
export { SettingsGroup, type SettingsGroupProps } from "./SettingsGroup";

// Status Components
export {
  StatusBadge,
  type StatusBadgeProps,
  type StatusType,
} from "./StatusBadge";

// Navigation Components
export { FilterChip, type FilterChipProps } from "./FilterChip";
export { NavItem, type NavItemProps } from "./NavItem";

// Dashboard Components
export { QuickAction, type QuickActionProps } from "./QuickAction";
export { StatCard, type StatCardProps } from "./StatCard";

// Feedback Components (moved from shared/)
export { CopyButton } from "./CopyButton";
export { EmptyState } from "./EmptyState";
export { Modal } from "./Modal";
export { Skeleton } from "./Skeleton";
export { Toast } from "./Toast";
