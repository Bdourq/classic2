/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LoyaltyTransaction {
  id: string;
  amount: number;
  timestamp: string;
  type: 'add' | 'redeem';
  notes?: string;
}

export interface Customer {
  phone: string;
  name: string;
  points: number;
  createdAt: string;
  history: LoyaltyTransaction[];
}

export interface CashierSession {
  isAuthorized: boolean;
  pin: string;
}
