/**
 * Base Types - Foundation для всей type system
 * 
 * AI AGENT GUIDE:
 * Import base types для создания новых entities:
 * 
 * import { BaseEntity, NamedEntity, ActivatableEntity } from './base'
 * 
 * interface MyEntity extends BaseEntity, NamedEntity {
 *   my_field: string;
 * }
 */

export * from './BaseEntity';
export * from './Mixins';




