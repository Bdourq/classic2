export interface Customer {
  phone: string;
  points: number;
  createdAt: string;
}

export interface PointsLog {
  id: string;
  phone: string;
  action: 'add' | 'redeem';
  points: number;
  createdAt: string;
}
