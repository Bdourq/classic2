export interface Customer {
  phone: string;
  points: number;
  createdAt: string;
  /** تاريخ آخر مرة أُضيفت له نقاط — أو تاريخ انضمامه إذا لم تُضف له نقاط بعد */
  lastAddAt?: string;
  /** اسم العميل — اختياري، يُدخله العميل عند أول تسجيل */
  name?: string | null;
}

export interface PointsLog {
  id: string;
  phone: string;
  action: 'add' | 'redeem';
  points: number;
  createdAt: string;
}
